import type {
  PaperOrientation,
  ScalePrintPaperId,
} from "@/lib/solar-system/scale/paper-formats"

import type { ScaleBodyRow } from "./-data"

export type PrintArtMode = "outline" | "full"

export type PlanetLayoutMode = "pack" | "one_per_page"

export type SunPrintMode = "fit_if_possible" | "tile" | "limb_edge"

export type PrintPageSection =
  | "sun"
  | "planets"
  | "moons"
  | "belts"
  | "appendix"

export type PrintConfig = {
  paperId: ScalePrintPaperId
  orientation: PaperOrientation
  sunMm: number
  artMode: PrintArtMode
  planetLayout: PlanetLayoutMode
  sunMode: SunPrintMode
  includeMoons: boolean
  includeBelts: boolean
  includeAppendix: boolean
  marginMm: number
  /** Repeated mm on adjacent tiles for gluing (sun and oversized bodies). */
  tileOverlapMm: number
}

export type PlacementKind =
  | "body"
  | "body_tile"
  | "sun_tile"
  | "sun_limb"
  | "sun_single"
  | "appendix_line"

export type BodyPlacement = {
  kind: PlacementKind
  body?: ScaleBodyRow
  /** Disk center X on sheet (mm from left edge). */
  centerXMm: number
  /** Disk center Y on sheet (mm from top edge). */
  centerYMm: number
  diameterMm: number
  label: string
  subtitle?: string
  /** Horizontal space reserved for label (>= diameterMm); used by pack layout. */
  labelWidthMm?: number
  /** Clip viewport for sun tiles / limb (sheet coords). */
  clipLeftMm?: number
  clipTopMm?: number
  clipWidthMm?: number
  clipHeightMm?: number
  tileRow?: number
  tileCol?: number
  tileRows?: number
  tileCols?: number
  showRegistrationMarks?: boolean
}

export type PrintPage = {
  section: PrintPageSection
  pageNumber: number
  sheetWidthMm: number
  sheetHeightMm: number
  marginMm: number
  printableWidthMm: number
  printableHeightMm: number
  placements: BodyPlacement[]
  title?: string
}

export type OmittedBody = {
  body: ScaleBodyRow
  reason: "too_small" | "unknown_size"
  scaledMm?: number
  context?: string
}

export type SunSectionPlan =
  | { mode: "single"; pages: 1 }
  | { mode: "tile"; pages: number; rows: number; cols: number }
  | { mode: "limb"; pages: 1 }

export type PrintLayoutSummary = {
  totalPages: number
  sunPages: number
  planetPages: number
  moonPages: number
  beltPages: number
  appendixPages: number
}

export type PrintLayoutResult = {
  pages: PrintPage[]
  sunSection: SunSectionPlan | null
  omitted: OmittedBody[]
  summary: PrintLayoutSummary
  sunTileWarning?: string
}

export const MIN_PRINT_MM = 3
export const PACK_GAP_MM = 8
export const LABEL_HEIGHT_MM = 8
/** Approx. mm per character at 3mm name label size. */
export const LABEL_NAME_CHAR_MM = 1.65
/** Approx. mm per character at 2.5mm subtitle size. */
export const LABEL_SUBTITLE_CHAR_MM = 1.35
/** Minimum horizontal label slot when packing small disks. */
export const MIN_LABEL_WIDTH_MM = 14
export const APPENDIX_COL_GAP_MM = 8
export const SUN_TILE_PREVIEW_CAP = 50
