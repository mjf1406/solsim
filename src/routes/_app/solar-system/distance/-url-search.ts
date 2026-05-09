import {
  applyBodyTypePreset,
  classifyBodyTypePreset,
  type BodyTypePresetId,
  type MoonParentPolicy,
  type SizeBodyDisplayFilter,
  SIZE_BODY_KIND_ORDER,
} from "@/lib/solar-system/body-type-display"

import type { SizeBodyKind, SizeCanvasLabelMode } from "../size/-data"

/** Validated `/solar-system/distance` search shape (flat for URL serialization). */
export type DistanceRouteSearch = {
  labels: SizeCanvasLabelMode
  body?: string
  preset?: BodyTypePresetId
  k?: string
  moon?: MoonParentPolicy
  /** pxPerKm used for body diameters (size scale). */
  zoom_size?: number
  /** pxPerKm used for x-axis distances (distance scale). */
  zoom_dist?: number
}

/** Minimal validated search for `<Link to="/solar-system/distance">` without query params. */
export const DISTANCE_PAGE_DEFAULT_LINK_SEARCH: DistanceRouteSearch = {
  labels: "on",
}

const PRESETS = new Set<BodyTypePresetId>([
  "planets",
  "planetsAndMoons",
  "auto",
])

const MOON_POLICIES = new Set<MoonParentPolicy>(["any", "planetsOnly"])

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

/** Build filter from validated search fields (`preset` overrides `k` / `moon`). */
export function distanceSearchToBodyDisplayFilter(
  search: DistanceRouteSearch
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

/**
 * Partial search object for `navigate({ search })` — omit keys that match defaults
 * so URLs stay short.
 */
export function serializeDistancePageSearch(opts: {
  selectedBodyId: string | null
  bodyDisplayFilter: SizeBodyDisplayFilter
  debouncedPxPerKmSize: number
  debouncedPxPerKmDistance: number
}): Partial<DistanceRouteSearch> {
  const out: Partial<DistanceRouteSearch> = {}

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

/** Builds validated search for `navigate({ search })` from serialized partials. */
export function finalizeNavigateSearch(
  partial: Partial<DistanceRouteSearch>
): DistanceRouteSearch {
  return parseDistanceRouteSearch({
    labels: "on",
    ...partial,
  } as Record<string, unknown>)
}

/**
 * Safe parser for `validateSearch` — never throws; invalid fragments fall back to defaults.
 */
export function parseDistanceRouteSearch(
  search: Record<string, unknown>
): DistanceRouteSearch {
  const preset = parsePreset(search.preset)
  const kRaw = parseStringParam(search.k)
  const moon = parseMoon(search.moon)
  const zoomSize = parseZoom(search.zoom_size)
  const zoomDist = parseZoom(search.zoom_dist)

  const out: DistanceRouteSearch = {
    labels: "on",
    ...stripUndefined({
      body: parseStringParam(search.body),
      preset,
      k: kRaw,
      moon,
      zoom_size: zoomSize,
      zoom_dist: zoomDist,
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

