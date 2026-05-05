/** When a disk is too large to fit, anchor its center so this much chord stays inside the padded left edge. */
export const OVERSIZED_DISK_VISIBLE_ARC_PX = 120

/** Disk uses left-edge anchoring when its pixel diameter exceeds this fraction of `min(viewport width, height)`. */
export const OVERSIZED_DISK_THRESHOLD_FRAC = 0.6

export type OversizedViewportInset = {
  top: number
  right: number
  bottom: number
  left: number
}

export function shouldAnchorDiskOnLeft(
  diameterPx: number,
  wCss: number,
  hCss: number,
  thresholdFrac: number = OVERSIZED_DISK_THRESHOLD_FRAC
): boolean {
  if (!(diameterPx > 0)) return false
  const limit = Math.min(wCss, hCss) * thresholdFrac
  return diameterPx > limit
}

/**
 * Center for a disk anchored off the left so a sliver of width `visibleArcPx`
 * remains inside the canvas from `insetLeft` (same CSS space as body layout).
 */
export function leftSliverAnchorCenter(
  diameterPx: number,
  hCss: number,
  visibleArcPx: number = OVERSIZED_DISK_VISIBLE_ARC_PX,
  insetLeft = 0
): { cx: number; cy: number } {
  return {
    cx: -(diameterPx / 2) + insetLeft + visibleArcPx,
    cy: hCss / 2,
  }
}

/**
 * Clamps drag so the disk (center = baseCenter + drag, radius = diameter/2)
 * still intersects the padded viewport rectangle. Works for a left-sliver
 * anchor or any fixed base center (e.g. frozen layout center).
 */
export function clampDragOffsetForLeftAnchoredDisk(
  anchorCx: number,
  anchorCy: number,
  diameterPx: number,
  dragX: number,
  dragY: number,
  w: number,
  h: number,
  inset: OversizedViewportInset
): { x: number; y: number } {
  const r = diameterPx / 2
  if (!(r > 0) || w <= 0 || h <= 0) return { x: dragX, y: dragY }
  const { top: it, right: ir, bottom: ib, left: il } = inset

  let dx = dragX
  let dy = dragY

  const dxMin = il - anchorCx - r
  const dxMax = w - ir - anchorCx + r
  const dyMin = it - anchorCy - r
  const dyMax = h - ib - anchorCy + r

  if (dxMin <= dxMax) {
    dx = Math.min(dxMax, Math.max(dxMin, dx))
  } else {
    dx = (dxMin + dxMax) / 2
  }
  if (dyMin <= dyMax) {
    dy = Math.min(dyMax, Math.max(dyMin, dy))
  } else {
    dy = (dyMin + dyMax) / 2
  }

  return { x: dx, y: dy }
}

export type OversizedAnchorDragEntry = {
  kind: string
  id: string
  diameterPx: number
}

/**
 * For each star entry, clamps drag so the rendered disk stays in the padded
 * viewport: uses the left-sliver anchor when oversized, otherwise the frozen
 * center (skip if frozen is not set yet for that id).
 */
export function clampStarDiskDragsInViewport(
  entries: OversizedAnchorDragEntry[],
  wCss: number,
  hCss: number,
  inset: OversizedViewportInset,
  dragOffsetById: Map<string, { x: number; y: number }>,
  frozenCenterById: ReadonlyMap<string, { cx: number; cy: number }>,
  options?: {
    visibleArcPx?: number
    thresholdFrac?: number
  }
): void {
  const visibleArcPx = options?.visibleArcPx ?? OVERSIZED_DISK_VISIBLE_ARC_PX
  const thresholdFrac = options?.thresholdFrac ?? OVERSIZED_DISK_THRESHOLD_FRAC

  for (const e of entries) {
    if (e.kind !== "star" || e.diameterPx < 1) continue

    let baseCx: number
    let baseCy: number
    if (shouldAnchorDiskOnLeft(e.diameterPx, wCss, hCss, thresholdFrac)) {
      const anchor = leftSliverAnchorCenter(
        e.diameterPx,
        hCss,
        visibleArcPx,
        inset.left
      )
      baseCx = anchor.cx
      baseCy = anchor.cy
    } else {
      const frozen = frozenCenterById.get(e.id)
      if (!frozen) continue
      baseCx = frozen.cx
      baseCy = frozen.cy
    }

    const d = dragOffsetById.get(e.id) ?? { x: 0, y: 0 }
    const clamped = clampDragOffsetForLeftAnchoredDisk(
      baseCx,
      baseCy,
      e.diameterPx,
      d.x,
      d.y,
      wCss,
      hCss,
      inset
    )
    if (clamped.x !== d.x || clamped.y !== d.y) {
      dragOffsetById.set(e.id, clamped)
    }
  }
}

/**
 * @deprecated Prefer {@link clampStarDiskDragsInViewport} with the real
 * `frozenCenterById` map so drag is clamped below the anchor threshold too.
 */
export function clampOversizedStarDragsIfAnchored(
  entries: OversizedAnchorDragEntry[],
  wCss: number,
  hCss: number,
  inset: OversizedViewportInset,
  dragOffsetById: Map<string, { x: number; y: number }>,
  options?: {
    visibleArcPx?: number
    thresholdFrac?: number
  }
): void {
  clampStarDiskDragsInViewport(
    entries,
    wCss,
    hCss,
    inset,
    dragOffsetById,
    new Map(),
    options
  )
}
