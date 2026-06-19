import { LIGHT_SPEED_KM_PER_S } from "@/lib/solar-system/distance/distance-units"

/** Visualizer speed multiplier options (sidebar / control). */
export const LIGHT_SPEED_MULTIPLIERS = [1, 2, 4, 8, 16, 32, 64, 128] as const

export type LightSpeedMultiplier = (typeof LIGHT_SPEED_MULTIPLIERS)[number]

export function isLightSpeedMultiplier(n: number): n is LightSpeedMultiplier {
  return (LIGHT_SPEED_MULTIPLIERS as readonly number[]).includes(n)
}

/** Photon disc diameter in CSS px (exaggerated for visibility). */
export const LIGHT_SPEED_PHOTON_DIAMETER_PX = 10

/** Kilometers per second at `multiplier` × c. */
export function lightSpeedKmPerSecond(multiplier: number): number {
  return LIGHT_SPEED_KM_PER_S * multiplier
}

/** Number of streak particles in the light-speed overlay. */
export const LIGHT_SPEED_PARTICLE_COUNT = 48

/** Base horizontal streak length in CSS px (before per-particle jitter). */
export function lightSpeedParticleStreakLengthPx(multiplier: number): number {
  return Math.min(220, 6 + 18 * Math.log2(Math.max(1, multiplier)))
}

/** Horizontal drift speed for streak particles in CSS px/s. */
export function lightSpeedParticleSpeedPxPerSec(multiplier: number): number {
  return 120 + 90 * Math.log2(Math.max(1, multiplier))
}
