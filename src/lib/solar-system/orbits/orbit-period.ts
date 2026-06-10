import { KM_PER_AU } from "@/lib/solar-system/distance/distance-units"
import type { DistanceBody } from "@/routes/_app/solar-system/distance/-data"

/** Simulated seconds advanced per wall-clock second at each preset. */
export type TimeSpeedPreset = {
  key: string
  label: string
  simSecondsPerWallSecond: number
}

export const TIME_SPEED_PRESETS: readonly TimeSpeedPreset[] = [
  { key: "1hr", label: "1 hr/s", simSecondsPerWallSecond: 3600 },
  { key: "1day", label: "1 day/s", simSecondsPerWallSecond: 86_400 },
  { key: "1wk", label: "1 wk/s", simSecondsPerWallSecond: 604_800 },
  { key: "1mo", label: "1 mo/s", simSecondsPerWallSecond: 2_592_000 },
  { key: "1yr", label: "1 yr/s", simSecondsPerWallSecond: 31_557_600 },
  { key: "10yr", label: "10 yr/s", simSecondsPerWallSecond: 315_576_000 },
  { key: "100yr", label: "100 yr/s", simSecondsPerWallSecond: 3_155_760_000 },
] as const

export const DEFAULT_TIME_SPEED_INDEX = 1

/** Earth reference for Kepler's third law (T² ∝ a³). */
const EARTH_ORBITAL_PERIOD_SEC = 365.25 * 86_400
const EARTH_SEMI_MAJOR_KM = KM_PER_AU

/** Earth's Moon reference for scaling moon angular speeds. */
const MOON_REF_SEMI_MAJOR_KM = 384_400
const MOON_REF_ORBITAL_PERIOD_SEC = 27.32 * 86_400

/**
 * Orbital period in seconds from semi-major axis (km) via Kepler's third law,
 * normalized to Earth's year at 1 AU.
 */
export function orbitalPeriodSeconds(semiMajorAxisKm: number): number {
  if (!(semiMajorAxisKm > 0) || !Number.isFinite(semiMajorAxisKm)) {
    return EARTH_ORBITAL_PERIOD_SEC
  }
  const ratio = semiMajorAxisKm / EARTH_SEMI_MAJOR_KM
  return EARTH_ORBITAL_PERIOD_SEC * ratio ** 1.5
}

function orbitRadiusKmForPeriod(body: DistanceBody): number | null {
  if (body.kind === "star") return null
  if (body.kind === "moon") {
    const r = body.semiMajorAxisKm ?? body.moonOrbitKm
    return r != null && Number.isFinite(r) && r > 0 ? r : null
  }
  const r = body.semiMajorAxisKm
  return r != null && Number.isFinite(r) && r > 0 ? r : null
}

/**
 * Angular velocity in radians per simulated second.
 * TODO: parent mass affects moon period; currently scaled from Earth's Moon reference.
 */
export function angularVelocityRadPerSimSec(body: DistanceBody): number {
  const aKm = orbitRadiusKmForPeriod(body)
  if (aKm == null) return 0

  let periodSec = orbitalPeriodSeconds(aKm)

  if (body.kind === "moon") {
    const calcAtRef = orbitalPeriodSeconds(MOON_REF_SEMI_MAJOR_KM)
    if (calcAtRef > 0) {
      periodSec *= MOON_REF_ORBITAL_PERIOD_SEC / calcAtRef
    }
  }

  if (!(periodSec > 0)) return 0
  return (2 * Math.PI) / periodSec
}
