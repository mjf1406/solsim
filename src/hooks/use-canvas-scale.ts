import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDebouncedValue } from "@tanstack/react-pacer"

import {
  computeMoonPowerOfTwoSnapStops,
  computeScaleReadout,
  computeSliderRange,
  computeSliderSnapStops,
  nearestMoonPowerOfTwoCaption,
  nearestPresetMode,
  nearestSnapStopCaption,
  pxPerKmForMode,
  pxPerKmToSliderValue,
  pxPerKmToSliderValueMoonLadder,
  type CanvasScaleExtraStopInput,
  type ScaleMode,
  type ScaleReadout,
  type ScaleSliderStop,
  type SliderRange,
  sliderValueToPxPerKm,
  sliderValueToPxPerKmMoonLadder,
} from "@/lib/solar-system/scale/scale-presets"

export type UseCanvasScaleOptions = {
  /** Calibrated CSS pixels per real-world mm; defaults to the CSS spec value. */
  pxPerMm: number
  /** When false, Moon ladder x1/8…x128 (equal ticks); when true, named object presets on log range. */
  isCalibrated: boolean
  /** Initial preset mode; defaults to `"moon_one_px"`. */
  initialMode?: ScaleMode
  /** Debounce delay (ms) before the canvas-facing `debouncedPxPerKm` updates. */
  debounceWaitMs?: number
  /** Widens log range and adds ticks (e.g. Fit Neptune on `/distance`). */
  extraStops?: readonly CanvasScaleExtraStopInput[]
  /**
   * Initial physical scale (px/km). Overrides `initialMode` when set.
   * Until the user touches the slider, follows updates when `range`/`initialPxPerKm` change (e.g. resize).
   */
  initialPxPerKm?: number | null
  /** Use logarithmic slider + merged snap stops even when display is not calibrated. */
  alwaysUseLogRange?: boolean
}

export type UseCanvasScaleResult = {
  /** Preset mode when calibrated and snapped near a tick; else `null`. */
  mode: ScaleMode | null
  /** Label for the cycle preset button (`Custom` when between calibrated ticks). */
  cycleButtonLabel: string
  /** 0..1 slider position. */
  sliderValue: number
  /** Live `pxPerKm` (updates with every slider tick). */
  pxPerKm: number
  /** Debounced `pxPerKm` (canvas should consume this). */
  debouncedPxPerKm: number
  /** Live readout (km per px, 1:N ratio) using the live `pxPerKm`. */
  readout: ScaleReadout
  /** Slider extents (log space) and the snap positions of each named preset. */
  range: SliderRange
  /** Tick targets: Moon ladder x1/8…x128 when uncalibrated; else named object presets. */
  snapStops: ScaleSliderStop[]
  /** True if the live and debounced values disagree — slider is still settling. */
  isPending: boolean
  /** Set the slider position directly (e.g. from a drag). */
  setSliderValue: (value: number) => void
  /** Snap to the next tick (Moon ladder step or named preset). */
  cycleMode: () => void
  /** Snap the slider to the named preset directly. */
  selectMode: (mode: ScaleMode) => void
}

/**
 * Reusable canvas-scale state: uncalibrated Moon ladder (equal ticks x1/8…x128),
 * or calibrated log slider with named presets.
 *
 * - `pxPerKm` updates synchronously while the user drags (so the readout feels
 *   live).
 * - `debouncedPxPerKm` lags by `debounceWaitMs`; canvases that have to relay
 *   out / redraw should consume this value to avoid thrashing during drag.
 *
 * Recomputation: when `pxPerMm` changes, calibrated mode preserves `pxPerKm` by
 * remapping the log slider; uncalibrated ladder position is unchanged.
 */
export function useCanvasScale({
  pxPerMm,
  isCalibrated,
  initialMode = "moon_one_px",
  debounceWaitMs = 150,
  extraStops,
  initialPxPerKm,
  alwaysUseLogRange = false,
}: UseCanvasScaleOptions): UseCanvasScaleResult {
  const range = useMemo(
    () => computeSliderRange(pxPerMm, extraStops),
    [extraStops, pxPerMm]
  )

  const userTouchedRef = useRef(false)

  const logBranch = isCalibrated || alwaysUseLogRange

  const [sliderValue, setSliderValueState] = useState(() => {
    const r = computeSliderRange(pxPerMm, extraStops)
    if (initialPxPerKm != null && initialPxPerKm > 0 && Number.isFinite(initialPxPerKm)) {
      return pxPerKmToSliderValue(initialPxPerKm, r)
    }
    const px = pxPerKmForMode(initialMode, pxPerMm)
    return logBranch ? pxPerKmToSliderValue(px, r) : pxPerKmToSliderValueMoonLadder(px)
  })

  // Track the previous range so we can preserve the *physical* pxPerKm when
  // calibration changes (rather than the slider fraction, which would silently
  // change the chosen scale every time the user re-calibrates).
  const prevRangeRef = useRef<SliderRange>(range)
  const prevPxMmRef = useRef(pxPerMm)
  useEffect(() => {
    if (prevRangeRef.current === range) return
    const prev = prevRangeRef.current
    prevRangeRef.current = range
    if (!logBranch) return
    const pxMmChanged = prevPxMmRef.current !== pxPerMm
    prevPxMmRef.current = pxPerMm
    // Resize-only range updates (same mm calibration): auto-fit via `initialPxPerKm` effect.
    if (
      !pxMmChanged &&
      initialPxPerKm != null &&
      !userTouchedRef.current
    ) {
      return
    }
    const prevPxPerKm = sliderValueToPxPerKm(sliderValue, prev)
    const nextSlider = pxPerKmToSliderValue(prevPxPerKm, range)
    setSliderValueState(nextSlider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPxPerKm, logBranch, pxPerMm, range])

  const prevIsCalibratedRef = useRef(isCalibrated)
  useEffect(() => {
    if (alwaysUseLogRange) return
    if (prevIsCalibratedRef.current === isCalibrated) return
    const wasCalibrated = prevIsCalibratedRef.current
    prevIsCalibratedRef.current = isCalibrated
    if (wasCalibrated && !isCalibrated) {
      const px = sliderValueToPxPerKm(sliderValue, range)
      setSliderValueState(pxPerKmToSliderValueMoonLadder(px))
    } else if (!wasCalibrated && isCalibrated) {
      const px = sliderValueToPxPerKmMoonLadder(sliderValue)
      setSliderValueState(pxPerKmToSliderValue(px, range))
    }
  }, [alwaysUseLogRange, isCalibrated, range, sliderValue])

  useEffect(() => {
    if (initialPxPerKm == null || !(initialPxPerKm > 0) || !Number.isFinite(initialPxPerKm)) {
      return
    }
    if (userTouchedRef.current) return
    setSliderValueState(pxPerKmToSliderValue(initialPxPerKm, range))
  }, [initialPxPerKm, range])

  const pxPerKm = useMemo(
    () =>
      logBranch ? sliderValueToPxPerKm(sliderValue, range) : sliderValueToPxPerKmMoonLadder(sliderValue),
    [logBranch, sliderValue, range]
  )

  const [debouncedPxPerKm] = useDebouncedValue(pxPerKm, {
    wait: debounceWaitMs,
  })

  const mode = useMemo(
    () => (logBranch ? nearestPresetMode(sliderValue, range, 0.008) : null),
    [logBranch, sliderValue, range]
  )

  const snapStops = useMemo(
    () => computeSliderSnapStops(range, isCalibrated, alwaysUseLogRange),
    [alwaysUseLogRange, isCalibrated, range]
  )

  const cycleButtonLabel = useMemo(() => {
    if (logBranch) {
      return nearestSnapStopCaption(sliderValue, snapStops, 0.012) ?? "Custom"
    }
    return nearestMoonPowerOfTwoCaption(sliderValue)
  }, [logBranch, sliderValue, snapStops])

  const readout = useMemo(
    () => computeScaleReadout(pxPerKm, pxPerMm),
    [pxPerKm, pxPerMm]
  )

  const setSliderValue = useCallback((value: number) => {
    if (!Number.isFinite(value)) return
    userTouchedRef.current = true
    setSliderValueState(Math.min(1, Math.max(0, value)))
  }, [])

  const selectMode = useCallback(
    (m: ScaleMode) => {
      userTouchedRef.current = true
      const v = range.presetSliderValueByMode[m]
      setSliderValueState(v)
    },
    [range]
  )

  const cycleMode = useCallback(() => {
    userTouchedRef.current = true
    if (logBranch) {
      const stops = computeSliderSnapStops(range, isCalibrated, alwaysUseLogRange)
      if (stops.length === 0) return
      let bestI = 0
      let bestD = Infinity
      for (let i = 0; i < stops.length; i++) {
        const d = Math.abs(stops[i]!.sliderValue - sliderValue)
        if (d < bestD) {
          bestD = d
          bestI = i
        }
      }
      const nextI = (bestI + 1) % stops.length
      setSliderValueState(stops[nextI]!.sliderValue)
      return
    }
    const stops = computeMoonPowerOfTwoSnapStops()
    if (stops.length === 0) return
    let bestI = 0
    let bestD = Infinity
    for (let i = 0; i < stops.length; i++) {
      const d = Math.abs(stops[i]!.sliderValue - sliderValue)
      if (d < bestD) {
        bestD = d
        bestI = i
      }
    }
    const nextI = (bestI + 1) % stops.length
    setSliderValueState(stops[nextI]!.sliderValue)
  }, [alwaysUseLogRange, isCalibrated, logBranch, range, sliderValue])

  const isPending = pxPerKm !== debouncedPxPerKm

  return {
    mode,
    cycleButtonLabel,
    sliderValue,
    pxPerKm,
    debouncedPxPerKm,
    readout,
    range,
    snapStops,
    isPending,
    setSliderValue,
    cycleMode,
    selectMode,
  }
}
