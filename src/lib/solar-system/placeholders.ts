import type { SizeBodyKind } from "@/routes/_app/solar-system/size/-data"

const PLACEHOLDER_BASE = "/assets/placeholders"
const STARS_BASE = "/assets/stars"
const PLANETS_BASE = "/assets/planets"
const NATURAL_SATELLITES_BASE = "/assets/natural-satellites"

/** Display names with real disk SVGs under `public/assets/stars/`. */
const STAR_DISK_NAMES = new Set(["Sun"])

/** Display names with real disk SVGs under `public/assets/planets/`. */
const PLANET_DISK_NAMES = new Set(["Earth", "Mars", "Mercury", "Uranus"])

/** Display names with real disk SVGs under `public/assets/natural-satellites/`. */
const MOON_DISK_NAMES = new Set(["Moon"])

/** Disk image URL for a solar-system body; prefers real art when available. */
export function bodyDiskSrc(name: string, kind: SizeBodyKind): string {
  const displayName = name.trim()
  if (kind === "star" && STAR_DISK_NAMES.has(displayName)) {
    return `${STARS_BASE}/${displayName}.svg`
  }
  if (kind === "planet" && PLANET_DISK_NAMES.has(displayName)) {
    return `${PLANETS_BASE}/${displayName}.svg`
  }
  if (kind === "moon" && MOON_DISK_NAMES.has(displayName)) {
    return `${NATURAL_SATELLITES_BASE}/${displayName}.svg`
  }
  return placeholderSrc(name, kind)
}

/** Placeholder disk image for a solar-system body on canvas views. */
export function placeholderSrc(name: string, kind: SizeBodyKind): string {
  const n = name.trim().toLowerCase()
  if (kind === "star" || n === "sun") return `${PLACEHOLDER_BASE}/sun.svg`
  if (kind === "scifi") return `${PLACEHOLDER_BASE}/asteroid.svg`
  if (kind === "asteroid") return `${PLACEHOLDER_BASE}/asteroid.svg`
  if (kind === "comet") return `${PLACEHOLDER_BASE}/comet.svg`
  if (kind === "dwarf") return `${PLACEHOLDER_BASE}/dwarf-planet.svg`
  if (kind === "planet") {
    const map: Record<string, string> = {
      mercury: "mercury",
      venus: "venus",
      earth: "earth",
      mars: "mars",
      jupiter: "jupiter",
      saturn: "saturn",
      uranus: "uranus",
      neptune: "neptune",
    }
    const file = map[n]
    if (file) return `${PLACEHOLDER_BASE}/${file}.svg`
    return `${PLACEHOLDER_BASE}/dwarf-planet.svg`
  }
  return `${PLACEHOLDER_BASE}/natural-satellite.svg`
}
