import {
  collectSizeCanvasBodies,
  type SizeBodyKind,
  type SizeCanvasBody,
  type SizePageModel,
} from "@/routes/_app/solar-system/size/-data"

export const SIZE_BODY_KIND_ORDER: SizeBodyKind[] = [
  "star",
  "planet",
  "moon",
  "dwarf",
  "asteroid",
  "comet",
]

export type KindRowVisibility = "visible" | "hidden"

export type MoonParentPolicy = "any" | "planetsOnly"

export type SizeBodyDisplayFilter = {
  kindVisibility: Record<SizeBodyKind, KindRowVisibility>
  moonParentPolicy: MoonParentPolicy
}

export type BodyTypePresetId = "planets" | "planetsAndMoons" | "auto"

const allVisible = (): Record<SizeBodyKind, KindRowVisibility> => ({
  star: "visible",
  planet: "visible",
  moon: "visible",
  dwarf: "visible",
  asteroid: "visible",
  comet: "visible",
})

export function defaultSizeBodyDisplayFilter(): SizeBodyDisplayFilter {
  return {
    kindVisibility: allVisible(),
    moonParentPolicy: "any",
  }
}

export function applyBodyTypePreset(
  id: BodyTypePresetId
): SizeBodyDisplayFilter {
  switch (id) {
    case "planets":
      return {
        kindVisibility: {
          star: "visible",
          planet: "visible",
          moon: "hidden",
          dwarf: "hidden",
          asteroid: "hidden",
          comet: "hidden",
        },
        moonParentPolicy: "any",
      }
    case "planetsAndMoons":
      return {
        kindVisibility: {
          star: "visible",
          planet: "visible",
          moon: "visible",
          dwarf: "hidden",
          asteroid: "hidden",
          comet: "hidden",
        },
        moonParentPolicy: "planetsOnly",
      }
    case "auto":
      return {
        kindVisibility: allVisible(),
        moonParentPolicy: "any",
      }
  }
}

function filtersEqual(
  a: SizeBodyDisplayFilter,
  b: SizeBodyDisplayFilter
): boolean {
  if (a.moonParentPolicy !== b.moonParentPolicy) return false
  for (const k of SIZE_BODY_KIND_ORDER) {
    if (a.kindVisibility[k] !== b.kindVisibility[k]) return false
  }
  return true
}

export function classifyBodyTypePreset(
  filter: SizeBodyDisplayFilter
): BodyTypePresetId | "custom" {
  for (const id of [
    "planets",
    "planetsAndMoons",
    "auto",
  ] as const satisfies readonly BodyTypePresetId[]) {
    if (filtersEqual(filter, applyBodyTypePreset(id))) return id
  }
  return "custom"
}

export function cycleBodyTypePreset(
  filter: SizeBodyDisplayFilter
): SizeBodyDisplayFilter {
  const p = classifyBodyTypePreset(filter)
  if (p === "planets") return applyBodyTypePreset("planetsAndMoons")
  if (p === "planetsAndMoons") return applyBodyTypePreset("auto")
  if (p === "auto") return applyBodyTypePreset("planets")
  return applyBodyTypePreset("planets")
}

export function presetCycleButtonLabel(filter: SizeBodyDisplayFilter): string {
  const p = classifyBodyTypePreset(filter)
  if (p === "custom") return "Custom"
  if (p === "planets") return "Planets"
  if (p === "planetsAndMoons") return "Planets+"
  return "Auto"
}

/** Widest preset / custom label for fixed-width cycle button layout. */
export const BODY_TYPE_PRESET_BUTTON_WIDTH_REF = "Planets+"

/**
 * True when the body's on-screen diameter is at least `minPx` CSS pixels at the
 * given map scale (`diameterKm * pxPerKm`).
 */
export function isRenderableAtScale(
  diameterKm: number,
  pxPerKm: number,
  minPx: number
): boolean {
  if (
    !(pxPerKm > 0) ||
    !Number.isFinite(diameterKm) ||
    !Number.isFinite(pxPerKm) ||
    !Number.isFinite(minPx)
  ) {
    return false
  }
  return diameterKm * pxPerKm >= minPx
}

export function kindByIdFromBodies(
  bodies: SizeCanvasBody[]
): Map<string, SizeBodyKind> {
  const m = new Map<string, SizeBodyKind>()
  for (const b of bodies) {
    m.set(b.row.id, b.kind)
  }
  return m
}

export function statsByKindForModel(
  model: SizePageModel,
  minPx: number,
  pxPerKm: number
): Record<SizeBodyKind, { total: number; renderable: number }> {
  const bodies = collectSizeCanvasBodies(model)
  const empty = (): Record<
    SizeBodyKind,
    { total: number; renderable: number }
  > => ({
    star: { total: 0, renderable: 0 },
    planet: { total: 0, renderable: 0 },
    moon: { total: 0, renderable: 0 },
    dwarf: { total: 0, renderable: 0 },
    asteroid: { total: 0, renderable: 0 },
    comet: { total: 0, renderable: 0 },
  })
  const out = empty()
  for (const b of bodies) {
    const s = out[b.kind]
    s.total += 1
    if (isRenderableAtScale(b.row.diameterKm, pxPerKm, minPx)) {
      s.renderable += 1
    }
  }
  return out
}

export function bodyPassesDisplayFilter(
  body: SizeCanvasBody,
  filter: SizeBodyDisplayFilter,
  kindById: Map<string, SizeBodyKind>,
  pxPerKm: number,
  minPx: number
): boolean {
  if (filter.kindVisibility[body.kind] === "hidden") return false
  if (!isRenderableAtScale(body.row.diameterKm, pxPerKm, minPx)) return false
  if (
    body.kind === "moon" &&
    body.parentPlanetId &&
    filter.moonParentPolicy === "planetsOnly"
  ) {
    const parentKind = kindById.get(body.parentPlanetId)
    if (parentKind !== "planet") return false
  }
  return true
}

export type BodyCanvasInclusion = {
  onCanvas: boolean
  /** When `onCanvas` is true, a short positive label; when false, why it is not drawn. */
  reasonLabel: string
}

const LABEL_ON_CANVAS = "On canvas"
const LABEL_KIND_HIDDEN = "Kind hidden"
const LABEL_UNDER_MIN_PX = "Under 1 px at this scale"
const LABEL_MOON_PARENT_PLANETS_ONLY = "Major-planet moons only"

/**
 * Same inclusion rules as {@link bodyPassesDisplayFilter} / the size canvas, with a
 * short label for UI (first failing check wins).
 */
export function bodyCanvasInclusion(
  body: SizeCanvasBody,
  filter: SizeBodyDisplayFilter,
  kindById: Map<string, SizeBodyKind>,
  pxPerKm: number,
  minPx: number
): BodyCanvasInclusion {
  if (filter.kindVisibility[body.kind] === "hidden") {
    return { onCanvas: false, reasonLabel: LABEL_KIND_HIDDEN }
  }
  if (!isRenderableAtScale(body.row.diameterKm, pxPerKm, minPx)) {
    return { onCanvas: false, reasonLabel: LABEL_UNDER_MIN_PX }
  }
  if (
    body.kind === "moon" &&
    body.parentPlanetId &&
    filter.moonParentPolicy === "planetsOnly"
  ) {
    const parentKind = kindById.get(body.parentPlanetId)
    if (parentKind !== "planet") {
      return { onCanvas: false, reasonLabel: LABEL_MOON_PARENT_PLANETS_ONLY }
    }
  }
  return { onCanvas: true, reasonLabel: LABEL_ON_CANVAS }
}

export function filterSizeCanvasBodiesForDisplay(
  bodies: SizeCanvasBody[],
  filter: SizeBodyDisplayFilter,
  pxPerKm: number,
  minPx: number
): SizeCanvasBody[] {
  const kindById = kindByIdFromBodies(bodies)
  return bodies.filter((b) =>
    bodyPassesDisplayFilter(b, filter, kindById, pxPerKm, minPx)
  )
}

/** Whether this id would be drawn on the size canvas under the filter (same rules as canvas). */
export function isSizeBodyIdVisibleUnderFilter(
  model: SizePageModel,
  filter: SizeBodyDisplayFilter,
  id: string | null,
  pxPerKm: number,
  minPx = 1
): boolean {
  if (!id) return false
  const bodies = collectSizeCanvasBodies(model)
  const kindById = kindByIdFromBodies(bodies)
  const body = bodies.find((b) => b.row.id === id)
  if (!body) return false
  return bodyPassesDisplayFilter(body, filter, kindById, pxPerKm, minPx)
}
