import { describe, expect, it } from "vitest"

import {
  clampDragOffsetForLeftAnchoredDisk,
  clampOversizedStarDragsIfAnchored,
  clampStarDiskDragsInViewport,
  leftSliverAnchorCenter,
  OVERSIZED_DISK_VISIBLE_ARC_PX,
} from "./oversized-left-sliver-anchor"

const inset = { top: 10, right: 10, bottom: 10, left: 20 }

describe("leftSliverAnchorCenter", () => {
  it("places the disk so the right limb meets insetLeft + visible arc", () => {
    const d = 2000
    const r = d / 2
    const h = 600
    const il = 20
    const arc = 100
    const { cx, cy } = leftSliverAnchorCenter(d, h, arc, il)
    expect(cx + r).toBeCloseTo(il + arc)
    expect(cy).toBe(h / 2)
  })

  it("defaults visible arc to OVERSIZED_DISK_VISIBLE_ARC_PX", () => {
    const d = 800
    const r = d / 2
    const { cx } = leftSliverAnchorCenter(d, 400)
    expect(cx + r).toBeCloseTo(OVERSIZED_DISK_VISIBLE_ARC_PX)
  })
})

describe("clampDragOffsetForLeftAnchoredDisk", () => {
  it("clamps a huge negative dx so the disk still intersects the padded viewport", () => {
    const d = 2000
    const r = d / 2
    const w = 800
    const h = 600
    const anchor = leftSliverAnchorCenter(d, h, 120, inset.left)
    const clamped = clampDragOffsetForLeftAnchoredDisk(
      anchor.cx,
      anchor.cy,
      d,
      -50_000,
      0,
      w,
      h,
      inset
    )
    const cx = anchor.cx + clamped.x
    expect(cx + r).toBeGreaterThanOrEqual(inset.left - 1e-9)
    expect(cx - r).toBeLessThanOrEqual(w - inset.right + 1e-9)
  })

  it("leaves zero drag unchanged at the anchor", () => {
    const d = 2000
    const w = 800
    const h = 600
    const anchor = leftSliverAnchorCenter(d, h, 120, inset.left)
    const clamped = clampDragOffsetForLeftAnchoredDisk(
      anchor.cx,
      anchor.cy,
      d,
      0,
      0,
      w,
      h,
      inset
    )
    expect(clamped.x).toBe(0)
    expect(clamped.y).toBe(0)
  })
})

describe("clampOversizedStarDragsIfAnchored", () => {
  it("writes clamped offsets back into the map", () => {
    const d = 5000
    const w = 400
    const h = 300
    const drag = new Map<string, { x: number; y: number }>([
      ["sun", { x: -9000, y: 0 }],
    ])
    clampOversizedStarDragsIfAnchored(
      [{ kind: "star", id: "sun", diameterPx: d }],
      w,
      h,
      inset,
      drag
    )
    const out = drag.get("sun")!
    expect(out.x).toBeGreaterThan(-9000)
    const anchor = leftSliverAnchorCenter(d, h, OVERSIZED_DISK_VISIBLE_ARC_PX, inset.left)
    const r = d / 2
    const cx = anchor.cx + out.x
    expect(cx + r).toBeGreaterThanOrEqual(inset.left - 1e-9)
  })

  it("does not touch drag for non-star entries", () => {
    const drag = new Map([["earth", { x: -999, y: 3 }]])
    clampOversizedStarDragsIfAnchored(
      [{ kind: "planet", id: "earth", diameterPx: 40 }],
      800,
      600,
      inset,
      drag
    )
    expect(drag.get("earth")).toEqual({ x: -999, y: 3 })
  })
})

describe("clampStarDiskDragsInViewport", () => {
  it("clamps huge positive dx against frozen center when not left-anchored", () => {
    const w = 800
    const h = 600
    const d = 300
    const r = d / 2
    const limit = Math.min(w, h) * 0.6
    expect(d).toBeLessThanOrEqual(limit)

    const drag = new Map([["sun", { x: 8000, y: 0 }]])
    const frozen = new Map([["sun", { cx: 400, cy: 300 }]])
    clampStarDiskDragsInViewport(
      [{ kind: "star", id: "sun", diameterPx: d }],
      w,
      h,
      inset,
      drag,
      frozen
    )
    const out = drag.get("sun")!
    expect(out.x).toBeLessThan(8000)
    const cx = 400 + out.x
    expect(cx + r).toBeGreaterThanOrEqual(inset.left - 1e-9)
    expect(cx - r).toBeLessThanOrEqual(w - inset.right + 1e-9)
  })

  it("still clamps anchored stars when frozen map is provided", () => {
    const d = 5000
    const w = 400
    const h = 300
    const drag = new Map([["sun", { x: -9000, y: 0 }]])
    const frozen = new Map([["sun", { cx: 999, cy: 999 }]])
    clampStarDiskDragsInViewport(
      [{ kind: "star", id: "sun", diameterPx: d }],
      w,
      h,
      inset,
      drag,
      frozen
    )
    const out = drag.get("sun")!
    expect(out.x).toBeGreaterThan(-9000)
    const anchor = leftSliverAnchorCenter(d, h, OVERSIZED_DISK_VISIBLE_ARC_PX, inset.left)
    const r = d / 2
    expect(anchor.cx + out.x + r).toBeGreaterThanOrEqual(inset.left - 1e-9)
  })
})
