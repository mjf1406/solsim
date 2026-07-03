import {
  ADULT_BICYCLE_TYPICAL_LENGTH_MM,
  BASKETBALL_DIAMETER_MM,
  BEACH_BALL_DIAMETER_MM,
  CAR_TYPICAL_LENGTH_MM,
  GRAPEFRUIT_TYPICAL_DIAMETER_MM,
  HULA_HOOP_TYPICAL_DIAMETER_MM,
  LOCOMOTIVE_TYPICAL_LENGTH_MM,
  MOON_DIAMETER_KM,
  PING_PONG_BALL_DIAMETER_MM,
  SCHOOL_BUS_TYPICAL_LENGTH_MM,
  SOFTBALL_DIAMETER_MM,
  SUN_DIAMETER_KM,
  TENNIS_BALL_DIAMETER_MM,
  VOLLEYBALL_DIAMETER_MM,
  SCALE_MODE_CYCLE,
  scaleModeLabel,
  type ScaleMode,
} from "@/lib/solar-system/scale/scale-presets"

export const MIN_DISK_PX = 14

/** Fraction of card inner width used as the maximum disk diameter. */
export const CARD_MAX_DISK_FRACTION = 0.82

export type SunSizeUnit = "in" | "cm"

export const MM_PER_IN = 25.4
export const MM_PER_CM = 10

/** Default Sun diameter: 4 inches (common classroom reference). */
export const DEFAULT_SUN_MM = 4 * MM_PER_IN

export function mmPerKmFromSun(sunMm: number): number {
  if (!Number.isFinite(sunMm) || sunMm <= 0) return Number.NaN
  return sunMm / SUN_DIAMETER_KM
}

export function scaledBodyMm(diameterKm: number, sunMm: number): number {
  return diameterKm * mmPerKmFromSun(sunMm)
}

export function displayPxFromMm(scaledMm: number, pxPerMm: number): number {
  if (!Number.isFinite(scaledMm) || scaledMm < 0) return 0
  if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) return 0
  return scaledMm * pxPerMm
}

export type BodyRenderState =
  | { renderable: true }
  | { renderable: false; reason: "too_small"; scaledMm: number }
  | { renderable: false; reason: "unknown_size" }

export function getBodyRenderState(
  diameterKm: number | null,
  sunMm: number,
  pxPerMm: number
): BodyRenderState {
  if (diameterKm == null || !Number.isFinite(diameterKm)) {
    return { renderable: false, reason: "unknown_size" }
  }
  const scaledMm = scaledBodyMm(diameterKm, sunMm)
  const displayPx = displayPxFromMm(scaledMm, pxPerMm)
  if (displayPx < MIN_DISK_PX) {
    return { renderable: false, reason: "too_small", scaledMm }
  }
  return { renderable: true }
}

export function isBodyRenderable(
  diameterKm: number | null,
  sunMm: number,
  pxPerMm: number
): boolean {
  return getBodyRenderState(diameterKm, sunMm, pxPerMm).renderable
}

export function clampDiskToCardMax(displayPx: number, cardMaxPx: number): number {
  if (!Number.isFinite(displayPx) || displayPx <= 0) return 0
  return Math.min(displayPx, cardMaxPx)
}

export function sunMmToUnitValue(sunMm: number, unit: SunSizeUnit): number {
  return unit === "in" ? sunMm / MM_PER_IN : sunMm / MM_PER_CM
}

export function unitValueToSunMm(value: number, unit: SunSizeUnit): number {
  if (!Number.isFinite(value) || value <= 0) return Number.NaN
  return unit === "in" ? value * MM_PER_IN : value * MM_PER_CM
}

export function sunDiameterMmForScaleMode(
  mode: ScaleMode,
  pxPerMm: number
): number {
  if (mode === "moon_one_px") {
    if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) return Number.NaN
    return SUN_DIAMETER_KM / (MOON_DIAMETER_KM * pxPerMm)
  }
  switch (mode) {
    case "ping_pong_sun":
      return PING_PONG_BALL_DIAMETER_MM
    case "tennis_ball_sun":
      return TENNIS_BALL_DIAMETER_MM
    case "softball_sun":
      return SOFTBALL_DIAMETER_MM
    case "grapefruit_sun":
      return GRAPEFRUIT_TYPICAL_DIAMETER_MM
    case "volleyball_sun":
      return VOLLEYBALL_DIAMETER_MM
    case "basketball_sun":
      return BASKETBALL_DIAMETER_MM
    case "beach_ball_sun":
      return BEACH_BALL_DIAMETER_MM
    case "hula_hoop_sun":
      return HULA_HOOP_TYPICAL_DIAMETER_MM
    case "adult_bicycle_sun":
      return ADULT_BICYCLE_TYPICAL_LENGTH_MM
    case "car_sun":
      return CAR_TYPICAL_LENGTH_MM
    case "school_bus_sun":
      return SCHOOL_BUS_TYPICAL_LENGTH_MM
    case "locomotive_sun":
      return LOCOMOTIVE_TYPICAL_LENGTH_MM
    default:
      return Number.NaN
  }
}

export const REAL_WORLD_SUN_PRESETS = SCALE_MODE_CYCLE.map((mode) => ({
  id: mode,
  label: scaleModeLabel(mode),
}))
