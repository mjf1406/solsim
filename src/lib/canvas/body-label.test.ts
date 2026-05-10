import { describe, expect, it } from "vitest"

import {
  canvasLabelFitsInsideDiskHorizontalCount,
  canvasLabelFitsInsideDisk,
} from "./body-label"

describe("canvasLabelFitsInsideDiskHorizontalCount", () => {
  it("returns false when count is not positive", () => {
    expect(canvasLabelFitsInsideDiskHorizontalCount(10, 10, 100, 0)).toBe(
      false
    )
    expect(canvasLabelFitsInsideDiskHorizontalCount(10, 10, 100, -1)).toBe(
      false
    )
  })

  it("delegates to horizontally scaled width", () => {
    const w = 12
    const h = 8
    const r = 40
    expect(canvasLabelFitsInsideDiskHorizontalCount(w, h, r, 3)).toBe(
      canvasLabelFitsInsideDisk(w * 3, h, r)
    )
  })

  it("returns false when the disk is too small for three copies side-by-side", () => {
    const w = 10
    const h = 10
    const count = 3
    const hw = (w * count) / 2
    const hh = h / 2
    const needR = Math.sqrt((hw * hw + hh * hh) / 0.96)
    const rTooSmall = needR * 0.99
    expect(canvasLabelFitsInsideDiskHorizontalCount(w, h, rTooSmall, count)).toBe(
      false
    )
  })

  it("returns true when the disk comfortably fits three copies horizontally", () => {
    const w = 10
    const h = 10
    const count = 3
    const hw = (w * count) / 2
    const hh = h / 2
    const needR = Math.sqrt((hw * hw + hh * hh) / 0.96)
    const rComfortable = needR * 1.05
    expect(
      canvasLabelFitsInsideDiskHorizontalCount(w, h, rComfortable, count)
    ).toBe(true)
  })
})
