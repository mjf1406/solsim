import {
  diameterKm,
  fetchSolarSystemJson,
  type CatalogBody,
  type SizeBodyKind,
  type SolarSystemJson,
} from "@/routes/_app/solar-system/size/-data"

import { getBodyRenderState } from "./-scale-math"

export { fetchSolarSystemJson }

/** Horizons ids for the eight planets in solar order. */
export const INNER_PLANET_IDS = ["199", "299", "399", "499"] as const
export const OUTER_PLANET_IDS = ["599", "699", "799", "899"] as const
export const ALL_PLANET_IDS = [
  ...INNER_PLANET_IDS,
  ...OUTER_PLANET_IDS,
] as const

/** Ceres lives in dwarf_planets, not asteroids. */
const CERES_ID = "1"

/** Curated asteroid-belt bodies (Horizons ids), in display order. */
const ASTEROID_BELT_ASTEROID_IDS = [
  "2",
  "3",
  "4",
  "10",
  "15",
  "16",
  "324",
  "511",
  "624",
  "704",
] as const

/** Curated comets for the Kuiper belt section, in display order. */
const KUIPER_BELT_COMET_NAMES = [
  "Halley",
  "Encke",
  "Tempel 1",
  "Borrelly",
  "Churyumov-Gerasimenko",
  "Hartley 2",
  "Swift-Tuttle",
  "Hale-Bopp",
  "NEOWISE",
  "Tsuchinshan-ATLAS",
] as const

export type ScaleBodyRow = {
  id: string
  name: string
  kind: SizeBodyKind
  diameterKm: number | null
}

export type ScalePlanetSection = {
  type: "planet"
  planet: ScaleBodyRow
  moons: ScaleBodyRow[]
}

export type ScaleBeltSection = {
  type: "belt"
  beltId: "asteroid-belt" | "kuiper-belt"
  label: string
  dwarfPlanets: ScaleBodyRow[]
  minors: ScaleBodyRow[]
}

export type ScaleSunSection = {
  type: "sun"
  body: ScaleBodyRow
}

export type ScaleSection =
  | ScaleSunSection
  | ScalePlanetSection
  | ScaleBeltSection

export type ScalePageModel = {
  sections: ScaleSection[]
}

function categoryToKind(category: string): SizeBodyKind {
  switch (category) {
    case "star":
      return "star"
    case "planet":
      return "planet"
    case "moon":
      return "moon"
    case "dwarf_planet":
      return "dwarf"
    case "asteroid":
      return "asteroid"
    case "comet":
      return "comet"
    default:
      return "asteroid"
  }
}

function catalogBodyToRow(body: CatalogBody): ScaleBodyRow {
  return {
    id: body.id,
    name: body.name,
    kind: categoryToKind(body.category),
    diameterKm: diameterKm(body.physical),
  }
}

function buildCatalogIndex(json: SolarSystemJson): Map<string, CatalogBody> {
  const map = new Map<string, CatalogBody>()
  const lists = [
    json.categories.star ?? [],
    json.categories.planets ?? [],
    json.categories.moons ?? [],
    json.categories.dwarf_planets ?? [],
    json.categories.asteroids ?? [],
    json.categories.comets ?? [],
  ]
  for (const list of lists) {
    for (const body of list) {
      map.set(body.id, body)
    }
  }
  return map
}

function moonsByParent(moons: CatalogBody[]): Map<string, CatalogBody[]> {
  const map = new Map<string, CatalogBody[]>()
  for (const moon of moons) {
    const pid = moon.parent_id
    if (pid == null || pid === "") continue
    const list = map.get(pid) ?? []
    list.push(moon)
    map.set(pid, list)
  }
  return map
}

function sortByDiameterDesc(rows: ScaleBodyRow[]): ScaleBodyRow[] {
  return [...rows].sort((a, b) => {
    if (a.diameterKm == null && b.diameterKm == null) {
      return a.name.localeCompare(b.name)
    }
    if (a.diameterKm == null) return 1
    if (b.diameterKm == null) return -1
    return b.diameterKm - a.diameterKm
  })
}

function rowFromId(
  index: Map<string, CatalogBody>,
  id: string
): ScaleBodyRow | null {
  const body = index.get(id)
  if (!body) return null
  return catalogBodyToRow(body)
}

function moonsForPlanet(
  byParent: Map<string, CatalogBody[]>,
  planetId: string
): ScaleBodyRow[] {
  const list = byParent.get(planetId) ?? []
  return sortByDiameterDesc(list.map(catalogBodyToRow))
}

function planetSection(
  index: Map<string, CatalogBody>,
  byParent: Map<string, CatalogBody[]>,
  planetId: string
): ScalePlanetSection | null {
  const planet = rowFromId(index, planetId)
  if (!planet) return null
  return {
    type: "planet",
    planet,
    moons: moonsForPlanet(byParent, planetId),
  }
}

function kuiperDwarfPlanets(json: SolarSystemJson): ScaleBodyRow[] {
  return sortByDiameterDesc(
    (json.categories.dwarf_planets ?? [])
      .filter((d) => d.id !== CERES_ID)
      .map(catalogBodyToRow)
  )
}

function cometsByName(json: SolarSystemJson): Map<string, CatalogBody> {
  const map = new Map<string, CatalogBody>()
  for (const comet of json.categories.comets ?? []) {
    map.set(comet.name, comet)
  }
  return map
}

export function buildScaleModel(json: SolarSystemJson): ScalePageModel {
  const index = buildCatalogIndex(json)
  const byParent = moonsByParent(json.categories.moons ?? [])
  const cometIndex = cometsByName(json)

  const sections: ScaleSection[] = []

  const sun = rowFromId(index, "10") ?? rowFromId(index, json.categories.star?.[0]?.id ?? "")
  if (sun) {
    sections.push({ type: "sun", body: sun })
  }

  for (const id of INNER_PLANET_IDS) {
    const section = planetSection(index, byParent, id)
    if (section) sections.push(section)
  }

  const ceres = rowFromId(index, CERES_ID)
  const asteroids = ASTEROID_BELT_ASTEROID_IDS.map((id) => rowFromId(index, id)).filter(
    (row): row is ScaleBodyRow => row != null
  )

  sections.push({
    type: "belt",
    beltId: "asteroid-belt",
    label: "Asteroid Belt",
    dwarfPlanets: ceres ? [ceres] : [],
    minors: asteroids,
  })

  for (const id of OUTER_PLANET_IDS) {
    const section = planetSection(index, byParent, id)
    if (section) sections.push(section)
  }

  const kuiperComets = KUIPER_BELT_COMET_NAMES.map((name) => {
    const body = cometIndex.get(name)
    return body ? catalogBodyToRow(body) : null
  }).filter((row): row is ScaleBodyRow => row != null)

  sections.push({
    type: "belt",
    beltId: "kuiper-belt",
    label: "Kuiper Belt",
    dwarfPlanets: kuiperDwarfPlanets(json),
    minors: kuiperComets,
  })

  return { sections }
}

export type UnrenderedBodyEntry = {
  body: ScaleBodyRow
  reason: "too_small" | "unknown_size"
  scaledMm?: number
  context?: string
}

export function collectUnrenderedBodies(
  model: ScalePageModel,
  sunMm: number,
  pxPerMm: number
): UnrenderedBodyEntry[] {
  const out: UnrenderedBodyEntry[] = []

  const consider = (body: ScaleBodyRow, context?: string) => {
    const state = getBodyRenderState(body.diameterKm, sunMm, pxPerMm)
    if (state.renderable) return
    out.push({
      body,
      reason: state.reason,
      scaledMm: state.reason === "too_small" ? state.scaledMm : undefined,
      context,
    })
  }

  for (const section of model.sections) {
    if (section.type === "sun") {
      consider(section.body)
    } else if (section.type === "planet") {
      consider(section.planet)
      for (const moon of section.moons) {
        consider(moon, `Moon of ${section.planet.name}`)
      }
    } else {
      for (const dwarf of section.dwarfPlanets) {
        consider(dwarf, section.label)
      }
      for (const minor of section.minors) {
        consider(minor, section.label)
      }
    }
  }

  return out
}

export type PrintBodyGroup = "planets" | "moons" | "belts"

export type FlatPrintBody = {
  body: ScaleBodyRow
  group: PrintBodyGroup
  context?: string
  sortOrder: number
}

export type FlattenPrintBodiesOptions = {
  includeMoons: boolean
  includeBelts: boolean
}

export function flattenPrintBodies(
  model: ScalePageModel,
  options: FlattenPrintBodiesOptions
): FlatPrintBody[] {
  const out: FlatPrintBody[] = []
  let sortOrder = 0

  for (const section of model.sections) {
    if (section.type === "planet") {
      out.push({
        body: section.planet,
        group: "planets",
        sortOrder: sortOrder++,
      })
      if (options.includeMoons) {
        for (const moon of section.moons) {
          out.push({
            body: moon,
            group: "moons",
            context: `Moon of ${section.planet.name}`,
            sortOrder: sortOrder++,
          })
        }
      }
    } else if (section.type === "belt" && options.includeBelts) {
      for (const dwarf of section.dwarfPlanets) {
        out.push({
          body: dwarf,
          group: "belts",
          context: section.label,
          sortOrder: sortOrder++,
        })
      }
      for (const minor of section.minors) {
        out.push({
          body: minor,
          group: "belts",
          context: section.label,
          sortOrder: sortOrder++,
        })
      }
    }
  }

  return out
}
