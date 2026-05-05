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
