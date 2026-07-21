import { describe, expect, it } from "vite-plus/test"

import {
  applyBodyTypePreset,
  classifyBodyTypePreset,
  defaultSizeBodyDisplayFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import {
  CSS_PX_PER_MM,
  computeSliderRange,
  pxPerKmForMoonOnePx,
  sliderValueToPxPerKm,
  sliderValueToPxPerKmMoonLadder,
} from "@/lib/solar-system/scale/scale-presets"

import {
  clampZoomPxPerKmForCalibration,
  finalizeNavigateSearch,
  moonLadderPxPerKmBounds,
  parseSizeRouteSearch,
  pxPerKmToSliderForCalibration,
  serializeSizePageSearch,
  sizeSearchToBodyDisplayFilter,
  sliderToPxPerKmForCalibration,
  zoomDiffSignificant,
} from "./-url-search"

function filtersEqual(
  a: SizeBodyDisplayFilter,
  b: SizeBodyDisplayFilter
): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

describe("parseSizeRouteSearch", () => {
  it("defaults labels and filter when empty", () => {
    const s = parseSizeRouteSearch({})
    expect(s.labels).toBe("on")
    expect(
      filtersEqual(
        sizeSearchToBodyDisplayFilter(s),
        applyBodyTypePreset("planets")
      )
    ).toBe(true)
  })

  it("reads preset and ignores k/moon", () => {
    const s = parseSizeRouteSearch({
      preset: "auto",
      k: "hhhhhhh",
      moon: "planetsOnly",
    })
    expect(s.preset).toBe("auto")
    expect(s.k).toBeUndefined()
    expect(
      filtersEqual(
        sizeSearchToBodyDisplayFilter(s),
        applyBodyTypePreset("auto")
      )
    ).toBe(true)
  })

  it("drops invalid k", () => {
    const s = parseSizeRouteSearch({ k: "vvv" })
    expect(s.k).toBeUndefined()
    expect(
      filtersEqual(
        sizeSearchToBodyDisplayFilter(s),
        applyBodyTypePreset("planets")
      )
    ).toBe(true)
  })

  it("decodes custom k + moon", () => {
    const s = parseSizeRouteSearch({
      k: "vvvvhhv",
      moon: "planetsOnly",
    })
    const f = sizeSearchToBodyDisplayFilter(s)
    expect(f.moonParentPolicy).toBe("planetsOnly")
    expect(f.kindVisibility.scifi).toBe("visible")
    expect(f.kindVisibility.asteroid).toBe("hidden")
  })
})

describe("serializeSizePageSearch + finalizeNavigateSearch", () => {
  it("omits defaults for planets preset", () => {
    const partial = serializeSizePageSearch({
      selectedBodyId: null,
      labelMode: "on",
      bodyDisplayFilter: applyBodyTypePreset("planets"),
      debouncedPxPerKm: pxPerKmForMoonOnePx(),
    })
    expect(partial.preset).toBeUndefined()
    expect(partial.k).toBeUndefined()
    expect(partial.labels).toBeUndefined()
    expect(partial.zoom).toBeUndefined()
    const fin = finalizeNavigateSearch(partial)
    expect(
      filtersEqual(
        sizeSearchToBodyDisplayFilter(fin),
        applyBodyTypePreset("planets")
      )
    ).toBe(true)
  })

  it("round-trips non-default preset", () => {
    const partial = serializeSizePageSearch({
      selectedBodyId: null,
      labelMode: "on",
      bodyDisplayFilter: applyBodyTypePreset("planetsAndMoons"),
      debouncedPxPerKm: pxPerKmForMoonOnePx(),
    })
    expect(partial.preset).toBe("planetsAndMoons")
    const fin = finalizeNavigateSearch(partial)
    expect(
      filtersEqual(
        sizeSearchToBodyDisplayFilter(fin),
        applyBodyTypePreset("planetsAndMoons")
      )
    ).toBe(true)
  })

  it("round-trips custom filter via k", () => {
    const custom: SizeBodyDisplayFilter = {
      ...defaultSizeBodyDisplayFilter(),
      kindVisibility: {
        ...defaultSizeBodyDisplayFilter().kindVisibility,
        scifi: "visible",
      },
    }
    expect(classifyBodyTypePreset(custom)).toBe("custom")
    const partial = serializeSizePageSearch({
      selectedBodyId: null,
      labelMode: "auto",
      bodyDisplayFilter: custom,
      debouncedPxPerKm: sliderValueToPxPerKmMoonLadder(0.25),
    })
    expect(partial.k).toHaveLength(7)
    expect(partial.labels).toBe("auto")
    const fin = finalizeNavigateSearch(partial)
    expect(filtersEqual(sizeSearchToBodyDisplayFilter(fin), custom)).toBe(true)
  })
})

describe("zoom helpers", () => {
  it("zoomDiffSignificant is false at default moon scale", () => {
    expect(zoomDiffSignificant(pxPerKmForMoonOnePx())).toBe(false)
  })

  it("clamps uncalibrated pxPerKm to ladder band", () => {
    const { minPxPerKm, maxPxPerKm } = moonLadderPxPerKmBounds()
    const lo = clampZoomPxPerKmForCalibration({
      pxPerKm: minPxPerKm / 100,
      isCalibrated: false,
      pxPerMm: CSS_PX_PER_MM,
    })
    const hi = clampZoomPxPerKmForCalibration({
      pxPerKm: maxPxPerKm * 100,
      isCalibrated: false,
      pxPerMm: CSS_PX_PER_MM,
    })
    expect(lo).toBeCloseTo(minPxPerKm, 10)
    expect(hi).toBeCloseTo(maxPxPerKm, 10)
  })

  it("maps slider round-trip on calibrated range", () => {
    const range = computeSliderRange(CSS_PX_PER_MM)
    const px = sliderValueToPxPerKm(0.37, range)
    const slider = pxPerKmToSliderForCalibration({
      pxPerKm: px,
      isCalibrated: true,
      pxPerMm: CSS_PX_PER_MM,
    })
    const again = sliderToPxPerKmForCalibration({
      sliderValue: slider,
      isCalibrated: true,
      pxPerMm: CSS_PX_PER_MM,
      range,
    })
    expect(again).toBeCloseTo(px, 12)
  })
})
