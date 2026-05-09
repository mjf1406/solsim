/**
 * Pure scale math for the solar-system canvas.
 *
 * `pxPerKm` is the only quantity the canvas consumes; every preset and the slider
 * map onto it. Slider value `0..1` maps logarithmically to `pxPerKm`.
 *
 * Physical-size presets need a `pxPerMm` value to translate real-world sizes (mm)
 * into CSS pixels. The default `CSS_PX_PER_MM` follows the W3C convention
 * (`1 in = 96 CSS px`); calibrated displays pass a measured value via
 * `useDisplayCalibration`.
 */

/** Reference Moon diameter (km); matches the snapshot fallback in `-data.ts`. */
export const MOON_DIAMETER_KM = 3474.8

/** Reference Sun diameter (km); matches `solar_system_data.json`. */
export const SUN_DIAMETER_KM = 1_391_400

/** Regulation ping pong ball diameter (mm); ITTF 40 mm ball. */
export const PING_PONG_BALL_DIAMETER_MM = 40

/** Regulation tennis ball diameter (mm). */
export const TENNIS_BALL_DIAMETER_MM = 67

/**
 * Fastpitch softball ~12 in circumference (NFHS/NCAA class), mm diameter.
 * `12 * 25.4 / π`
 */
export const SOFTBALL_DIAMETER_MM = (12 * 25.4) / Math.PI

/** Typical large grapefruit equatorial diameter, mm. */
export const GRAPEFRUIT_TYPICAL_DIAMETER_MM = 110

/** Indoor volleyball ~65–67 cm circumference; mm diameter using 66 cm C. */
export const VOLLEYBALL_DIAMETER_MM = 660 / Math.PI

/** Regulation basketball diameter (mm). */
export const BASKETBALL_DIAMETER_MM = 239

/** Typical inflatable beach ball diameter (~16 in retail size), mm. */
export const BEACH_BALL_DIAMETER_MM = 406

/** Typical large hula hoop tube diameter (~32 in), mm. */
export const HULA_HOOP_TYPICAL_DIAMETER_MM = 32 * 25.4

/** Typical adult bicycle overall length (hybrid / city bike class), mm. */
export const ADULT_BICYCLE_TYPICAL_LENGTH_MM = 1750

/** Typical midsize sedan length (one common classroom reference), mm. */
export const CAR_TYPICAL_LENGTH_MM = 4500

/** Typical US school bus length (~40 ft class), mm. */
export const SCHOOL_BUS_TYPICAL_LENGTH_MM = 12_200

/** Typical diesel-electric locomotive body length order-of-magnitude, mm. */
export const LOCOMOTIVE_TYPICAL_LENGTH_MM = 20_000

/**
 * W3C CSS reference: `1 in = 96 CSS px`, so `1 mm = 96 / 25.4 ≈ 3.7795 CSS px`.
 * Used as the default `pxPerMm` when the user has not calibrated their display.
 */
export const CSS_PX_PER_MM = 96 / 25.4

export type ScaleMode =
  | "ping_pong_sun"
  | "tennis_ball_sun"
  | "softball_sun"
  | "moon_one_px"
  | "grapefruit_sun"
  | "volleyball_sun"
  | "basketball_sun"
  | "beach_ball_sun"
  | "hula_hoop_sun"
  | "adult_bicycle_sun"
  | "car_sun"
  | "school_bus_sun"
  | "locomotive_sun"

/**
 * Cycle order (ascending `pxPerKm` / Sun pixel size at fixed calibration).
 */
export const SCALE_MODE_CYCLE: readonly ScaleMode[] = [
  "ping_pong_sun",
  "tennis_ball_sun",
  "softball_sun",
  "moon_one_px",
  "grapefruit_sun",
  "volleyball_sun",
  "basketball_sun",
  "beach_ball_sun",
  "hula_hoop_sun",
  "adult_bicycle_sun",
  "car_sun",
  "school_bus_sun",
  "locomotive_sun",
] as const

export function nextScaleMode(mode: ScaleMode): ScaleMode {
  const i = SCALE_MODE_CYCLE.indexOf(mode)
  if (i < 0) return SCALE_MODE_CYCLE[0]
  return SCALE_MODE_CYCLE[(i + 1) % SCALE_MODE_CYCLE.length]
}

export function scaleModeLabel(mode: ScaleMode): string {
  switch (mode) {
    case "ping_pong_sun":
      return "Ping pong"
    case "tennis_ball_sun":
      return "Tennis ball"
    case "softball_sun":
      return "Softball"
    case "moon_one_px":
      return "1 px Moon"
    case "grapefruit_sun":
      return "Grapefruit"
    case "volleyball_sun":
      return "Volleyball"
    case "basketball_sun":
      return "Basketball"
    case "beach_ball_sun":
      return "Beach ball"
    case "hula_hoop_sun":
      return "Hula hoop"
    case "adult_bicycle_sun":
      return "Adult bicycle"
    case "car_sun":
      return "Car"
    case "school_bus_sun":
      return "School bus"
    case "locomotive_sun":
      return "Locomotive"
  }
}

/** Widest button label; used to reserve fixed cycle-button width. */
export const SCALE_MODE_BUTTON_WIDTH_REF = "Adult bicycle"

/**
 * Two-line captions for ticks under the log slider (hyphen + line break so the
 * block centers on the tick).
 */
export function scaleModeSliderCaption(mode: ScaleMode): string {
  switch (mode) {
    case "ping_pong_sun":
      return "Ping-\npong"
    case "tennis_ball_sun":
      return "Tennis-\nball"
    case "softball_sun":
      return "Soft-\nball"
    case "moon_one_px":
      return "1 px-\nMoon"
    case "grapefruit_sun":
      return "Grape-\nfruit"
    case "volleyball_sun":
      return "Volley-\nball"
    case "basketball_sun":
      return "Basket-\nball"
    case "beach_ball_sun":
      return "Beach-\nball"
    case "hula_hoop_sun":
      return "Hula-\nhoop"
    case "adult_bicycle_sun":
      return "Adult-\nbicycle"
    case "car_sun":
      return "Car"
    case "school_bus_sun":
      return "School-\nbus"
    case "locomotive_sun":
      return "Loco-\nmotive"
  }
}

/** Sun renders as `targetPx` CSS pixels across. */
export function pxPerKmForSunDiameter(targetPx: number): number {
  return targetPx / SUN_DIAMETER_KM
}

/** Moon renders as exactly 1 CSS pixel across (default scale). */
export function pxPerKmForMoonOnePx(): number {
  return 1 / MOON_DIAMETER_KM
}

export function pxPerKmForPingPongSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(PING_PONG_BALL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForTennisBallSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(TENNIS_BALL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForSoftballSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(SOFTBALL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForGrapefruitSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(GRAPEFRUIT_TYPICAL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForVolleyballSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(VOLLEYBALL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForBasketballSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(BASKETBALL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForBeachBallSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(BEACH_BALL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForHulaHoopSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(HULA_HOOP_TYPICAL_DIAMETER_MM * pxPerMm)
}

export function pxPerKmForAdultBicycleSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(ADULT_BICYCLE_TYPICAL_LENGTH_MM * pxPerMm)
}

export function pxPerKmForCarSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(CAR_TYPICAL_LENGTH_MM * pxPerMm)
}

export function pxPerKmForSchoolBusSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(SCHOOL_BUS_TYPICAL_LENGTH_MM * pxPerMm)
}

export function pxPerKmForLocomotiveSun(pxPerMm: number): number {
  return pxPerKmForSunDiameter(LOCOMOTIVE_TYPICAL_LENGTH_MM * pxPerMm)
}

export function pxPerKmForMode(mode: ScaleMode, pxPerMm: number): number {
  switch (mode) {
    case "ping_pong_sun":
      return pxPerKmForPingPongSun(pxPerMm)
    case "tennis_ball_sun":
      return pxPerKmForTennisBallSun(pxPerMm)
    case "softball_sun":
      return pxPerKmForSoftballSun(pxPerMm)
    case "moon_one_px":
      return pxPerKmForMoonOnePx()
    case "grapefruit_sun":
      return pxPerKmForGrapefruitSun(pxPerMm)
    case "volleyball_sun":
      return pxPerKmForVolleyballSun(pxPerMm)
    case "basketball_sun":
      return pxPerKmForBasketballSun(pxPerMm)
    case "beach_ball_sun":
      return pxPerKmForBeachBallSun(pxPerMm)
    case "hula_hoop_sun":
      return pxPerKmForHulaHoopSun(pxPerMm)
    case "adult_bicycle_sun":
      return pxPerKmForAdultBicycleSun(pxPerMm)
    case "car_sun":
      return pxPerKmForCarSun(pxPerMm)
    case "school_bus_sun":
      return pxPerKmForSchoolBusSun(pxPerMm)
    case "locomotive_sun":
      return pxPerKmForLocomotiveSun(pxPerMm)
  }
}

/**
 * Small linear padding on `pxPerKm` so outer presets sit near the slider ends
 * (ticks span the track like the Moon ladder) while still allowing a slight
 * nudge past the extreme named scales.
 */
const SLIDER_MIN_LINEAR_PAD = 0.95
const SLIDER_MAX_LINEAR_PAD = 1.05

/** Extra log-slider ticks beyond [`SCALE_MODE_CYCLE`] (e.g. Fit Mars distance-scale alignment). */
export type CanvasScaleExtraStopInput = {
  key: string
  pxPerKm: number
  label: string
}

export type SliderRange = {
  minPxPerKm: number
  maxPxPerKm: number
  /** Slider positions of each preset mode. */
  presetSliderValueByMode: Record<ScaleMode, number>
  /** Extra ticks appended after widening min/max with [`CanvasScaleExtraStopInput`]. */
  extraSnapStops: ScaleSliderStop[]
}

/**
 * Computes the log-slider range from the preset extrema (plus mild padding).
 * Values depend on `pxPerMm` (calibration).
 *
 * Optional `extraStops` widen the slider bounds so additional ticks (e.g. Fit Neptune)
 * land inside the log domain alongside the usual Sun/Moon presets.
 */
export function computeSliderRange(
  pxPerMm: number,
  extraStops?: readonly CanvasScaleExtraStopInput[]
): SliderRange {
  const pxPerKmByMode = SCALE_MODE_CYCLE.map((m) => pxPerKmForMode(m, pxPerMm))
  const extraPxFiltered =
    extraStops?.map((s) => s.pxPerKm).filter((n) => n > 0 && Number.isFinite(n)) ??
    []
  const band = [...pxPerKmByMode, ...extraPxFiltered]
  const lowest = Math.min(...band)
  const highest = Math.max(...band)
  const minPxPerKm = lowest * SLIDER_MIN_LINEAR_PAD
  const maxPxPerKm = highest * SLIDER_MAX_LINEAR_PAD

  const presetSliderValueByMode = {} as Record<ScaleMode, number>
  for (const m of SCALE_MODE_CYCLE) {
    const px = pxPerKmForMode(m, pxPerMm)
    presetSliderValueByMode[m] = pxPerKmToSliderValueWithRange(
      px,
      minPxPerKm,
      maxPxPerKm
    )
  }

  const extraSnapStops: ScaleSliderStop[] =
    extraStops?.map((s) => ({
      key: s.key,
      sliderValue: pxPerKmToSliderValueWithRange(s.pxPerKm, minPxPerKm, maxPxPerKm),
      caption: s.label,
    })) ?? []

  return { minPxPerKm, maxPxPerKm, presetSliderValueByMode, extraSnapStops }
}

function pxPerKmToSliderValueWithRange(
  pxPerKm: number,
  minPxPerKm: number,
  maxPxPerKm: number
): number {
  if (!(pxPerKm > 0) || !(minPxPerKm > 0) || !(maxPxPerKm > 0)) return 0
  const lo = Math.log10(minPxPerKm)
  const hi = Math.log10(maxPxPerKm)
  if (hi <= lo) return 0
  const v = (Math.log10(pxPerKm) - lo) / (hi - lo)
  return Math.min(1, Math.max(0, v))
}

/** 0..1 slider value → pxPerKm via log10 mapping bounded by `range`. */
export function sliderValueToPxPerKm(value: number, range: SliderRange): number {
  const v = Math.min(1, Math.max(0, value))
  const lo = Math.log10(range.minPxPerKm)
  const hi = Math.log10(range.maxPxPerKm)
  return Math.pow(10, lo + v * (hi - lo))
}

export function pxPerKmToSliderValue(pxPerKm: number, range: SliderRange): number {
  return pxPerKmToSliderValueWithRange(
    pxPerKm,
    range.minPxPerKm,
    range.maxPxPerKm
  )
}

/** Clickable log-slider stop: tick position = `sliderValue` on 0..1. */
export type ScaleSliderStop = {
  key: string
  sliderValue: number
  caption: string
}

/** Caption for `pxPerKm = moonOnePx × 2**n` (n may be negative). */
export function moonPowerOfTwoMultiplierCaption(n: number): string {
  if (n === 0) return "x1"
  if (n > 0) return `x${2 ** n}`
  const denom = 2 ** -n
  return `x1/${denom}`
}

/** Moon ladder: bottom tick x1/16 (`n = -4`), then x1/8 (`n = -3`) up to x128 (`n = 7`). */
export const MOON_LADDER_MIN_N = -4
export const MOON_LADDER_MAX_N = 7

/** Equal-spaced 0..1 slider position for integer exponent `n` on the Moon ladder. */
export function moonLadderSliderValueFromN(n: number): number {
  const span = MOON_LADDER_MAX_N - MOON_LADDER_MIN_N
  if (span <= 0) return 0
  return Math.min(1, Math.max(0, (n - MOON_LADDER_MIN_N) / span))
}

/** Uncalibrated mapping: uniform in `n` from `MOON_LADDER_MIN_N`..`MOON_LADDER_MAX_N`. */
export function sliderValueToPxPerKmMoonLadder(value: number): number {
  const moon = pxPerKmForMoonOnePx()
  if (!(moon > 0)) return Number.EPSILON
  const t = Math.min(1, Math.max(0, value))
  const n = (MOON_LADDER_MAX_N - MOON_LADDER_MIN_N) * t + MOON_LADDER_MIN_N
  return moon * 2 ** n
}

/** Inverse of [`sliderValueToPxPerKmMoonLadder`]; clamps to ladder band. */
export function pxPerKmToSliderValueMoonLadder(pxPerKm: number): number {
  const moon = pxPerKmForMoonOnePx()
  if (!(moon > 0) || !(pxPerKm > 0)) return 0
  const n = Math.log2(pxPerKm / moon)
  return moonLadderSliderValueFromN(n)
}

/**
 * Fixed snap stops x1/8 … x128: ticks equally spaced on the slider (linear in `n`).
 */
export function computeMoonPowerOfTwoSnapStops(): ScaleSliderStop[] {
  const stops: ScaleSliderStop[] = []
  for (let n = MOON_LADDER_MIN_N; n <= MOON_LADDER_MAX_N; n++) {
    stops.push({
      key: `moon_power2_${n}`,
      sliderValue: moonLadderSliderValueFromN(n),
      caption: moonPowerOfTwoMultiplierCaption(n),
    })
  }
  return stops
}

/** One-line caption for decade snap (×10¹, ×10²) after beach-ball pxPerKm. */
export function decadeSnapCaption(power: 1 | 2): string {
  const sup = ["¹", "²"] as const
  return `×10${sup[power - 1]}`
}

export function computeSliderSnapStops(
  range: SliderRange,
  isCalibrated: boolean,
  alwaysUseLogRange = false
): ScaleSliderStop[] {
  if (!isCalibrated && !alwaysUseLogRange) {
    return computeMoonPowerOfTwoSnapStops()
  }
  if (!isCalibrated && alwaysUseLogRange) {
    const moon = pxPerKmForMoonOnePx()
    const ladder: ScaleSliderStop[] = []
    for (let n = MOON_LADDER_MIN_N; n <= MOON_LADDER_MAX_N; n++) {
      const px = moon * 2 ** n
      const sliderValue = pxPerKmToSliderValue(px, range)
      if (sliderValue > 0 && sliderValue < 1) {
        ladder.push({
          key: `moon_power2_${n}`,
          sliderValue,
          caption: moonPowerOfTwoMultiplierCaption(n),
        })
      }
    }
    return [...ladder, ...range.extraSnapStops].sort(
      (a, b) => a.sliderValue - b.sliderValue
    )
  }
  const stops: ScaleSliderStop[] = []
  for (const m of SCALE_MODE_CYCLE) {
    stops.push({
      key: m,
      sliderValue: range.presetSliderValueByMode[m],
      caption: scaleModeLabel(m),
    })
  }
  stops.push(...range.extraSnapStops)
  return stops.slice().sort((a, b) => a.sliderValue - b.sliderValue)
}

/** Nearest snap stop caption for cycle button labeling when using merged preset lists. */
export function nearestSnapStopCaption(
  sliderValue: number,
  stops: ScaleSliderStop[],
  tolerance = 0.01
): string | null {
  let best: ScaleSliderStop | null = null
  let bestDist = Infinity
  for (const s of stops) {
    const d = Math.abs(s.sliderValue - sliderValue)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return bestDist <= tolerance && best ? best.caption : null
}

/**
 * Returns the preset whose slider position is within `tolerance` of `value`,
 * else `null`. Used to label the cycle button as the preset (or "Custom").
 */
export function nearestPresetMode(
  value: number,
  range: SliderRange,
  tolerance = 0.005
): ScaleMode | null {
  let best: ScaleMode | null = null
  let bestDist = Infinity
  for (const m of SCALE_MODE_CYCLE) {
    const p = range.presetSliderValueByMode[m]
    const d = Math.abs(p - value)
    if (d < bestDist) {
      bestDist = d
      best = m
    }
  }
  return bestDist <= tolerance ? best : null
}

/** Nearest Moon ladder tick caption for the cycle button when uncalibrated. */
export function nearestMoonPowerOfTwoCaption(value: number): string {
  const t = Math.min(1, Math.max(0, value))
  const nFloat = (MOON_LADDER_MAX_N - MOON_LADDER_MIN_N) * t + MOON_LADDER_MIN_N
  const n = Math.min(
    MOON_LADDER_MAX_N,
    Math.max(MOON_LADDER_MIN_N, Math.round(nFloat))
  )
  return moonPowerOfTwoMultiplierCaption(n)
}

export type ScaleReadout = {
  /** km represented by 1 CSS pixel at this `pxPerKm`. */
  kmPerPx: number
  /** Unitless scale ratio (1 : N) using the supplied `pxPerMm`. */
  ratio: number
}

export function computeScaleReadout(
  pxPerKm: number,
  pxPerMm: number
): ScaleReadout {
  const safe = pxPerKm > 0 ? pxPerKm : Number.EPSILON
  const kmPerPx = 1 / safe
  const ratio = pxPerMm > 0 ? (kmPerPx * 1_000_000) / pxPerMm : Infinity
  return { kmPerPx, ratio }
}

/** "1 px = 3,474.8 km" with adaptive precision. */
export function formatKmPerPx(kmPerPx: number): string {
  if (!Number.isFinite(kmPerPx) || kmPerPx <= 0) return "—"
  const digits = kmPerPx >= 1000 ? 0 : kmPerPx >= 1 ? 1 : kmPerPx >= 0.001 ? 4 : 6
  return `${kmPerPx.toLocaleString("en-US", { maximumFractionDigits: digits })} km`
}

/** "1 : 13,138,489,432" with no fractional digits (rounds the ratio). */
export function formatScaleRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "—"
  if (ratio >= 1) {
    return `1 : ${Math.round(ratio).toLocaleString("en-US")}`
  }
  const inv = 1 / ratio
  return `${Math.round(inv).toLocaleString("en-US")} : 1`
}
