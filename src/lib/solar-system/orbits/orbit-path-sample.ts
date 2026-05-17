import type { DistanceBody } from "@/routes/_app/solar-system/distance/-data"

export type OrbitPathModel = "circle" | "kepler"

export type OrbitPathSampleKm = { xKm: number; yKm: number }

export type OrbitPath = {
  /** Closed loop of world-space samples in km (top-down: +x right, +y down). */
  samplePathKm(steps: number): OrbitPathSampleKm[]
  /** Position at fractional path parameter f in [0, 1). */
  positionAtFractionKm(f: number): OrbitPathSampleKm
}

function sampleCircleKm(
  radiusKm: number,
  steps: number,
  phaseRad: number
): OrbitPathSampleKm[] {
  const n = Math.max(8, Math.floor(steps))
  const out: OrbitPathSampleKm[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + phaseRad
    out.push({
      xKm: radiusKm * Math.cos(t),
      yKm: radiusKm * Math.sin(t),
    })
  }
  return out
}

export function circularOrbitPath(opts: {
  radiusKm: number
  phaseRad?: number
}): OrbitPath {
  const radiusKm = Math.max(0, opts.radiusKm)
  const phaseRad = opts.phaseRad ?? 0
  return {
    samplePathKm(steps) {
      return sampleCircleKm(radiusKm, steps, phaseRad)
    },
    positionAtFractionKm(f) {
      const t = f * Math.PI * 2 + phaseRad
      return {
        xKm: radiusKm * Math.cos(t),
        yKm: radiusKm * Math.sin(t),
      }
    },
  }
}

/** Keplerian ellipse in the orbital plane — stub uses circle at semi-major axis until implemented. */
export function keplerOrbitPath(opts: {
  semiMajorAxisKm: number
  eccentricity: number | null
  argOfPerihelionRad?: number | null
  longitudeOfAscendingNodeRad?: number | null
  inclinationRad?: number | null
  phaseRad?: number
}): OrbitPath {
  const a = Math.max(0, opts.semiMajorAxisKm)
  const e =
    opts.eccentricity != null && Number.isFinite(opts.eccentricity)
      ? Math.min(0.999, Math.max(0, opts.eccentricity))
      : 0
  const phaseRad = opts.phaseRad ?? 0
  const omega = opts.argOfPerihelionRad ?? 0

  if (e < 1e-6) {
    return circularOrbitPath({ radiusKm: a, phaseRad })
  }

  const b = a * Math.sqrt(1 - e * e)

  return {
    samplePathKm(steps) {
      const n = Math.max(8, Math.floor(steps))
      const out: OrbitPathSampleKm[] = []
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2 + phaseRad
        const x = a * Math.cos(t)
        const y = b * Math.sin(t)
        const c = Math.cos(omega)
        const s = Math.sin(omega)
        out.push({
          xKm: x * c - y * s,
          yKm: x * s + y * c,
        })
      }
      return out
    },
    positionAtFractionKm(f) {
      const t = f * Math.PI * 2 + phaseRad
      const x = a * Math.cos(t)
      const y = b * Math.sin(t)
      const c = Math.cos(omega)
      const s = Math.sin(omega)
      return {
        xKm: x * c - y * s,
        yKm: x * s + y * c,
      }
    },
  }
}

/** Stable phase per body so markers don't stack at the same angle. */
function defaultPhaseRad(body: DistanceBody): number {
  let h = 0
  const s = body.canvasId
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return ((h % 360) / 180) * Math.PI
}

export function buildOrbitPathForBody(
  body: DistanceBody,
  model: OrbitPathModel
): OrbitPath | null {
  if (body.kind === "star") return null

  const phaseRad = defaultPhaseRad(body)
  const radiusKm =
    body.kind === "moon"
      ? body.semiMajorAxisKm ?? body.moonOrbitKm
      : body.semiMajorAxisKm

  if (radiusKm == null || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return null
  }

  const e = body.raw?.elements?.e ?? null

  if (model === "kepler") {
    return keplerOrbitPath({
      semiMajorAxisKm: radiusKm,
      eccentricity: e,
      phaseRad,
    })
  }

  return circularOrbitPath({ radiusKm, phaseRad })
}
