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
  ASSUMED_LEFT_SIDEBAR_PX_CSS,
  ASSUMED_RIGHT_SIDEBAR_PX_CSS,
  DISTANCE_CANVAS_BASE_INSET_PX,
} from "@/hooks/use-distance-scale"
import {
  usePinchZoom,
  type PinchZoomCenter,
} from "@/hooks/use-pinch-zoom"
import { BODY_CLASS_STYLE } from "@/lib/constants"
import {
  DISTANCE_REGIONS,
  computeDistanceRegionStripLayout,
  type DistanceRegionStripLayout,
} from "@/lib/solar-system/distance-regions"
import { LIGHT_SPEED_KM_PER_S } from "@/lib/solar-system/distance/distance-units"
import {
  applyBodyTypePreset,
  filterSizeCanvasBodiesForDisplay,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { MAX_SAFE_DISTANCE_RENDER_PX } from "@/lib/solar-system/distance-render-limit"
import { sizeBodyKindToBodyClass } from "@/lib/solar-system/body-class"
import { cn } from "@/lib/utils"

import {
  collectDistanceBodies,
  type DistanceBody,
  type SolarSystemJson,
  type SizePageModel,
} from "../-data"
import { placeholderSrc } from "@/lib/solar-system/placeholders"

import { LightSpeedParticles } from "./light-speed-particles"
import { LightSpeedPhoton } from "./light-speed-photon"

/**
 * Distance strip (DOM):
 * - x position is proportional to distance from Sun (km) * pxPerKmDistance.
 * - disk diameter uses true scale; bodies smaller than 1 CSS px use a transparent proxy
 *   hit pad so labels attach and taps work; the left sidebar still uses true diameter × scale.
 * - All name labels are always shown.
 * - Wide content uses div/img instead of canvas to avoid browser canvas dimension limits.
 */

/** When true diameter is under 1 CSS px, layout uses this diameter for label anchor math. */
const PROXY_DISK_DIAMETER_PX = 1

/** Transparent hit pad (CSS px) for proxy disks — matches prior ~10px radius hit target. */
const PROXY_DISK_HIT_PAD_PX = 20

/** Left/right content inset: sidebar width + inner pad (stable — ignores live sidebar toggle). */
const INSET_LEFT_CSS =
  ASSUMED_LEFT_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX
const INSET_RIGHT_CSS =
  ASSUMED_RIGHT_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX

/**
 * Vertical gap between a planet/dwarf disk's top edge and the body label's
 * bottom edge. Fixed regardless of moon count; the leader uses an elbow shape
 * so an inflated stack of moon labels doesn't push the body name further up.
 */
const PLANET_LABEL_GAP_ABOVE_DISK_PX = 50

/** Minimum horizontal copies of the label that must fit inscribed before using inside-disk placement. */
const DISTANCE_INSIDE_LABEL_HORIZONTAL_COUNT = 3

/** Min vertical extent of the orbit-range band (px). */
const ORBIT_ZONE_MIN_HEIGHT_PX = 16

type OrbitOverlayLayout = {
  zoneLeft: number
  zoneTop: number
  zoneWidth: number
  zoneHeight: number
  svgLeft: number
  svgTop: number
  svgWidth: number
  svgHeight: number
  lineX1Local: number
  lineYLocal: number
  lineX2Local: number
  lineY2Local: number
  strokeDasharray: string | undefined
  stroke: string
  strokeWidth: number
  strokeOpacity: number
  peri: OrbitApsisMarkerLayout
  apo: OrbitApsisMarkerLayout
}

type OrbitApsisMarkerLayout = {
  cx: number
  cy: number
  src: string
  drawDiameterPx: number
  isProxyDisk: boolean
  label: string
  labelLeft: number
  labelTop: number
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
  zIndex = 5,
}: {
  canvasId: string
  labelRect: CanvasBodyLabelRect
  hitRect: CanvasBodyLabelRect
  name: string
  interactive: boolean
  zIndex?: number
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
        zIndex,
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

function DistanceLabelLeaderSvg({
  leader,
  zIndex = 1,
}: {
  leader: DistanceLabelLeader
  zIndex?: number
}) {
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
      className="pointer-events-none absolute overflow-visible"
      style={{ left, top, width, height, zIndex }}
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
  stackBase = 5,
}: {
  item: DistanceLayoutItem
  interactive: boolean
  selected: boolean
  /** Base z-index for this body's layers (orbit overlay keeps selected bodies above apsis markers). */
  stackBase?: number
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
    zIndex: stackBase + 20,
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
            zIndex: stackBase,
          }}
          aria-hidden
        />
        {item.leader ? (
          <DistanceLabelLeaderSvg leader={item.leader} zIndex={stackBase + 1} />
        ) : null}
        <LabelHitArea
          canvasId={item.canvasId}
          labelRect={item.labelRect}
          hitRect={item.labelHitRect}
          name={item.name}
          interactive={interactive}
          zIndex={stackBase + 5}
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
    zIndex: stackBase,
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
        <DistanceLabelLeaderSvg leader={item.leader} zIndex={stackBase + 1} />
      ) : null}
      <LabelHitArea
        canvasId={item.canvasId}
        labelRect={item.labelRect}
        hitRect={item.labelHitRect}
        name={item.name}
        interactive={interactive}
        zIndex={stackBase + 5}
      />
    </>
  )
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

function OrbitUnderlay({ overlay }: { overlay: OrbitOverlayLayout }) {
  const strokeOpacity =
    overlay.strokeOpacity > 0 ? overlay.strokeOpacity : 0.45
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute bg-[rgba(255,255,255,0.04)]"
        style={{
          left: overlay.zoneLeft,
          top: overlay.zoneTop,
          width: overlay.zoneWidth,
          height: overlay.zoneHeight,
          zIndex: 0,
        }}
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute overflow-visible"
        style={{
          left: overlay.svgLeft,
          top: overlay.svgTop,
          width: overlay.svgWidth,
          height: overlay.svgHeight,
          zIndex: 1,
        }}
        viewBox={`0 0 ${overlay.svgWidth} ${overlay.svgHeight}`}
      >
        <line
          x1={overlay.lineX1Local}
          y1={overlay.lineYLocal}
          x2={overlay.lineX2Local}
          y2={overlay.lineY2Local}
          stroke={overlay.stroke}
          strokeWidth={overlay.strokeWidth}
          strokeOpacity={strokeOpacity}
          strokeDasharray={overlay.strokeDasharray}
          strokeLinecap="round"
        />
      </svg>
    </>
  )
}

function OrbitApsisDiskDecor({
  marker,
  zDisk,
  zLabel,
}: {
  marker: OrbitApsisMarkerLayout
  zDisk: number
  zLabel: number
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const D = marker.drawDiameterPx
  const r = D / 2

  if (marker.isProxyDisk) {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full bg-white/15 ring-1 ring-white/25"
          style={{
            left: marker.cx - r,
            top: marker.cy - r,
            width: D,
            height: D,
            opacity: 0.75,
            zIndex: zDisk,
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none select-none whitespace-nowrap"
          style={{
            position: "absolute",
            left: marker.labelLeft,
            top: marker.labelTop,
            font: CANVAS_BODY_LABEL_FONT_LARGE,
            color: "#ffffff",
            WebkitTextStroke: "3px #000000",
            paintOrder: "stroke fill",
            lineHeight: 1,
            zIndex: zLabel,
          }}
        >
          {marker.label}
        </span>
      </>
    )
  }

  const diskStyle: CSSProperties = {
    position: "absolute",
    left: marker.cx - r,
    top: marker.cy - r,
    width: D,
    height: D,
    borderRadius: "50%",
    opacity: 0.75,
    pointerEvents: "none",
    zIndex: zDisk,
  }

  return (
    <>
      {!imgFailed ? (
        <img
          src={marker.src}
          alt=""
          draggable={false}
          decoding="async"
          className="pointer-events-none object-cover"
          style={diskStyle}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none"
          style={{
            ...diskStyle,
            backgroundColor: "rgba(128, 128, 128, 0.45)",
          }}
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none select-none whitespace-nowrap"
        style={{
          position: "absolute",
          left: marker.labelLeft,
          top: marker.labelTop,
          font: CANVAS_BODY_LABEL_FONT_LARGE,
          color: "#ffffff",
          WebkitTextStroke: "3px #000000",
          paintOrder: "stroke fill",
          lineHeight: 1,
          zIndex: zLabel,
        }}
      >
        {marker.label}
      </span>
    </>
  )
}

function OrbitApsisMarkers({ overlay }: { overlay: OrbitOverlayLayout }) {
  const zDisk = 6
  const zLabel = 7
  return (
    <>
      <OrbitApsisDiskDecor
        marker={overlay.peri}
        zDisk={zDisk}
        zLabel={zLabel}
      />
      <OrbitApsisDiskDecor marker={overlay.apo} zDisk={zDisk} zLabel={zLabel} />
    </>
  )
}

const REGION_STRIP_TICK_HALF_PX = 8

/** Vertical half-extent of invisible hit strips along the region baseline (comfortable tap target). */
const REGION_STRIP_LINE_HIT_HALF_PX = 14

/** Half-width of invisible hit pad centered on each end tick. */
const REGION_STRIP_TICK_HIT_HALF_PX = 6

function DistanceRegionStrip({
  layout,
  selected,
  interactive,
}: {
  layout: DistanceRegionStripLayout
  selected: boolean
  interactive: boolean
}) {
  const baseStyle = BODY_CLASS_STYLE[layout.region.strokeBodyClass]
  const dashArr =
    baseStyle.dash.length > 0 ? baseStyle.dash.join(" ") : undefined
  /** Region strips use higher idle opacity than generic orbit glyphs so they read on the dark canvas. */
  const strokeOpacityIdle = 0.82

  const stroke = selected ? "#38bdf8" : baseStyle.color
  const strokeWidth = selected
    ? Math.max(baseStyle.width, 1.25)
    : baseStyle.width
  const strokeOpacityUse = selected ? 0.95 : strokeOpacityIdle

  const rid = layout.region.canvasId
  const svgPad = 1
  const svgLeft = layout.xInner - svgPad
  const svgTop = layout.y - REGION_STRIP_TICK_HALF_PX
  const svgWidth = Math.max(1, layout.xOuter - layout.xInner + 2 * svgPad)
  const svgHeight = 2 * REGION_STRIP_TICK_HALF_PX
  const midLocal = layout.y - svgTop

  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute overflow-visible"
        style={{
          left: svgLeft,
          top: svgTop,
          width: svgWidth,
          height: svgHeight,
          zIndex: 3,
        }}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      >
        {layout.segments.map((seg, i) => {
          const x1 = seg.x1 - svgLeft
          const x2 = seg.x2 - svgLeft
          return (
            <line
              key={`${rid}-seg-${i}`}
              x1={x1}
              y1={midLocal}
              x2={x2}
              y2={midLocal}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacityUse}
              strokeDasharray={dashArr}
              strokeLinecap="round"
            />
          )
        })}
        <line
          x1={layout.xInner - svgLeft}
          y1={midLocal - REGION_STRIP_TICK_HALF_PX + 2}
          x2={layout.xInner - svgLeft}
          y2={midLocal + REGION_STRIP_TICK_HALF_PX - 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacityUse}
          strokeLinecap="round"
        />
        <line
          x1={layout.xOuter - svgLeft}
          y1={midLocal - REGION_STRIP_TICK_HALF_PX + 2}
          x2={layout.xOuter - svgLeft}
          y2={midLocal + REGION_STRIP_TICK_HALF_PX - 2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacityUse}
          strokeLinecap="round"
        />
      </svg>
      {interactive
        ? layout.segments.map((seg, i) => {
            const w = Math.max(1, seg.x2 - seg.x1)
            return (
              <div
                key={`${rid}-line-hit-${i}`}
                data-body-id={rid}
                aria-hidden
                className="absolute bg-transparent"
                style={{
                  left: seg.x1,
                  top: layout.y - REGION_STRIP_LINE_HIT_HALF_PX,
                  width: w,
                  height: 2 * REGION_STRIP_LINE_HIT_HALF_PX,
                  zIndex: 3,
                  cursor: "pointer",
                }}
              />
            )
          })
        : null}
      {interactive ? (
        <>
          <div
            data-body-id={rid}
            aria-hidden
            className="absolute bg-transparent"
            style={{
              left: layout.xInner - REGION_STRIP_TICK_HIT_HALF_PX,
              top: layout.y - REGION_STRIP_TICK_HALF_PX,
              width: 2 * REGION_STRIP_TICK_HIT_HALF_PX,
              height: 2 * REGION_STRIP_TICK_HALF_PX,
              zIndex: 3,
              cursor: "pointer",
            }}
          />
          <div
            data-body-id={rid}
            aria-hidden
            className="absolute bg-transparent"
            style={{
              left: layout.xOuter - REGION_STRIP_TICK_HIT_HALF_PX,
              top: layout.y - REGION_STRIP_TICK_HALF_PX,
              width: 2 * REGION_STRIP_TICK_HIT_HALF_PX,
              height: 2 * REGION_STRIP_TICK_HALF_PX,
              zIndex: 3,
              cursor: "pointer",
            }}
          />
        </>
      ) : null}
      {layout.labels.map((lb, i) => (
        <div
          key={`${rid}-lbl-${i}`}
          data-body-id={rid}
          className={cn(
            !interactive && "pointer-events-none",
            selected && "rounded-md ring-2 ring-sky-400/90 ring-offset-2 ring-offset-transparent"
          )}
          style={{
            position: "absolute",
            left: lb.left,
            top: lb.top,
            width: Math.max(44, lb.right - lb.left),
            height: Math.max(32, layout.labelHeight),
            zIndex: 4,
            pointerEvents: interactive ? "auto" : "none",
            cursor: interactive ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="select-none whitespace-nowrap"
            style={{
              font: CANVAS_BODY_LABEL_FONT_LARGE,
              color: selected ? "#7dd3fc" : "#ffffff",
              WebkitTextStroke: selected ? "3px #0c4a6e" : "3px #000000",
              paintOrder: "stroke fill",
              lineHeight: 1,
            }}
          >
            {layout.region.label}
          </span>
        </div>
      ))}
    </>
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
  orbitOn = false,
  onCenterKmFromSunChange,
  lightSpeedActive = false,
  lightSpeedMultiplier = 1,
  onLightSpeedReachedEnd,
  onPinchZoomStart,
  onPinchZoomTo,
  onPinchZoomEnd,
  onWheelZoomStep,
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
  /** Show perihelion/aphelion range overlay for the selected body. */
  orbitOn?: boolean
  /** Kilometers from the Sun at horizontal viewport center (scroll + distance scale). */
  onCenterKmFromSunChange?: (km: number | null) => void
  /** Auto-scroll strip at scaled light speed; disables user scroll / taps on bodies. */
  lightSpeedActive?: boolean
  lightSpeedMultiplier?: number
  /** Called once when scroll reaches the right edge while light speed is active. */
  onLightSpeedReachedEnd?: () => void
  onPinchZoomStart?: () => void
  onPinchZoomTo?: (factor: number) => void
  onPinchZoomEnd?: () => void
  onWheelZoomStep?: (direction: 1 | -1) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const zoomAnchorRef = useRef<{
    anchorKm: number
    centerOffsetX: number
  } | null>(null)
  const clearZoomAnchorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const photonWorldXRef = useRef<number | null>(null)
  const syncLayoutRef = useRef<(() => void) | null>(null)
  const posByIdForScrollRef = useRef<Map<string, { cx: number; cy: number }>>(
    new Map()
  )
  const viewportWForScrollRef = useRef(0)

  const [contentWidthPx, setContentWidthPx] = useState(0)
  const [layoutItems, setLayoutItems] = useState<DistanceLayoutItem[]>([])
  const [orbitOverlay, setOrbitOverlay] = useState<OrbitOverlayLayout | null>(
    null
  )
  const [regionOverlays, setRegionOverlays] = useState<
    DistanceRegionStripLayout[]
  >([])

  const bodyDisplayFilterRef = useRef(bodyDisplayFilter)
  const pxPerKmSizeRef = useRef(pxPerKmSize)
  const pxPerKmDistanceRef = useRef(pxPerKmDistance)
  const orbitOnRef = useRef(orbitOn)
  const selectedBodyIdRef = useRef(selectedBodyId)
  const onCenterKmFromSunChangeRef = useRef(onCenterKmFromSunChange)
  const lightSpeedActiveRef = useRef(lightSpeedActive)
  const lightSpeedMultiplierRef = useRef(lightSpeedMultiplier)
  const onLightSpeedReachedEndRef = useRef(onLightSpeedReachedEnd)
  const contentWidthPxRef = useRef(contentWidthPx)
  const onPinchZoomStartRef = useRef(onPinchZoomStart)
  const onPinchZoomToRef = useRef(onPinchZoomTo)
  const onPinchZoomEndRef = useRef(onPinchZoomEnd)
  const onWheelZoomStepRef = useRef(onWheelZoomStep)

  const setZoomAnchorFromCenter = useCallback((center: PinchZoomCenter) => {
    const w = wrapperRef.current
    const pxD = pxPerKmDistanceRef.current
    if (w && pxD > 0) {
      zoomAnchorRef.current = {
        anchorKm: Math.max(
          0,
          (w.scrollLeft + center.offsetX - INSET_LEFT_CSS) / pxD
        ),
        centerOffsetX: center.offsetX,
      }
    }
  }, [])

  useLayoutEffect(() => {
    onPinchZoomStartRef.current = onPinchZoomStart
    onPinchZoomToRef.current = onPinchZoomTo
    onPinchZoomEndRef.current = onPinchZoomEnd
    onWheelZoomStepRef.current = onWheelZoomStep
  }, [onPinchZoomStart, onPinchZoomTo, onPinchZoomEnd, onWheelZoomStep])

  usePinchZoom(wrapperRef, {
    enabled: Boolean(onPinchZoomTo) && !lightSpeedActive,
    wheelZoomShiftKey: true,
    wheelZoomCtrlKey: true,
    onGestureStart: (center: PinchZoomCenter) => {
      setZoomAnchorFromCenter(center)
      onPinchZoomStartRef.current?.()
    },
    onZoomTo: (factor, center) => {
      if (zoomAnchorRef.current) {
        zoomAnchorRef.current.centerOffsetX = center.offsetX
      }
      onPinchZoomToRef.current?.(factor)
    },
    onGestureEnd: () => {
      if (clearZoomAnchorTimerRef.current != null) {
        clearTimeout(clearZoomAnchorTimerRef.current)
      }
      clearZoomAnchorTimerRef.current = setTimeout(() => {
        zoomAnchorRef.current = null
        clearZoomAnchorTimerRef.current = null
      }, 200)
      onPinchZoomEndRef.current?.()
    },
    onWheelZoomStep: (direction, center) => {
      setZoomAnchorFromCenter(center)
      onWheelZoomStepRef.current?.(direction)
    },
  })

  useLayoutEffect(() => {
    onCenterKmFromSunChangeRef.current = onCenterKmFromSunChange
  })

  useLayoutEffect(() => {
    lightSpeedActiveRef.current = lightSpeedActive
  }, [lightSpeedActive])

  useLayoutEffect(() => {
    lightSpeedMultiplierRef.current = lightSpeedMultiplier
  }, [lightSpeedMultiplier])

  useLayoutEffect(() => {
    contentWidthPxRef.current = contentWidthPx
  }, [contentWidthPx])

  useLayoutEffect(() => {
    onLightSpeedReachedEndRef.current = onLightSpeedReachedEnd
  })

  const onContentPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!e.isPrimary) return
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
      if (lightSpeedActiveRef.current) {
        e.preventDefault()
        return
      }
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

    function emitCenterKmFromSun() {
      const cb = onCenterKmFromSunChangeRef.current
      if (!cb) return
      const w = wrapperRef.current
      if (!w) {
        cb(null)
        return
      }
      const vw = w.clientWidth ?? 0
      const hCss = w.clientHeight ?? 0
      if (vw < 16 || hCss < 16) {
        cb(null)
        return
      }
      const pxD = pxPerKmDistanceRef.current
      if (!(pxD > 0)) {
        cb(null)
        return
      }
      const km = Math.max(
        0,
        (w.scrollLeft + vw / 2 - INSET_LEFT_CSS) / pxD
      )
      cb(km)
    }

    function syncLayout() {
      try {
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
        if (
          !Number.isFinite(pos.cx) ||
          pos.cx > MAX_SAFE_DISTANCE_RENDER_PX
        ) {
          continue
        }

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

      let orbitOverlayNext: OrbitOverlayLayout | null = null
      const pxD = pxPerKmDistanceRef.current
      if (
        orbitOnRef.current &&
        selectedBodyIdRef.current &&
        pxD > 0
      ) {
        const selId = selectedBodyIdRef.current
        const bodyForOrbit = bodiesAll.find((b) => b.canvasId === selId)
        const selPosForOrbit = posById.get(selId)
        const selPastRenderLimit =
          selPosForOrbit != null &&
          Number.isFinite(selPosForOrbit.cx) &&
          selPosForOrbit.cx > MAX_SAFE_DISTANCE_RENDER_PX
        if (
          bodyForOrbit &&
          bodyForOrbit.kind !== "star" &&
          !selPastRenderLimit
        ) {
          const periKm = bodyForOrbit.perihelionKm
          const apKm = bodyForOrbit.aphelionKm
          if (
            periKm != null &&
            apKm != null &&
            Number.isFinite(periKm) &&
            Number.isFinite(apKm) &&
            periKm >= 0 &&
            apKm >= 0
          ) {
            let parentX: number | null = null
            if (
              bodyForOrbit.kind === "moon" &&
              bodyForOrbit.parentPlanetId
            ) {
              const parentBody = bodiesAll.find(
                (p) =>
                  (p.kind === "planet" || p.kind === "dwarf") &&
                  p.row.id === bodyForOrbit.parentPlanetId
              )
              if (
                parentBody &&
                Number.isFinite(parentBody.distanceFromSunKm)
              ) {
                parentX =
                  INSET_LEFT_CSS + parentBody.distanceFromSunKm * pxD
              }
            } else {
              parentX = INSET_LEFT_CSS
            }

            if (parentX != null) {
              const periX = parentX + periKm * pxD
              const apoX = parentX + apKm * pxD
              if (
                Math.max(periX, apoX) > MAX_SAFE_DISTANCE_RENDER_PX
              ) {
                /* Orbit markers would exceed browser layout limits */
              } else {
              const entry = entries.find((e) => e.canvasId === selId)
              if (entry) {
                const D = entry.drawDiameterPx
                const r = D / 2
                const cy = midY
                const minCx = Math.min(periX, apoX)
                const maxCx = Math.max(periX, apoX)
                const zoneHeight = Math.max(D, ORBIT_ZONE_MIN_HEIGHT_PX)
                const zoneTop = midY - zoneHeight / 2
                const zoneLeft = minCx - r
                const zoneWidth = Math.max(D, maxCx - minCx + D)

                const orbitKindClass = sizeBodyKindToBodyClass(
                  bodyForOrbit.kind
                )
                const orbitStyle = BODY_CLASS_STYLE[orbitKindClass]
                const dashArr =
                  orbitStyle.dash.length > 0
                    ? orbitStyle.dash.join(" ")
                    : undefined

                const periLabel =
                  bodyForOrbit.kind === "moon" ? "Periapsis" : "Perihelion"
                const apoLabel =
                  bodyForOrbit.kind === "moon" ? "Apoapsis" : "Aphelion"

                const { w: periLw, h: periLh } = measureCanvasLabelBox(
                  ctx,
                  periLabel,
                  CANVAS_BODY_LABEL_FONT_LARGE
                )
                const { w: apoLw } = measureCanvasLabelBox(
                  ctx,
                  apoLabel,
                  CANVAS_BODY_LABEL_FONT_LARGE
                )

                const labelGap = 6
                const proxyLabelGap = 8
                let periLabelLeft: number
                let periLabelTop: number
                let apoLabelLeft: number
                let apoLabelTop: number

                if (entry.isProxyDisk) {
                  periLabelLeft = periX - periLw / 2
                  periLabelTop = cy - proxyLabelGap - periLh
                  apoLabelLeft = apoX - apoLw / 2
                  apoLabelTop = cy + proxyLabelGap
                } else {
                  periLabelLeft = periX - periLw / 2
                  periLabelTop = cy - r - labelGap - periLh
                  apoLabelLeft = apoX - apoLw / 2
                  apoLabelTop = cy + r + labelGap
                }

                const lineY = midY
                const linePad = 4
                const svgLeft = minCx - linePad
                const svgTop = lineY - linePad
                const svgWidth = Math.max(1, maxCx - minCx + 2 * linePad)
                const svgHeight = 2 * linePad

                const strokeOpacityRaw = orbitStyle.alpha
                const strokeOpacity =
                  strokeOpacityRaw > 0 ? strokeOpacityRaw : 0.45

                orbitOverlayNext = {
                  zoneLeft,
                  zoneTop,
                  zoneWidth,
                  zoneHeight,
                  svgLeft,
                  svgTop,
                  svgWidth,
                  svgHeight,
                  lineX1Local: minCx - svgLeft,
                  lineYLocal: lineY - svgTop,
                  lineX2Local: maxCx - svgLeft,
                  lineY2Local: lineY - svgTop,
                  strokeDasharray: dashArr,
                  stroke: orbitStyle.color,
                  strokeWidth: orbitStyle.width,
                  strokeOpacity,
                  peri: {
                    cx: periX,
                    cy,
                    src: entry.src,
                    drawDiameterPx: D,
                    isProxyDisk: entry.isProxyDisk,
                    label: periLabel,
                    labelLeft: periLabelLeft,
                    labelTop: periLabelTop,
                  },
                  apo: {
                    cx: apoX,
                    cy,
                    src: entry.src,
                    drawDiameterPx: D,
                    isProxyDisk: entry.isProxyDisk,
                    label: apoLabel,
                    labelLeft: apoLabelLeft,
                    labelTop: apoLabelTop,
                  },
                }

                rightExtent = Math.max(
                  rightExtent,
                  zoneLeft + zoneWidth,
                  periLabelLeft + periLw,
                  apoLabelLeft + apoLw,
                  maxCx + r
                )
              }
              }
            }
          }
        }
      }

      const regionOverlaysNext: DistanceRegionStripLayout[] = []
      if (pxD > 0) {
        for (const region of DISTANCE_REGIONS) {
          const regionMeasure = measureCanvasLabelBox(
            ctx,
            region.label,
            CANVAS_BODY_LABEL_FONT_LARGE
          )
          const layout = computeDistanceRegionStripLayout({
            region,
            insetLeftPx: INSET_LEFT_CSS,
            pxPerKmDistance: pxD,
            midY,
            labelMeasure: regionMeasure,
            maxRenderPx: MAX_SAFE_DISTANCE_RENDER_PX,
          })
          if (!layout) continue
          regionOverlaysNext.push(layout)
          rightExtent = Math.max(rightExtent, layout.xOuter)
          for (const lb of layout.labels) {
            rightExtent = Math.max(rightExtent, lb.right)
          }
        }
      }

      const widthPx = Math.min(
        MAX_SAFE_DISTANCE_RENDER_PX + INSET_RIGHT_CSS,
        Math.max(viewportW, rightExtent + INSET_RIGHT_CSS)
      )

      const scrollPosById = new Map<string, { cx: number; cy: number }>()
      for (const it of resolvedItems) {
        scrollPosById.set(it.canvasId, { cx: it.cx, cy: it.cy })
      }
      for (const ro of regionOverlaysNext) {
        scrollPosById.set(ro.region.canvasId, {
          cx: (ro.xInner + ro.xOuter) / 2,
          cy: ro.y,
        })
      }
      posByIdForScrollRef.current = scrollPosById
      viewportWForScrollRef.current = viewportW
      setContentWidthPx(widthPx)
      setLayoutItems(resolvedItems)
      setOrbitOverlay(orbitOverlayNext)
      setRegionOverlays(regionOverlaysNext)
      } finally {
        emitCenterKmFromSun()
      }
    }

    syncLayoutRef.current = syncLayout

    const resizeObserver = new ResizeObserver(() => {
      syncLayout()
    })
    resizeObserver.observe(wrapper)
    const onWinResize = () => {
      syncLayout()
    }
    const onScroll = () => {
      emitCenterKmFromSun()
    }
    window.addEventListener("resize", onWinResize)
    wrapper.addEventListener("scroll", onScroll, { passive: true })

    syncLayout()

    return () => {
      syncLayoutRef.current = null
      resizeObserver.disconnect()
      window.removeEventListener("resize", onWinResize)
      wrapper.removeEventListener("scroll", onScroll)
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

    const anchor = zoomAnchorRef.current
    const w = wrapperRef.current
    if (anchor && w && pxPerKmDistance > 0) {
      const maxScroll = Math.max(0, w.scrollWidth - w.clientWidth)
      const nextScroll = Math.min(
        maxScroll,
        Math.max(
          0,
          anchor.anchorKm * pxPerKmDistance +
            INSET_LEFT_CSS -
            anchor.centerOffsetX
        )
      )
      w.scrollLeft = nextScroll
    }
  }, [pxPerKmDistance])

  useLayoutEffect(() => {
    orbitOnRef.current = orbitOn
    syncLayoutRef.current?.()
  }, [orbitOn])

  useLayoutEffect(() => {
    selectedBodyIdRef.current = selectedBodyId
    syncLayoutRef.current?.()
  }, [selectedBodyId])

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

  /** Auto-scroll at scaled c while light-speed visualizer is on. */
  useLayoutEffect(() => {
    if (!lightSpeedActive) return
    const wrapper = wrapperRef.current
    if (!wrapper) return

    photonWorldXRef.current = wrapper.scrollLeft + wrapper.clientWidth / 2

    let raf = 0
    let last = performance.now()
    let ended = false

    const tick = (now: number) => {
      if (ended) return
      const w = wrapperRef.current
      if (!w || !lightSpeedActiveRef.current) return

      const dt = Math.min(0.08, Math.max(0, (now - last) / 1000))
      last = now

      const pxD = pxPerKmDistanceRef.current
      const mult = lightSpeedMultiplierRef.current
      const pxPerSec = LIGHT_SPEED_KM_PER_S * pxD * mult

      const vw = w.clientWidth
      const stripWidth =
        contentWidthPxRef.current > 0
          ? contentWidthPxRef.current
          : w.scrollWidth
      const maxScroll = Math.max(0, stripWidth - vw)
      const endX = Math.max(0, stripWidth - INSET_RIGHT_CSS)
      let x = photonWorldXRef.current ?? w.scrollLeft + vw / 2
      x += pxPerSec * dt

      if (x >= endX) {
        photonWorldXRef.current = endX
        w.scrollLeft = maxScroll
        ended = true
        onLightSpeedReachedEndRef.current?.()
        return
      }

      photonWorldXRef.current = x

      const followAnchorScreenX = vw / 2
      const desiredScrollLeft = Math.min(
        maxScroll,
        Math.max(0, x - followAnchorScreenX)
      )
      if (desiredScrollLeft > w.scrollLeft) w.scrollLeft = desiredScrollLeft
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      ended = true
      photonWorldXRef.current = null
      cancelAnimationFrame(raf)
    }
  }, [lightSpeedActive])

  const interactive = Boolean(onBodySelect) && !lightSpeedActive

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "fixed inset-x-0 top-(--app-header-h) z-1 h-[calc(100svh-var(--app-header-h))] overflow-x-auto overflow-y-hidden bg-[#020617]",
        lightSpeedActive && "touch-none"
      )}
      style={lightSpeedActive ? { touchAction: "none" } : undefined}
      aria-label={
        lightSpeedActive
          ? "Light speed visualizer: auto-scrolling at scaled light speed."
          : "Scaled distances: scroll horizontally to reach distant bodies; pinch with two fingers, Shift+wheel, or trackpad pinch to zoom scale; tap or click a disk or its name label to select."
      }
    >
      <div
        className={cn(
          "relative h-full min-h-full",
          interactive && "touch-none select-none",
          lightSpeedActive && "pointer-events-none"
        )}
        style={{
          width:
            contentWidthPx > 0 ? `${contentWidthPx}px` : "100%",
          minWidth: "100%",
        }}
        onPointerDown={interactive ? onContentPointerDown : undefined}
        role="presentation"
      >
        {orbitOverlay ? <OrbitUnderlay overlay={orbitOverlay} /> : null}
        {regionOverlays.map((layout) => (
          <DistanceRegionStrip
            key={layout.region.canvasId}
            layout={layout}
            selected={selectedBodyId === layout.region.canvasId}
            interactive={interactive}
          />
        ))}
        {layoutItems.map((item) => (
          <DistanceBodyLayers
            key={item.canvasId}
            item={item}
            interactive={interactive}
            selected={item.canvasId === selectedBodyId}
            stackBase={
              orbitOverlay && item.canvasId === selectedBodyId ? 10 : 5
            }
          />
        ))}
        {orbitOverlay ? <OrbitApsisMarkers overlay={orbitOverlay} /> : null}
        <LightSpeedPhoton
          wrapperRef={wrapperRef}
          worldXRef={photonWorldXRef}
          active={lightSpeedActive}
        />
      </div>
      <LightSpeedParticles
        wrapperRef={wrapperRef}
        active={lightSpeedActive}
        multiplier={lightSpeedMultiplier}
      />
    </div>
  )
}
