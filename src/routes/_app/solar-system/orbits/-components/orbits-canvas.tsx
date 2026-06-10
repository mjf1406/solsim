import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react"

import { BODY_CLASS_STYLE } from "@/lib/constants"
import {
  applyBodyTypePreset,
  filterSizeCanvasBodiesForDisplay,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { sizeBodyKindToBodyClass } from "@/lib/solar-system/body-class"
import { MAX_SAFE_DISTANCE_RENDER_PX } from "@/lib/solar-system/distance-render-limit"
import {
  buildOrbitPathForBody,
  type OrbitPath,
} from "@/lib/solar-system/orbits/orbit-path-sample"
import { angularVelocityRadPerSimSec } from "@/lib/solar-system/orbits/orbit-period"
import { placeholderSrc } from "@/lib/solar-system/placeholders"
import { cn } from "@/lib/utils"

import {
  collectDistanceBodies,
  type DistanceBody,
  type SolarSystemJson,
  type SizePageModel,
} from "../../distance/-data"

const PROXY_DISK_DIAMETER_PX = 1
const PROXY_DISK_HIT_PAD_PX = 20
const ORBIT_PATH_STEPS = 128
const FOLLOW_EASE = 0.2
const ORBIT_HIT_PAD_MIN_PX = 10

type WorldPosKm = { xKm: number; yKm: number }

type StaticBodyEntry = {
  canvasId: string
  name: string
  src: string
  kind: DistanceBody["kind"]
  drawDiameterPx: number
  isProxyDisk: boolean
  orbitPath: OrbitPath | null
  /** null = orbit centered on Sun (origin) */
  parentCanvasId: string | null
  phaseRad: number
  omegaRadPerSimSec: number
  stroke: string
  strokeWidth: number
  strokeOpacity: number
  strokeDasharray: string | undefined
  perihelionKm: number | null
  aphelionKm: number | null
}

type OrbitPolylineLayout = {
  canvasId: string
  points: string
  hitPoints: string
  stroke: string
  strokeWidth: number
  strokeOpacity: number
  strokeDasharray: string | undefined
}

type BodyLayoutItem = {
  canvasId: string
  name: string
  src: string
  cx: number
  cy: number
  drawDiameterPx: number
  isProxyDisk: boolean
}

type ApsisMarkerLayout = {
  cx: number
  cy: number
  label: string
}

function defaultBodyPhase(body: DistanceBody): number {
  let h = 0
  for (let i = 0; i < body.canvasId.length; i++) {
    h = (h * 31 + body.canvasId.charCodeAt(i)) | 0
  }
  return ((h % 360) / 360) * 0.85 + 0.05
}

function orbitRadiusKm(body: DistanceBody): number | null {
  if (body.kind === "star") return null
  if (body.kind === "moon") {
    const r = body.semiMajorAxisKm ?? body.moonOrbitKm
    return r != null && Number.isFinite(r) ? r : null
  }
  const r = body.semiMajorAxisKm
  return r != null && Number.isFinite(r) ? r : null
}

function isBeyondPolarRenderLimit(
  body: DistanceBody,
  pxPerKmDistance: number
): boolean {
  const rKm = orbitRadiusKm(body)
  if (rKm == null || !(pxPerKmDistance > 0)) return false
  return rKm * pxPerKmDistance > MAX_SAFE_DISTANCE_RENDER_PX
}

function worldPosAtSimTime(
  entry: StaticBodyEntry,
  posByCanvasId: Map<string, WorldPosKm>,
  simTimeSec: number
): WorldPosKm | null {
  if (entry.kind === "star") {
    return { xKm: 0, yKm: 0 }
  }
  if (!entry.orbitPath) return null

  const angle = entry.phaseRad + entry.omegaRadPerSimSec * simTimeSec
  const f = ((angle / (2 * Math.PI)) % 1 + 1) % 1
  const local = entry.orbitPath.positionAtFractionKm(f)

  if (entry.parentCanvasId == null) {
    return { xKm: local.xKm, yKm: local.yKm }
  }

  const parent = posByCanvasId.get(entry.parentCanvasId)
  if (!parent) return null
  return {
    xKm: parent.xKm + local.xKm,
    yKm: parent.yKm + local.yKm,
  }
}

function SelectionIndicator({ style }: { style: CSSProperties }) {
  return (
    <span
      aria-hidden
      className="absolute rounded-full border-2 border-sky-400/90 shadow-[0_0_18px_rgba(56,189,248,0.55)] animate-pulse"
      style={style}
    />
  )
}

function BodyNameLabel({
  item,
  interactive,
}: {
  item: BodyLayoutItem
  interactive: boolean
}) {
  const r = item.drawDiameterPx / 2
  const halfPad = PROXY_DISK_HIT_PAD_PX / 2
  const top = item.isProxyDisk ? item.cy - halfPad - 18 : item.cy - r - 8

  return (
    <button
      type="button"
      data-body-id={item.canvasId}
      className={cn(
        "absolute select-none whitespace-nowrap border-0 bg-transparent p-0 text-sm text-white",
        interactive ? "cursor-pointer" : "pointer-events-none cursor-default"
      )}
      style={{
        left: item.cx,
        top,
        transform: "translateX(-50%)",
        WebkitTextStroke: "2px #000",
        paintOrder: "stroke fill",
        zIndex: 11,
        pointerEvents: interactive ? "auto" : "none",
      }}
      aria-label={item.name}
      onClick={(e) => e.stopPropagation()}
    >
      {item.name}
    </button>
  )
}

function OrbitBodyDisk({
  item,
  interactive,
  selected,
}: {
  item: BodyLayoutItem
  interactive: boolean
  selected: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const D = item.drawDiameterPx
  const r = D / 2
  const halfPad = PROXY_DISK_HIT_PAD_PX / 2
  const pe: CSSProperties["pointerEvents"] = interactive ? "auto" : "none"
  const cursor: CSSProperties["cursor"] = interactive ? "pointer" : "default"
  const indicatorSize = Math.max(18, D + Math.max(8, Math.min(20, D * 0.16)))
  const indicatorStyle: CSSProperties = {
    position: "absolute",
    left: item.cx - indicatorSize / 2,
    top: item.cy - indicatorSize / 2,
    width: indicatorSize,
    height: indicatorSize,
    pointerEvents: "none",
    zIndex: 20,
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
            zIndex: 10,
          }}
          aria-hidden
        />
        <BodyNameLabel item={item} interactive={interactive} />
      </>
    )
  }

  const diskStyle: CSSProperties = {
    position: "absolute",
    left: item.cx - r,
    top: item.cy - r,
    width: D,
    height: D,
    borderRadius: "50%",
    pointerEvents: pe,
    cursor,
    zIndex: 10,
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
      <BodyNameLabel item={item} interactive={interactive} />
    </>
  )
}

function polylineForOrbit(
  entry: StaticBodyEntry,
  centerKm: WorldPosKm,
  worldToScreen: (x: number, y: number, vw: number, vh: number) => { sx: number; sy: number },
  vw: number,
  vh: number
): { points: string; hitPoints: string } | null {
  if (!entry.orbitPath) return null
  const samples = entry.orbitPath.samplePathKm(ORBIT_PATH_STEPS)
  const screenPts = samples.map((p) => {
    const wx = centerKm.xKm + p.xKm
    const wy = centerKm.yKm + p.yKm
    const { sx, sy } = worldToScreen(wx, wy, vw, vh)
    return { sx, sy }
  })
  return {
    points: screenPts.map((p) => `${p.sx},${p.sy}`).join(" "),
    hitPoints: screenPts.map((p) => `${p.sx},${p.sy}`).join(" "),
  }
}

export function OrbitsCanvas({
  model,
  json,
  onBodySelect,
  selectedBodyId = null,
  bodyDisplayFilter = applyBodyTypePreset("planets"),
  pxPerKmSize,
  pxPerKmDistance,
  orbitModel = "circle",
  paused = true,
  simSpeedSecondsPerWallSecond = 86_400,
  centerOnBodyId = null,
  centerOnBodyToken = 0,
}: {
  model: SizePageModel
  json: SolarSystemJson
  onBodySelect?: (bodyId: string | null) => void
  selectedBodyId?: string | null
  bodyDisplayFilter?: SizeBodyDisplayFilter
  pxPerKmSize: number
  pxPerKmDistance: number
  orbitModel?: "circle" | "kepler"
  paused?: boolean
  simSpeedSecondsPerWallSecond?: number
  centerOnBodyId?: string | null
  centerOnBodyToken?: number
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [orbitPolylines, setOrbitPolylines] = useState<OrbitPolylineLayout[]>(
    []
  )
  const [bodyItems, setBodyItems] = useState<BodyLayoutItem[]>([])
  const [apsisMarkers, setApsisMarkers] = useState<ApsisMarkerLayout[]>([])

  const staticEntriesRef = useRef<StaticBodyEntry[]>([])
  const simTimeSecRef = useRef(0)
  const lastFrameRef = useRef<number | null>(null)
  const followBodyIdRef = useRef<string | null>(null)

  const panDragRef = useRef<{
    active: boolean
    startX: number
    startY: number
    startPanX: number
    startPanY: number
  } | null>(null)

  const bodyDisplayFilterRef = useRef(bodyDisplayFilter)
  const pxPerKmSizeRef = useRef(pxPerKmSize)
  const pxPerKmDistanceRef = useRef(pxPerKmDistance)
  const orbitModelRef = useRef(orbitModel)
  const selectedBodyIdRef = useRef(selectedBodyId)
  const panOffsetRef = useRef(panOffset)
  const pausedRef = useRef(paused)
  const simSpeedRef = useRef(simSpeedSecondsPerWallSecond)
  const viewportRef = useRef({ w: 0, h: 0 })

  useLayoutEffect(() => {
    panOffsetRef.current = panOffset
  }, [panOffset])

  useLayoutEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useLayoutEffect(() => {
    simSpeedRef.current = simSpeedSecondsPerWallSecond
  }, [simSpeedSecondsPerWallSecond])

  useLayoutEffect(() => {
    if (centerOnBodyToken <= 0) return
    followBodyIdRef.current = centerOnBodyId
  }, [centerOnBodyId, centerOnBodyToken])

  const clearFollow = useCallback(() => {
    followBodyIdRef.current = null
  }, [])

  const worldToScreen = useCallback(
    (xKm: number, yKm: number, vw: number, vh: number) => {
      const cx = vw / 2 + panOffsetRef.current.x
      const cy = vh / 2 + panOffsetRef.current.y
      const px = pxPerKmDistanceRef.current
      return {
        sx: cx + xKm * px,
        sy: cy + yKm * px,
      }
    },
    []
  )

  const computeStaticLayoutRef = useRef<(() => void) | null>(null)
  const computeBodyPositionsRef = useRef<(() => void) | null>(null)

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    function computeStaticLayout() {
      const vw = wrapper!.clientWidth
      const vh = wrapper!.clientHeight
      viewportRef.current = { w: vw, h: vh }
      if (vw < 16 || vh < 16) return

      const pxD = pxPerKmDistanceRef.current
      if (!(pxD > 0)) return

      const bodiesAll = collectDistanceBodies(model, json)
      const bodiesFiltered = filterSizeCanvasBodiesForDisplay(
        bodiesAll,
        bodyDisplayFilterRef.current,
        Math.max(pxPerKmSizeRef.current, Number.EPSILON),
        0
      ) as DistanceBody[]

      const parentCatalogToCanvas = new Map<string, string>()
      for (const b of bodiesFiltered) {
        if (b.kind === "planet" || b.kind === "dwarf") {
          parentCatalogToCanvas.set(b.row.id, b.canvasId)
        }
      }

      const entries: StaticBodyEntry[] = bodiesFiltered
        .filter((b) => !isBeyondPolarRenderLimit(b, pxD))
        .map((b) => {
          const raw = b.row.diameterKm * pxPerKmSizeRef.current
          const trueDiameterPx =
            Number.isFinite(raw) && raw > 0 ? raw : Number.EPSILON
          const isProxyDisk = trueDiameterPx < 1
          const drawDiameterPx = isProxyDisk
            ? PROXY_DISK_DIAMETER_PX
            : Math.max(0.25, trueDiameterPx)
          const orbitClass = sizeBodyKindToBodyClass(b.kind)
          const style = BODY_CLASS_STYLE[orbitClass]
          const dashArr =
            style.dash.length > 0 ? style.dash.join(" ") : undefined

          let parentCanvasId: string | null = null
          if (b.kind === "moon" && b.parentPlanetId) {
            parentCanvasId =
              parentCatalogToCanvas.get(b.parentPlanetId) ?? null
          }

          return {
            canvasId: b.canvasId,
            name: b.row.name,
            src: placeholderSrc(b.row.name, b.kind),
            kind: b.kind,
            drawDiameterPx,
            isProxyDisk,
            orbitPath: buildOrbitPathForBody(b, "circle"),
            parentCanvasId,
            phaseRad: defaultBodyPhase(b),
            omegaRadPerSimSec: angularVelocityRadPerSimSec(b),
            stroke: style.color,
            strokeWidth: style.width,
            strokeOpacity: style.alpha > 0 ? style.alpha : 0.45,
            strokeDasharray: dashArr,
            perihelionKm: b.perihelionKm,
            aphelionKm: b.aphelionKm,
          }
        })

      staticEntriesRef.current = entries
    }

    function computeBodyPositions() {
      const { w: vw, h: vh } = viewportRef.current
      if (vw < 16 || vh < 16) return

      const pxD = pxPerKmDistanceRef.current
      if (!(pxD > 0)) return

      const entries = staticEntriesRef.current
      const simTime = simTimeSecRef.current
      const posByCanvasId = new Map<string, WorldPosKm>()

      for (const e of entries) {
        if (e.kind === "star") {
          posByCanvasId.set(e.canvasId, { xKm: 0, yKm: 0 })
        }
      }

      for (const e of entries) {
        if (e.kind === "star" || e.kind === "moon") continue
        const p = worldPosAtSimTime(e, posByCanvasId, simTime)
        if (p) posByCanvasId.set(e.canvasId, p)
      }

      for (const e of entries) {
        if (e.kind !== "moon") continue
        const p = worldPosAtSimTime(e, posByCanvasId, simTime)
        if (p) posByCanvasId.set(e.canvasId, p)
      }

      const followId = followBodyIdRef.current
      if (followId) {
        const target = posByCanvasId.get(followId)
        if (target && pxD > 0) {
          const targetPanX = -target.xKm * pxD
          const targetPanY = -target.yKm * pxD
          const nextPan = {
            x:
              panOffsetRef.current.x +
              (targetPanX - panOffsetRef.current.x) * FOLLOW_EASE,
            y:
              panOffsetRef.current.y +
              (targetPanY - panOffsetRef.current.y) * FOLLOW_EASE,
          }
          panOffsetRef.current = nextPan
          setPanOffset(nextPan)
        }
      }

      const polylines: OrbitPolylineLayout[] = []
      const items: BodyLayoutItem[] = []

      for (const e of entries) {
        if (e.kind === "star" || !e.orbitPath) continue

        const centerKm =
          e.parentCanvasId != null
            ? (posByCanvasId.get(e.parentCanvasId) ?? { xKm: 0, yKm: 0 })
            : { xKm: 0, yKm: 0 }

        const pl = polylineForOrbit(e, centerKm, worldToScreen, vw, vh)
        if (pl) {
          polylines.push({
            canvasId: e.canvasId,
            points: pl.points,
            hitPoints: pl.hitPoints,
            stroke: e.stroke,
            strokeWidth: e.strokeWidth,
            strokeOpacity: e.strokeOpacity,
            strokeDasharray: e.strokeDasharray,
          })
        }

        const world = posByCanvasId.get(e.canvasId)
        if (!world) continue
        const { sx, sy } = worldToScreen(world.xKm, world.yKm, vw, vh)
        items.push({
          canvasId: e.canvasId,
          name: e.name,
          src: e.src,
          cx: sx,
          cy: sy,
          drawDiameterPx: e.drawDiameterPx,
          isProxyDisk: e.isProxyDisk,
        })
      }

      items.sort((a, b) => a.drawDiameterPx - b.drawDiameterPx)

      let markers: ApsisMarkerLayout[] = []
      if (
        orbitModelRef.current === "kepler" &&
        selectedBodyIdRef.current
      ) {
        const sel = entries.find(
          (e) => e.canvasId === selectedBodyIdRef.current
        )
        if (sel && sel.kind !== "star") {
          const centerKm =
            sel.parentCanvasId != null
              ? (posByCanvasId.get(sel.parentCanvasId) ?? { xKm: 0, yKm: 0 })
              : { xKm: 0, yKm: 0 }
          const periLabel = sel.kind === "moon" ? "Periapsis" : "Perihelion"
          const apoLabel = sel.kind === "moon" ? "Apoapsis" : "Aphelion"

          const placeMarker = (distKm: number | null, label: string) => {
            if (distKm == null || !Number.isFinite(distKm) || distKm < 0) return
            const angle = label.includes("Peri") ? 0 : Math.PI
            const wx = centerKm.xKm + distKm * Math.cos(angle)
            const wy = centerKm.yKm + distKm * Math.sin(angle)
            const { sx, sy } = worldToScreen(wx, wy, vw, vh)
            markers.push({ cx: sx, cy: sy, label })
          }

          placeMarker(sel.perihelionKm, periLabel)
          placeMarker(sel.aphelionKm, apoLabel)
        }
      }

      setOrbitPolylines(polylines)
      setBodyItems(items)
      setApsisMarkers(markers)
    }

    computeStaticLayoutRef.current = computeStaticLayout
    computeBodyPositionsRef.current = computeBodyPositions

    const ro = new ResizeObserver(() => {
      computeStaticLayout()
      computeBodyPositions()
    })
    ro.observe(wrapper)
    const onWinResize = () => {
      computeStaticLayout()
      computeBodyPositions()
    }
    window.addEventListener("resize", onWinResize)
    computeStaticLayout()
    computeBodyPositions()

    return () => {
      computeStaticLayoutRef.current = null
      computeBodyPositionsRef.current = null
      ro.disconnect()
      window.removeEventListener("resize", onWinResize)
    }
  }, [model, json, worldToScreen])

  useLayoutEffect(() => {
    bodyDisplayFilterRef.current = bodyDisplayFilter
    pxPerKmSizeRef.current = pxPerKmSize
    pxPerKmDistanceRef.current = pxPerKmDistance
    orbitModelRef.current = orbitModel
    selectedBodyIdRef.current = selectedBodyId
    computeStaticLayoutRef.current?.()
    computeBodyPositionsRef.current?.()
  }, [
    bodyDisplayFilter,
    pxPerKmSize,
    pxPerKmDistance,
    orbitModel,
    selectedBodyId,
  ])

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      const last = lastFrameRef.current
      lastFrameRef.current = now
      if (last != null && !pausedRef.current) {
        const dt = Math.min(0.1, (now - last) / 1000)
        simTimeSecRef.current += dt * simSpeedRef.current
      }
      computeBodyPositionsRef.current?.()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const t = e.target
      if (t instanceof Element) {
        const el = t.closest("[data-body-id]")
        const id = el?.getAttribute("data-body-id")
        if (id && onBodySelect) {
          onBodySelect(id)
          return
        }
      }
      if (e.button !== 0) return
      clearFollow()
      panDragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panOffsetRef.current.x,
        startPanY: panOffsetRef.current.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [onBodySelect, clearFollow]
  )

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current
    if (!drag?.active) return
    setPanOffset({
      x: drag.startPanX + (e.clientX - drag.startX),
      y: drag.startPanY + (e.clientY - drag.startY),
    })
  }, [])

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (panDragRef.current) panDragRef.current.active = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }, [])

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      clearFollow()
      const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      setPanOffset((p) => ({
        x: p.x - e.deltaX * factor,
        y: p.y - e.deltaY * factor,
      }))
    },
    [clearFollow]
  )

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    wrapper.addEventListener("wheel", onWheel, { passive: false })
    return () => wrapper.removeEventListener("wheel", onWheel)
  }, [onWheel])

  const interactive = Boolean(onBodySelect)

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-x-0 top-(--app-header-h) z-1 h-[calc(100svh-var(--app-header-h))] overflow-hidden bg-[#020617] touch-none"
      aria-label="Top-down polar view of orbits around the Sun. Drag to pan; click a body, its label, or its orbit to select."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        {orbitPolylines.map((pl) => (
          <g key={`orbit-${pl.canvasId}`}>
            <polyline
              fill="none"
              points={pl.hitPoints}
              stroke="transparent"
              strokeWidth={Math.max(
                ORBIT_HIT_PAD_MIN_PX,
                pl.strokeWidth + 6
              )}
              strokeOpacity={0}
              className="cursor-pointer"
              data-body-id={pl.canvasId}
              style={{ pointerEvents: interactive ? "stroke" : "none" }}
            />
            <polyline
              fill="none"
              points={pl.points}
              stroke={pl.stroke}
              strokeWidth={pl.strokeWidth}
              strokeOpacity={pl.strokeOpacity}
              strokeDasharray={pl.strokeDasharray}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          </g>
        ))}
      </svg>

      {apsisMarkers.map((m, i) => (
        <span
          key={`apsis-${i}`}
          aria-hidden
          className="pointer-events-none absolute select-none whitespace-nowrap text-xs text-white"
          style={{
            left: m.cx,
            top: m.cy - 20,
            transform: "translateX(-50%)",
            WebkitTextStroke: "2px #000",
            paintOrder: "stroke fill",
            zIndex: 8,
          }}
        >
          {m.label}
        </span>
      ))}

      {bodyItems.map((item) => (
        <OrbitBodyDisk
          key={item.canvasId}
          item={item}
          interactive={interactive}
          selected={item.canvasId === selectedBodyId}
        />
      ))}
    </div>
  )
}
