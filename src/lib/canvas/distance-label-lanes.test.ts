import { describe, expect, it } from "vitest"

import {
  DISTANCE_LABEL_UNDERLINE_GAP_PX,
  resolveDistanceLabelLanes,
  type DistanceLaneInput,
} from "./distance-label-lanes"

function rect(
  left: number,
  top: number,
  right: number,
  bottom: number
): DistanceLaneInput["naturalRect"] {
  return { left, top, right, bottom }
}

describe("resolveDistanceLabelLanes", () => {
  it("keeps separated labels on lane 0 with leaders and underline gap", () => {
    const inputs: DistanceLaneInput[] = [
      {
        id: "a",
        cx: 100,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: rect(110, 193, 150, 207),
      },
      {
        id: "b",
        cx: 400,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: rect(410, 193, 450, 207),
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const a = m.get("a")
    const b = m.get("b")
    expect(a?.leader).not.toBeNull()
    expect(b?.leader).not.toBeNull()
    expect(a?.labelRect).toEqual(inputs[0]?.naturalRect)
    expect(b?.labelRect).toEqual(inputs[1]?.naturalRect)
    const aUnderlineY = a!.labelRect.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
    expect(a?.leader?.points).toEqual([
      { x: 105, y: 200 },
      { x: 105, y: aUnderlineY },
      { x: a!.labelRect.left, y: aUnderlineY },
      { x: a!.labelRect.right, y: aUnderlineY },
    ])
    const bUnderlineY = b!.labelRect.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
    expect(b?.leader?.points[b!.leader!.points.length - 1]?.y).toBe(
      bUnderlineY
    )
  })

  it("shifts the second overlapping label to a non-zero lane with a leader", () => {
    const shared = rect(110, 193, 160, 207)
    const inputs: DistanceLaneInput[] = [
      {
        id: "first",
        cx: 100,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: shared,
      },
      {
        id: "second",
        cx: 105,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: { ...shared },
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const first = m.get("first")
    expect(first?.leader).not.toBeNull()
    const firstUnderlineY =
      first!.labelRect.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
    expect(first?.leader?.points[first!.leader!.points.length - 1]?.y).toBe(
      firstUnderlineY
    )
    const second = m.get("second")
    expect(second?.leader).not.toBeNull()
    expect(second?.labelRect.top).not.toBe(shared.top)
    const secondUnderlineY =
      second!.labelRect.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
    expect(second?.leader?.points[second!.leader!.points.length - 1]?.y).toBe(
      secondUnderlineY
    )
  })

  it("does not move inside-disk labels and still avoids them when placing outside labels", () => {
    const inside: DistanceLaneInput = {
      id: "sun",
      cx: 50,
      cy: 200,
      diskRadiusPx: 80,
      isLabelInsideDisk: true,
      naturalRect: rect(30, 188, 70, 212),
    }
    const outside: DistanceLaneInput = {
      id: "near",
      cx: 120,
      cy: 200,
      diskRadiusPx: 4,
      isLabelInsideDisk: false,
      /** Would overlap inside rect if not shifted. */
      naturalRect: rect(60, 188, 100, 212),
    }
    const m = resolveDistanceLabelLanes([outside, inside], { padPx: 4 })
    expect(m.get("sun")?.labelRect).toEqual(inside.naturalRect)
    expect(m.get("sun")?.leader).toBeNull()
    expect(m.get("near")?.labelRect.top).not.toBe(outside.naturalRect.top)
  })

  it("falls back to natural rect when no lane clears within maxLaneAbs", () => {
    const base = rect(110, 193, 140, 207)
    const inputs: DistanceLaneInput[] = []
    for (let i = 0; i < 8; i++) {
      inputs.push({
        id: `x${i}`,
        cx: 100 + i * 0.01,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: { ...base },
      })
    }
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4, maxLaneAbs: 2 })
    const lastId = "x7"
    const last = m.get(lastId)
    expect(last?.labelRect).toEqual(base)
    expect(last?.leader).not.toBeNull()
    const underlineY = base.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
    expect(last?.leader?.points[last!.leader!.points.length - 1]?.y).toBe(
      underlineY
    )
  })

  it("fans out multiple stacked bodies into different lanes", () => {
    const h = 14
    const inputs: DistanceLaneInput[] = [100, 101, 102].map((cx, i) => ({
      id: `p${i}`,
      cx,
      cy: 200,
      diskRadiusPx: 4,
      isLabelInsideDisk: false,
      naturalRect: rect(cx + 8, 200 - h / 2, cx + 8 + 50, 200 + h / 2),
    }))
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const tops = inputs.map((inp) => m.get(inp.id)?.labelRect.top)
    const uniqueTops = new Set(tops)
    expect(uniqueTops.size).toBe(3)
  })

  it("honors preferredLane exactly without lane search", () => {
    const h = 14
    const natural = rect(110, 193, 150, 207)
    const inputs: DistanceLaneInput[] = [
      {
        id: "m",
        cx: 100,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: natural,
        preferredLane: -2,
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const laneStep = h + 4
    const placed = m.get("m")
    expect(placed?.labelRect.top).toBe(natural.top - 2 * laneStep)
    expect(placed?.leader?.points[0]).toEqual({ x: 105, y: 195 })
  })

  it("lockNaturalRect keeps rect at lane 0 and still emits a leader", () => {
    const natural = rect(40, 120, 90, 134)
    const inputs: DistanceLaneInput[] = [
      {
        id: "planet",
        cx: 100,
        cy: 200,
        diskRadiusPx: 24,
        isLabelInsideDisk: false,
        naturalRect: natural,
        lockNaturalRect: true,
        leaderAttachment: "top",
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const p = m.get("planet")
    expect(p?.labelRect).toEqual(natural)
    expect(p?.leader).not.toBeNull()
    const underlineY = natural.bottom + DISTANCE_LABEL_UNDERLINE_GAP_PX
    expect(p?.leader?.points[p!.leader!.points.length - 1]?.y).toBe(underlineY)
  })

  it("leaderAttachment top uses disk top center", () => {
    const inputs: DistanceLaneInput[] = [
      {
        id: "p",
        cx: 100,
        cy: 200,
        diskRadiusPx: 5,
        isLabelInsideDisk: false,
        naturalRect: rect(110, 193, 150, 207),
        lockNaturalRect: true,
        leaderAttachment: "top",
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const points = m.get("p")?.leader?.points
    expect(points?.[0]).toEqual({ x: 100, y: 195 })
  })

  it("leaderAttachment left-elbow draws horizontal then vertical to label bottom-right", () => {
    const natural = rect(40, 120, 90, 134)
    const inputs: DistanceLaneInput[] = [
      {
        id: "planet",
        cx: 150,
        cy: 200,
        diskRadiusPx: 6,
        isLabelInsideDisk: false,
        naturalRect: natural,
        lockNaturalRect: true,
        leaderAttachment: "left-elbow",
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const placed = m.get("planet")
    expect(placed?.labelRect).toEqual(natural)
    expect(placed?.leader?.points).toEqual([
      { x: 144, y: 200 },
      { x: 90, y: 200 },
      { x: 90, y: 134 },
    ])
  })

  it("isLabelInsideDisk keeps natural rect and suppresses leader", () => {
    const natural = rect(90, 190, 130, 206)
    const inputs: DistanceLaneInput[] = [
      {
        id: "inside",
        cx: 110,
        cy: 200,
        diskRadiusPx: 40,
        isLabelInsideDisk: true,
        naturalRect: natural,
      },
    ]
    const m = resolveDistanceLabelLanes(inputs, { padPx: 4 })
    const placed = m.get("inside")
    expect(placed?.labelRect).toEqual(natural)
    expect(placed?.leader).toBeNull()
  })
})
