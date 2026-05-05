import { useCallback, useEffect, useState } from "react"

import { CSS_PX_PER_MM } from "@/lib/solar-system/scale/scale-presets"

const STORAGE_KEY = "solsim:display-calibration:v1"

/** ID-1 credit card width (mm), ISO/IEC 7810. */
export const CREDIT_CARD_WIDTH_MM = 85.6

/** ID-1 credit card height (mm). Useful for sizing the calibration outline. */
export const CREDIT_CARD_HEIGHT_MM = 53.98

/** Typical hex wood pencil: distance across flats (mm), for body width. */
export const PENCIL_ACROSS_FLATS_MM = 7.2

/** ISO/IEC 7810 ID-3 passport page long edge (mm). */
export const PASSPORT_LONG_EDGE_MM = 125

/** ISO/IEC 7810 ID-3 short edge (mm). */
export const PASSPORT_SHORT_EDGE_MM = 88

export type CalibratorReference = "pencil" | "credit_card" | "passport"

/** Physical width (mm) the user matches to the on-screen horizontal outline. */
export function calibrationReferenceWidthMm(
  ref: CalibratorReference
): number {
  switch (ref) {
    case "pencil":
      return PENCIL_ACROSS_FLATS_MM
    case "credit_card":
      return CREDIT_CARD_WIDTH_MM
    case "passport":
      return PASSPORT_LONG_EDGE_MM
  }
}

export type DisplayCalibration = {
  /** CSS pixels per real-world millimeter on this display. */
  pxPerMm: number
  /** True when the user has saved a measurement; false means using the CSS spec default. */
  isCalibrated: boolean
  /** Stored width (CSS px) the user matched to a credit card; undefined when uncalibrated. */
  cardWidthPx: number | null
  /** Save a new calibration based on the user's matched card width in CSS pixels. */
  setCardWidthPx: (px: number) => void
  /** Forget the saved calibration and revert to the CSS spec default. */
  reset: () => void
}

function readStoredCardWidthPx(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const n = Number.parseFloat(raw)
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  } catch {
    return null
  }
}

/**
 * Optional, persistent display calibration. Without calibration we fall back to
 * the W3C CSS pixel convention (`1 in = 96 CSS px` → `~3.78 px / mm`), which is
 * deterministic but typically off by 10-30% on real monitors.
 */
export function useDisplayCalibration(): DisplayCalibration {
  const [cardWidthPx, setCardWidthPxState] = useState<number | null>(() =>
    readStoredCardWidthPx()
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setCardWidthPxState(readStoredCardWidthPx())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setCardWidthPx = useCallback((px: number) => {
    if (!Number.isFinite(px) || px <= 0) return
    setCardWidthPxState(px)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(px))
    } catch {
      /* localStorage unavailable; in-memory only */
    }
  }, [])

  const reset = useCallback(() => {
    setCardWidthPxState(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const isCalibrated = cardWidthPx != null && cardWidthPx > 0
  const pxPerMm = isCalibrated
    ? cardWidthPx / CREDIT_CARD_WIDTH_MM
    : CSS_PX_PER_MM

  return {
    pxPerMm,
    isCalibrated,
    cardWidthPx,
    setCardWidthPx,
    reset,
  }
}
