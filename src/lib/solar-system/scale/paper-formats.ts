/**
 * Nominal physical sheet sizes (mm) for common classroom/office formats.
 *
 * Intended for future print-to-scale / multi-page layouts for teachers;
 * these are not wired into the interactive scale slider.
 */

export const MM_PER_INCH = 25.4

export type PaperFormatId =
  | "a4"
  | "a3"
  | "letter"
  | "legal"
  | "tabloid"
  | "ledger"

export type PaperFormat = {
  id: PaperFormatId
  label: string
  /** Nominal sheet width (mm). */
  widthMm: number
  /** Nominal sheet height (mm). */
  heightMm: number
}

export const PAPER_FORMATS: Record<PaperFormatId, PaperFormat> = {
  a4: { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  a3: { id: "a3", label: "A3", widthMm: 297, heightMm: 420 },
  letter: {
    id: "letter",
    label: "Letter",
    widthMm: 8.5 * MM_PER_INCH,
    heightMm: 11 * MM_PER_INCH,
  },
  legal: {
    id: "legal",
    label: "Legal",
    widthMm: 8.5 * MM_PER_INCH,
    heightMm: 14 * MM_PER_INCH,
  },
  tabloid: {
    id: "tabloid",
    label: "Tabloid",
    widthMm: 11 * MM_PER_INCH,
    heightMm: 17 * MM_PER_INCH,
  },
  ledger: {
    id: "ledger",
    label: "Ledger",
    widthMm: 17 * MM_PER_INCH,
    heightMm: 11 * MM_PER_INCH,
  },
}

/** Stable iteration order for pickers or print pipelines. */
export const PAPER_FORMAT_ORDER = [
  "a4",
  "a3",
  "letter",
  "legal",
  "tabloid",
  "ledger",
] as const satisfies readonly PaperFormatId[]

export function paperFormatsInOrder(): PaperFormat[] {
  return PAPER_FORMAT_ORDER.map((id) => PAPER_FORMATS[id])
}

export type PaperOrientation = "portrait" | "landscape"

export type PaperEdge = "short" | "long"

/** Printable margin applied on each side when fitting the Sun to a sheet. */
export const PAPER_PRINT_MARGIN_MM = 10

/** Paper formats exposed as Sun-diameter print presets on the scale page. */
export const SCALE_PRINT_PAPER_IDS = ["letter", "a4", "a3"] as const satisfies readonly PaperFormatId[]

export type ScalePrintPaperId = (typeof SCALE_PRINT_PAPER_IDS)[number]

export type ScalePrintPresetId = `${ScalePrintPaperId}-${PaperEdge}`

/** Print preset options for the scale page (short and long edge per format). */
export const SCALE_PRINT_PRESET_OPTIONS: ReadonlyArray<{
  id: ScalePrintPresetId
  label: string
}> = SCALE_PRINT_PAPER_IDS.flatMap((id) => [
  { id: `${id}-short`, label: `${PAPER_FORMATS[id].label} (short edge)` },
  { id: `${id}-long`, label: `${PAPER_FORMATS[id].label} (long edge)` },
])

/**
 * Sun diameter (mm) that fits the printable edge of a sheet.
 * Portrait: short = width, long = height; landscape swaps them.
 */
export function sunMmForPaper(
  format: PaperFormat,
  orientation: PaperOrientation = "portrait",
  edge: PaperEdge = "short"
): number {
  const shortEdgeMm =
    orientation === "portrait" ? format.widthMm : format.heightMm
  const longEdgeMm =
    orientation === "portrait" ? format.heightMm : format.widthMm
  const edgeMm = edge === "short" ? shortEdgeMm : longEdgeMm
  return Math.max(edgeMm - 2 * PAPER_PRINT_MARGIN_MM, 1)
}

export function sunMmForPaperId(
  id: ScalePrintPaperId,
  orientation: PaperOrientation = "portrait",
  edge: PaperEdge = "short"
): number {
  return sunMmForPaper(PAPER_FORMATS[id], orientation, edge)
}

export function sunMmForPrintPreset(presetId: ScalePrintPresetId): number {
  const dash = presetId.lastIndexOf("-")
  const paperId = presetId.slice(0, dash) as ScalePrintPaperId
  const edge = presetId.slice(dash + 1) as PaperEdge
  if (!(paperId in PAPER_FORMATS)) return Number.NaN
  if (edge !== "short" && edge !== "long") return Number.NaN
  return sunMmForPaperId(paperId, "portrait", edge)
}
