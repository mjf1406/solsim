import { describe, expect, it } from "vitest"

import { bodyDiskSrc, placeholderSrc } from "./placeholders"

describe("bodyDiskSrc", () => {
  it("uses real star disk when available", () => {
    expect(bodyDiskSrc("Sun", "star")).toBe("/assets/stars/Sun.svg")
  })

  it("uses real planet disks when available", () => {
    expect(bodyDiskSrc("Earth", "planet")).toBe("/assets/planets/Earth.svg")
    expect(bodyDiskSrc("Mars", "planet")).toBe("/assets/planets/Mars.svg")
    expect(bodyDiskSrc("Mercury", "planet")).toBe("/assets/planets/Mercury.svg")
    expect(bodyDiskSrc("Uranus", "planet")).toBe("/assets/planets/Uranus.svg")
  })

  it("uses real moon disk when available", () => {
    expect(bodyDiskSrc("Moon", "moon")).toBe(
      "/assets/natural-satellites/Moon.svg"
    )
  })

  it("falls back to placeholders for bodies without real art", () => {
    expect(bodyDiskSrc("Venus", "planet")).toBe(
      "/assets/placeholders/venus.svg"
    )
    expect(bodyDiskSrc("Jupiter", "planet")).toBe(
      "/assets/placeholders/jupiter.svg"
    )
    expect(bodyDiskSrc("Io", "moon")).toBe(
      "/assets/placeholders/natural-satellite.svg"
    )
    expect(bodyDiskSrc("Ceres", "dwarf")).toBe(
      "/assets/placeholders/dwarf-planet.svg"
    )
    expect(bodyDiskSrc("Halley's Comet", "comet")).toBe(
      "/assets/placeholders/comet.svg"
    )
  })
})

describe("placeholderSrc", () => {
  it("maps planets to lowercase placeholder files", () => {
    expect(placeholderSrc("Earth", "planet")).toBe(
      "/assets/placeholders/earth.svg"
    )
  })

  it("uses generic placeholders for non-planet kinds", () => {
    expect(placeholderSrc("Sun", "star")).toBe("/assets/placeholders/sun.svg")
    expect(placeholderSrc("Moon", "moon")).toBe(
      "/assets/placeholders/natural-satellite.svg"
    )
  })
})
