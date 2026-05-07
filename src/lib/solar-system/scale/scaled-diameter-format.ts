/**
 * Pure helpers for the "Scaled diameter" sidebar stat: the body's real-world
 * physical size on the user's screen at the current canvas scale.
 *
 * Formula: `mm = diameterKm * pxPerKm / pxPerMm`, where `pxPerKm` is the live
 * canvas scale and `pxPerMm` is the display calibration (CSS-spec fallback when
 * the user hasn't calibrated, in which case the result is approximate).
 *
 * Auto-unit selection picks the smallest sensible unit such that the displayed
 * value is at least 1, capped at km (metric) or mi (imperial). For metric,
 * sub-millimeter values stay in mm (never µm), clamped below a hundredth.
 * Normal values round to two decimal places for display.
 */

import { spokenNumberEnUsFromEnUsDisplay } from "@/lib/reading/spoken-number-en-us"

/** Statute mile to kilometer (exact: `1 mi = 1.609344 km`). */
const KM_PER_MI = 1.609344
/** Inches per millimeter (exact: `1 in = 25.4 mm`). */
const MM_PER_IN = 25.4
const IN_PER_FT = 12
const FT_PER_MI = 5280

export type ScaledDiameterUnitSystem = "metric" | "imperial"

export type MetricUnit = "mm" | "cm" | "m" | "km"
export type ImperialUnit = "in" | "ft" | "mi"
export type ScaledDiameterUnit = MetricUnit | ImperialUnit

export type ScaledDiameterFormatted = {
  /** Formatted number without the unit suffix, e.g. `"12.35"` or `"4.50e-3"`. */
  display: string
  /** Auto-picked unit symbol. */
  unit: ScaledDiameterUnit
  /** The numeric value in the chosen unit, before formatting. */
  valueInUnit: number
  /** Singular noun for the unit, e.g. `"millimeter"` (used by spoken sentence). */
  unitWordsSingular: string
  /** Plural noun for the unit, e.g. `"millimeters"` (used by spoken sentence). */
  unitWordsPlural: string
}

/**
 * Real-world physical mm a body occupies on the user's screen at the current
 * scale. Returns `NaN` if any input is non-finite or non-positive.
 */
export function scaledDiameterMm(
  diameterKm: number,
  pxPerKm: number,
  pxPerMm: number
): number {
  if (!Number.isFinite(diameterKm) || diameterKm < 0) return Number.NaN
  if (!Number.isFinite(pxPerKm) || pxPerKm <= 0) return Number.NaN
  if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) return Number.NaN
  return (diameterKm * pxPerKm) / pxPerMm
}

function roundToTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100
}

function roundToThreeDecimals(n: number): number {
  return Math.round(n * 1000) / 1000
}

function unitWords(unit: ScaledDiameterUnit): {
  singular: string
  plural: string
} {
  switch (unit) {
    case "mm":
      return { singular: "millimeter", plural: "millimeters" }
    case "cm":
      return { singular: "centimeter", plural: "centimeters" }
    case "m":
      return { singular: "meter", plural: "meters" }
    case "km":
      return { singular: "kilometer", plural: "kilometers" }
    case "in":
      return { singular: "inch", plural: "inches" }
    case "ft":
      return { singular: "foot", plural: "feet" }
    case "mi":
      return { singular: "mile", plural: "miles" }
  }
}

/** Picks the smallest metric unit where the value is ≥ 1, capped at km. */
function pickMetric(mm: number): { value: number; unit: MetricUnit } {
  const km = mm / 1_000_000
  if (km >= 1) return { value: km, unit: "km" }
  const m = mm / 1000
  if (m >= 1) return { value: m, unit: "m" }
  const cm = mm / 10
  if (cm >= 1) return { value: cm, unit: "cm" }
  return { value: mm, unit: "mm" }
}

/** Picks the smallest imperial unit where the value is ≥ 1, capped at mi. */
function pickImperial(mm: number): { value: number; unit: ImperialUnit } {
  const inches = mm / MM_PER_IN
  const feet = inches / IN_PER_FT
  const miles = feet / FT_PER_MI
  if (miles >= 1) return { value: miles, unit: "mi" }
  if (feet >= 1) return { value: feet, unit: "ft" }
  return { value: inches, unit: "in" }
}

/**
 * Auto-picks the most sensible sub-unit on the chosen side and formats it.
 *
 * Returns sentinel `display: "—"` when `mm` is non-finite or negative; callers
 * should branch on that the same way they branch on a missing diameter row.
 */
export function formatScaledDiameter(
  mm: number,
  system: ScaledDiameterUnitSystem
): ScaledDiameterFormatted {
  if (!Number.isFinite(mm) || mm < 0) {
    return {
      display: "—",
      unit: system === "metric" ? "mm" : "in",
      valueInUnit: Number.NaN,
      unitWordsSingular: system === "metric" ? "millimeter" : "inch",
      unitWordsPlural: system === "metric" ? "millimeters" : "inches",
    }
  }

  const { value, unit } =
    system === "metric" ? pickMetric(mm) : pickImperial(mm)

  let display: string
  let valueInUnit: number
  if (system === "metric" && unit === "mm" && value > 0 && value < 1) {
    if (value < 0.01) {
      display = "< 0.01"
      valueInUnit = value
    } else {
      valueInUnit = roundToThreeDecimals(value)
      display = valueInUnit.toLocaleString("en-US", {
        maximumFractionDigits: 3,
        minimumFractionDigits: 0,
      })
    }
  } else if (value > 0 && value < 0.001) {
    // Keep very small values compact for non-mm contexts.
    display = value.toExponential(2)
    valueInUnit = value
  } else {
    valueInUnit = roundToTwoDecimals(value)
    display = valueInUnit.toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  }

  const words = unitWords(unit)
  return {
    display,
    unit,
    valueInUnit,
    unitWordsSingular: words.singular,
    unitWordsPlural: words.plural,
  }
}

/**
 * English sentence for the auto-picked scaled diameter, mirroring the style of
 * `spokenDiameterSentence` in the size page data layer.
 *
 * Falls back to the bare unit word when the value is below the spoken-number
 * helper's resolution (e.g. tiny values that are clamped for display).
 *
 * For normal values, spoken decimals match {@link formatScaledDiameter}'s `display`
 * digit-for-digit after the decimal point.
 */
export function spokenScaledDiameterSentence(
  mm: number,
  system: ScaledDiameterUnitSystem
): string {
  const formatted = formatScaledDiameter(mm, system)
  const value = formatted.valueInUnit
  if (!Number.isFinite(value) || value < 0) return ""

  if (system === "metric" && formatted.unit === "mm" && mm > 0 && mm < 0.01) {
    return "Less than one hundredth of a millimeter."
  }

  // Very small positive values are awkward to read as decimals; keep the sentence simple.
  if (value > 0 && value < 0.05) {
    return `Less than one ${formatted.unitWordsSingular}.`
  }

  const displayNormalized = formatted.display.replace(/,/g, "")
  const words = spokenNumberEnUsFromEnUsDisplay(formatted.display)
  const singular =
    displayNormalized === "1" ||
    displayNormalized === "1.0" ||
    displayNormalized === "1.00"
  const unitWord = singular
    ? formatted.unitWordsSingular
    : formatted.unitWordsPlural
  const sentence = `${words} ${unitWord}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + "."
}

// Exported for tests and callers that want the same exact-conversion constants
// used by the formatter.
export const SCALED_DIAMETER_CONSTANTS = {
  KM_PER_MI,
  MM_PER_IN,
  IN_PER_FT,
  FT_PER_MI,
} as const
