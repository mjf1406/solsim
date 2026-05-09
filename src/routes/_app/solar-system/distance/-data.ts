import { spokenNumberEnUsMaxOneDecimal } from "@/lib/reading/spoken-number-en-us"
import type {
  CatalogBody,
  Elements,
  SolarSystemJson,
  SizeCanvasBody,
  SizePageModel,
} from "../size/-data"
import {
  collectSizeCanvasBodies,
  findSizeRowNameById,
  kindLabel,
} from "../size/-data"

export {
  SOLAR_SYSTEM_JSON_URL,
  SCI_FI_SIZE_CATALOG_URL,
  fetchSolarSystemJson,
  fetchSciFiSizeCatalog,
  buildSizePageModel,
  collectSizeCanvasBodies,
  kindLabel,
  findSizeRowNameById,
  type SizePageModel,
  type SizeCanvasBody,
  type SolarSystemJson,
} from "../size/-data"

/** Exact from snapshot metadata: `AU_km`. */
export const KM_PER_AU = 149_597_870.7

/** Kilometers to statute miles (exact definition uses 1 mi = 1.609344 km). */
const KM_TO_MI = 1 / 1.609344

function auToKm(au: number | null | undefined): number | null {
  if (typeof au !== "number" || !Number.isFinite(au) || au < 0) return null
  return au * KM_PER_AU
}

function perihelionAu(el: Elements | undefined): number | null {
  if (!el) return null
  const q = el.q_au
  if (typeof q === "number" && Number.isFinite(q) && q >= 0) return q
  // If only `a` + `e` are present, derive q = a(1-e).
  const a = el.a_au
  const e = el.e
  if (
    typeof a === "number" &&
    Number.isFinite(a) &&
    a >= 0 &&
    typeof e === "number" &&
    Number.isFinite(e)
  ) {
    return a * (1 - e)
  }
  return null
}

function aphelionAu(el: Elements | undefined): number | null {
  if (!el) return null
  const ad = el.apoapsis_au
  if (typeof ad === "number" && Number.isFinite(ad) && ad >= 0) return ad
  // If only `a` + `e` are present, derive Q = a(1+e).
  const a = el.a_au
  const e = el.e
  if (
    typeof a === "number" &&
    Number.isFinite(a) &&
    a >= 0 &&
    typeof e === "number" &&
    Number.isFinite(e)
  ) {
    return a * (1 + e)
  }
  return null
}

function meanDistanceAu(el: Elements | undefined): number | null {
  const a = el?.a_au
  if (typeof a === "number" && Number.isFinite(a) && a >= 0) return a
  const q = perihelionAu(el)
  const Q = aphelionAu(el)
  if (q != null && Q != null) return (q + Q) / 2
  return null
}

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0
}

function bodyKey(kind: SizeCanvasBody["kind"], catalogId: string): string {
  return `${kind}:${catalogId}`
}

function buildBodyIndex(json: SolarSystemJson): Map<string, CatalogBody> {
  const map = new Map<string, CatalogBody>()
  const addAll = (kind: SizeCanvasBody["kind"], list?: CatalogBody[]) => {
    for (const b of list ?? []) {
      map.set(bodyKey(kind, b.id), b)
    }
  }
  addAll("star", json.categories.star)
  addAll("planet", json.categories.planets)
  addAll("moon", json.categories.moons)
  addAll("dwarf", json.categories.dwarf_planets)
  addAll("asteroid", json.categories.asteroids)
  addAll("comet", json.categories.comets)
  return map
}

export type DistanceBody = SizeCanvasBody & {
  /** Mean distance from Sun for plotting (km). Moons inherit their parent's Sun distance. */
  distanceFromSunKm: number
  /**
   * Semi-major axis in km from the body's own orbital elements: Sun-orbiters use
   * heliocentric a; moons use orbit around their parent.
   */
  semiMajorAxisKm: number | null
  /** Closest approach (km): perihelion for Sun-orbiters; periapsis around parent for moons. */
  perihelionKm: number | null
  /** Farthest distance (km): aphelion for Sun-orbiters; apoapsis around parent for moons. */
  aphelionKm: number | null
  /** Moon orbit offset in km from the parent (for layout); null for non-moons or unknown. */
  moonOrbitKm: number | null
  /** Stable reference to the raw catalog record, if present in the snapshot. */
  raw: CatalogBody | null
}

export function collectDistanceBodies(
  model: SizePageModel,
  json: SolarSystemJson
): DistanceBody[] {
  const all = collectSizeCanvasBodies(model)
  const index = buildBodyIndex(json)

  const rawByCanvasId = new Map<string, CatalogBody>()
  for (const b of all) {
    const raw = index.get(bodyKey(b.kind, b.row.id))
    if (raw) rawByCanvasId.set(b.canvasId, raw)
  }

  const sunId = all.find((b) => b.kind === "star")?.canvasId ?? null
  const distanceFromSunByCanvasId = new Map<string, number>()
  if (sunId) distanceFromSunByCanvasId.set(sunId, 0)

  // Compute Sun distance for non-moons first.
  for (const b of all) {
    if (b.kind === "moon") continue
    if (b.kind === "star") {
      distanceFromSunByCanvasId.set(b.canvasId, 0)
      continue
    }
    const raw = rawByCanvasId.get(b.canvasId)
    const aAu = meanDistanceAu(raw?.elements)
    const km = auToKm(aAu)
    distanceFromSunByCanvasId.set(b.canvasId, km ?? Number.NaN)
  }

  // Moons inherit parent's Sun distance.
  for (const b of all) {
    if (b.kind !== "moon") continue
    const parentCatalogId = b.parentPlanetId
    if (!parentCatalogId) {
      distanceFromSunByCanvasId.set(b.canvasId, Number.NaN)
      continue
    }
    const parent = all.find(
      (p) =>
        (p.kind === "planet" || p.kind === "dwarf") && p.row.id === parentCatalogId
    )
    const parentDist = parent
      ? distanceFromSunByCanvasId.get(parent.canvasId)
      : undefined
    distanceFromSunByCanvasId.set(b.canvasId, parentDist ?? Number.NaN)
  }

  // Heuristic moon orbit distances (km) — only used for layout.
  // If the snapshot doesn't include moon-orbit radii, we fall back to rough known averages.
  const moonOrbitFallbackKmById: Record<string, number> = {
    // Earth's Moon
    "301": 384_400,
    // Mars: Phobos/Deimos
    "401": 9_376,
    "402": 23_463,
    // Jupiter: Galileans
    "501": 421_700,
    "502": 671_034,
    "503": 1_070_412,
    "504": 1_882_709,
    // Saturn: major
    "601": 185_539,
    "602": 238_037,
    "603": 294_619,
    "604": 377_396,
    "605": 1_221_870,
    "606": 1_481_009,
    "607": 3_560_820,
    // Uranus: big five
    "701": 129_390,
    "702": 191_020,
    "703": 266_300,
    "704": 435_910,
    "705": 583_520,
    // Neptune: Triton
    "801": 354_759,
  }

  return all.map((b) => {
    const raw = rawByCanvasId.get(b.canvasId) ?? null

    const periAu = perihelionAu(raw?.elements)
    const apAu = aphelionAu(raw?.elements)
    const periKm = auToKm(periAu)
    const apKm = auToKm(apAu)

    const semiMajorAxisAu = meanDistanceAu(raw?.elements)
    const semiMajorAxisKm = auToKm(semiMajorAxisAu)

    const dist = distanceFromSunByCanvasId.get(b.canvasId)
    const distanceFromSunKm = isFiniteNonNegative(dist) ? dist : Number.NaN

    const moonOrbitKm =
      b.kind === "moon"
        ? moonOrbitFallbackKmById[b.row.id] ?? null
        : null

    return {
      ...b,
      raw,
      distanceFromSunKm,
      semiMajorAxisKm,
      perihelionKm: periKm,
      aphelionKm: apKm,
      moonOrbitKm,
    }
  })
}

export type DistanceBodyDetail = {
  name: string
  kindLabel: string
  kind: SizeCanvasBody["kind"]
  parentPlanetName: string | null
  /** Mean distance from Sun (km). */
  distanceFromSunKm: number
  /** Semi-major axis in km (heliocentric for Sun-orbiters; around parent for moons). */
  semiMajorAxisKm: number | null
  perihelionKm: number | null
  aphelionKm: number | null
  /** Moon orbit km (offset from parent), if known. */
  moonOrbitKm: number | null
  /** Neighbour ids among Sun-orbiters (moons use parent neighbours). */
  prevSunOrbiterId: string | null
  nextSunOrbiterId: string | null
}

function sortSunOrbitersByDistance(bodies: DistanceBody[]): DistanceBody[] {
  return bodies
    .filter((b) => b.kind !== "moon" && b.kind !== "star")
    .slice()
    .sort((a, b) => a.distanceFromSunKm - b.distanceFromSunKm)
}

function canonicalSunOrbiterIdForBody(
  all: DistanceBody[],
  body: DistanceBody
): string | null {
  if (body.kind !== "moon") return body.canvasId
  const pid = body.parentPlanetId
  if (!pid) return null
  const parent = all.find(
    (b) => (b.kind === "planet" || b.kind === "dwarf") && b.row.id === pid
  )
  return parent?.canvasId ?? null
}

export function findDistanceBodyDetail(
  model: SizePageModel,
  json: SolarSystemJson,
  id: string | null
): DistanceBodyDetail | null {
  if (!id) return null
  const bodies = collectDistanceBodies(model, json)
  const body = bodies.find((b) => b.canvasId === id)
  if (!body) return null

  const parentPlanetName =
    body.kind === "moon" && body.parentPlanetId
      ? findSizeRowNameById(model, body.parentPlanetId)
      : null

  const sunOrbiters = sortSunOrbitersByDistance(bodies)
  const canonical = canonicalSunOrbiterIdForBody(bodies, body)
  const i = canonical
    ? sunOrbiters.findIndex((b) => b.canvasId === canonical)
    : -1
  const prev = i > 0 ? sunOrbiters[i - 1]!.canvasId : null
  const next = i >= 0 && i < sunOrbiters.length - 1 ? sunOrbiters[i + 1]!.canvasId : null

  return {
    name: body.row.name,
    kind: body.kind,
    kindLabel: kindLabel(body.kind),
    parentPlanetName,
    distanceFromSunKm: body.distanceFromSunKm,
    semiMajorAxisKm: body.semiMajorAxisKm,
    perihelionKm: body.perihelionKm,
    aphelionKm: body.aphelionKm,
    moonOrbitKm: body.moonOrbitKm,
    prevSunOrbiterId: prev,
    nextSunOrbiterId: next,
  }
}

export function formatDistanceNumber(
  km: number | null,
  unit: "km" | "mi"
): string {
  if (km == null || !Number.isFinite(km) || km < 0) return "—"
  const n = unit === "km" ? km : km * KM_TO_MI
  const digits = n >= 1000 ? 0 : n >= 1 ? 1 : 3
  return n.toLocaleString("en-US", { maximumFractionDigits: digits })
}

export function formatDistancePx(px: number): string {
  if (!Number.isFinite(px) || px < 0) return "—"
  const digits = px >= 1 ? 1 : px >= 0.01 ? 3 : 4
  return `${px.toLocaleString("en-US", { maximumFractionDigits: digits })} px`
}

export function spokenDistanceSentence(km: number, unit: "km" | "mi"): string {
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

