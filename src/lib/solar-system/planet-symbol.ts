/** Public URL prefix for files in `public/assets/planet-symbols/`. */
export const PLANET_SYMBOLS_BASE_PATH = "/assets/planet-symbols"

/** File names under `public/assets/planet-symbols/`, keyed by body display name. */
const SYMBOL_FILE_BY_DISPLAY_NAME: Record<string, string> = {
  Sun: "Sun_symbol_(bold).svg",
  Mercury: "Mercury_symbol_(bold).svg",
  Venus: "Venus_symbol_(bold).svg",
  Earth: "Earth_symbol_(small,_bold).svg",
  Mars: "Mars_symbol_(bold).svg",
  Jupiter: "Jupiter_symbol_(bold).svg",
  Saturn: "Saturn_symbol_(bold).svg",
  Uranus: "Uranus_symbol_(bold).svg",
  Neptune: "Neptune_symbol_(bold).svg",
  Pluto: "Pluto_symbol_(large_orb,_bold).svg",
  Ceres: "Ceres_symbol_(bold).svg",
  Eris: "Eris_symbol_(bold).svg",
  Haumea: "Haumea_symbol_(bold).svg",
  Makemake: "Makemake_symbol_(bold).svg",
  Gonggong: "Gonggong_symbol_(bold).svg",
}

export function planetSymbolHrefForDisplayName(name: string): string | null {
  const file = SYMBOL_FILE_BY_DISPLAY_NAME[name]
  if (!file) return null
  return `${PLANET_SYMBOLS_BASE_PATH}/${file}`
}
