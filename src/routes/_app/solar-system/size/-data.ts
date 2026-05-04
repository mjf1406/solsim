/** Snapshot served from `public/data/solar_system_data.json`. */
export const SOLAR_SYSTEM_JSON_URL = "/data/solar_system_data.json"

export type Physical = {
  diameter_km?: number | null
  mean_radius_km?: number | null
} | null

export type CatalogBody = {
  id: string
  name: string
  category: string
  parent_id?: string | null
  physical?: Physical
}

export type SolarSystemJson = {
  metadata: {
    physical_schema?: {
      physical?: Record<string, string>
    }
    physical_sources?: unknown
  }
  categories: {
    star?: CatalogBody[]
    planets?: CatalogBody[]
    moons?: CatalogBody[]
    dwarf_planets?: CatalogBody[]
    asteroids?: CatalogBody[]
    comets?: CatalogBody[]
  }
}

export type SizeRow = {
  id: string
  name: string
  diameterKm: number | null
}

export type PlanetSection = {
  body: SizeRow
  moons: SizeRow[]
}

export type SizePageModel = {
  physicalNote: string
  sun: SizeRow | null
  planets: PlanetSection[]
  dwarfPlanets: PlanetSection[]
  asteroids: SizeRow[]
  comets: SizeRow[]
}

export function diameterKm(physical: Physical | undefined): number | null {
  if (!physical) return null
  const d = physical.diameter_km
  if (typeof d === "number" && Number.isFinite(d)) return d
  const r = physical.mean_radius_km
  if (typeof r === "number" && Number.isFinite(r)) return 2 * r
  return null
}

function bodyToRow(body: CatalogBody): SizeRow {
  return {
    id: body.id,
    name: body.name,
    diameterKm: diameterKm(body.physical),
  }
}

function moonsByParent(moons: CatalogBody[]): Map<string, CatalogBody[]> {
  const map = new Map<string, CatalogBody[]>()
  for (const m of moons) {
    const pid = m.parent_id
    if (pid == null || pid === "") continue
    const list = map.get(pid) ?? []
    list.push(m)
    map.set(pid, list)
  }
  return map
}

function topMoonsForParent(
  map: Map<string, CatalogBody[]>,
  parentId: string,
  limit: number
): SizeRow[] {
  const list = map.get(parentId) ?? []
  return list
    .map(bodyToRow)
    .filter(
      (row): row is SizeRow & { diameterKm: number } => row.diameterKm != null
    )
    .sort((a, b) => b.diameterKm - a.diameterKm)
    .slice(0, limit)
}

function topByDiameter(bodies: CatalogBody[], limit: number): SizeRow[] {
  return bodies
    .map(bodyToRow)
    .filter(
      (row): row is SizeRow & { diameterKm: number } => row.diameterKm != null
    )
    .sort((a, b) => b.diameterKm - a.diameterKm)
    .slice(0, limit)
}

function physicalSchemaNote(meta: SolarSystemJson["metadata"]): string {
  const keys = meta.physical_schema?.physical
    ? Object.keys(meta.physical_schema.physical).join(", ")
    : null
  return keys
    ? `Physical fields follow the snapshot schema (e.g. ${keys.slice(0, 120)}${keys.length > 120 ? "…" : ""}).`
    : "Physical fields follow the snapshot in solar_system_data.json."
}

export async function fetchSolarSystemJson(): Promise<SolarSystemJson> {
  const res = await fetch(SOLAR_SYSTEM_JSON_URL)
  if (!res.ok) {
    throw new Error(`Failed to load solar system data (${res.status})`)
  }
  return res.json() as Promise<SolarSystemJson>
}

export function buildSizePageModel(data: SolarSystemJson): SizePageModel {
  const moons = data.categories.moons ?? []
  const byParent = moonsByParent(moons)
  const moonLimit = 5
  const minorLimit = 5

  const star = data.categories.star?.[0]
  const sun = star ? bodyToRow(star) : null

  const planets: PlanetSection[] = (data.categories.planets ?? []).map((p) => ({
    body: bodyToRow(p),
    moons: topMoonsForParent(byParent, p.id, moonLimit),
  }))

  const dwarfPlanets: PlanetSection[] = (data.categories.dwarf_planets ?? [])
    .map((p) => ({
      body: bodyToRow(p),
      moons: topMoonsForParent(byParent, p.id, moonLimit),
    }))
    .filter(
      (s): s is PlanetSection & { body: SizeRow & { diameterKm: number } } =>
        s.body.diameterKm != null
    )
    .sort((a, b) => b.body.diameterKm - a.body.diameterKm)
    .slice(0, minorLimit + 1)

  const asteroids = topByDiameter(data.categories.asteroids ?? [], minorLimit)
  const comets = topByDiameter(data.categories.comets ?? [], minorLimit)

  return {
    physicalNote: physicalSchemaNote(data.metadata),
    sun,
    planets,
    dwarfPlanets,
    asteroids,
    comets,
  }
}

export function formatDiameterKm(km: number | null): string {
  if (km == null || !Number.isFinite(km)) return "—"
  return `${km.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`
}
