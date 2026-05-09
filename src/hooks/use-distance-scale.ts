import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDebouncedValue } from "@tanstack/react-pacer"

import {
  CSS_PX_PER_MM,
  computeScaleReadout,
  formatKmPerPx,
  formatScaleRatio,
  pxPerKmForMoonOnePx,
  type ScaleReadout,
  type ScaleSliderStop,
} from "@/lib/solar-system/scale/scale-presets"
import { KM_PER_AU } from "@/routes/_app/solar-system/distance/-data"

/** Matches md:[--sidebar-width:15rem] when both sidebars are assumed open. */
export const ASSUMED_SIDEBAR_PX_CSS = 240

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
    innerWidth - 2 * ASSUMED_SIDEBAR_PX_CSS - DISTANCE_CANVAS_INNER_PAD_PX
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

export type DistanceScaleMode =
  | "fit_mercury"
  | "fit_mars"
  | "fit_jupiter"
  | "fit_pluto"
  | "fit_neptune"
  | "moon_one_px"

const DISTANCE_SCALE_CYCLE: readonly DistanceScaleMode[] = [
  "fit_mercury",
  "fit_mars",
  "fit_jupiter",
  "fit_neptune",
  "moon_one_px",
] as const

export type UseDistanceScaleOptions = {
  /** Debounce delay (ms) before the canvas-facing `debouncedPxPerKm` updates. */
  debounceWaitMs?: number
  /** Initial preset mode; defaults to `fit_mars`. */
  initialMode?: DistanceScaleMode
}

export type DistanceSliderRange = {
  minPxPerKm: number
  maxPxPerKm: number
  presetSliderValueByMode: Record<DistanceScaleMode, number>
}

export function pxPerKmToSliderValueForDistanceRange(
  pxPerKm: number,
  range: DistanceSliderRange
): number {
  return pxPerKmToSliderValueWithRange(pxPerKm, range.minPxPerKm, range.maxPxPerKm)
}

export type UseDistanceScaleResult = {
  /** Preset mode when snapped near a tick; else `null`. */
  mode: DistanceScaleMode | null
  /** Label for the cycle preset button (`Custom` when between ticks). */
  cycleButtonLabel: string
  /** 0..1 slider position. */
  sliderValue: number
  /** Live pxPerKm (updates with every slider tick). */
  pxPerKm: number
  /** Debounced pxPerKm (canvas should consume this). */
  debouncedPxPerKm: number
  /** Live readout (km per px, 1:N ratio). Ratio uses CSS default calibration. */
  readout: ScaleReadout
  /** Range backing the log slider (needed to map URL pxPerKm → slider). */
  range: DistanceSliderRange
  /** Tick targets: fit scales for a few anchor bodies. */
  snapStops: ScaleSliderStop[]
  /** True if the live and debounced values disagree. */
  isPending: boolean
  /** Set the slider position directly (0..1). */
  setSliderValue: (value: number) => void
  /** Snap to the next tick (cycle presets). */
  cycleMode: () => void
  /** Snap to the named preset directly. */
  selectMode: (mode: DistanceScaleMode) => void
}

function scaleModeLabel(mode: DistanceScaleMode): string {
  switch (mode) {
    case "fit_mercury":
      return "Fit Mercury"
    case "fit_mars":
      return "Fit Mars"
    case "fit_jupiter":
      return "Fit Jupiter"
    case "fit_pluto":
      return "Fit Pluto"
    case "fit_neptune":
      return "Fit Neptune"
    case "moon_one_px":
      return "1 px Moon"
  }
}

function meanOrbitDistanceKm(mode: Exclude<DistanceScaleMode, "moon_one_px">): number {
  switch (mode) {
    case "fit_mercury":
      return 0.387098 * KM_PER_AU
    case "fit_mars":
      return 1.523679 * KM_PER_AU
    case "fit_jupiter":
      return 5.2026 * KM_PER_AU
    case "fit_pluto":
      return 39.482 * KM_PER_AU
    case "fit_neptune":
      return 30.07 * KM_PER_AU
  }
}

const SLIDER_MIN_LINEAR_PAD = 0.95
const SLIDER_MAX_LINEAR_PAD = 1.05

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

function sliderValueToPxPerKmWithRange(
  value: number,
  minPxPerKm: number,
  maxPxPerKm: number
): number {
  const v = Math.min(1, Math.max(0, value))
  const lo = Math.log10(minPxPerKm)
  const hi = Math.log10(maxPxPerKm)
  return Math.pow(10, lo + v * (hi - lo))
}

function computeDistanceSliderRange(widthPx: number): DistanceSliderRange {
  const pxPerKmByMode: Array<{ mode: DistanceScaleMode; pxPerKm: number }> = [
    {
      mode: "fit_mercury",
      pxPerKm: pxPerKmForFitDistance(
        meanOrbitDistanceKm("fit_mercury"),
        widthPx,
        DISTANCE_FIT_ORBIT_PX_OPTIONS
      ),
    },
    {
      mode: "fit_mars",
      pxPerKm: pxPerKmForFitDistance(
        meanOrbitDistanceKm("fit_mars"),
        widthPx,
        DISTANCE_FIT_ORBIT_PX_OPTIONS
      ),
    },
    {
      mode: "fit_jupiter",
      pxPerKm: pxPerKmForFitDistance(
        meanOrbitDistanceKm("fit_jupiter"),
        widthPx,
        DISTANCE_FIT_ORBIT_PX_OPTIONS
      ),
    },
    {
      mode: "fit_neptune",
      pxPerKm: pxPerKmForFitDistance(
        meanOrbitDistanceKm("fit_neptune"),
        widthPx,
        DISTANCE_FIT_ORBIT_PX_OPTIONS
      ),
    },
    { mode: "moon_one_px", pxPerKm: pxPerKmForMoonOnePx() },
  ]
  const all = pxPerKmByMode.map((x) => x.pxPerKm).filter((n) => n > 0 && Number.isFinite(n))
  const lowest = Math.min(...all)
  const highest = Math.max(...all)
  const minPxPerKm = lowest * SLIDER_MIN_LINEAR_PAD
  const maxPxPerKm = highest * SLIDER_MAX_LINEAR_PAD

  const presetSliderValueByMode = {} as Record<DistanceScaleMode, number>
  for (const { mode, pxPerKm } of pxPerKmByMode) {
    presetSliderValueByMode[mode] = pxPerKmToSliderValueWithRange(
      pxPerKm,
      minPxPerKm,
      maxPxPerKm
    )
  }
  presetSliderValueByMode.fit_pluto = pxPerKmToSliderValueWithRange(
    pxPerKmForFitDistance(
      meanOrbitDistanceKm("fit_pluto"),
      widthPx,
      DISTANCE_FIT_ORBIT_PX_OPTIONS
    ),
    minPxPerKm,
    maxPxPerKm
  )

  return { minPxPerKm, maxPxPerKm, presetSliderValueByMode }
}

function nearestPresetMode(
  value: number,
  range: DistanceSliderRange,
  tolerance = 0.008
): DistanceScaleMode | null {
  let best: DistanceScaleMode | null = null
  let bestDist = Infinity
  const modes: DistanceScaleMode[] = [
    "fit_mercury",
    "fit_mars",
    "fit_jupiter",
    "fit_neptune",
    "moon_one_px",
  ]
  for (const m of modes) {
    const p = range.presetSliderValueByMode[m]
    const d = Math.abs(p - value)
    if (d < bestDist) {
      bestDist = d
      best = m
    }
  }
  return bestDist <= tolerance ? best : null
}

function computeSnapStops(range: DistanceSliderRange): ScaleSliderStop[] {
  const modes: DistanceScaleMode[] = [
    "fit_mercury",
    "fit_mars",
    "fit_jupiter",
    "fit_neptune",
    "moon_one_px",
  ]
  return modes
    .map((m) => ({
      key: m,
      sliderValue: range.presetSliderValueByMode[m],
      caption: scaleModeLabel(m),
    }))
    .slice()
    .sort((a, b) => a.sliderValue - b.sliderValue)
}

/**
 * Distance-scale state for the distance canvas.
 *
 * - Default behavior auto-fits Mars to the assumed sidebar-adjusted width and
 *   recomputes on resize until the user touches the slider.
 */
export function useDistanceScale({
  debounceWaitMs = 150,
  initialMode = "fit_mars",
}: UseDistanceScaleOptions = {}): UseDistanceScaleResult {
  const [viewportWidthPx, setViewportWidthPx] = useState(() =>
    typeof window === "undefined" ? 1200 : assumedDistanceFitViewportWidthPx()
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const onResize = () => setViewportWidthPx(assumedDistanceFitViewportWidthPx())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const range = useMemo(
    () => computeDistanceSliderRange(viewportWidthPx),
    [viewportWidthPx]
  )

  const userTouchedRef = useRef(false)

  const [sliderValue, setSliderValueState] = useState(() => {
    const w = typeof window === "undefined" ? 1200 : assumedDistanceFitViewportWidthPx()
    const r = computeDistanceSliderRange(w)
    if (initialMode === "moon_one_px") return r.presetSliderValueByMode.moon_one_px
    const px = pxPerKmForFitDistance(
      meanOrbitDistanceKm(initialMode),
      w,
      DISTANCE_FIT_ORBIT_PX_OPTIONS
    )
    return pxPerKmToSliderValueWithRange(px, r.minPxPerKm, r.maxPxPerKm)
  })

  // Recompute the auto-fit slider position on resize until the user touches the slider.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync slider to fit preset until user adjusts */
    if (userTouchedRef.current) return
    if (initialMode === "moon_one_px") {
      setSliderValueState(range.presetSliderValueByMode.moon_one_px)
      return
    }
    const px = pxPerKmForFitDistance(
      meanOrbitDistanceKm(initialMode),
      viewportWidthPx,
      DISTANCE_FIT_ORBIT_PX_OPTIONS
    )
    setSliderValueState(
      pxPerKmToSliderValueWithRange(px, range.minPxPerKm, range.maxPxPerKm)
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialMode, range, viewportWidthPx])

  const pxPerKm = useMemo(
    () =>
      sliderValueToPxPerKmWithRange(sliderValue, range.minPxPerKm, range.maxPxPerKm),
    [sliderValue, range.maxPxPerKm, range.minPxPerKm]
  )

  const [debouncedPxPerKm] = useDebouncedValue(pxPerKm, {
    wait: debounceWaitMs,
  })

  const mode = useMemo(
    () => nearestPresetMode(sliderValue, range, 0.01),
    [sliderValue, range]
  )

  const cycleButtonLabel = useMemo(
    () => (mode != null ? scaleModeLabel(mode) : "Custom"),
    [mode]
  )

  const readout = useMemo(() => computeScaleReadout(pxPerKm, CSS_PX_PER_MM), [pxPerKm])

  const snapStops = useMemo(() => computeSnapStops(range), [range])

  const setSliderValue = useCallback((value: number) => {
    if (!Number.isFinite(value)) return
    userTouchedRef.current = true
    setSliderValueState(Math.min(1, Math.max(0, value)))
  }, [])

  const selectMode = useCallback(
    (m: DistanceScaleMode) => {
      userTouchedRef.current = true
      setSliderValueState(range.presetSliderValueByMode[m])
    },
    [range]
  )

  const cycleMode = useCallback(() => {
    userTouchedRef.current = true
    const current = mode ?? initialMode
    const i = DISTANCE_SCALE_CYCLE.indexOf(current)
    const next =
      i < 0
        ? DISTANCE_SCALE_CYCLE[0]
        : DISTANCE_SCALE_CYCLE[(i + 1) % DISTANCE_SCALE_CYCLE.length]
    selectMode(next)
  }, [initialMode, mode, selectMode])

  const isPending = pxPerKm !== debouncedPxPerKm

  return {
    mode,
    cycleButtonLabel,
    sliderValue,
    pxPerKm,
    debouncedPxPerKm,
    readout: {
      kmPerPx: readout.kmPerPx,
      ratio: readout.ratio,
    },
    range,
    snapStops,
    isPending,
    setSliderValue,
    cycleMode,
    selectMode,
  }
}

export const DistanceScaleFormat = {
  formatKmPerPx,
  formatScaleRatio,
} as const
