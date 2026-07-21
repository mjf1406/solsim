import { describe, expect, it } from "vite-plus/test"

import type { ScaleBodyRow, ScalePageModel } from "./-data"
import {
  computeDiskTiles,
  computePrintLayout,
  computeSunTiles,
  estimateLabelWidthMm,
  layoutPack,
  partitionBodies,
  printableRect,
} from "./-print-layout"
import {
  LABEL_HEIGHT_MM,
  MIN_LABEL_WIDTH_MM,
  MIN_PRINT_MM,
  PACK_GAP_MM,
} from "./-print-types"
import type { FlatPrintBody, PrintBodyGroup } from "./-data"

function body(
  id: string,
  name: string,
  diameterKm: number,
  kind: ScaleBodyRow["kind"] = "planet"
): ScaleBodyRow {
  return { id, name, kind, diameterKm }
}

function defaultTestConfig(
  overrides: Partial<Parameters<typeof computePrintLayout>[1]> = {}
) {
  return {
    paperId: "a4" as const,
    orientation: "portrait" as const,
    sunMm: 1500,
    artMode: "outline" as const,
    planetLayout: "pack" as const,
    sunMode: "limb_edge" as const,
    includeMoons: false,
    includeBelts: false,
    includeAppendix: false,
    marginMm: 10,
    tileOverlapMm: 20,
    ...overrides,
  }
}

function minimalModel(): ScalePageModel {
  return {
    sections: [
      { type: "sun", body: body("10", "Sun", 1_391_400, "star") },
      {
        type: "planet",
        planet: body("199", "Mercury", 4879.4),
        moons: [],
      },
      {
        type: "planet",
        planet: body("399", "Earth", 12756),
        moons: [body("301", "Moon", 3474.8, "moon")],
      },
      {
        type: "planet",
        planet: body("599", "Jupiter", 139822),
        moons: [],
      },
    ],
  }
}

describe("printableRect", () => {
  it("subtracts margins from A4 portrait", () => {
    const rect = printableRect("a4", "portrait", 10)
    expect(rect.sheetWidthMm).toBe(210)
    expect(rect.sheetHeightMm).toBe(297)
    expect(rect.printableWidthMm).toBe(190)
    expect(rect.printableHeightMm).toBe(277)
  })
})

describe("computeSunTiles", () => {
  it("computes grid for oversized Sun", () => {
    const rect = printableRect("a4", "portrait", 10)
    const sun = body("10", "Sun", 1_391_400, "star")
    const { pages, plan } = computeSunTiles(sun, 400, rect, 0)
    expect(plan.mode).toBe("tile")
    if (plan.mode === "tile") {
      expect(plan.rows).toBeGreaterThan(1)
      expect(plan.cols).toBeGreaterThan(1)
      expect(pages.length).toBe(plan.rows * plan.cols)
    }
  })
})

describe("partitionBodies", () => {
  it("omits bodies below MIN_PRINT_MM", () => {
    const sunMm = 100
    const items: FlatPrintBody[] = [
      {
        body: body("1", "Tiny", 100),
        group: "planets",
        sortOrder: 0,
      },
    ]
    const { omitted, renderable } = partitionBodies(items, sunMm)
    expect(renderable).toHaveLength(0)
    expect(omitted).toHaveLength(1)
    expect(omitted[0]!.reason).toBe("too_small")
    expect(omitted[0]!.scaledMm!).toBeLessThan(MIN_PRINT_MM)
  })
})

describe("computePrintLayout", () => {
  it("packs planets on fewer pages than one-per-page", () => {
    const model = minimalModel()
    const packed = computePrintLayout(
      model,
      defaultTestConfig({ planetLayout: "pack" })
    )
    const oneEach = computePrintLayout(
      model,
      defaultTestConfig({ planetLayout: "one_per_page" })
    )
    expect(packed.summary.planetPages).toBeLessThan(oneEach.summary.planetPages)
  })

  it("uses single Sun page when fit_if_possible and Sun fits", () => {
    const model = minimalModel()
    const rect = printableRect("a4", "portrait", 10)
    const shortEdge = Math.min(rect.printableWidthMm, rect.printableHeightMm)
    const result = computePrintLayout(
      model,
      defaultTestConfig({
        sunMm: shortEdge - 1,
        sunMode: "fit_if_possible",
      })
    )
    expect(result.sunSection?.mode).toBe("single")
    expect(result.summary.sunPages).toBe(1)
  })

  it("limb edge always produces one Sun page", () => {
    const model = minimalModel()
    const result = computePrintLayout(model, defaultTestConfig({ sunMm: 2000 }))
    expect(result.sunSection?.mode).toBe("limb")
    expect(result.summary.sunPages).toBe(1)
  })

  it("tiles oversized planets in one_per_page layout", () => {
    const model: ScalePageModel = {
      sections: [
        { type: "sun", body: body("10", "Sun", 1_391_400, "star") },
        {
          type: "planet",
          planet: body("599", "Jupiter", 139822),
          moons: [],
        },
      ],
    }
    const result = computePrintLayout(
      model,
      defaultTestConfig({
        sunMm: 2500,
        artMode: "full",
        planetLayout: "one_per_page",
      })
    )
    const planetPages = result.pages.filter((p) => p.section === "planets")
    const tilePlacements = planetPages.flatMap((p) =>
      p.placements.filter((pl) => pl.kind === "body_tile")
    )
    expect(tilePlacements.length).toBeGreaterThan(1)
    expect(planetPages.length).toBeGreaterThan(1)
  })

  it("fits small planets on a single body page", () => {
    const model: ScalePageModel = {
      sections: [
        { type: "sun", body: body("10", "Sun", 1_391_400, "star") },
        {
          type: "planet",
          planet: body("199", "Mercury", 4879.4),
          moons: [],
        },
      ],
    }
    const result = computePrintLayout(
      model,
      defaultTestConfig({
        sunMm: 900,
        planetLayout: "one_per_page",
      })
    )
    const planetPages = result.pages.filter((p) => p.section === "planets")
    expect(planetPages).toHaveLength(1)
    expect(planetPages[0]!.placements[0]!.kind).toBe("body")
  })

  it("packs moons on the same page as planets in pack mode", () => {
    const model = minimalModel()
    const result = computePrintLayout(
      model,
      defaultTestConfig({ includeMoons: true })
    )
    const bodyPages = result.pages.filter((p) => p.section === "planets")
    const pageWithMoon = bodyPages.find((page) =>
      page.placements.some((p) => p.body?.name === "Moon")
    )
    expect(pageWithMoon).toBeDefined()
    expect(
      pageWithMoon!.placements.some((p) => p.body?.kind === "planet")
    ).toBe(true)
    expect(result.summary.moonPages).toBeGreaterThan(0)
  })

  it("uses fewer body pages when moons pack with planets", () => {
    const model = minimalModel()
    const packedWithMoons = computePrintLayout(
      model,
      defaultTestConfig({ includeMoons: true, planetLayout: "pack" })
    )
    const onePerPageWithMoons = computePrintLayout(
      model,
      defaultTestConfig({ includeMoons: true, planetLayout: "one_per_page" })
    )
    expect(packedWithMoons.summary.planetPages).toBeLessThan(
      onePerPageWithMoons.summary.planetPages
    )
  })

  it("omits appendix pages when includeAppendix is false", () => {
    const model = minimalModel()
    const result = computePrintLayout(
      model,
      defaultTestConfig({ sunMm: 50, includeAppendix: false })
    )
    expect(result.summary.appendixPages).toBe(0)
    expect(result.pages.every((p) => p.section !== "appendix")).toBe(true)
    expect(result.omitted.length).toBeGreaterThan(0)
  })

  it("lays out appendix in two columns when enabled", () => {
    const model = minimalModel()
    const result = computePrintLayout(
      model,
      defaultTestConfig({
        sunMm: 50,
        includeAppendix: true,
        includeMoons: true,
        includeBelts: true,
      })
    )
    const appendixPage = result.pages.find((p) => p.section === "appendix")
    expect(appendixPage).toBeDefined()
    const bodyLines = appendixPage!.placements.filter((p) =>
      p.label.startsWith("•")
    )
    expect(bodyLines.length).toBeGreaterThan(1)
    const xs = new Set(bodyLines.map((p) => p.centerXMm))
    expect(xs.size).toBeGreaterThanOrEqual(2)
  })
})

function packItem(
  name: string,
  diameterMm: number,
  group: PrintBodyGroup = "planets"
) {
  return {
    body: body(name, name, diameterMm * 1000),
    group,
    diameterMm,
    label: name,
    subtitle: "",
  }
}

describe("layoutPack", () => {
  it("tucks small bodies beside tall ones instead of leaving a gap row", () => {
    const rect = printableRect("a4", "portrait", 10)
    const pages = layoutPack(
      [
        packItem("BigA", 100),
        packItem("BigB", 100),
        packItem("Small", 30, "moons"),
      ],
      "planets",
      rect,
      0,
      0
    )
    expect(pages).toHaveLength(1)
    const small = pages[0]!.placements.find((p) => p.body?.name === "Small")!
    expect(small.centerXMm).toBeGreaterThan(
      rect.marginMm + 100 + PACK_GAP_MM - 1
    )
    expect(small.centerYMm).toBeLessThan(
      rect.marginMm + 100 + LABEL_HEIGHT_MM + PACK_GAP_MM
    )
  })

  it("spaces packed labels by estimated text width not just disk diameter", () => {
    const rect = printableRect("a4", "portrait", 10)
    const pages = layoutPack(
      [packItem("Titania", 5, "moons"), packItem("Makemake", 5, "moons")],
      "planets",
      rect,
      0,
      0
    )
    const [left, right] = pages[0]!.placements
    expect(left!.labelWidthMm).toBeGreaterThanOrEqual(MIN_LABEL_WIDTH_MM)
    expect(left!.labelWidthMm).toBeGreaterThan(left!.diameterMm)
    const leftEdge = left!.centerXMm + left!.labelWidthMm! / 2
    const rightEdge = right!.centerXMm - right!.labelWidthMm! / 2
    expect(rightEdge - leftEdge).toBeGreaterThanOrEqual(PACK_GAP_MM)
  })
})

describe("estimateLabelWidthMm", () => {
  it("is at least MIN_LABEL_WIDTH_MM for short names", () => {
    expect(estimateLabelWidthMm("Io", "1 mm")).toBeGreaterThanOrEqual(
      MIN_LABEL_WIDTH_MM
    )
  })
})

describe("computeDiskTiles", () => {
  it("produces contiguous tile centers across columns with zero overlap", () => {
    const rect = printableRect("a4", "portrait", 10)
    const jupiter = body("599", "Jupiter", 139822)
    const diameterMm = 250
    const { pages, cols } = computeDiskTiles(
      jupiter,
      diameterMm,
      rect,
      "planets",
      "Jupiter",
      "25 cm",
      "body_tile",
      0,
      0
    )
    expect(cols).toBeGreaterThan(1)
    const row0 = pages.filter((p) => p.placements[0]?.tileRow === 0)
    const col0 = row0.find((p) => p.placements[0]?.tileCol === 0)!
    const col1 = row0.find((p) => p.placements[0]?.tileCol === 1)!
    expect(
      Math.abs(col1.placements[0]!.centerXMm - col0.placements[0]!.centerXMm)
    ).toBe(rect.printableWidthMm)
  })

  it("steps tile centers by printable width minus overlap", () => {
    const rect = printableRect("a4", "portrait", 10)
    const overlap = 20
    const jupiter = body("599", "Jupiter", 139822)
    const diameterMm = 250
    const { pages, cols } = computeDiskTiles(
      jupiter,
      diameterMm,
      rect,
      "planets",
      "Jupiter",
      "25 cm",
      "body_tile",
      0,
      overlap
    )
    expect(cols).toBeGreaterThan(1)
    const row0 = pages.filter((p) => p.placements[0]?.tileRow === 0)
    const col0 = row0.find((p) => p.placements[0]?.tileCol === 0)!
    const col1 = row0.find((p) => p.placements[0]?.tileCol === 1)!
    expect(
      Math.abs(col1.placements[0]!.centerXMm - col0.placements[0]!.centerXMm)
    ).toBe(rect.printableWidthMm - overlap)
  })

  it("may require more tiles with overlap than without", () => {
    const rect = printableRect("a4", "portrait", 10)
    const jupiter = body("599", "Jupiter", 139822)
    const diameterMm = 360
    const withoutOverlap = computeDiskTiles(
      jupiter,
      diameterMm,
      rect,
      "planets",
      "Jupiter",
      undefined,
      "body_tile",
      0,
      0
    )
    const withOverlap = computeDiskTiles(
      jupiter,
      diameterMm,
      rect,
      "planets",
      "Jupiter",
      undefined,
      "body_tile",
      0,
      20
    )
    expect(withOverlap.pages.length).toBeGreaterThanOrEqual(
      withoutOverlap.pages.length
    )
  })
})
