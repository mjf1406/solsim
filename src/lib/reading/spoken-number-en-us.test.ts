import { describe, expect, it } from "vite-plus/test"

import { spokenNumberEnUsFromEnUsDisplay } from "@/lib/reading/spoken-number-en-us"

describe("spokenNumberEnUsFromEnUsDisplay", () => {
  it("reads each digit after the decimal", () => {
    expect(spokenNumberEnUsFromEnUsDisplay("3.72")).toBe(
      "three point seven two"
    )
  })

  it("reads a single decimal digit", () => {
    expect(spokenNumberEnUsFromEnUsDisplay("3.7")).toBe("three point seven")
  })

  it("reads zeros between significant decimal digits", () => {
    expect(spokenNumberEnUsFromEnUsDisplay("12.05")).toBe(
      "twelve point zero five"
    )
  })

  it("strips grouping commas on the integer part", () => {
    expect(spokenNumberEnUsFromEnUsDisplay("1,234")).toBe(
      "one thousand two hundred thirty-four"
    )
  })

  it("returns empty for sentinel display", () => {
    expect(spokenNumberEnUsFromEnUsDisplay("—")).toBe("")
  })
})
