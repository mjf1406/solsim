import {
  CANVAS_BODY_LABEL_AVOIDANCE_PAD,
  type CanvasBodyLabelRect,
  canvasLabelRectsOverlap,
  inflateCanvasLabelRect,
} from "./body-label"

/** Vertical gap between label baseline/glyphs and the underline segment (distance strip). */
export const DISTANCE_LABEL_UNDERLINE_GAP_PX = 5

export type DistanceLabelLeaderAttachment = "right" | "top" | "left-elbow"

export type DistanceLaneInput = {
  id: string
  cx: number
  cy: number
  diskRadiusPx: number
  isLabelInsideDisk: boolean
  /** Bounds from {@link bodyCircleLabelRect} before lane shifts. */
  naturalRect: CanvasBodyLabelRect
  /**
   * When true, keep {@link naturalRect} at lane 0 but still emit a leader
   * (unlike {@link isLabelInsideDisk}, which suppresses the leader).
   */
  lockNaturalRect?: boolean
  /** Use this lane index directly instead of searching for a non-overlapping lane. */
  preferredLane?: number
  /** Disk attachment point for the leader polyline; default `"right"`. */
  leaderAttachment?: DistanceLabelLeaderAttachment
}

/**
 * Leader geometry as a polyline in the same CSS coordinate space as
 * {@link DistanceLaneInput}. Renderers draw the points in order.
 */
export type DistanceLabelLeader = {
  points: Array<{ x: number; y: number }>
}

export type DistanceLanePlacement = {
  labelRect: CanvasBodyLabelRect
  leader: DistanceLabelLeader | null
}

export type ResolveDistanceLabelLanesOptions = {
  /** Inflated rect padding for overlap tests; default {@link CANVAS_BODY_LABEL_AVOIDANCE_PAD}. */
  padPx?: number
  /** Try lane indices 0, 1, -1, … up to this absolute value. Default 6. */
  maxLaneAbs?: number
}

function laneSequence(maxAbs: number): number[] {
  const seq: number[] = [0]
  for (let k = 1; k <= maxAbs; k++) {
    seq.push(k, -k)
  }
  return seq
}

function buildUnderlineLeaderPoints(
  fromX: number,
  fromY: number,
  rect: CanvasBodyLabelRect
): Array<{ x: number; y: number }> {
  const underlineY = rect.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
  const xl = rect.left
  const xr = rect.right
  const points: Array<{ x: number; y: number }> = [
    { x: fromX, y: fromY },
    { x: fromX, y: underlineY },
  ]
  if (fromX >= xr) {
    points.push({ x: xr, y: underlineY }, { x: xl, y: underlineY })
  } else {
    points.push({ x: xl, y: underlineY }, { x: xr, y: underlineY })
  }
  return points
}

function buildLeftElbowLeaderPoints(
  cx: number,
  cy: number,
  r: number,
  rect: CanvasBodyLabelRect
): Array<{ x: number; y: number }> {
  return [
    { x: cx - r, y: cy },
    { x: rect.right, y: cy },
    { x: rect.right, y: rect.bottom },
  ]
}

/**
 * Resolves vertical "lanes" for distance-strip labels that would overlap when
 * placed at their natural positions. Inside-disk labels are fixed and still
 * participate in overlap avoidance for outside labels.
 */
export function resolveDistanceLabelLanes(
  inputs: DistanceLaneInput[],
  opts?: ResolveDistanceLabelLanesOptions
): Map<string, DistanceLanePlacement> {
  const padPx = opts?.padPx ?? CANVAS_BODY_LABEL_AVOIDANCE_PAD
  const maxLaneAbs = opts?.maxLaneAbs ?? 6

  const sorted = [...inputs].sort((a, b) =>
    a.cx !== b.cx ? a.cx - b.cx : a.id.localeCompare(b.id)
  )

  const occupied: CanvasBodyLabelRect[] = []
  const result = new Map<string, DistanceLanePlacement>()

  for (const inp of sorted) {
    if (inp.isLabelInsideDisk) {
      result.set(inp.id, { labelRect: inp.naturalRect, leader: null })
      occupied.push(inflateCanvasLabelRect(inp.naturalRect, padPx))
      continue
    }

    const labelHeight = inp.naturalRect.bottom - inp.naturalRect.top
    const laneStepPx = labelHeight + 4
    const r = inp.diskRadiusPx
    const attachment: DistanceLabelLeaderAttachment =
      inp.leaderAttachment ?? "right"

    let chosenRect = inp.naturalRect
    let chosenLane = 0

    if (inp.lockNaturalRect === true) {
      chosenRect = inp.naturalRect
      chosenLane = 0
    } else if (inp.preferredLane != null) {
      chosenLane = inp.preferredLane
      const dy = chosenLane * laneStepPx
      chosenRect = {
        left: inp.naturalRect.left,
        top: inp.naturalRect.top + dy,
        right: inp.naturalRect.right,
        bottom: inp.naturalRect.bottom + dy,
      }
    } else {
      for (const lane of laneSequence(maxLaneAbs)) {
        const dy = lane * laneStepPx
        const rect: CanvasBodyLabelRect = {
          left: inp.naturalRect.left,
          top: inp.naturalRect.top + dy,
          right: inp.naturalRect.right,
          bottom: inp.naturalRect.bottom + dy,
        }
        const inflated = inflateCanvasLabelRect(rect, padPx)
        let clear = true
        for (const o of occupied) {
          if (canvasLabelRectsOverlap(inflated, o)) {
            clear = false
            break
          }
        }
        if (clear) {
          chosenRect = rect
          chosenLane = lane
          break
        }
      }
    }

    let points: Array<{ x: number; y: number }>
    if (attachment === "left-elbow") {
      points = buildLeftElbowLeaderPoints(inp.cx, inp.cy, r, chosenRect)
    } else {
      const fromX = attachment === "top" ? inp.cx : inp.cx + r
      const fromY =
        attachment === "top"
          ? inp.cy - r
          : chosenLane === 0
            ? inp.cy
            : chosenLane > 0
              ? inp.cy + r
              : inp.cy - r
      points = buildUnderlineLeaderPoints(fromX, fromY, chosenRect)
    }

    const leader: DistanceLabelLeader = { points }

    result.set(inp.id, { labelRect: chosenRect, leader })
    occupied.push(inflateCanvasLabelRect(chosenRect, padPx))
  }

  return result
}
