import { describe, expect, it } from "vitest"

import {
  bodyDiameterRatio,
  diskCentersAlongTargetDiameter,
} from "./measure-body-math"

describe("measure-body-math", () => {
  it("bodyDiameterRatio divides diameters", () => {
    expect(bodyDiameterRatio(8000, 4000)).toBe(2)
  })

  it("diskCentersAlongTargetDiameter places one disk at center when ratio is 1", () => {
    const cx = 100
    const R = 40
    const Du = 80
    const centers = diskCentersAlongTargetDiameter(cx, R, Du, 1)
    expect(centers).toEqual([cx])
  })

  it("diskCentersAlongTargetDiameter tiles edge-to-edge for small integer ratios", () => {
    const cx = 50
    const R = 30
    const Du = 20
    const ratio = 3
    const centers = diskCentersAlongTargetDiameter(cx, R, Du, ratio)
    expect(centers.length).toBe(3)
    expect(centers[0]).toBeCloseTo(cx - R + Du / 2)
    expect(centers[1]).toBeCloseTo(centers[0]! + Du)
    expect(centers[2]).toBeCloseTo(centers[1]! + Du)
  })
})
