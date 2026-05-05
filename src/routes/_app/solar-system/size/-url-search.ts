import {
  applyBodyTypePreset,
  classifyBodyTypePreset,
  type BodyTypePresetId,
  type MoonParentPolicy,
  type SizeBodyDisplayFilter,
  SIZE_BODY_KIND_ORDER,
} from "@/lib/solar-system/body-type-display"
import {
  computeSliderRange,
  pxPerKmForMoonOnePx,
  pxPerKmToSliderValue,
  pxPerKmToSliderValueMoonLadder,
  sliderValueToPxPerKm,
  sliderValueToPxPerKmMoonLadder,
  type SliderRange,
} from "@/lib/solar-system/scale/scale-presets"

import type { SizeBodyKind, SizeCanvasLabelMode } from "./-data"

/** Validated `/solar-system/size` search shape (flat for URL serialization). */
export type SizeRouteSearch = {
  labels: SizeCanvasLabelMode
  body?: string
  preset?: BodyTypePresetId
  k?: string
  moon?: MoonParentPolicy
  zoom?: number
}

/** Minimal validated search for `<Link to="/solar-system/size">` without query params. */
export const SIZE_PAGE_DEFAULT_LINK_SEARCH: SizeRouteSearch = {
  labels: "on",
}

const LABEL_MODES = new Set<SizeCanvasLabelMode>(["on", "auto", "off"])

const PRESETS = new Set<BodyTypePresetId>([
  "planets",
  "planetsAndMoons",
  "auto",
])

const MOON_POLICIES = new Set<MoonParentPolicy>(["any", "planetsOnly"])

export function defaultMoonPxPerKm(): number {
  return pxPerKmForMoonOnePx()
}

/** Omit `zoom` from URL when within this relative tolerance of default Moon scale. */
export const ZOOM_OMIT_EPSILON_REL = 1e-9

export function zoomDiffSignificant(zoom: number): boolean {
  const def = defaultMoonPxPerKm()
  if (!(zoom > 0) || !(def > 0)) return false
  const rel = Math.abs(zoom - def) / Math.max(zoom, def)
  return rel > ZOOM_OMIT_EPSILON_REL
}

export function moonLadderPxPerKmBounds(): { minPxPerKm: number; maxPxPerKm: number } {
  return {
    minPxPerKm: sliderValueToPxPerKmMoonLadder(0),
    maxPxPerKm: sliderValueToPxPerKmMoonLadder(1),
  }
}

function clampPxPerKm(
  pxPerKm: number,
  minPxPerKm: number,
  maxPxPerKm: number
): number {
  if (!(pxPerKm > 0)) return minPxPerKm
  return Math.min(maxPxPerKm, Math.max(minPxPerKm, pxPerKm))
}

/**
 * Maps a shared `pxPerKm` to the slider position for the current calibration branch.
 */
export function pxPerKmToSliderForCalibration(opts: {
  pxPerKm: number
  isCalibrated: boolean
  pxPerMm: number
}): number {
  const { pxPerKm, isCalibrated, pxPerMm } = opts
  if (!(pxPerKm > 0)) return 0
  if (isCalibrated) {
    const range = computeSliderRange(pxPerMm)
    const clamped = clampPxPerKm(
      pxPerKm,
      range.minPxPerKm,
      range.maxPxPerKm
    )
    return pxPerKmToSliderValue(clamped, range)
  }
  const { minPxPerKm, maxPxPerKm } = moonLadderPxPerKmBounds()
  const clamped = clampPxPerKm(pxPerKm, minPxPerKm, maxPxPerKm)
  return pxPerKmToSliderValueMoonLadder(clamped)
}

function parseStringParam(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim()
  return undefined
}

function parseLabels(value: unknown): SizeCanvasLabelMode {
  const s = parseStringParam(value)
  if (s && LABEL_MODES.has(s as SizeCanvasLabelMode)) {
    return s as SizeCanvasLabelMode
  }
  return "on"
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
export function sizeSearchToBodyDisplayFilter(search: SizeRouteSearch): SizeBodyDisplayFilter {
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

function encodeKindVisibilityString(
  filter: SizeBodyDisplayFilter
): string {
  return SIZE_BODY_KIND_ORDER.map((kind) =>
    filter.kindVisibility[kind] === "visible" ? "v" : "h"
  ).join("")
}

/**
 * Partial search object for `navigate({ search })` — omit keys that match defaults
 * so URLs stay short.
 */
export function serializeSizePageSearch(opts: {
  selectedBodyId: string | null
  labelMode: SizeCanvasLabelMode
  bodyDisplayFilter: SizeBodyDisplayFilter
  debouncedPxPerKm: number
}): Partial<SizeRouteSearch> {
  const out: Partial<SizeRouteSearch> = {}

  if (opts.selectedBodyId) out.body = opts.selectedBodyId

  if (opts.labelMode !== "on") out.labels = opts.labelMode

  const classified = classifyBodyTypePreset(opts.bodyDisplayFilter)
  if (classified === "custom") {
    out.k = encodeKindVisibilityString(opts.bodyDisplayFilter)
    if (opts.bodyDisplayFilter.moonParentPolicy !== "any") {
      out.moon = opts.bodyDisplayFilter.moonParentPolicy
    }
  } else if (classified !== "planets") {
    out.preset = classified
  }

  const z = opts.debouncedPxPerKm
  if (zoomDiffSignificant(z)) {
    out.zoom = Number(z.toPrecision(9))
  }

  return out
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const next = {} as Partial<T>
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key]
    if (v !== undefined) next[key] = v as T[keyof T]
  }
  return next
}

/** Builds validated search for `navigate({ search })` from serialized partials. */
export function finalizeNavigateSearch(
  partial: Partial<SizeRouteSearch>
): SizeRouteSearch {
  return parseSizeRouteSearch({
    labels: partial.labels ?? "on",
    ...partial,
  } as Record<string, unknown>)
}

/**
 * Safe parser for `validateSearch` — never throws; invalid fragments fall back to defaults.
 */
export function parseSizeRouteSearch(
  search: Record<string, unknown>
): SizeRouteSearch {
  const preset = parsePreset(search.preset)
  const kRaw = parseStringParam(search.k)
  const moon = parseMoon(search.moon)
  const zoom = parseZoom(search.zoom)

  const out: SizeRouteSearch = {
    labels: parseLabels(search.labels),
    ...stripUndefined({
      body: parseStringParam(search.body),
      preset,
      k: kRaw,
      moon,
      zoom,
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

/** Used in tests and clamp helpers. */
export function clampZoomPxPerKmForCalibration(opts: {
  pxPerKm: number
  isCalibrated: boolean
  pxPerMm: number
}): number {
  const { pxPerKm, isCalibrated, pxPerMm } = opts
  if (!(pxPerKm > 0)) return defaultMoonPxPerKm()
  if (isCalibrated) {
    const range = computeSliderRange(pxPerMm)
    return clampPxPerKm(pxPerKm, range.minPxPerKm, range.maxPxPerKm)
  }
  const { minPxPerKm, maxPxPerKm } = moonLadderPxPerKmBounds()
  return clampPxPerKm(pxPerKm, minPxPerKm, maxPxPerKm)
}

/** Inverse of {@link pxPerKmToSliderForCalibration}: slider → pxPerKm for current branch. */
export function sliderToPxPerKmForCalibration(opts: {
  sliderValue: number
  isCalibrated: boolean
  pxPerMm: number
  range: SliderRange
}): number {
  const v = Math.min(1, Math.max(0, opts.sliderValue))
  return opts.isCalibrated
    ? sliderValueToPxPerKm(v, opts.range)
    : sliderValueToPxPerKmMoonLadder(v)
}
