import { describe, expect, it } from "vite-plus/test"

import { buildSizePageModel } from "../size/-data"
import {
  KM_PER_AU,
  collectDistanceBodies,
  findDistanceBodyDetail,
  type SolarSystemJson,
} from "./-data"

function makeJson(): SolarSystemJson {
  return {
    metadata: {},
    categories: {
      star: [
        {
          id: "10",
          name: "Sun",
          category: "star",
          physical: { diameter_km: 1_391_400 },
          elements: null,
        },
      ],
      planets: [
        {
          id: "199",
          name: "Mercury",
          category: "planet",
          physical: { diameter_km: 4879.4 },
          elements: { a_au: 0.387098 },
        },
        {
          id: "299",
          name: "Venus",
          category: "planet",
          physical: { diameter_km: 12103.6 },
          elements: { a_au: 0.723332 },
        },
        {
          id: "399",
          name: "Earth",
          category: "planet",
          physical: { diameter_km: 12756.0 },
          elements: { a_au: 1.0 },
        },
      ],
      moons: [
        {
          id: "301",
          name: "Moon",
          category: "moon",
          parent_id: "399",
          physical: { diameter_km: 3474.8 },
          elements: { a_au: 0.002588599856872054 },
        },
      ],
      dwarf_planets: [],
      asteroids: [],
      comets: [],
    },
  }
}

describe("distance data layer", () => {
  it("collectDistanceBodies computes Sun distance and moon inheritance", () => {
    const json = makeJson()
    const model = buildSizePageModel(json, [])
    const bodies = collectDistanceBodies(model, json)

    const sun = bodies.find((b) => b.row.name === "Sun")!
    expect(sun.distanceFromSunKm).toBe(0)

    const mercury = bodies.find((b) => b.row.name === "Mercury")!
    expect(mercury.distanceFromSunKm).toBeCloseTo(0.387098 * KM_PER_AU, 3)
    expect(mercury.semiMajorAxisKm).toBeCloseTo(0.387098 * KM_PER_AU, 3)

    const earth = bodies.find((b) => b.row.name === "Earth")!
    const moon = bodies.find((b) => b.row.name === "Moon")!
    expect(moon.distanceFromSunKm).toBeCloseTo(earth.distanceFromSunKm, 6)
    expect(moon.moonOrbitKm).toBeGreaterThan(100_000) // semi-major axis from elements
    expect(moon.semiMajorAxisKm).toBeCloseTo(
      0.002588599856872054 * KM_PER_AU,
      3
    )
  })

  it("findDistanceBodyDetail prev/next use Sun-orbiter ordering; moons use parent neighbors", () => {
    const json = makeJson()
    const model = buildSizePageModel(json, [])
    const bodies = collectDistanceBodies(model, json)
    const earthId = bodies.find((b) => b.row.name === "Earth")!.canvasId
    const moonId = bodies.find((b) => b.row.name === "Moon")!.canvasId

    const earth = findDistanceBodyDetail(model, json, earthId)!
    expect(earth.prevSunOrbiterId).toBeTruthy()
    expect(earth.nextSunOrbiterId).toBeNull()

    const moon = findDistanceBodyDetail(model, json, moonId)!
    expect(moon.prevSunOrbiterId).toBe(earth.prevSunOrbiterId)
    expect(moon.nextSunOrbiterId).toBe(earth.nextSunOrbiterId)
  })
})
