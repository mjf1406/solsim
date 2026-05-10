import type { BodyClass } from "@/lib/constants"
import { KM_PER_AU } from "@/lib/solar-system/distance/distance-units"

export type DistanceRegion = {
  canvasId: string
  label: string
  innerAu: number
  outerAu: number
  innerKm: number
  outerKm: number
  labelIntervalPx: number
  description: string
  iconSrc: string
  iconKeepColors: boolean
  /** Stroke style for the strip line/ticks — matches {@link BODY_CLASS_STYLE}. */
  strokeBodyClass: BodyClass
}

export const DISTANCE_REGION_BELOW_ECLIPTIC_PX = 75

const COMET_PLACEHOLDER = "/assets/placeholders/comet.svg"
const ASTEROID_PLACEHOLDER = "/assets/placeholders/asteroid.svg"

export const ASTEROID_BELT_REGION: DistanceRegion = {
  canvasId: "meta:asteroid-belt",
  label: "Asteroid Belt",
  innerAu: 2.06,
  outerAu: 3.27,
  innerKm: 2.06 * KM_PER_AU,
  outerKm: 3.27 * KM_PER_AU,
  labelIntervalPx: 5000,
  description:
    "Region between Mars and Jupiter where most asteroids orbit the Sun.",
  iconSrc: ASTEROID_PLACEHOLDER,
  iconKeepColors: true,
  strokeBodyClass: "asteroid",
}

export const KUIPER_BELT_REGION: DistanceRegion = {
  canvasId: "meta:kuiper-belt",
  label: "Kuiper Belt",
  innerAu: 30,
  outerAu: 50,
  innerKm: 30 * KM_PER_AU,
  outerKm: 50 * KM_PER_AU,
  labelIntervalPx: 5000,
  description:
    "Ring of icy bodies beyond Neptune’s orbit; short-period comets often originate here.",
  iconSrc: COMET_PLACEHOLDER,
  iconKeepColors: false,
  strokeBodyClass: "comet",
}

export const OORT_CLOUD_REGION: DistanceRegion = {
  canvasId: "meta:oort-cloud",
  label: "Oort Cloud",
  innerAu: 2000,
  outerAu: 200_000,
  innerKm: 2000 * KM_PER_AU,
  outerKm: 200_000 * KM_PER_AU,
  labelIntervalPx: 25_000,
  description:
    "Vast spherical shell of icy bodies far from the Sun; long-period comets are thought to come from here.",
  iconSrc: COMET_PLACEHOLDER,
  iconKeepColors: false,
  strokeBodyClass: "comet",
}

export const DISTANCE_REGIONS: readonly DistanceRegion[] = [
  ASTEROID_BELT_REGION,
  KUIPER_BELT_REGION,
  OORT_CLOUD_REGION,
]

const REGION_BY_ID = new Map(
  DISTANCE_REGIONS.map((r) => [r.canvasId, r] as const)
)

export function isDistanceRegionCanvasId(id: string | null | undefined): boolean {
  return id != null && REGION_BY_ID.has(id)
}

export function findDistanceRegionByCanvasId(
  id: string | null | undefined
): DistanceRegion | null {
  if (id == null) return null
  return REGION_BY_ID.get(id) ?? null
}

/** Back-compat alias for URLs / older references. */
export const ASTEROID_BELT_CANVAS_ID = ASTEROID_BELT_REGION.canvasId

export type DistanceRegionLabelLayout = {
  cx: number
  left: number
  top: number
  right: number
}

export type DistanceRegionStripLayout = {
  region: DistanceRegion
  xInner: number
  xOuter: number
  y: number
  labelHeight: number
  labels: DistanceRegionLabelLayout[]
  segments: Array<{ x1: number; x2: number }>
}

const MIN_REGION_SPAN_PX = 6
const LABEL_EDGE_GAP_PX = 4

/**
 * Layout for a distance region strip on `/distance`: ticks at inner/outer AU,
 * horizontal segments with gaps for labels at {@link DistanceRegion.labelIntervalPx}.
 */
export function computeDistanceRegionStripLayout(opts: {
  region: DistanceRegion
  insetLeftPx: number
  pxPerKmDistance: number
  midY: number
  labelMeasure: { w: number; h: number }
  maxRenderPx: number
}): DistanceRegionStripLayout | null {
  const { region, insetLeftPx, pxPerKmDistance, midY, labelMeasure, maxRenderPx } =
    opts
  if (!(pxPerKmDistance > 0)) return null

  const xInnerRaw = insetLeftPx + region.innerKm * pxPerKmDistance
  const xOuterRaw = insetLeftPx + region.outerKm * pxPerKmDistance

  if (!Number.isFinite(xInnerRaw) || xInnerRaw > maxRenderPx) return null

  const xInner = xInnerRaw
  const xOuter = Math.min(xOuterRaw, maxRenderPx)

  const span = xOuter - xInner
  if (!Number.isFinite(span) || span < MIN_REGION_SPAN_PX) return null

  const y = midY + DISTANCE_REGION_BELOW_ECLIPTIC_PX
  const interval = region.labelIntervalPx

  const { w: lw, h: lh } = labelMeasure
  const innerPad = LABEL_EDGE_GAP_PX
  const minCenter = xInner + innerPad + lw / 2
  const maxCenter = xOuter - innerPad - lw / 2

  const labels: DistanceRegionLabelLayout[] = []
  if (maxCenter >= minCenter) {
    let cx = xInner + interval / 2
    const step = interval
    while (cx <= maxCenter + 0.5) {
      if (cx >= minCenter - 0.5) {
        const left = cx - lw / 2
        const right = cx + lw / 2
        if (left >= xInner + innerPad && right <= xOuter - innerPad) {
          labels.push({
            cx,
            left,
            top: y - lh / 2,
            right,
          })
        }
      }
      cx += step
    }
  }

  const segments: Array<{ x1: number; x2: number }> = []
  const gap = LABEL_EDGE_GAP_PX

  if (labels.length === 0) {
    segments.push({ x1: xInner, x2: xOuter })
  } else {
    let cursor = xInner
    for (const lb of labels) {
      const segEnd = lb.left - gap
      if (segEnd > cursor + 0.5) {
        segments.push({ x1: cursor, x2: segEnd })
      }
      cursor = lb.right + gap
    }
    if (xOuter > cursor + 0.5) {
      segments.push({ x1: cursor, x2: xOuter })
    }
  }

  return {
    region,
    xInner,
    xOuter,
    y,
    labelHeight: lh,
    labels,
    segments,
  }
}

/** Title fragment for inner/outer AU in sidebar (e.g. "~30 AU" or "~2.06 AU"). */
export function formatDistanceRegionAuTitle(au: number): string {
  if (Number.isInteger(au)) {
    return `~${au.toLocaleString("en-US")} AU`
  }
  return `~${au.toLocaleString("en-US", { maximumFractionDigits: 4 })} AU`
}
