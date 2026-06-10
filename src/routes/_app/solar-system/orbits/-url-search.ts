import {
  applyBodyTypePreset,
  classifyBodyTypePreset,
  type BodyTypePresetId,
  type MoonParentPolicy,
  type SizeBodyDisplayFilter,
  SIZE_BODY_KIND_ORDER,
} from "@/lib/solar-system/body-type-display"
import type { OrbitPathModel } from "@/lib/solar-system/orbits/orbit-path-sample"

import type { SizeBodyKind, SizeCanvasLabelMode } from "../size/-data"

/** Validated `/solar-system/orbits` search shape (flat for URL serialization). */
export type OrbitsRouteSearch = {
  labels: SizeCanvasLabelMode
  body?: string
  preset?: BodyTypePresetId
  k?: string
  moon?: MoonParentPolicy
  zoom_size?: number
  zoom_dist?: number
  orbit?: boolean
  /** Orbit path model on the polar canvas (`circle` default). */
  orbit_model?: OrbitPathModel
}

export const ORBITS_PAGE_DEFAULT_LINK_SEARCH: OrbitsRouteSearch = {
  labels: "on",
}

const PRESETS = new Set<BodyTypePresetId>([
  "planets",
  "planetsAndMoons",
  "auto",
])

const MOON_POLICIES = new Set<MoonParentPolicy>(["any", "planetsOnly"])

const ORBIT_MODELS = new Set<OrbitPathModel>(["circle", "kepler"])

function parseStringParam(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim()
  return undefined
}

function parsePreset(value: unknown): BodyTypePresetId | undefined {
  const s = parseStringParam(value)
  if (s && PRESETS.has(s as BodyTypePresetId)) return s as BodyTypePresetId
  return undefined
}

function parseMoon(value: unknown): MoonParentPolicy | undefined {
  const s = parseStringParam(value)
  if (s && MOON_POLICIES.has(s as MoonParentPolicy)) {
    return s as MoonParentPolicy
  }
  return undefined
}

function parseZoom(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value.trim())
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

function parseOrbit(value: unknown): boolean | undefined {
  if (value === true) return true
  if (value === false) return false
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    if (s === "1" || s === "true") return true
    if (s === "0" || s === "false") return false
  }
  return undefined
}

function parseOrbitModel(value: unknown): OrbitPathModel | undefined {
  const s = parseStringParam(value)
  if (s && ORBIT_MODELS.has(s as OrbitPathModel)) return s as OrbitPathModel
  return undefined
}

function decodeKindVisibilityString(k: string): Record<
  SizeBodyKind,
  "visible" | "hidden"
> | null {
  if (k.length !== SIZE_BODY_KIND_ORDER.length) return null
  const out = {} as Record<SizeBodyKind, "visible" | "hidden">
  for (let i = 0; i < SIZE_BODY_KIND_ORDER.length; i++) {
    const ch = k[i]
    if (ch !== "v" && ch !== "h") return null
    const kind = SIZE_BODY_KIND_ORDER[i]!
    out[kind] = ch === "v" ? "visible" : "hidden"
  }
  return out
}

export function orbitsSearchToBodyDisplayFilter(
  search: OrbitsRouteSearch
): SizeBodyDisplayFilter {
  const preset = search.preset
  if (preset) return applyBodyTypePreset(preset)

  const vis = search.k ? decodeKindVisibilityString(search.k) : null
  if (vis) {
    return {
      kindVisibility: vis,
      moonParentPolicy: search.moon ?? "any",
    }
  }

  return applyBodyTypePreset("planets")
}

function encodeKindVisibilityString(filter: SizeBodyDisplayFilter): string {
  return SIZE_BODY_KIND_ORDER.map((kind) =>
    filter.kindVisibility[kind] === "visible" ? "v" : "h"
  ).join("")
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const next = {} as Partial<T>
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key]
    if (v !== undefined) next[key] = v as T[keyof T]
  }
  return next
}

export function serializeOrbitsPageSearch(opts: {
  selectedBodyId: string | null
  bodyDisplayFilter: SizeBodyDisplayFilter
  debouncedPxPerKmSize: number
  debouncedPxPerKmDistance: number
}): Partial<OrbitsRouteSearch> {
  const out: Partial<OrbitsRouteSearch> = {}

  if (opts.selectedBodyId) out.body = opts.selectedBodyId

  const classified = classifyBodyTypePreset(opts.bodyDisplayFilter)
  if (classified === "custom") {
    out.k = encodeKindVisibilityString(opts.bodyDisplayFilter)
    if (opts.bodyDisplayFilter.moonParentPolicy !== "any") {
      out.moon = opts.bodyDisplayFilter.moonParentPolicy
    }
  } else if (classified !== "planets") {
    out.preset = classified
  }

  if (opts.debouncedPxPerKmSize > 0) {
    out.zoom_size = Number(opts.debouncedPxPerKmSize.toPrecision(9))
  }
  if (opts.debouncedPxPerKmDistance > 0) {
    out.zoom_dist = Number(opts.debouncedPxPerKmDistance.toPrecision(9))
  }

  return out
}

export function finalizeOrbitsNavigateSearch(
  partial: Partial<OrbitsRouteSearch>
): OrbitsRouteSearch {
  return parseOrbitsRouteSearch({
    labels: "on",
    ...partial,
  } as Record<string, unknown>)
}

export function parseOrbitsRouteSearch(
  search: Record<string, unknown>
): OrbitsRouteSearch {
  const preset = parsePreset(search.preset)
  const kRaw = parseStringParam(search.k)
  const moon = parseMoon(search.moon)
  const zoomSize = parseZoom(search.zoom_size)
  const zoomDist = parseZoom(search.zoom_dist)
  const orbit = parseOrbit(search.orbit)
  const orbitModel = parseOrbitModel(search.orbit_model)

  const out: OrbitsRouteSearch = {
    labels: "on",
    ...stripUndefined({
      body: parseStringParam(search.body),
      preset,
      k: kRaw,
      moon,
      zoom_size: zoomSize,
      zoom_dist: zoomDist,
      orbit,
      orbit_model: orbitModel,
    }),
  }

  if (preset) {
    delete out.k
    delete out.moon
  }

  if (out.k && decodeKindVisibilityString(out.k) == null) {
    delete out.k
    delete out.moon
  }

  return out
}
