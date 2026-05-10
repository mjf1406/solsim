export const APP_NAME = "SolSim"
export const FEEDBACK_GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScpmuHVGEW4b8a7bvLlWEfF2FxuwvIGb5SvMVC8UbK2qCgt5w/viewform?usp=publish-editor"
export const AU_TO_M = 92955807.273 // 92,955,807.273 miles
export const AU_TO_KM = 149597870.7 // 149,597,870.7 kilometers

export type BodyClass =
  | "star"
  | "planet"
  | "dwarf-planet"
  | "asteroid"
  | "comet"
  | "natural-satellite"

export type OrbitStyle = {
  color: string
  dash: number[]
  width: number
  alpha: number
}

export const BODY_CLASS_STYLE: Record<BodyClass, OrbitStyle> = {
  star: { color: "#f5b301", dash: [], width: 1, alpha: 0 },
  planet: { color: "#94a3b8", dash: [], width: 1.25, alpha: 0.45 },
  "dwarf-planet": { color: "#c084fc", dash: [10, 6], width: 1, alpha: 0.45 },
  asteroid: { color: "#a3a3a3", dash: [2, 4], width: 0.75, alpha: 0.35 },
  comet: { color: "#67e8f9", dash: [1, 7], width: 0.75, alpha: 0.55 },
  "natural-satellite": {
    color: "#cbd5e1",
    dash: [3, 6],
    width: 1,
    alpha: 0.35,
  },
}