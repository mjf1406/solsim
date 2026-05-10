import { isSizeBodyIdVisibleUnderFilter } from "@/lib/solar-system/body-type-display"
import { isDistanceRegionCanvasId } from "@/lib/solar-system/distance-regions"
import { isBodyBeyondDistanceRenderLimit } from "@/lib/solar-system/distance-render-limit"

import {
  collectDistanceBodies,
  type SolarSystemJson,
  type SizePageModel,
} from "./-data"
import type { SizeBodyDisplayFilter } from "@/lib/solar-system/body-type-display"

/** True when the body may appear on the distance strip at this scale (filter + render limit). */
export function isDistancePageBodySelectable(
  model: SizePageModel,
  json: SolarSystemJson,
  filter: SizeBodyDisplayFilter,
  id: string | null,
  pxPerKmSize: number,
  pxPerKmDistance: number,
  insetLeftPx: number
): boolean {
  if (!id) return false
  if (isDistanceRegionCanvasId(id)) return pxPerKmDistance > 0
  if (
    !isSizeBodyIdVisibleUnderFilter(model, filter, id, pxPerKmSize, 0)
  ) {
    return false
  }
  if (!(pxPerKmDistance > 0)) return true

  const bodies = collectDistanceBodies(model, json)
  const body =
    bodies.find((b) => b.canvasId === id) ?? bodies.find((b) => b.row.id === id)
  if (!body) return false

  return !isBodyBeyondDistanceRenderLimit(
    body,
    bodies,
    pxPerKmDistance,
    insetLeftPx
  )
}
