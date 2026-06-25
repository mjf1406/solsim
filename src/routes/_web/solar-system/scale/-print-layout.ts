import {
  formatScaledDiameter,
} from "@/lib/solar-system/scale/scaled-diameter-format"
import {
  PAPER_FORMATS,
  PAPER_PRINT_MARGIN_MM,
} from "@/lib/solar-system/scale/paper-formats"

import type { FlatPrintBody, PrintBodyGroup, ScaleBodyRow, ScalePageModel } from "./-data"
import { flattenPrintBodies } from "./-data"
import { scaledBodyMm } from "./-scale-math"
import type {
  BodyPlacement,
  OmittedBody,
  PrintConfig,
  PrintLayoutResult,
  PrintPage,
  PrintPageSection,
  SunSectionPlan,
} from "./-print-types"
import {
  APPENDIX_COL_GAP_MM,
  LABEL_HEIGHT_MM,
  LABEL_NAME_CHAR_MM,
  LABEL_SUBTITLE_CHAR_MM,
  MIN_LABEL_WIDTH_MM,
  MIN_PRINT_MM,
  PACK_GAP_MM,
  SUN_TILE_PREVIEW_CAP,
} from "./-print-types"

type PrintableRect = {
  sheetWidthMm: number
  sheetHeightMm: number
  marginMm: number
  printableWidthMm: number
  printableHeightMm: number
}

type PackItem = {
  body: ScaleBodyRow
  group: PrintBodyGroup
  diameterMm: number
  label: string
  subtitle: string
}

function printableRect(
  paperId: PrintConfig["paperId"],
  orientation: PrintConfig["orientation"],
  marginMm: number
): PrintableRect {
  const format = PAPER_FORMATS[paperId]
  const sheetWidthMm =
    orientation === "portrait" ? format.widthMm : format.heightMm
  const sheetHeightMm =
    orientation === "portrait" ? format.heightMm : format.widthMm
  return {
    sheetWidthMm,
    sheetHeightMm,
    marginMm,
    printableWidthMm: sheetWidthMm - 2 * marginMm,
    printableHeightMm: sheetHeightMm - 2 * marginMm,
  }
}

function scaledDiameterMm(body: ScaleBodyRow, sunMm: number): number | null {
  if (body.diameterKm == null || !Number.isFinite(body.diameterKm)) return null
  return scaledBodyMm(body.diameterKm, sunMm)
}

function formatLabel(body: ScaleBodyRow, diameterMm: number): string {
  const formatted = formatScaledDiameter(diameterMm, "metric")
  const size =
    formatted.display !== "—"
      ? `${formatted.display} ${formatted.unit}`
      : undefined
  return size ? `${body.name} — ${size}` : body.name
}

function partitionBodies(
  bodies: FlatPrintBody[],
  sunMm: number
): { renderable: PackItem[]; omitted: OmittedBody[] } {
  const renderable: PackItem[] = []
  const omitted: OmittedBody[] = []

  for (const entry of bodies) {
    const diameterMm = scaledDiameterMm(entry.body, sunMm)
    if (diameterMm == null) {
      omitted.push({
        body: entry.body,
        reason: "unknown_size",
        context: entry.context,
      })
      continue
    }
    if (diameterMm < MIN_PRINT_MM) {
      omitted.push({
        body: entry.body,
        reason: "too_small",
        scaledMm: diameterMm,
        context: entry.context,
      })
      continue
    }
    renderable.push({
      body: entry.body,
      group: entry.group,
      diameterMm,
      label: entry.body.name,
      subtitle: formatLabel(entry.body, diameterMm).replace(
        `${entry.body.name} — `,
        ""
      ),
    })
  }

  return { renderable, omitted }
}

function createPage(
  section: PrintPageSection,
  pageNumber: number,
  rect: PrintableRect,
  title?: string
): PrintPage {
  return {
    section,
    pageNumber,
    sheetWidthMm: rect.sheetWidthMm,
    sheetHeightMm: rect.sheetHeightMm,
    marginMm: rect.marginMm,
    printableWidthMm: rect.printableWidthMm,
    printableHeightMm: rect.printableHeightMm,
    placements: [],
    title,
  }
}

function computeSunSingle(
  sunBody: ScaleBodyRow,
  sunMm: number,
  rect: PrintableRect
): { pages: PrintPage[]; plan: SunSectionPlan } {
  const page = createPage("sun", 0, rect)
  const cx = rect.marginMm + rect.printableWidthMm / 2
  const cy = rect.marginMm + rect.printableHeightMm / 2
  page.placements.push({
    kind: "sun_single",
    body: sunBody,
    centerXMm: cx,
    centerYMm: cy,
    diameterMm: sunMm,
    label: "Sun",
    subtitle: formatLabel(sunBody, sunMm).replace("Sun — ", ""),
  })
  return { pages: [page], plan: { mode: "single", pages: 1 } }
}

function computeSunLimb(
  sunBody: ScaleBodyRow,
  sunMm: number,
  rect: PrintableRect
): { pages: PrintPage[]; plan: SunSectionPlan } {
  const page = createPage("sun", 0, rect)
  const radius = sunMm / 2
  const arcDepth = rect.printableWidthMm
  const cx = rect.marginMm - radius + arcDepth
  const cy = rect.marginMm + rect.printableHeightMm / 2

  page.placements.push({
    kind: "sun_limb",
    body: sunBody,
    centerXMm: cx,
    centerYMm: cy,
    diameterMm: sunMm,
    label: "Sun limb at scale",
    subtitle: "Full disk continues off page",
    clipLeftMm: rect.marginMm,
    clipTopMm: rect.marginMm,
    clipWidthMm: rect.printableWidthMm,
    clipHeightMm: rect.printableHeightMm,
  })

  return { pages: [page], plan: { mode: "limb", pages: 1 } }
}

function bodyFitsOnPage(
  diameterMm: number,
  rect: PrintableRect,
  labelSpace = LABEL_HEIGHT_MM
): boolean {
  return (
    diameterMm <= rect.printableWidthMm &&
    diameterMm + labelSpace <= rect.printableHeightMm
  )
}

function bodyNeedsTiling(diameterMm: number, rect: PrintableRect): boolean {
  return (
    diameterMm > rect.printableWidthMm ||
    diameterMm > rect.printableHeightMm
  )
}

function computeDiskTiles(
  body: ScaleBodyRow,
  diameterMm: number,
  rect: PrintableRect,
  section: PrintPageSection,
  baseLabel: string,
  subtitle: string | undefined,
  placementKind: "sun_tile" | "body_tile",
  startPageNumber: number,
  overlapMm = 0
): { pages: PrintPage[]; rows: number; cols: number } {
  const tileW = rect.printableWidthMm
  const tileH = rect.printableHeightMm
  const overlap = Math.max(
    0,
    Math.min(overlapMm, tileW - 1, tileH - 1)
  )
  const strideW = tileW - overlap
  const strideH = tileH - overlap
  const cols =
    diameterMm <= tileW ? 1 : Math.ceil((diameterMm - tileW) / strideW) + 1
  const rows =
    diameterMm <= tileH ? 1 : Math.ceil((diameterMm - tileH) / strideH) + 1
  const radius = diameterMm / 2

  const pages: PrintPage[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const page = createPage(section, startPageNumber + pages.length, rect)
      const x0 = col * strideW
      const y0 = row * strideH
      const cx = rect.marginMm + radius - x0
      const cy = rect.marginMm + radius - y0

      page.placements.push({
        kind: placementKind,
        body,
        centerXMm: cx,
        centerYMm: cy,
        diameterMm,
        label: `${baseLabel} (row ${row + 1}, col ${col + 1} of ${rows}×${cols})`,
        subtitle,
        clipLeftMm: rect.marginMm,
        clipTopMm: rect.marginMm,
        clipWidthMm: tileW,
        clipHeightMm: tileH,
        tileRow: row,
        tileCol: col,
        tileRows: rows,
        tileCols: cols,
        showRegistrationMarks: true,
      })
      pages.push(page)
    }
  }

  return { pages, rows, cols }
}

function computeSunTiles(
  sunBody: ScaleBodyRow,
  sunMm: number,
  rect: PrintableRect,
  overlapMm: number
): { pages: PrintPage[]; plan: SunSectionPlan; warning?: string } {
  const { pages, rows, cols } = computeDiskTiles(
    sunBody,
    sunMm,
    rect,
    "sun",
    "Sun",
    formatLabel(sunBody, sunMm).replace("Sun — ", ""),
    "sun_tile",
    0,
    overlapMm
  )

  let warning: string | undefined
  if (rows * cols > SUN_TILE_PREVIEW_CAP) {
    warning = `Sun spans ${rows}×${cols} = ${rows * cols} pages. Preview may be slow; print still includes all tiles.`
  }

  return {
    pages,
    plan: { mode: "tile", pages: pages.length, rows, cols },
    warning,
  }
}

function resolveSunPages(
  sunBody: ScaleBodyRow,
  config: PrintConfig,
  rect: PrintableRect
): {
  pages: PrintPage[]
  plan: SunSectionPlan
  warning?: string
} {
  const { sunMm, sunMode } = config
  const shortEdge = Math.min(rect.printableWidthMm, rect.printableHeightMm)

  if (sunMode === "limb_edge") {
    return computeSunLimb(sunBody, sunMm, rect)
  }

  if (sunMode === "fit_if_possible" && sunMm <= shortEdge) {
    return computeSunSingle(sunBody, sunMm, rect)
  }

  if (sunMode === "fit_if_possible" && sunMm > shortEdge) {
    return computeSunTiles(sunBody, sunMm, rect, config.tileOverlapMm)
  }

  return computeSunTiles(sunBody, sunMm, rect, config.tileOverlapMm)
}

function layoutOnePerPage(
  items: PackItem[],
  section: PrintPageSection,
  rect: PrintableRect,
  startPageNumber: number,
  overlapMm: number
): PrintPage[] {
  const pages: PrintPage[] = []
  for (const item of items) {
    if (bodyNeedsTiling(item.diameterMm, rect)) {
      const { pages: tilePages } = computeDiskTiles(
        item.body,
        item.diameterMm,
        rect,
        section,
        item.label,
        item.subtitle,
        "body_tile",
        startPageNumber + pages.length,
        overlapMm
      )
      pages.push(...tilePages)
      continue
    }

    const page = createPage(section, startPageNumber + pages.length, rect)
    const cx = rect.marginMm + rect.printableWidthMm / 2
    const cy = rect.marginMm + rect.printableHeightMm / 2
    page.placements.push({
      kind: "body",
      body: item.body,
      centerXMm: cx,
      centerYMm: cy,
      diameterMm: item.diameterMm,
      label: item.label,
      subtitle: item.subtitle,
    })
    pages.push(page)
  }
  return pages
}

type FootprintRect = {
  x: number
  y: number
  w: number
  h: number
}

function estimateLabelWidthMm(name: string, subtitle: string): number {
  const nameWidth = name.length * LABEL_NAME_CHAR_MM
  const subtitleWidth = subtitle.length * LABEL_SUBTITLE_CHAR_MM
  return Math.max(MIN_LABEL_WIDTH_MM, nameWidth, subtitleWidth)
}

function itemFootprintSize(item: PackItem): { w: number; h: number } {
  const labelW = estimateLabelWidthMm(item.label, item.subtitle)
  return {
    w: Math.max(item.diameterMm, labelW),
    h: item.diameterMm + LABEL_HEIGHT_MM,
  }
}

function printableBounds(rect: PrintableRect): FootprintRect {
  return {
    x: rect.marginMm,
    y: rect.marginMm,
    w: rect.printableWidthMm,
    h: rect.printableHeightMm,
  }
}

function rectsCollide(
  a: FootprintRect,
  b: FootprintRect,
  gap: number
): boolean {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  )
}

function fitsInBounds(box: FootprintRect, bounds: FootprintRect): boolean {
  return (
    box.x >= bounds.x &&
    box.y >= bounds.y &&
    box.x + box.w <= bounds.x + bounds.w &&
    box.y + box.h <= bounds.y + bounds.h
  )
}

function lowestYForX(
  x: number,
  w: number,
  h: number,
  placed: FootprintRect[],
  bounds: FootprintRect,
  gap: number
): number | null {
  let y = bounds.y

  for (let iter = 0; iter <= placed.length; iter++) {
    let bumped = false
    const box: FootprintRect = { x, y, w, h }
    for (const p of placed) {
      if (rectsCollide(box, p, gap)) {
        const nextY = p.y + p.h + gap
        if (nextY > y) {
          y = nextY
          bumped = true
        }
      }
    }
    if (!bumped) break
  }

  const box: FootprintRect = { x, y, w, h }
  return fitsInBounds(box, bounds) ? y : null
}

/** Bottom-left 2D bin pack: tuck smaller disks into gaps beside taller ones. */
function findBottomLeftSlot(
  w: number,
  h: number,
  placed: FootprintRect[],
  bounds: FootprintRect,
  gap: number
): { x: number; y: number } | null {
  const xs = new Set<number>([bounds.x])
  for (const p of placed) {
    xs.add(p.x)
    const right = p.x + p.w + gap
    if (right + w <= bounds.x + bounds.w) {
      xs.add(right)
    }
  }

  let best: { x: number; y: number } | null = null
  for (const x of [...xs].sort((a, b) => a - b)) {
    if (x + w > bounds.x + bounds.w) continue
    const y = lowestYForX(x, w, h, placed, bounds, gap)
    if (y == null) continue
    if (!best || y < best.y || (y === best.y && x < best.x)) {
      best = { x, y }
    }
  }
  return best
}

function packItemToPlacement(
  item: PackItem,
  slot: { x: number; y: number },
  footprintW: number
): BodyPlacement {
  return {
    kind: "body",
    body: item.body,
    centerXMm: slot.x + footprintW / 2,
    centerYMm: slot.y + item.diameterMm / 2,
    diameterMm: item.diameterMm,
    label: item.label,
    subtitle: item.subtitle,
    labelWidthMm: footprintW,
  }
}

function layoutPack(
  items: PackItem[],
  section: PrintPageSection,
  rect: PrintableRect,
  startPageNumber: number,
  overlapMm: number
): PrintPage[] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => b.diameterMm - a.diameterMm)
  const bounds = printableBounds(rect)
  const pages: PrintPage[] = []
  let page = createPage(section, startPageNumber, rect)
  let placed: FootprintRect[] = []

  const flushPage = () => {
    if (page.placements.length > 0) {
      pages.push(page)
      page = createPage(section, startPageNumber + pages.length, rect)
      placed = []
    }
  }

  for (const item of sorted) {
    if (bodyNeedsTiling(item.diameterMm, rect)) {
      flushPage()
      const { pages: tilePages } = computeDiskTiles(
        item.body,
        item.diameterMm,
        rect,
        section,
        item.label,
        item.subtitle,
        "body_tile",
        startPageNumber + pages.length,
        overlapMm
      )
      pages.push(...tilePages)
      continue
    }

    const { w, h } = itemFootprintSize(item)
    let slot = findBottomLeftSlot(w, h, placed, bounds, PACK_GAP_MM)

    if (!slot) {
      flushPage()
      slot = findBottomLeftSlot(w, h, placed, bounds, PACK_GAP_MM)
    }

    if (!slot) {
      continue
    }

    page.placements.push(packItemToPlacement(item, slot, w))
    placed.push({ x: slot.x, y: slot.y, w, h })
  }

  if (page.placements.length > 0) {
    pages.push(page)
  }

  return pages
}

function layoutAllBodies(
  items: PackItem[],
  layout: PrintConfig["planetLayout"],
  rect: PrintableRect,
  startPageNumber: number,
  overlapMm: number
): PrintPage[] {
  if (layout === "pack") {
    return layoutPack(items, "planets", rect, startPageNumber, overlapMm)
  }

  const planets = items.filter((item) => item.group === "planets")
  const secondary = items.filter(
    (item) => item.group === "moons" || item.group === "belts"
  )

  const pages = layoutOnePerPage(
    planets,
    "planets",
    rect,
    startPageNumber,
    overlapMm
  )

  if (secondary.length > 0) {
    pages.push(
      ...layoutPack(
        secondary,
        "planets",
        rect,
        startPageNumber + pages.length,
        overlapMm
      )
    )
  }

  return pages
}

function countPagesWithGroup(
  pages: PrintPage[],
  group: PrintBodyGroup
): number {
  return pages.filter((page) =>
    page.placements.some(
      (p) =>
        p.body != null &&
        ((group === "moons" && p.body.kind === "moon") ||
          (group === "belts" &&
            (p.body.kind === "dwarf" ||
              p.body.kind === "asteroid" ||
              p.body.kind === "comet")))
    )
  ).length
}

function layoutAppendix(
  omitted: OmittedBody[],
  rect: PrintableRect,
  startPageNumber: number
): PrintPage[] {
  if (omitted.length === 0) return []

  const lineHeight = 6
  const titleSpace = 12
  const colWidth = (rect.printableWidthMm - APPENDIX_COL_GAP_MM) / 2
  const maxRows = Math.floor(
    (rect.printableHeightMm - titleSpace) / lineHeight
  )

  const lines: string[] = [
    "The following bodies are not drawn at this scale:",
    ...omitted.map((entry) => {
      const size =
        entry.reason === "unknown_size"
          ? "size unknown"
          : entry.scaledMm != null
            ? formatScaledDiameter(entry.scaledMm, "metric")
            : null
      const sizeStr =
        size && typeof size === "object" && size.display !== "—"
          ? `${size.display} ${size.unit}`
          : "too small"
      const ctx = entry.context ? ` (${entry.context})` : ""
      return `• ${entry.body.name}${ctx} — ${sizeStr}`
    }),
  ]

  const pages: PrintPage[] = []
  let page = createPage(
    "appendix",
    startPageNumber,
    rect,
    "Bodies too small or unknown at this scale"
  )
  let lineIdx = 0

  const addLine = (text: string) => {
    let row = Math.floor(lineIdx / 2)
    while (row >= maxRows) {
      pages.push(page)
      page = createPage(
        "appendix",
        startPageNumber + pages.length,
        rect,
        "Bodies too small or unknown at this scale (continued)"
      )
      lineIdx = 0
      row = 0
    }

    const col = lineIdx % 2
    const x = rect.marginMm + col * (colWidth + APPENDIX_COL_GAP_MM) + 4
    const y = rect.marginMm + titleSpace + row * lineHeight

    page.placements.push({
      kind: "appendix_line",
      centerXMm: x,
      centerYMm: y,
      diameterMm: 0,
      label: text,
    })
    lineIdx++
  }

  for (const text of lines) {
    addLine(text)
  }

  pages.push(page)
  return pages
}

function renumberPages(pages: PrintPage[]): PrintPage[] {
  return pages.map((page, index) => ({ ...page, pageNumber: index + 1 }))
}

export function computePrintLayout(
  model: ScalePageModel,
  config: PrintConfig
): PrintLayoutResult {
  const rect = printableRect(
    config.paperId,
    config.orientation,
    config.marginMm ?? PAPER_PRINT_MARGIN_MM
  )

  const sunSection = model.sections.find((s) => s.type === "sun")
  const allOmitted: OmittedBody[] = []
  const pages: PrintPage[] = []

  let sunSectionPlan: SunSectionPlan | null = null
  let sunTileWarning: string | undefined

  if (sunSection) {
    const sunResult = resolveSunPages(sunSection.body, config, rect)
    pages.push(...sunResult.pages)
    sunSectionPlan = sunResult.plan
    sunTileWarning = sunResult.warning
  }

  const flat = flattenPrintBodies(model, {
    includeMoons: config.includeMoons,
    includeBelts: config.includeBelts,
  })

  const bodyEntries = flat.filter(
    (b) =>
      b.group === "planets" ||
      (config.includeMoons && b.group === "moons") ||
      (config.includeBelts && b.group === "belts")
  )

  const bodyPack = partitionBodies(bodyEntries, config.sunMm)
  allOmitted.push(...bodyPack.omitted)

  const bodyPages = layoutAllBodies(
    bodyPack.renderable,
    config.planetLayout,
    rect,
    pages.length,
    config.tileOverlapMm
  )
  pages.push(...bodyPages)

  const appendixPages = config.includeAppendix
    ? layoutAppendix(allOmitted, rect, pages.length)
    : []
  pages.push(...appendixPages)

  const numbered = renumberPages(pages)

  const summary = {
    totalPages: numbered.length,
    sunPages: sunSectionPlan?.pages ?? 0,
    planetPages: bodyPages.length,
    moonPages: countPagesWithGroup(bodyPages, "moons"),
    beltPages: countPagesWithGroup(bodyPages, "belts"),
    appendixPages: appendixPages.length,
  }

  return {
    pages: numbered,
    sunSection: sunSectionPlan,
    omitted: allOmitted,
    summary,
    sunTileWarning,
  }
}

export function formatLayoutSummary(summary: PrintLayoutResult["summary"]): string {
  const parts: string[] = []
  if (summary.sunPages > 0) {
    parts.push(
      `${summary.sunPages} Sun page${summary.sunPages === 1 ? "" : "s"}`
    )
  }
  if (summary.planetPages > 0) {
    parts.push(
      `${summary.planetPages} planet page${summary.planetPages === 1 ? "" : "s"}`
    )
  }
  if (summary.moonPages > 0) {
    parts.push(
      `${summary.moonPages} moon page${summary.moonPages === 1 ? "" : "s"}`
    )
  }
  if (summary.beltPages > 0) {
    parts.push(
      `${summary.beltPages} belt page${summary.beltPages === 1 ? "" : "s"}`
    )
  }
  if (summary.appendixPages > 0) {
    parts.push(
      `${summary.appendixPages} appendix page${summary.appendixPages === 1 ? "" : "s"}`
    )
  }
  return `${summary.totalPages} page${summary.totalPages === 1 ? "" : "s"} (${parts.join(" + ")})`
}

/** @internal exported for tests */
export {
  printableRect,
  computeSunTiles,
  computeDiskTiles,
  bodyFitsOnPage,
  bodyNeedsTiling,
  partitionBodies,
  layoutPack,
  estimateLabelWidthMm,
}
