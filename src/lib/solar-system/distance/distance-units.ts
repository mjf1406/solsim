/** Speed of light in km/s (same numeric basis as light-distance helpers below). */
export const LIGHT_SPEED_KM_PER_S = 299_792.458

/** Exact from snapshot metadata: `AU_km`. */
export const KM_PER_AU = 149_597_870.7

/** Kilometers per statute mile (1 mi = 1.609344 km). */
export const KM_PER_MILE = 1.609344

/** Kilometers per light-minute (speed of light × 60 s). */
export const KM_PER_LIGHT_MINUTE = LIGHT_SPEED_KM_PER_S * 60

/** Kilometers per light-hour (speed of light × 3600 s). */
export const KM_PER_LIGHT_HOUR = LIGHT_SPEED_KM_PER_S * 3600

/** Kilometers per Julian light-year (speed of light × 365.25 days). */
export const KM_PER_LIGHT_YEAR = LIGHT_SPEED_KM_PER_S * 86_400 * 365.25

const LIGHT_TIME_SCALES = [
  { sec: 365.25 * 86_400, suf: "yr" },
  { sec: 86_400, suf: "d" },
  { sec: 3600, suf: "h" },
  { sec: 60, suf: "min" },
] as const

const MAX_LIGHT_TIME_SCALE_PARTS = 4

function trimDecimalString(x: number, maxFrac: number): string {
  const p = 10 ** maxFrac
  const r = Math.round(x * p) / p
  if (Number.isInteger(r)) return String(r)
  return String(r)
}

/** Seconds only; used when duration is under one minute. */
function formatLightTimeSecondsOnly(t: number): string {
  if (t >= 100) return `${Math.round(t)}s`
  if (t >= 10) return `${trimDecimalString(t, 1)}s`
  if (t >= 1) return `${trimDecimalString(t, 2)}s`
  if (t >= 1e-6) return `${trimDecimalString(t, 3)}s`
  return `${t.toExponential(2)}s`
}

function formatLightTimeRemainderSeconds(
  rem: number,
  hasLargerUnits: boolean
): string | null {
  if (hasLargerUnits) {
    const rounded = Math.round(rem)
    return rounded > 0 ? `${rounded}s` : null
  }
  return formatLightTimeSecondsOnly(rem)
}

/**
 * Human-readable light travel time for a distance in km (time for light to cross it).
 * Uses yr → d → h → min → s, omitting zero units and shrinking detail for small totals.
 */
export function formatLightTimeFromKm(km: number): string {
  const t = km / LIGHT_SPEED_KM_PER_S
  if (!Number.isFinite(t) || t < 0) return "—"
  if (t === 0) return "0s"

  let scaleIndex = 0
  while (
    scaleIndex < LIGHT_TIME_SCALES.length &&
    t < LIGHT_TIME_SCALES[scaleIndex].sec
  ) {
    scaleIndex++
  }

  if (scaleIndex >= LIGHT_TIME_SCALES.length) {
    return formatLightTimeSecondsOnly(t)
  }

  const parts: string[] = []
  let rem = t

  for (
    let i = scaleIndex;
    i < LIGHT_TIME_SCALES.length && parts.length < MAX_LIGHT_TIME_SCALE_PARTS;
    i++
  ) {
    const { sec, suf } = LIGHT_TIME_SCALES[i]
    const n = Math.floor(rem / sec)
    rem -= n * sec
    if (n > 0) parts.push(`${n}${suf}`)
  }

  const secPart = formatLightTimeRemainderSeconds(rem, parts.length > 0)
  if (secPart) parts.push(secPart)

  return parts.length > 0 ? parts.join(" ") : formatLightTimeSecondsOnly(t)
}

export type DistanceUnit =
  | "km"
  | "px"
  | "mi"
  | "au"
  | "lmin"
  | "lhr"
  | "lyr"
  | "ltime"

export const DISTANCE_UNITS: DistanceUnit[] = [
  "km",
  "px",
  "mi",
  "au",
  "lmin",
  "lhr",
  "lyr",
  "ltime",
]

export const DISTANCE_UNIT_LABELS: Record<DistanceUnit, string> = {
  km: "km",
  px: "px",
  mi: "mi",
  au: "AU",
  lmin: "light-min",
  lhr: "light-hour",
  lyr: "light-yr",
  ltime: "light time",
}

export type DistanceUnitOrAll = DistanceUnit | "all"

/**
 * Converts kilometers from the Sun to the chosen unit's numeric value.
 * For `px`, pass `pxPerKmDistance` (CSS px per km) from the distance scale.
 * For `ltime`, returns light-travel time in seconds.
 */
export function kmToUnitValue(
  km: number,
  unit: DistanceUnit,
  pxPerKmDistance?: number
): number {
  switch (unit) {
    case "km":
      return km
    case "px":
      if (pxPerKmDistance == null || !(pxPerKmDistance > 0)) return NaN
      return km * pxPerKmDistance
    case "mi":
      return km / KM_PER_MILE
    case "au":
      return km / KM_PER_AU
    case "lmin":
      return km / KM_PER_LIGHT_MINUTE
    case "lhr":
      return km / KM_PER_LIGHT_HOUR
    case "lyr":
      return km / KM_PER_LIGHT_YEAR
    case "ltime":
      return km / LIGHT_SPEED_KM_PER_S
  }
}

const UNIT_SUFFIX: Record<DistanceUnit, string> = {
  km: " km",
  px: " px",
  mi: " mi",
  au: " AU",
  lmin: " light-min",
  lhr: " light-hour",
  lyr: " light-yr",
  ltime: "",
}

export function formatDistance(
  km: number,
  unit: DistanceUnit,
  pxPerKmDistance?: number,
  opts?: { omitUnitSuffix?: boolean }
): string {
  const omitSuffix = opts?.omitUnitSuffix === true

  if (unit === "ltime") {
    return formatLightTimeFromKm(km)
  }

  const value = kmToUnitValue(km, unit, pxPerKmDistance)
  if (unit === "px" && !Number.isFinite(value)) {
    return omitSuffix ? "—" : "— px"
  }

  const formatted = new Intl.NumberFormat(undefined, {
    maximumSignificantDigits: value !== 0 && Math.abs(value) < 1 ? 6 : 8,
    maximumFractionDigits:
      unit === "px"
        ? 2
        : value !== 0 && Math.abs(value) < 1
          ? 8
          : Math.abs(value) < 1000
            ? 4
            : 3,
  }).format(value)

  return omitSuffix ? formatted : `${formatted}${UNIT_SUFFIX[unit]}`
}
