import { describe, expect, it } from "vitest"

import type { SizeCanvasBody } from "@/routes/_app/solar-system/size/-data"

import {
  applyBodyTypePreset,
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

describe("isRenderableAtScale", () => {
  it("uses Moon km as 1 px reference", () => {
    const moonKm = 3474.8
    expect(isRenderableAtScale(3474.8, moonKm, 1)).toBe(true)
    expect(isRenderableAtScale(3474.7, moonKm, 1)).toBe(false)
    expect(isRenderableAtScale(6949.6, moonKm, 1)).toBe(true)
  })
})

describe("bodyPassesDisplayFilter planetsOnly moons", () => {
  const moonKm = 3474.8
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
      bodyPassesDisplayFilter(galilean, filter, kindById, moonKm, minPx)
    ).toBe(true)
  })

  it("excludes moons of dwarf planets", () => {
    expect(
      bodyPassesDisplayFilter(charon, filter, kindById, moonKm, minPx)
    ).toBe(false)
  })

  it("filterSizeCanvasBodiesForDisplay drops dwarf-planet moons", () => {
    const visible = filterSizeCanvasBodiesForDisplay(
      bodies,
      filter,
      moonKm,
      minPx
    )
    expect(visible.some((b) => b.row.id === "io")).toBe(true)
    expect(visible.some((b) => b.row.id === "char")).toBe(false)
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
