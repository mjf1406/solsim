import { describe, expect, it } from "vite-plus/test"

import {
  computeMoonPowerOfTwoSnapStops,
  nearestSnapStopIndex,
  sliderValueToPxPerKmMoonLadder,
  snapStopSliderValueForPinchFactor,
  stepSnapStopSliderValue,
} from "./scale-presets"

describe("scale snap stops for gesture zoom", () => {
  const stops = computeMoonPowerOfTwoSnapStops()

  it("nearestSnapStopIndex picks closest tick", () => {
    const mid = (stops[3]!.sliderValue + stops[4]!.sliderValue) / 2
    expect(nearestSnapStopIndex(mid, stops)).toBe(3)
  })

  it("stepSnapStopSliderValue moves one stop", () => {
    const start = stops[5]!.sliderValue
    expect(stepSnapStopSliderValue(start, stops, 1)).toBe(stops[6]!.sliderValue)
    expect(stepSnapStopSliderValue(start, stops, -1)).toBe(
      stops[4]!.sliderValue
    )
  })

  it("stepSnapStopSliderValue clamps at ends", () => {
    expect(stepSnapStopSliderValue(stops[0]!.sliderValue, stops, -1)).toBe(
      stops[0]!.sliderValue
    )
    const last = stops.length - 1
    expect(stepSnapStopSliderValue(stops[last]!.sliderValue, stops, 1)).toBe(
      stops[last]!.sliderValue
    )
  })

  it("snapStopSliderValueForPinchFactor stays on stops", () => {
    const start = stops[4]!.sliderValue
    const pxFn = sliderValueToPxPerKmMoonLadder
    const zoomedIn = snapStopSliderValueForPinchFactor(start, 2, stops, pxFn)
    const zoomedOut = snapStopSliderValueForPinchFactor(start, 0.5, stops, pxFn)
    const allValues = new Set(stops.map((s) => s.sliderValue))
    expect(allValues.has(zoomedIn)).toBe(true)
    expect(allValues.has(zoomedOut)).toBe(true)
    expect(zoomedIn).toBeGreaterThan(start)
    expect(zoomedOut).toBeLessThan(start)
  })

  it("snapStopSliderValueForPinchFactor returns start at factor 1", () => {
    const start = stops[3]!.sliderValue
    expect(
      snapStopSliderValueForPinchFactor(
        start,
        1,
        stops,
        sliderValueToPxPerKmMoonLadder
      )
    ).toBe(start)
  })
})
