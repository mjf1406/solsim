import type { DistanceBody } from "@/routes/_app/solar-system/distance/-data"

/**
 * Conservative cap below Chromium's effective element layout / scroll coordinate
 * limit (~16,777,200 CSS px). Bodies placed beyond this often fail to paint.
 */
export const MAX_SAFE_DISTANCE_RENDER_PX = 16_000_000

export type DistanceInclusionContext = {
  bodies: DistanceBody[]
  pxPerKmDistance: number
  insetLeftPx: number
}

/**
 * Horizontal center (CSS px) of `body` on the distance strip, matching
 * {@link DistanceCanvas} layout (parent X + moon offset when applicable).
 */
export function distanceBodyCenterXPx(
  body: DistanceBody,
  bodies: DistanceBody[],
  pxPerKmDistance: number,
  insetLeftPx: number
): number | null {
  if (!(pxPerKmDistance > 0) || !Number.isFinite(pxPerKmDistance)) return null

  const parentPosByCatalogId = new Map<string, number>()
  for (const e of bodies) {
    if (e.kind === "planet" || e.kind === "dwarf") {
      if (!Number.isFinite(e.distanceFromSunKm)) continue
      parentPosByCatalogId.set(
        e.row.id,
        insetLeftPx + e.distanceFromSunKm * pxPerKmDistance
      )
    }
  }

  let cx = insetLeftPx + body.distanceFromSunKm * pxPerKmDistance
  if (body.kind === "moon" && body.parentPlanetId) {
    const parentX = parentPosByCatalogId.get(body.parentPlanetId)
    if (parentX != null) {
      cx = parentX + (body.moonOrbitKm ?? 0) * pxPerKmDistance
    }
  }

  if (!Number.isFinite(cx)) return null
  return cx
}

export function isBodyBeyondDistanceRenderLimit(
  body: DistanceBody,
  bodies: DistanceBody[],
  pxPerKmDistance: number,
  insetLeftPx: number
): boolean {
  const cx = distanceBodyCenterXPx(
    body,
    bodies,
    pxPerKmDistance,
    insetLeftPx
  )
  if (cx == null) return false
  return cx > MAX_SAFE_DISTANCE_RENDER_PX
}
