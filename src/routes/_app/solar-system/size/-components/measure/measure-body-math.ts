/** Exact ratio of diameters (target ÷ unit). */
export function bodyDiameterRatio(targetKm: number, unitKm: number): number {
  return targetKm / unitKm
}

const MAX_TILED_UNIT_DISKS = 96

/**
 * Horizontal centers (px) for unit disks drawn edge-to-edge across the target's
 * diameter. When there are too many for `MAX_TILED_UNIT_DISKS`, centers are
 * sampled evenly along the chord (label still uses exact `ratio`).
 */
export function diskCentersAlongTargetDiameter(
  cx: number,
  targetRadiusPx: number,
  unitDiameterPx: number,
  ratio: number
): number[] {
  const Du = unitDiameterPx
  const ru = Du / 2
  const R = targetRadiusPx
  if (!(Du > 0) || !(R > 0)) return []

  const fullCount = Math.max(0, Math.floor(ratio))
  if (fullCount <= 0) return []

  const maxDraw = Math.min(fullCount, MAX_TILED_UNIT_DISKS)
  if (maxDraw <= 0) return []

  if (fullCount <= MAX_TILED_UNIT_DISKS) {
    const centers: number[] = []
    for (let k = 0; k < fullCount; k++) {
      centers.push(cx - R + ru + k * Du)
    }
    return centers
  }

  const left = cx - R + ru
  const right = cx + R - ru
  if (right <= left) return [cx]

  const centers: number[] = []
  for (let i = 0; i < maxDraw; i++) {
    const t = maxDraw === 1 ? 0 : i / (maxDraw - 1)
    centers.push(left + t * (right - left))
  }
  return centers
}

/** Display string for the measure label (≤1 decimal, no grouping). */
export function formatMeasureRatioForLabel(ratio: number): string {
  return ratio.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    useGrouping: false,
  })
}
