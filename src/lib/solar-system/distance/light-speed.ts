import { LIGHT_SPEED_KM_PER_S } from "@/lib/solar-system/distance/distance-units"

/** Visualizer speed multiplier options (sidebar / control). */
export const LIGHT_SPEED_MULTIPLIERS = [1, 2, 4, 8, 16, 32] as const

export type LightSpeedMultiplier = (typeof LIGHT_SPEED_MULTIPLIERS)[number]

export function isLightSpeedMultiplier(n: number): n is LightSpeedMultiplier {
  return (LIGHT_SPEED_MULTIPLIERS as readonly number[]).includes(n)
}

/** Photon disc diameter in CSS px (exaggerated for visibility). */
export const LIGHT_SPEED_PHOTON_DIAMETER_PX = 10

/** Horizontal extent of the sine-wave trail behind the photon (content px). */
export const LIGHT_SPEED_TRAIL_WIDTH_PX = 280

/** Vertical amplitude of the wave (half peak-to-trough). */
export const LIGHT_SPEED_WAVE_AMPLITUDE_PX = 14

/** Kilometers per second at `multiplier` × c. */
export function lightSpeedKmPerSecond(multiplier: number): number {
  return LIGHT_SPEED_KM_PER_S * multiplier
}
