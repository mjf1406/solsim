import type { BodyClass } from "@/lib/constants"
import type { SizeBodyKind } from "@/routes/_app/solar-system/size/-data"

/** Map canvas body kind to orbit-style body class (see `BODY_CLASS_STYLE`). */
export function sizeBodyKindToBodyClass(kind: SizeBodyKind): BodyClass {
  switch (kind) {
    case "star":
      return "star"
    case "planet":
      return "planet"
    case "dwarf":
      return "dwarf-planet"
    case "moon":
      return "natural-satellite"
    case "asteroid":
      return "asteroid"
    case "comet":
    case "scifi":
      return "comet"
  }
}
