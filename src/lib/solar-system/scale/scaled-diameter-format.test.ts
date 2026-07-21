import { describe, expect, it } from "vite-plus/test"

import {
  formatScaledDiameter,
  spokenScaledDiameterSentence,
} from "./scaled-diameter-format"

describe("formatScaledDiameter (metric, no micrometers)", () => {
  it("never returns µm", () => {
    const valuesMm = [0.9, 0.5, 0.1234, 0.02, 0.009, 1, 12.34, 1234]
    for (const mm of valuesMm) {
      const f = formatScaledDiameter(mm, "metric")
      expect(f.unit).not.toBe("µm")
      expect(f.display).not.toContain("µm")
    }
  })

  it("uses up to 3 decimals for sub-mm mm values", () => {
    expect(formatScaledDiameter(0.5, "metric")).toMatchObject({
      unit: "mm",
      display: "0.5",
    })
    expect(formatScaledDiameter(0.1234, "metric")).toMatchObject({
      unit: "mm",
      display: "0.123",
    })
  })

  it('clamps values below 0.01 mm as "< 0.01 mm"', () => {
    expect(formatScaledDiameter(0.009, "metric")).toMatchObject({
      unit: "mm",
      display: "< 0.01",
    })
  })
})

describe("spokenScaledDiameterSentence (metric clamp)", () => {
  it("uses hundredth-of-a-millimeter phrasing below 0.01 mm", () => {
    expect(spokenScaledDiameterSentence(0.009, "metric")).toBe(
      "Less than one hundredth of a millimeter."
    )
  })
})
