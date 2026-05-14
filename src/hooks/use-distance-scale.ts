import { useEffect, useState } from "react"

/** Matches left sidebar `md:[--sidebar-width:30.75rem]` on `/size` and `/distance` at 16px/rem. */
export const ASSUMED_LEFT_SIDEBAR_PX_CSS = 492
/** Right sidebar default `--sidebar-width:16rem` at 16px/rem. */
export const ASSUMED_RIGHT_SIDEBAR_PX_CSS = 256

/** Uniform edge inset (CSS px) added inside each sidebar strip on the distance canvas. */
export const DISTANCE_CANVAS_BASE_INSET_PX = 14

/** Inner horizontal pad subtracted after sidebar allowance (Fit-* preset width). */
export const DISTANCE_CANVAS_INNER_PAD_PX = 28

/**
 * Horizontal margin subtracted from the Sun–outer-planet span for Fit-* orbit presets so
 * labels drawn past the disk (outside the circle) stay inside the gutters.
 */
export const DISTANCE_FIT_ORBIT_LABEL_TAIL_RESERVE_PX = 88

export type PxPerKmForFitDistanceOptions = {
  orbitLabelTailReservePx?: number
}

/** Pass-through for `/distance` orbit + size Fit-* ticks (same reserve keeps axes aligned). */
export const DISTANCE_FIT_ORBIT_PX_OPTIONS: PxPerKmForFitDistanceOptions = {
  orbitLabelTailReservePx: DISTANCE_FIT_ORBIT_LABEL_TAIL_RESERVE_PX,
}

/**
 * Width used for Fit-* distance presets: assumes both left and right sidebars occupy space,
 * plus inner padding.
 */
export function assumedDistanceFitViewportWidthPx(): number {
  if (typeof window === "undefined") return 1200
  const innerWidth = window.innerWidth ?? 1200
  return Math.max(
    200,
    innerWidth -
      ASSUMED_LEFT_SIDEBAR_PX_CSS -
      ASSUMED_RIGHT_SIDEBAR_PX_CSS -
      DISTANCE_CANVAS_INNER_PAD_PX
  )
}

/** Hook: recomputes assumed fit width on window resize. */
export function useAssumedDistanceFitViewportWidthPx(): number {
  const [widthPx, setWidthPx] = useState(() =>
    typeof window === "undefined" ? 1200 : assumedDistanceFitViewportWidthPx()
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const onResize = () => setWidthPx(assumedDistanceFitViewportWidthPx())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  return widthPx
}

/**
 * km represented by 1 CSS px along the distance axis when mean orbit `distanceKm` spans `widthPx`.
 * Use {@link DISTANCE_FIT_ORBIT_PX_OPTIONS} for Fit-* presets so outer labels fit between gutters.
 */
export function pxPerKmForFitDistance(
  distanceKm: number,
  widthPx: number,
  options?: PxPerKmForFitDistanceOptions
): number {
  if (!(distanceKm > 0) || !(widthPx > 0)) return Number.EPSILON
  const reserve = Math.max(0, options?.orbitLabelTailReservePx ?? 0)
  const span = Math.max(120, widthPx - reserve)
  return span / distanceKm
}
