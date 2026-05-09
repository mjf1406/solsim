import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react"

import {
  bodyCircleLabelRect,
  drawCanvasBodyLabel,
  inflateCanvasLabelRect,
  leftSliverAnchorCenter,
  OVERSIZED_DISK_VISIBLE_ARC_PX,
  shouldAnchorDiskOnLeft,
  type CanvasBodyLabelRect,
} from "@/lib/canvas"
import { getCanvasLocalCssPoint } from "@/lib/pointer/canvas-client-xy"
import {
  ASSUMED_SIDEBAR_PX_CSS,
  DISTANCE_CANVAS_BASE_INSET_PX,
} from "@/hooks/use-distance-scale"
import {
  applyBodyTypePreset,
  filterSizeCanvasBodiesForDisplay,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { cn } from "@/lib/utils"

import {
  collectDistanceBodies,
  type DistanceBody,
  type SolarSystemJson,
  type SizePageModel,
} from "../-data"

/**
 * Distance canvas:
 * - x position is proportional to distance from Sun (km) * pxPerKmDistance.
 * - disk diameter uses true scale; bodies smaller than 1 CSS px get a transparent 1 px proxy
 *   disk so labels attach and hit-testing works; the left sidebar still uses true diameter × scale.
 * - All name labels are always shown.
 */

const PLACEHOLDER_BASE = "/assets/placeholders"
const SPACE_FLAT_FILL = "#020617"

/** When true diameter is under 1 CSS px, draw this diameter (transparent) for label anchor + hits. */
const PROXY_DISK_DIAMETER_PX = 1

/** Minimum half-width (CSS px) for pointer hit on proxy disks (drawing stays 1 px). */
const PROXY_DISK_HIT_RADIUS_PX = 10

/** Left/right content inset: sidebar width + inner pad (stable — ignores live sidebar toggle). */
const INSET_LEFT_CSS = ASSUMED_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX
const INSET_RIGHT_CSS = ASSUMED_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX

function placeholderSrc(name: string, kind: DistanceBody["kind"]): string {
  const n = name.trim().toLowerCase()
  if (kind === "star" || n === "sun") return `${PLACEHOLDER_BASE}/sun.svg`
  if (kind === "scifi") return `${PLACEHOLDER_BASE}/asteroid.svg`
  if (kind === "asteroid") return `${PLACEHOLDER_BASE}/asteroid.svg`
  if (kind === "comet") return `${PLACEHOLDER_BASE}/comet.svg`
  if (kind === "dwarf") return `${PLACEHOLDER_BASE}/dwarf-planet.svg`
  if (kind === "planet") {
    const map: Record<string, string> = {
      mercury: "mercury",
      venus: "venus",
      earth: "earth",
      mars: "mars",
      jupiter: "jupiter",
      saturn: "saturn",
      uranus: "uranus",
      neptune: "neptune",
    }
    const file = map[n]
    if (file) return `${PLACEHOLDER_BASE}/${file}.svg`
    return `${PLACEHOLDER_BASE}/dwarf-planet.svg`
  }
  return `${PLACEHOLDER_BASE}/natural-satellite.svg`
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => {
        imageCache.delete(src)
        reject(new Error(`Failed to load ${src}`))
      }
      img.decoding = "async"
      img.src = src
    })
    imageCache.set(src, p)
  }
  return p
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  diameterPx: number
): void {
  const r = diameterPx / 2
  if (r <= 0) return
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, cx - r, cy - r, diameterPx, diameterPx)
  ctx.restore()
}

/** Invisible 1 CSS px disk: satisfies “always draw” while staying visually empty. */
function drawTransparentProxyDisk(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number
): void {
  const r = PROXY_DISK_DIAMETER_PX / 2
  ctx.save()
  ctx.globalAlpha = 0
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function pointInLabelHitRect(x: number, y: number, rect: CanvasBodyLabelRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

type LayoutEntry = DistanceBody & {
  src: string
  /** True scale diameter in CSS px (`diameterKm * pxPerKm`). */
  trueDiameterPx: number
  /** Disk drawn on canvas (1 px when using transparent proxy). */
  drawDiameterPx: number
  isProxyDisk: boolean
}

type HitLayoutSnapshot = {
  entries: Array<{
    canvasId: string
    drawDiameterPx: number
    isProxyDisk: boolean
  }>
  posById: Map<string, { cx: number; cy: number }>
  labelRectById: Map<string, CanvasBodyLabelRect>
}

function hitTestBodyIdAt(snap: HitLayoutSnapshot, x: number, y: number): string | null {
  for (let i = snap.entries.length - 1; i >= 0; i--) {
    const entry = snap.entries[i]
    const pos = snap.posById.get(entry.canvasId)
    if (!pos) continue
    const id = entry.canvasId
    const labelRect = snap.labelRectById.get(id)
    if (labelRect && pointInLabelHitRect(x, y, labelRect)) {
      return id
    }
    const diskR = entry.isProxyDisk
      ? PROXY_DISK_HIT_RADIUS_PX
      : Math.max(0.75, entry.drawDiameterPx / 2)
    const dx = x - pos.cx
    const dy = y - pos.cy
    if (dx * dx + dy * dy <= diskR * diskR) return id
  }
  return null
}

function expandRectToMinimumHitSize(
  rect: CanvasBodyLabelRect,
  minWidth = 44,
  minHeight = 32
): CanvasBodyLabelRect {
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  const dx = Math.max(0, (minWidth - width) / 2)
  const dy = Math.max(0, (minHeight - height) / 2)
  return {
    left: rect.left - dx,
    top: rect.top - dy,
    right: rect.right + dx,
    bottom: rect.bottom + dy,
  }
}

export function DistanceCanvas({
  model,
  json,
  onBodySelect,
  bodyDisplayFilter = applyBodyTypePreset("planets"),
  pxPerKmSize,
  pxPerKmDistance,
  scrollToBodyId = null,
  scrollToBodyToken = 0,
}: {
  model: SizePageModel
  json: SolarSystemJson
  onBodySelect?: (bodyId: string | null) => void
  bodyDisplayFilter?: SizeBodyDisplayFilter
  pxPerKmSize: number
  pxPerKmDistance: number
  /** Body id to center when `scrollToBodyToken` increments (body-types list only). */
  scrollToBodyId?: string | null
  scrollToBodyToken?: number
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layoutHitRef = useRef<HitLayoutSnapshot | null>(null)
  const redrawRef = useRef<(() => Promise<void>) | null>(null)
  const posByIdForScrollRef = useRef<Map<string, { cx: number; cy: number }>>(new Map())
  const viewportWForScrollRef = useRef(0)
  const [canvasWidthPx, setCanvasWidthPx] = useState(0)

  const bodyDisplayFilterRef = useRef(bodyDisplayFilter)
  const pxPerKmSizeRef = useRef(pxPerKmSize)
  const pxPerKmDistanceRef = useRef(pxPerKmDistance)

  const onCanvasPointerDown = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const snap = layoutHitRef.current
      if (!canvas || !snap) return
      const { x, y } = getCanvasLocalCssPoint(canvas, e.clientX, e.clientY)
      if (!onBodySelect) return
      const hit = hitTestBodyIdAt(snap, x, y)
      onBodySelect(hit)
    },
    [onBodySelect]
  )

  const onCanvasPointerMove = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const snap = layoutHitRef.current
      if (!canvas || !snap) return
      if (!onBodySelect) return
      const { x, y } = getCanvasLocalCssPoint(canvas, e.clientX, e.clientY)
      const hit = hitTestBodyIdAt(snap, x, y)
      canvas.style.cursor = hit ? "pointer" : "default"
    },
    [onBodySelect]
  )

  const onCanvasPointerLeave = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) canvas.style.cursor = "default"
  }, [])

  /** Vertical wheel (and dominant trackpad axis) scrolls horizontally. */
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      const dy = e.deltaY
      const dx = e.deltaX
      const dominant = Math.abs(dy) >= Math.abs(dx) ? dy : dx
      if (dominant === 0) return
      e.preventDefault()
      const factor =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? wrapper.clientWidth : 1
      wrapper.scrollLeft += dominant * factor
    }
    wrapper.addEventListener("wheel", onWheel, { passive: false })
    return () => wrapper.removeEventListener("wheel", onWheel)
  }, [])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    let cancelled = false
    const resizeObserver = new ResizeObserver(() => {
      void redraw()
    })
    resizeObserver.observe(wrapper)
    const onWinResize = () => {
      void redraw()
    }
    window.addEventListener("resize", onWinResize)

    async function redraw() {
      if (!wrapper) return
      const viewportW = wrapper.clientWidth ?? 0
      const hCss = wrapper.clientHeight ?? 0
      if (viewportW < 16 || hCss < 16) return

      const bodiesAll = collectDistanceBodies(model, json)

      const bodiesFiltered = filterSizeCanvasBodiesForDisplay(
        bodiesAll,
        bodyDisplayFilterRef.current,
        Math.max(pxPerKmSizeRef.current, Number.EPSILON),
        0
      ) as DistanceBody[]

      const entries: LayoutEntry[] = bodiesFiltered
        .map((b) => {
          const raw = b.row.diameterKm * pxPerKmSizeRef.current
          const trueDiameterPx =
            Number.isFinite(raw) && raw > 0 ? raw : Number.EPSILON
          const isProxyDisk = trueDiameterPx < 1
          const drawDiameterPx = isProxyDisk
            ? PROXY_DISK_DIAMETER_PX
            : Math.max(0.25, trueDiameterPx)
          return {
            ...b,
            src: placeholderSrc(b.row.name, b.kind),
            trueDiameterPx,
            drawDiameterPx,
            isProxyDisk,
          }
        })
        .sort((a, b) => a.drawDiameterPx - b.drawDiameterPx)

      const settled = await Promise.allSettled(entries.map((e) => loadImage(e.src)))
      if (cancelled) return

      const dpr =
        typeof window !== "undefined"
          ? Math.min(window.devicePixelRatio ?? 1, 3)
          : 1

      const canvasEl = canvasRef.current
      if (!canvasEl) return

      const ctx = canvasEl.getContext("2d")
      if (!ctx) return

      const midY = hCss / 2
      const posById = new Map<string, { cx: number; cy: number }>()

      const parentPosByCatalogId = new Map<string, number>()
      for (const e of entries) {
        if (e.kind === "planet" || e.kind === "dwarf") {
          const x0 = INSET_LEFT_CSS + e.distanceFromSunKm * pxPerKmDistanceRef.current
          parentPosByCatalogId.set(e.row.id, x0)
        }
      }

      for (const e of entries) {
        let cx = INSET_LEFT_CSS + e.distanceFromSunKm * pxPerKmDistanceRef.current
        if (e.kind === "moon" && e.parentPlanetId) {
          const parentX = parentPosByCatalogId.get(e.parentPlanetId)
          if (parentX != null) {
            cx = parentX + (e.moonOrbitKm ?? 0) * pxPerKmDistanceRef.current
          }
        }
        posById.set(e.canvasId, { cx, cy: midY })
      }

      for (const e of entries) {
        if (e.kind !== "star") continue
        if (!shouldAnchorDiskOnLeft(e.drawDiameterPx, viewportW, hCss)) continue
        const anchor = leftSliverAnchorCenter(
          e.drawDiameterPx,
          hCss,
          OVERSIZED_DISK_VISIBLE_ARC_PX,
          INSET_LEFT_CSS
        )
        posById.set(e.canvasId, anchor)
      }

      canvasEl.style.width = `${viewportW}px`
      canvasEl.style.height = `${hCss}px`
      canvasEl.width = Math.round(viewportW * dpr) ?? 0
      canvasEl.height = Math.round(hCss * dpr) ?? 0
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const labelRectById = new Map<string, CanvasBodyLabelRect>()
      for (const e of entries) {
        const pos = posById.get(e.canvasId)
        if (!pos) continue
        const raw = bodyCircleLabelRect(
          ctx,
          e.row.name,
          pos.cx,
          pos.cy,
          e.drawDiameterPx
        )
        const inflatePx = e.isProxyDisk ? 12 : 6
        labelRectById.set(
          e.canvasId,
          expandRectToMinimumHitSize(inflateCanvasLabelRect(raw, inflatePx))
        )
      }

      let rightExtent = viewportW
      for (const e of entries) {
        const pos = posById.get(e.canvasId)
        const labelRect = labelRectById.get(e.canvasId)
        if (pos) {
          rightExtent = Math.max(rightExtent, pos.cx + e.drawDiameterPx / 2)
        }
        if (labelRect) {
          rightExtent = Math.max(rightExtent, labelRect.right)
        }
      }
      const canvasWidthPx = Math.max(viewportW, rightExtent + INSET_RIGHT_CSS)

      canvasEl.style.width = `${canvasWidthPx}px`
      canvasEl.style.height = `${hCss}px`
      canvasEl.width = Math.round(canvasWidthPx * dpr) ?? 0
      canvasEl.height = Math.round(hCss * dpr) ?? 0
      setCanvasWidthPx(canvasWidthPx)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = SPACE_FLAT_FILL
      ctx.fillRect(0, 0, canvasWidthPx, hCss)

      posByIdForScrollRef.current = new Map(posById)
      viewportWForScrollRef.current = viewportW

      layoutHitRef.current = {
        entries: entries.map((e) => ({
          canvasId: e.canvasId,
          drawDiameterPx: e.drawDiameterPx,
          isProxyDisk: e.isProxyDisk,
        })),
        posById,
        labelRectById,
      }

      settled.forEach((res, i) => {
        const e = entries[i]
        const pos = posById.get(e.canvasId)
        if (!pos) return
        const { cx, cy } = pos
        if (e.isProxyDisk) {
          drawTransparentProxyDisk(ctx, cx, cy)
        } else if (res.status === "fulfilled") {
          drawBody(ctx, res.value, cx, cy, e.drawDiameterPx)
        } else {
          const r = e.drawDiameterPx / 2
          if (!(r > 0)) return
          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(128, 128, 128, 0.45)"
          ctx.fill()
          ctx.restore()
        }
        drawCanvasBodyLabel(ctx, e.row.name, cx, cy, e.drawDiameterPx / 2)
      })
    }

    redrawRef.current = redraw
    void redraw()

    return () => {
      cancelled = true
      redrawRef.current = null
      resizeObserver.disconnect()
      window.removeEventListener("resize", onWinResize)
    }
  }, [model, json])

  useLayoutEffect(() => {
    bodyDisplayFilterRef.current = bodyDisplayFilter
    void redrawRef.current?.()
  }, [bodyDisplayFilter])

  useLayoutEffect(() => {
    pxPerKmSizeRef.current = pxPerKmSize
    void redrawRef.current?.()
  }, [pxPerKmSize])

  useLayoutEffect(() => {
    pxPerKmDistanceRef.current = pxPerKmDistance
    void redrawRef.current?.()
  }, [pxPerKmDistance])

  useLayoutEffect(() => {
    if (scrollToBodyToken <= 0 || scrollToBodyId == null) return
    const wrapper = wrapperRef.current
    const bodyId = scrollToBodyId
    void (async () => {
      await redrawRef.current?.()
      if (!wrapper) return
      const posMap = posByIdForScrollRef.current
      const vw = viewportWForScrollRef.current
      const pos = posMap.get(bodyId)
      if (!pos || !(vw > 0)) return

      const scrollLeft = wrapper.scrollLeft
      const visibleRight = scrollLeft + vw
      const margin = 48
      const fullyVisible =
        pos.cx >= scrollLeft + margin && pos.cx <= visibleRight - margin
      if (fullyVisible) return

      wrapper.scrollTo({
        left: Math.max(0, pos.cx - vw / 2),
        behavior: "smooth",
      })
    })()
  }, [scrollToBodyId, scrollToBodyToken])

  const canvasInteractive = Boolean(onBodySelect)

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-x-0 top-(--app-header-h) z-1 h-[calc(100svh-var(--app-header-h))] overflow-x-auto overflow-y-hidden bg-[#020617]"
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full touch-none select-none",
          canvasInteractive ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{ width: `${canvasWidthPx}px` }}
        aria-label="Scaled distances: scroll horizontally to reach distant bodies; tap or click a disk or its name label to select."
        onPointerDown={canvasInteractive ? onCanvasPointerDown : undefined}
        onPointerMove={canvasInteractive ? onCanvasPointerMove : undefined}
        onPointerLeave={canvasInteractive ? onCanvasPointerLeave : undefined}
      />
    </div>
  )
}
