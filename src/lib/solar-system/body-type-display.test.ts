import { describe, expect, it } from "vitest"

import type { SizeCanvasBody } from "@/routes/_app/solar-system/size/-data"

import {
  applyBodyTypePreset,
  bodyCanvasInclusion,
  bodyPassesDisplayFilter,
  classifyBodyTypePreset,
  cycleBodyTypePreset,
  defaultSizeBodyDisplayFilter,
  filterSizeCanvasBodiesForDisplay,
  isRenderableAtScale,
  kindByIdFromBodies,
  presetCycleButtonLabel,
} from "./body-type-display"

function moon(id: string, diameterKm: number, parentId: string): SizeCanvasBody {
  return {
    row: { id, name: id, diameterKm },
    kind: "moon",
    parentPlanetId: parentId,
  }
}

function planet(id: string, diameterKm: number): SizeCanvasBody {
  return {
    row: { id, name: id, diameterKm },
    kind: "planet",
    parentPlanetId: null,
  }
}

function dwarf(id: string, diameterKm: number): SizeCanvasBody {
  return {
    row: { id, name: id, diameterKm },
    kind: "dwarf",
    parentPlanetId: null,
  }
}

function asteroid(id: string, diameterKm: number): SizeCanvasBody {
  return {
    row: { id, name: id, diameterKm },
    kind: "asteroid",
    parentPlanetId: null,
  }
}

describe("isRenderableAtScale", () => {
  it("uses diameterKm times pxPerKm vs minPx", () => {
    const moonKm = 3474.8
    const pxMoonOne = 1 / moonKm
    expect(isRenderableAtScale(3474.8, pxMoonOne, 1)).toBe(true)
    expect(isRenderableAtScale(3474.7, pxMoonOne, 1)).toBe(false)
    expect(isRenderableAtScale(6949.6, pxMoonOne, 1)).toBe(true)
  })

  it("crosses 1px threshold when pxPerKm doubles", () => {
    const moonKm = 3474.8
    const pxMoonOne = 1 / moonKm
    const smallKm = 2000
    expect(isRenderableAtScale(smallKm, pxMoonOne, 1)).toBe(false)
    expect(isRenderableAtScale(smallKm, pxMoonOne * 2, 1)).toBe(true)
  })
})

describe("bodyPassesDisplayFilter planetsOnly moons", () => {
  const moonKm = 3474.8
  const pxPerKm = 1 / moonKm
  const minPx = 1
  const jupiter = planet("jup", 140_000)
  const charon = moon("char", 4000, "plu")
  const pluto = dwarf("plu", 2376.6)
  const galilean = moon("io", 3600, "jup")
  const bodies = [jupiter, pluto, charon, galilean]
  const kindById = kindByIdFromBodies(bodies)

  const filter = applyBodyTypePreset("planetsAndMoons")

  it("allows moons of planets", () => {
    expect(
      bodyPassesDisplayFilter(galilean, filter, kindById, pxPerKm, minPx)
    ).toBe(true)
  })

  it("excludes moons of dwarf planets", () => {
    expect(
      bodyPassesDisplayFilter(charon, filter, kindById, pxPerKm, minPx)
    ).toBe(false)
  })

  it("filterSizeCanvasBodiesForDisplay drops dwarf-planet moons", () => {
    const visible = filterSizeCanvasBodiesForDisplay(
      bodies,
      filter,
      pxPerKm,
      minPx
    )
    expect(visible.some((b) => b.row.id === "io")).toBe(true)
    expect(visible.some((b) => b.row.id === "char")).toBe(false)
  })
})

describe("bodyCanvasInclusion", () => {
  const moonKm = 3474.8
  const pxMoonOne = 1 / moonKm
  const minPx = 1

  it("reports kind hidden before scale (moons preset)", () => {
    const jupiter = planet("jup", 140_000)
    const galilean = moon("io", 3600, "jup")
    const tinyAsteroid = asteroid("tiny", 500)
    const bodies = [jupiter, galilean, tinyAsteroid]
    const kindById = kindByIdFromBodies(bodies)
    const filter = applyBodyTypePreset("planets")
    const incMoon = bodyCanvasInclusion(
      galilean,
      filter,
      kindById,
      pxMoonOne,
      minPx
    )
    expect(incMoon.onCanvas).toBe(false)
    expect(incMoon.reasonLabel).toBe("Kind hidden")
    expect(
      bodyPassesDisplayFilter(galilean, filter, kindById, pxMoonOne, minPx)
    ).toBe(false)

    const incAst = bodyCanvasInclusion(
      tinyAsteroid,
      filter,
      kindById,
      pxMoonOne,
      minPx
    )
    expect(incAst.onCanvas).toBe(false)
    expect(incAst.reasonLabel).toBe("Kind hidden")
  })

  it("reports under 1 px when kind is visible", () => {
    const rock = asteroid("rock", 500)
    const bodies = [rock]
    const kindById = kindByIdFromBodies(bodies)
    const filter = defaultSizeBodyDisplayFilter()
    const inc = bodyCanvasInclusion(rock, filter, kindById, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(false)
    expect(inc.reasonLabel).toBe("Under 1 px at this scale")
    expect(
      bodyPassesDisplayFilter(rock, filter, kindById, pxMoonOne, minPx)
    ).toBe(false)
  })

  it("matches bodyPassesDisplayFilter for Planets+ dwarf moons", () => {
    const jupiter = planet("jup", 140_000)
    const charon = moon("char", 4000, "plu")
    const pluto = dwarf("plu", 2376.6)
    const bodies = [jupiter, pluto, charon]
    const kindById = kindByIdFromBodies(bodies)
    const filter = applyBodyTypePreset("planetsAndMoons")
    const inc = bodyCanvasInclusion(charon, filter, kindById, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(false)
    expect(inc.reasonLabel).toBe("Major-planet moons only")
    expect(
      bodyPassesDisplayFilter(charon, filter, kindById, pxMoonOne, minPx)
    ).toBe(inc.onCanvas)
  })

  it("reports on canvas when included", () => {
    const jupiter = planet("jup", 140_000)
    const galilean = moon("io", 3600, "jup")
    const bodies = [jupiter, galilean]
    const kindById = kindByIdFromBodies(bodies)
    const filter = applyBodyTypePreset("planetsAndMoons")
    const inc = bodyCanvasInclusion(galilean, filter, kindById, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(true)
    expect(inc.reasonLabel).toBe("On canvas")
  })
})

describe("presets and cycle", () => {
  it("classifies defaults as auto", () => {
    expect(classifyBodyTypePreset(defaultSizeBodyDisplayFilter())).toBe("auto")
    expect(presetCycleButtonLabel(defaultSizeBodyDisplayFilter())).toBe("Auto")
  })

  it("cycles planets -> planetsAndMoons -> auto -> planets", () => {
    let f = applyBodyTypePreset("planets")
    expect(classifyBodyTypePreset(f)).toBe("planets")
    f = cycleBodyTypePreset(f)
    expect(classifyBodyTypePreset(f)).toBe("planetsAndMoons")
    f = cycleBodyTypePreset(f)
    expect(classifyBodyTypePreset(f)).toBe("auto")
    f = cycleBodyTypePreset(f)
    expect(classifyBodyTypePreset(f)).toBe("planets")
  })

  it("treats tweaked filter as custom and cycle resets to planets", () => {
    const f = defaultSizeBodyDisplayFilter()
    f.kindVisibility.dwarf = "hidden"
    expect(classifyBodyTypePreset(f)).toBe("custom")
    expect(presetCycleButtonLabel(f)).toBe("Custom")
    const next = cycleBodyTypePreset(f)
    expect(classifyBodyTypePreset(next)).toBe("planets")
  })
})
