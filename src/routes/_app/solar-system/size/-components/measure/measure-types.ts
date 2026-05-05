/** Extensible: future measure targets (segments, orbits, etc.). */
export type MeasureSubjectKind = "body"

/** Unit of measure on the Size canvas (v1: a body's disk). */
export type MeasureUnitBody = { kind: "body"; canvasId: string }

/** Resolved pick on the canvas while measuring (v1: body disk or label). */
export type MeasureTargetHitBody = { kind: "body"; canvasId: string }

export type BodyMeasureOverlay =
  | null
  | {
      kind: "reject"
      targetCanvasId: string
      /** Monotonic clock (`performance.now()`): shake offset applies while `now < shakeEndMs`. */
      shakeEndMs: number
      /** Monotonic clock (`performance.now()`): X mark draws while `now < xEndMs`. */
      xEndMs: number
    }
  | {
      kind: "success"
      targetCanvasId: string
      unitCanvasId: string
      /** `targetDiameterKm / unitDiameterKm` (exact; label may round for display). */
      ratio: number
    }
