import { describe, expect, it } from "vite-plus/test"

import {
  makeSizeCanvasId,
  type SizeCanvasBody,
} from "@/routes/_app/solar-system/size/-data"

import {
  applyBodyTypePreset,
  bodyCanvasInclusion,
  bodyPassesDisplayFilter,
  classifyBodyTypePreset,
  cycleBodyTypePreset,
  defaultSizeBodyDisplayFilter,
  filterSizeCanvasBodiesForDisplay,
  isRenderableAtScale,
  presetCycleButtonLabel,
  statsByKindForModelUnderFilter,
} from "./body-type-display"

function moon(
  id: string,
  diameterKm: number,
  parentId: string
): SizeCanvasBody {
  return {
    canvasId: makeSizeCanvasId("moon", id),
    row: { id, name: id, diameterKm },
    kind: "moon",
    parentPlanetId: parentId,
  }
}

function planet(id: string, diameterKm: number): SizeCanvasBody {
  return {
    canvasId: makeSizeCanvasId("planet", id),
    row: { id, name: id, diameterKm },
    kind: "planet",
    parentPlanetId: null,
  }
}

function dwarf(id: string, diameterKm: number): SizeCanvasBody {
  return {
    canvasId: makeSizeCanvasId("dwarf", id),
    row: { id, name: id, diameterKm },
    kind: "dwarf",
    parentPlanetId: null,
  }
}

function asteroid(id: string, diameterKm: number): SizeCanvasBody {
  return {
    canvasId: makeSizeCanvasId("asteroid", id),
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

  const filter = applyBodyTypePreset("planetsAndMoons")

  it("allows moons of planets", () => {
    expect(
      bodyPassesDisplayFilter(galilean, filter, bodies, pxPerKm, minPx)
    ).toBe(true)
  })

  it("excludes moons of dwarf planets", () => {
    expect(
      bodyPassesDisplayFilter(charon, filter, bodies, pxPerKm, minPx)
    ).toBe(false)
  })

  it("allows dwarf-planet moons when dwarf kind is enabled", () => {
    const f = applyBodyTypePreset("planetsAndMoons")
    f.kindVisibility.dwarf = "visible"
    expect(bodyPassesDisplayFilter(charon, f, bodies, pxPerKm, minPx)).toBe(
      true
    )
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

  it("keeps two bodies that share the same catalog id string", () => {
    const host = planet("10", 140_000)
    const rock = asteroid("10", 5000)
    const dupBodies = [host, rock]
    const f = defaultSizeBodyDisplayFilter()
    const visible = filterSizeCanvasBodiesForDisplay(
      dupBodies,
      f,
      pxPerKm,
      minPx
    )
    expect(visible).toHaveLength(2)
    expect(new Set(visible.map((b) => b.canvasId)).size).toBe(2)
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
    const filter = applyBodyTypePreset("planets")
    const incMoon = bodyCanvasInclusion(
      galilean,
      filter,
      bodies,
      pxMoonOne,
      minPx
    )
    expect(incMoon.onCanvas).toBe(false)
    expect(incMoon.reasonLabel).toBe("Kind hidden")
    expect(
      bodyPassesDisplayFilter(galilean, filter, bodies, pxMoonOne, minPx)
    ).toBe(false)

    const incAst = bodyCanvasInclusion(
      tinyAsteroid,
      filter,
      bodies,
      pxMoonOne,
      minPx
    )
    expect(incAst.onCanvas).toBe(false)
    expect(incAst.reasonLabel).toBe("Kind hidden")
  })

  it("reports under 1 px when kind is visible", () => {
    const rock = asteroid("rock", 500)
    const bodies = [rock]
    const filter = defaultSizeBodyDisplayFilter()
    const inc = bodyCanvasInclusion(rock, filter, bodies, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(false)
    expect(inc.reasonLabel).toBe("Under 1 px at this scale")
    expect(
      bodyPassesDisplayFilter(rock, filter, bodies, pxMoonOne, minPx)
    ).toBe(false)
  })

  it("matches bodyPassesDisplayFilter for Planets+ dwarf moons", () => {
    const jupiter = planet("jup", 140_000)
    const charon = moon("char", 4000, "plu")
    const pluto = dwarf("plu", 2376.6)
    const bodies = [jupiter, pluto, charon]
    const filter = applyBodyTypePreset("planetsAndMoons")
    const inc = bodyCanvasInclusion(charon, filter, bodies, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(false)
    expect(inc.reasonLabel).toBe("Dwarf planets disabled")
    expect(
      bodyPassesDisplayFilter(charon, filter, bodies, pxMoonOne, minPx)
    ).toBe(inc.onCanvas)
  })

  it("includes dwarf moons in Planets+ when dwarf kind is enabled", () => {
    const jupiter = planet("jup", 140_000)
    const charon = moon("char", 4000, "plu")
    const pluto = dwarf("plu", 2376.6)
    const bodies = [jupiter, pluto, charon]
    const filter = applyBodyTypePreset("planetsAndMoons")
    filter.kindVisibility.dwarf = "visible"
    const inc = bodyCanvasInclusion(charon, filter, bodies, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(true)
    expect(inc.reasonLabel).toBe("On canvas")
  })

  it("reports on canvas when included", () => {
    const jupiter = planet("jup", 140_000)
    const galilean = moon("io", 3600, "jup")
    const bodies = [jupiter, galilean]
    const filter = applyBodyTypePreset("planetsAndMoons")
    const inc = bodyCanvasInclusion(galilean, filter, bodies, pxMoonOne, minPx)
    expect(inc.onCanvas).toBe(true)
    expect(inc.reasonLabel).toBe("On canvas")
  })
})

describe("dwarf moons require dwarf visibility", () => {
  const moonKm = 3474.8
  const pxPerKm = 1 / moonKm

  it("excludes dwarf-planet moons when dwarf kind is hidden (even when moons are visible)", () => {
    const jupiter = planet("jup", 140_000)
    const pluto = dwarf("plu", 2376.6)
    const charon = moon("char", 4000, "plu")
    const io = moon("io", 3600, "jup")
    const bodies = [jupiter, pluto, charon, io]

    const f = defaultSizeBodyDisplayFilter()
    f.kindVisibility.moon = "visible"
    f.kindVisibility.dwarf = "hidden"
    f.moonParentPolicy = "any"

    expect(bodyPassesDisplayFilter(io, f, bodies, pxPerKm, 1)).toBe(true)
    expect(bodyPassesDisplayFilter(charon, f, bodies, pxPerKm, 1)).toBe(false)

    const inc = bodyCanvasInclusion(charon, f, bodies, pxPerKm, 1)
    expect(inc.onCanvas).toBe(false)
    expect(inc.reasonLabel).toBe("Dwarf planets disabled")
  })
})

describe("statsByKindForModelUnderFilter", () => {
  const moonKm = 3474.8
  const pxPerKm = 1 / moonKm

  it("drops dwarf-planet moons from moon totals when dwarf kind is hidden", () => {
    const model = {
      physicalNote: "",
      sun: null,
      planets: [
        {
          body: { id: "jup", name: "Jupiter", diameterKm: 140_000 },
          moons: [{ id: "io", name: "Io", diameterKm: 3600 }],
        },
      ],
      dwarfPlanets: [
        {
          body: { id: "plu", name: "Pluto", diameterKm: 2376.6 },
          moons: [{ id: "char", name: "Charon", diameterKm: 4000 }],
        },
      ],
      asteroids: [],
      comets: [],
      sciFi: [],
    }

    const f = defaultSizeBodyDisplayFilter()
    f.kindVisibility.moon = "visible"
    f.kindVisibility.dwarf = "hidden"
    f.moonParentPolicy = "any"

    const stats = statsByKindForModelUnderFilter(model, f, 1, pxPerKm)
    expect(stats.moon.total).toBe(1)
    expect(stats.moon.renderable).toBe(1)
  })
})

describe("presets and cycle", () => {
  it("classifies defaults as auto", () => {
    expect(classifyBodyTypePreset(defaultSizeBodyDisplayFilter())).toBe("auto")
    expect(presetCycleButtonLabel(defaultSizeBodyDisplayFilter())).toBe("Auto")
  })

  it("keeps Sci-fi hidden for default and every preset", () => {
    const def = defaultSizeBodyDisplayFilter()
    expect(def.kindVisibility.scifi).toBe("hidden")
    expect(applyBodyTypePreset("planets").kindVisibility.scifi).toBe("hidden")
    expect(applyBodyTypePreset("planetsAndMoons").kindVisibility.scifi).toBe(
      "hidden"
    )
    expect(applyBodyTypePreset("auto").kindVisibility.scifi).toBe("hidden")
  })

  it("classifies as custom when Sci-fi is visible", () => {
    const f = defaultSizeBodyDisplayFilter()
    f.kindVisibility.scifi = "visible"
    expect(classifyBodyTypePreset(f)).toBe("custom")
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
