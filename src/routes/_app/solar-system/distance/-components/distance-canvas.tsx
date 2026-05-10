import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react"

import {
  bodyCircleLabelRect,
  CANVAS_BODY_LABEL_FONT_LARGE,
  canvasLabelFitsInsideDiskHorizontalCount,
  inflateCanvasLabelRect,
  leftSliverAnchorCenter,
  measureCanvasLabelBox,
  OVERSIZED_DISK_VISIBLE_ARC_PX,
  resolveDistanceLabelLanes,
  shouldAnchorDiskOnLeft,
  type CanvasBodyLabelRect,
  type DistanceLabelLeader,
  type DistanceLabelLeaderAttachment,
} from "@/lib/canvas"
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
 * Distance strip (DOM):
 * - x position is proportional to distance from Sun (km) * pxPerKmDistance.
 * - disk diameter uses true scale; bodies smaller than 1 CSS px use a transparent proxy
 *   hit pad so labels attach and taps work; the left sidebar still uses true diameter × scale.
 * - All name labels are always shown.
 * - Wide content uses div/img instead of canvas to avoid browser canvas dimension limits.
 */

const PLACEHOLDER_BASE = "/assets/placeholders"

/** When true diameter is under 1 CSS px, layout uses this diameter for label anchor math. */
const PROXY_DISK_DIAMETER_PX = 1

/** Transparent hit pad (CSS px) for proxy disks — matches prior ~10px radius hit target. */
const PROXY_DISK_HIT_PAD_PX = 20

/** Left/right content inset: sidebar width + inner pad (stable — ignores live sidebar toggle). */
const INSET_LEFT_CSS = ASSUMED_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX
const INSET_RIGHT_CSS = ASSUMED_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX

/**
 * Vertical gap between a planet/dwarf disk's top edge and the body label's
 * bottom edge. Fixed regardless of moon count; the leader uses an elbow shape
 * so an inflated stack of moon labels doesn't push the body name further up.
 */
const PLANET_LABEL_GAP_ABOVE_DISK_PX = 50

/** Minimum horizontal copies of the label that must fit inscribed before using inside-disk placement. */
const DISTANCE_INSIDE_LABEL_HORIZONTAL_COUNT = 3

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

/** Lazy 2D context for {@link bodyCircleLabelRect} text metrics only (no on-screen canvas). */
let measureCtxSingleton: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null
  if (!measureCtxSingleton) {
    const c = document.createElement("canvas")
    measureCtxSingleton = c.getContext("2d")
  }
  return measureCtxSingleton
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

type LayoutEntry = DistanceBody & {
  src: string
  /** True scale diameter in CSS px (`diameterKm * pxPerKm`). */
  trueDiameterPx: number
  /** Layout diameter (1 px when using transparent proxy). */
  drawDiameterPx: number
  isProxyDisk: boolean
}

type DistanceLayoutItem = {
  canvasId: string
  name: string
  src: string
  cx: number
  cy: number
  drawDiameterPx: number
  isProxyDisk: boolean
  labelRect: CanvasBodyLabelRect
  labelHitRect: CanvasBodyLabelRect
  leader: DistanceLabelLeader | null
}

function LabelHitArea({
  canvasId,
  labelRect,
  hitRect,
  name,
  interactive,
}: {
  canvasId: string
  labelRect: CanvasBodyLabelRect
  hitRect: CanvasBodyLabelRect
  name: string
  interactive: boolean
}) {
  const innerLeft = labelRect.left - hitRect.left
  const innerTop = labelRect.top - hitRect.top
  return (
    <div
      data-body-id={canvasId}
      className={cn(!interactive && "pointer-events-none")}
      style={{
        position: "absolute",
        left: hitRect.left,
        top: hitRect.top,
        width: hitRect.right - hitRect.left,
        height: hitRect.bottom - hitRect.top,
        zIndex: 5,
        pointerEvents: interactive ? "auto" : "none",
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <span
        className="select-none whitespace-nowrap"
        style={{
          position: "absolute",
          left: innerLeft,
          top: innerTop,
          font: CANVAS_BODY_LABEL_FONT_LARGE,
          color: "#ffffff",
          WebkitTextStroke: "3px #000000",
          paintOrder: "stroke fill",
          lineHeight: 1,
        }}
      >
        {name}
      </span>
    </div>
  )
}

function leaderPolylinePointsLocal(
  leader: DistanceLabelLeader,
  originLeft: number,
  originTop: number
): string {
  return leader.points
    .map((p) => `${p.x - originLeft},${p.y - originTop}`)
    .join(" ")
}

function DistanceLabelLeaderSvg({ leader }: { leader: DistanceLabelLeader }) {
  const xs = leader.points.map((p) => p.x)
  const ys = leader.points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = 6
  const left = minX - pad
  const top = minY - pad
  const width = Math.max(1, maxX - minX + 2 * pad)
  const height = Math.max(1, maxY - minY + 2 * pad)
  const points = leaderPolylinePointsLocal(leader, left, top)

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute z-[1] overflow-visible"
      style={{ left, top, width, height }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        points={points}
        stroke="#000000"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        fill="none"
        points={points}
        stroke="#ffffff"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DistanceBodyLayers({
  item,
  interactive,
  selected,
}: {
  item: DistanceLayoutItem
  interactive: boolean
  selected: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const pe: CSSProperties["pointerEvents"] = interactive ? "auto" : "none"
  const cursor: CSSProperties["cursor"] = interactive ? "pointer" : "default"
  const D = item.drawDiameterPx
  const r = D / 2
  const halfPad = PROXY_DISK_HIT_PAD_PX / 2
  const indicatorSize = Math.max(18, D + Math.max(8, Math.min(20, D * 0.16)))
  const indicatorStyle: CSSProperties = {
    position: "absolute",
    left: item.cx - indicatorSize / 2,
    top: item.cy - indicatorSize / 2,
    width: indicatorSize,
    height: indicatorSize,
    pointerEvents: "none",
  }

  if (item.isProxyDisk) {
    return (
      <>
        {selected ? <SelectionIndicator style={indicatorStyle} /> : null}
        <div
          data-body-id={item.canvasId}
          className={cn(!interactive && "pointer-events-none")}
          style={{
            position: "absolute",
            left: item.cx - halfPad,
            top: item.cy - halfPad,
            width: PROXY_DISK_HIT_PAD_PX,
            height: PROXY_DISK_HIT_PAD_PX,
            pointerEvents: pe,
            cursor,
          }}
          aria-hidden
        />
        {item.leader ? (
          <DistanceLabelLeaderSvg leader={item.leader} />
        ) : null}
        <LabelHitArea
          canvasId={item.canvasId}
          labelRect={item.labelRect}
          hitRect={item.labelHitRect}
          name={item.name}
          interactive={interactive}
        />
      </>
    )
  }

  const diskStyle = {
    position: "absolute" as const,
    left: item.cx - r,
    top: item.cy - r,
    width: D,
    height: D,
    borderRadius: "50%",
    pointerEvents: pe,
    cursor,
  }

  return (
    <>
      {selected ? <SelectionIndicator style={indicatorStyle} /> : null}
      {!imgFailed ? (
        <img
          src={item.src}
          alt=""
          draggable={false}
          decoding="async"
          data-body-id={item.canvasId}
          className={cn("object-cover", !interactive && "pointer-events-none")}
          style={diskStyle}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          data-body-id={item.canvasId}
          className={cn(!interactive && "pointer-events-none")}
          style={{
            ...diskStyle,
            backgroundColor: "rgba(128, 128, 128, 0.45)",
          }}
          aria-hidden
        />
      )}
      {item.leader ? (
        <DistanceLabelLeaderSvg leader={item.leader} />
      ) : null}
      <LabelHitArea
        canvasId={item.canvasId}
        labelRect={item.labelRect}
        hitRect={item.labelHitRect}
        name={item.name}
        interactive={interactive}
      />
    </>
  )
}

function SelectionIndicator({ style }: { style: CSSProperties }) {
  return (
    <span
      aria-hidden
      className="absolute z-20 rounded-full border-2 border-sky-400/90 shadow-[0_0_18px_rgba(56,189,248,0.55)] animate-pulse"
      style={style}
    />
  )
}

export function DistanceCanvas({
  model,
  json,
  onBodySelect,
  selectedBodyId = null,
  bodyDisplayFilter = applyBodyTypePreset("planets"),
  pxPerKmSize,
  pxPerKmDistance,
  scrollToBodyId = null,
  scrollToBodyToken = 0,
}: {
  model: SizePageModel
  json: SolarSystemJson
  onBodySelect?: (bodyId: string | null) => void
  selectedBodyId?: string | null
  bodyDisplayFilter?: SizeBodyDisplayFilter
  pxPerKmSize: number
  pxPerKmDistance: number
  /** Body id to center when `scrollToBodyToken` increments (body-types list only). */
  scrollToBodyId?: string | null
  scrollToBodyToken?: number
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const syncLayoutRef = useRef<(() => void) | null>(null)
  const posByIdForScrollRef = useRef<Map<string, { cx: number; cy: number }>>(
    new Map()
  )
  const viewportWForScrollRef = useRef(0)

  const [contentWidthPx, setContentWidthPx] = useState(0)
  const [layoutItems, setLayoutItems] = useState<DistanceLayoutItem[]>([])

  const bodyDisplayFilterRef = useRef(bodyDisplayFilter)
  const pxPerKmSizeRef = useRef(pxPerKmSize)
  const pxPerKmDistanceRef = useRef(pxPerKmDistance)

  const onContentPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!onBodySelect) return
      const t = e.target
      if (!(t instanceof Element)) return
      const el = t.closest("[data-body-id]")
      const id = el?.getAttribute("data-body-id")
      onBodySelect(id ?? null)
    },
    [onBodySelect]
  )

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
    const wrapper = wrapperRef.current
    if (!wrapper) return

    function syncLayout() {
      const viewportW = wrapper!.clientWidth ?? 0
      const hCss = wrapper!.clientHeight ?? 0
      if (viewportW < 16 || hCss < 16) return

      const ctx = getMeasureCtx()
      if (!ctx) return

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

      const midY = hCss / 2
      const posById = new Map<string, { cx: number; cy: number }>()

      const parentPosByCatalogId = new Map<string, number>()
      for (const e of entries) {
        if (e.kind === "planet" || e.kind === "dwarf") {
          const x0 =
            INSET_LEFT_CSS + e.distanceFromSunKm * pxPerKmDistanceRef.current
          parentPosByCatalogId.set(e.row.id, x0)
        }
      }

      for (const e of entries) {
        let cx =
          INSET_LEFT_CSS + e.distanceFromSunKm * pxPerKmDistanceRef.current
        if (e.kind === "moon" && e.parentPlanetId) {
          const parentX = parentPosByCatalogId.get(e.parentPlanetId)
          if (parentX != null) {
            cx =
              parentX +
              (e.moonOrbitKm ?? 0) * pxPerKmDistanceRef.current
          }
        }
        posById.set(e.canvasId, { cx, cy: midY })
      }

      for (const e of entries) {
        if (e.kind !== "star") continue
        if (!shouldAnchorDiskOnLeft(e.drawDiameterPx, viewportW, hCss))
          continue
        const anchor = leftSliverAnchorCenter(
          e.drawDiameterPx,
          hCss,
          OVERSIZED_DISK_VISIBLE_ARC_PX,
          INSET_LEFT_CSS
        )
        posById.set(e.canvasId, anchor)
      }

      const moonPreferredLaneByCanvasId = new Map<string, number>()
      const moonsByParentCatalogId = new Map<string, LayoutEntry[]>()
      for (const e of entries) {
        if (e.kind !== "moon" || !e.parentPlanetId) continue
        const pid = e.parentPlanetId
        const arr = moonsByParentCatalogId.get(pid) ?? []
        arr.push(e)
        moonsByParentCatalogId.set(pid, arr)
      }
      for (const group of moonsByParentCatalogId.values()) {
        group.sort((a, b) => {
          const ao = a.moonOrbitKm
          const bo = b.moonOrbitKm
          if (ao != null && bo != null && ao !== bo) return ao - bo
          if (ao != null && bo == null) return -1
          if (ao == null && bo != null) return 1
          const ax = posById.get(a.canvasId)?.cx ?? 0
          const bx = posById.get(b.canvasId)?.cx ?? 0
          const pid = a.parentPlanetId!
          const px = parentPosByCatalogId.get(pid) ?? 0
          return ax - px - (bx - px)
        })
        const N = group.length
        for (let i = 0; i < N; i++) {
          const sign = i % 2 === 0 ? -1 : 1
          const lane = sign * (N - i)
          moonPreferredLaneByCanvasId.set(group[i]!.canvasId, lane)
        }
      }

      const laneHintsByCanvasId = new Map<
        string,
        {
          preferredLane?: number
          lockNaturalRect?: boolean
          leaderAttachment?: DistanceLabelLeaderAttachment
          isLabelInsideDisk?: boolean
        }
      >()
      for (const [canvasId, lane] of moonPreferredLaneByCanvasId) {
        laneHintsByCanvasId.set(canvasId, { preferredLane: lane })
      }

      const items: DistanceLayoutItem[] = []

      for (const e of entries) {
        const pos = posById.get(e.canvasId)
        if (!pos) continue

        const rDisk = e.drawDiameterPx / 2
        const { w: labelW, h: labelH } = measureCanvasLabelBox(
          ctx,
          e.row.name,
          CANVAS_BODY_LABEL_FONT_LARGE
        )

        const starAnchoredLeft =
          e.kind === "star" &&
          shouldAnchorDiskOnLeft(e.drawDiameterPx, viewportW, hCss)

        const canTryInsideDisk =
          (e.kind === "planet" ||
            e.kind === "dwarf" ||
            e.kind === "star") &&
          !starAnchoredLeft &&
          canvasLabelFitsInsideDiskHorizontalCount(
            labelW,
            labelH,
            rDisk,
            DISTANCE_INSIDE_LABEL_HORIZONTAL_COUNT
          )

        let rawLabel: CanvasBodyLabelRect

        if (canTryInsideDisk) {
          rawLabel = {
            left: pos.cx - labelW / 2,
            top: pos.cy - labelH / 2,
            right: pos.cx + labelW / 2,
            bottom: pos.cy + labelH / 2,
          }
          laneHintsByCanvasId.set(e.canvasId, { isLabelInsideDisk: true })
        } else {
          rawLabel = bodyCircleLabelRect(
            ctx,
            e.row.name,
            pos.cx,
            pos.cy,
            e.drawDiameterPx,
            { forceOutside: true, font: CANVAS_BODY_LABEL_FONT_LARGE }
          )
          if (e.kind === "planet" || e.kind === "dwarf") {
            const labelWidth = rawLabel.right - rawLabel.left
            const labelHeight = rawLabel.bottom - rawLabel.top
            const gap = 6
            const right = pos.cx - rDisk - gap
            const bottom = (pos.cy - rDisk) - PLANET_LABEL_GAP_ABOVE_DISK_PX
            rawLabel = {
              left: right - labelWidth,
              top: bottom - labelHeight,
              right,
              bottom,
            }
            laneHintsByCanvasId.set(e.canvasId, {
              lockNaturalRect: true,
              leaderAttachment: "left-elbow",
            })
          }
        }
        const inflatePx = e.isProxyDisk ? 12 : 6
        const labelHitRect = expandRectToMinimumHitSize(
          inflateCanvasLabelRect(rawLabel, inflatePx)
        )

        items.push({
          canvasId: e.canvasId,
          name: e.row.name,
          src: e.src,
          cx: pos.cx,
          cy: pos.cy,
          drawDiameterPx: e.drawDiameterPx,
          isProxyDisk: e.isProxyDisk,
          labelRect: rawLabel,
          labelHitRect,
          leader: null,
        })
      }

      const laneInputs = items.map((it) => {
        const hint = laneHintsByCanvasId.get(it.canvasId)
        return {
          id: it.canvasId,
          cx: it.cx,
          cy: it.cy,
          diskRadiusPx: it.drawDiameterPx / 2,
          isLabelInsideDisk: hint?.isLabelInsideDisk === true,
          naturalRect: it.labelRect,
          preferredLane: hint?.preferredLane,
          lockNaturalRect: hint?.lockNaturalRect,
          leaderAttachment: hint?.leaderAttachment,
        }
      })

      const placements = resolveDistanceLabelLanes(laneInputs)

      const resolvedItems: DistanceLayoutItem[] = items.map((it) => {
        const p = placements.get(it.canvasId)
        const labelRect = p?.labelRect ?? it.labelRect
        const leader = p?.leader ?? null
        const inflatePx = it.isProxyDisk ? 12 : 6
        const labelHitRect = expandRectToMinimumHitSize(
          inflateCanvasLabelRect(labelRect, inflatePx)
        )
        return {
          ...it,
          labelRect,
          labelHitRect,
          leader,
        }
      })

      let rightExtent = viewportW
      for (const it of resolvedItems) {
        rightExtent = Math.max(
          rightExtent,
          it.cx + it.drawDiameterPx / 2,
          it.labelHitRect.right
        )
        if (it.leader) {
          for (const p of it.leader.points) {
            if (p.x > rightExtent) rightExtent = p.x
          }
        }
      }
      const widthPx = Math.max(viewportW, rightExtent + INSET_RIGHT_CSS)

      posByIdForScrollRef.current = new Map(posById)
      viewportWForScrollRef.current = viewportW
      setContentWidthPx(widthPx)
      setLayoutItems(resolvedItems)
    }

    syncLayoutRef.current = syncLayout

    const resizeObserver = new ResizeObserver(() => {
      syncLayout()
    })
    resizeObserver.observe(wrapper)
    const onWinResize = () => {
      syncLayout()
    }
    window.addEventListener("resize", onWinResize)

    syncLayout()

    return () => {
      syncLayoutRef.current = null
      resizeObserver.disconnect()
      window.removeEventListener("resize", onWinResize)
    }
  }, [model, json])

  useLayoutEffect(() => {
    bodyDisplayFilterRef.current = bodyDisplayFilter
    syncLayoutRef.current?.()
  }, [bodyDisplayFilter])

  useLayoutEffect(() => {
    pxPerKmSizeRef.current = pxPerKmSize
    syncLayoutRef.current?.()
  }, [pxPerKmSize])

  useLayoutEffect(() => {
    pxPerKmDistanceRef.current = pxPerKmDistance
    syncLayoutRef.current?.()
  }, [pxPerKmDistance])

  useLayoutEffect(() => {
    if (scrollToBodyToken <= 0 || scrollToBodyId == null) return
    const wrapper = wrapperRef.current
    const bodyId = scrollToBodyId
    queueMicrotask(() => {
      syncLayoutRef.current?.()
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
    })
  }, [scrollToBodyId, scrollToBodyToken])

  const interactive = Boolean(onBodySelect)

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-x-0 top-(--app-header-h) z-1 h-[calc(100svh-var(--app-header-h))] overflow-x-auto overflow-y-hidden bg-[#020617]"
      aria-label="Scaled distances: scroll horizontally to reach distant bodies; tap or click a disk or its name label to select."
    >
      <div
        className={cn(
          "relative h-full min-h-full",
          interactive && "touch-none select-none"
        )}
        style={{
          width:
            contentWidthPx > 0 ? `${contentWidthPx}px` : "100%",
          minWidth: "100%",
        }}
        onPointerDown={interactive ? onContentPointerDown : undefined}
        role="presentation"
      >
        {layoutItems.map((item) => (
          <DistanceBodyLayers
            key={item.canvasId}
            item={item}
            interactive={interactive}
            selected={item.canvasId === selectedBodyId}
          />
        ))}
      </div>
    </div>
  )
}
