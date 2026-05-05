import { spokenNumberEnUsMaxOneDecimal } from "@/lib/reading/spoken-number-en-us"

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

export type SizeCanvasLabelMode = "on" | "auto" | "off"

/** Matches canvas body taxonomy (`collectSizeCanvasBodies`). */
export type SizeBodyKind =
  | "star"
  | "planet"
  | "moon"
  | "dwarf"
  | "asteroid"
  | "comet"

/** Stable key for layout/selection; catalog `row.id` can repeat across kinds (Horizons). */
export function makeSizeCanvasId(
  kind: SizeBodyKind,
  catalogId: string
): string {
  return `${kind}:${catalogId}`
}

/** One drawable body on the size canvas (finite diameter). */
export type SizeCanvasBody = {
  canvasId: string
  row: SizeRow & { diameterKm: number }
  kind: SizeBodyKind
  /** Host planet or dwarf id when `kind === "moon"`. */
  parentPlanetId: string | null
}

/** Bodies shown on the size comparison canvas, in catalog order groups. */
export function collectSizeCanvasBodies(model: SizePageModel): SizeCanvasBody[] {
  const out: SizeCanvasBody[] = []
  const seen = new Set<string>()
  const add = (
    row: SizeRow,
    kind: SizeBodyKind,
    parentPlanetId: string | null = null
  ) => {
    if (row.diameterKm == null || !Number.isFinite(row.diameterKm)) return
    const canvasId = makeSizeCanvasId(kind, row.id)
    if (seen.has(canvasId)) return
    seen.add(canvasId)
    out.push({
      canvasId,
      row: row as SizeRow & { diameterKm: number },
      kind,
      parentPlanetId,
    })
  }

  if (model.sun) add(model.sun, "star", null)
  for (const s of model.planets) {
    add(s.body, "planet", null)
    for (const m of s.moons) add(m, "moon", s.body.id)
  }
  for (const s of model.dwarfPlanets) {
    add(s.body, "dwarf", null)
    for (const m of s.moons) add(m, "moon", s.body.id)
  }
  for (const a of model.asteroids) add(a, "asteroid", null)
  for (const c of model.comets) add(c, "comet", null)
  return out
}

export function kindLabel(kind: SizeBodyKind): string {
  switch (kind) {
    case "star":
      return "Star"
    case "planet":
      return "Planet"
    case "moon":
      return "Moon"
    case "dwarf":
      return "Dwarf planet"
    case "asteroid":
      return "Asteroid"
    case "comet":
      return "Comet"
  }
}

/** Moon diameter in km used as 1 CSS pixel on the size canvas; same rule as `size-canvas.tsx`. */
export function moonReferenceDiameterKm(model: SizePageModel): number {
  const candidates: SizeRow[] = []
  if (model.sun) candidates.push(model.sun)
  for (const s of model.planets) {
    candidates.push(s.body)
    for (const m of s.moons) candidates.push(m)
  }
  for (const s of model.dwarfPlanets) {
    candidates.push(s.body)
    for (const m of s.moons) candidates.push(m)
  }
  for (const a of model.asteroids) candidates.push(a)
  for (const c of model.comets) candidates.push(c)

  const moon = candidates.find(
    (r) =>
      r.name.trim().toLowerCase() === "moon" || r.id === "301"
  )
  if (moon?.diameterKm != null && Number.isFinite(moon.diameterKm)) {
    return moon.diameterKm
  }
  return 3474.8
}

export type SizeBodyDetail = {
  name: string
  kind: SizeBodyKind
  diameterKm: number
  /** Disk diameter in CSS pixels (Moon = 1 px). */
  diameterPx: number
}

/**
 * Resolves a body that appears on the size canvas (finite diameter only).
 * Returns null if missing or not drawable.
 */
export function findSizeBodyDetail(
  model: SizePageModel,
  id: string | null
): SizeBodyDetail | null {
  if (!id) return null
  const moonKm = moonReferenceDiameterKm(model)
  if (!(moonKm > 0)) return null

  const asDetail = (
    row: SizeRow,
    kind: SizeBodyKind
  ): SizeBodyDetail | null => {
    const d = row.diameterKm
    if (d == null || !Number.isFinite(d)) return null
    return {
      name: row.name,
      kind,
      diameterKm: d,
      diameterPx: d / moonKm,
    }
  }

  const byCanvas = collectSizeCanvasBodies(model).find((b) => b.canvasId === id)
  if (byCanvas) return asDetail(byCanvas.row, byCanvas.kind)

  if (model.sun?.id === id) return asDetail(model.sun, "star")
  for (const s of model.planets) {
    if (s.body.id === id) return asDetail(s.body, "planet")
    for (const m of s.moons) {
      if (m.id === id) return asDetail(m, "moon")
    }
  }
  for (const s of model.dwarfPlanets) {
    if (s.body.id === id) return asDetail(s.body, "dwarf")
    for (const m of s.moons) {
      if (m.id === id) return asDetail(m, "moon")
    }
  }
  for (const a of model.asteroids) {
    if (a.id === id) return asDetail(a, "asteroid")
  }
  for (const c of model.comets) {
    if (c.id === id) return asDetail(c, "comet")
  }
  return null
}

export function formatDiameterPx(px: number): string {
  if (!Number.isFinite(px)) return "—"
  const digits = px >= 1 ? 1 : px >= 0.01 ? 3 : 4
  return `${px.toLocaleString("en-US", { maximumFractionDigits: digits })} px`
}

export function findSizeRowNameById(
  model: SizePageModel,
  id: string | null
): string | null {
  if (!id) return null
  const byCanvas = collectSizeCanvasBodies(model).find((b) => b.canvasId === id)
  if (byCanvas) return byCanvas.row.name

  if (model.sun?.id === id) return model.sun.name
  for (const s of model.planets) {
    if (s.body.id === id) return s.body.name
    for (const m of s.moons) {
      if (m.id === id) return m.name
    }
  }
  for (const s of model.dwarfPlanets) {
    if (s.body.id === id) return s.body.name
    for (const m of s.moons) {
      if (m.id === id) return m.name
    }
  }
  for (const a of model.asteroids) {
    if (a.id === id) return a.name
  }
  for (const c of model.comets) {
    if (c.id === id) return c.name
  }
  return null
}

/** Kilometers to statute miles (exact definition uses 1 mi = 1.609344 km). */
const KM_TO_MI = 1 / 1.609344

export function formatDiameterKm(km: number | null): string {
  if (km == null || !Number.isFinite(km)) return "—"
  return `${km.toLocaleString("en-US", { maximumFractionDigits: 1 })} km`
}

export function formatDiameterNumber(
  km: number | null,
  unit: "km" | "mi"
): string {
  if (km == null || !Number.isFinite(km)) return "—"
  const n = unit === "km" ? km : km * KM_TO_MI
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 })
}

/** Words for the diameter shown with {@link formatDiameterNumber}, plus unit (singular mile/kilometer only when rounded display is exactly `1`). */
export function spokenDiameterSentence(km: number, unit: "km" | "mi"): string {
  const n = unit === "km" ? km : km * KM_TO_MI
  const formatted = n.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    useGrouping: false,
  })
  const words = spokenNumberEnUsMaxOneDecimal(n)
  const singular = formatted === "1"
  const unitWords =
    unit === "km"
      ? singular
        ? "kilometer"
        : "kilometers"
      : singular
        ? "mile"
        : "miles"
  const sentence = `${words} ${unitWords}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + "."
}
