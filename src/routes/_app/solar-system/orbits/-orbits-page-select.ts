import { isSizeBodyIdVisibleUnderFilter } from "@/lib/solar-system/body-type-display"
import { isDistanceRegionCanvasId } from "@/lib/solar-system/distance-regions"
import { MAX_SAFE_DISTANCE_RENDER_PX } from "@/lib/solar-system/distance-render-limit"
import type { SizeBodyDisplayFilter } from "@/lib/solar-system/body-type-display"

import {
  collectDistanceBodies,
  type SolarSystemJson,
  type SizePageModel,
} from "../distance/-data"

function polarOrbitRadiusKm(
  body: ReturnType<typeof collectDistanceBodies>[number]
): number | null {
  if (body.kind === "star") return null
  if (body.kind === "moon") {
    const r = body.moonOrbitKm ?? body.semiMajorAxisKm
    return r != null && Number.isFinite(r) ? r : null
  }
  const r = body.semiMajorAxisKm
  return r != null && Number.isFinite(r) ? r : null
}

function isBodyBeyondPolarRenderLimit(
  body: ReturnType<typeof collectDistanceBodies>[number],
  pxPerKmDistance: number
): boolean {
  const rKm = polarOrbitRadiusKm(body)
  if (rKm == null || !(pxPerKmDistance > 0)) return false
  return rKm * pxPerKmDistance > MAX_SAFE_DISTANCE_RENDER_PX
}

export function isOrbitsPageBodySelectable(
  model: SizePageModel,
  json: SolarSystemJson,
  filter: SizeBodyDisplayFilter,
  id: string | null,
  pxPerKmSize: number,
  pxPerKmDistance: number
): boolean {
  if (!id) return false

  if (isDistanceRegionCanvasId(id)) return false

  if (
    !isSizeBodyIdVisibleUnderFilter(model, filter, id, pxPerKmSize, 0)
  ) {
    return false
  }

  if (!(pxPerKmDistance > 0)) return true

  const bodies = collectDistanceBodies(model, json)
  const body = bodies.find((b) => b.canvasId === id || b.row.id === id)
  if (!body) return false

  return !isBodyBeyondPolarRenderLimit(body, pxPerKmDistance)
}
