import { useState } from "react"
import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ReadingKeyword } from "@/components/reading/reading-keyword"
import { SwitchableReadingNumber } from "@/components/reading/switchable-reading-number"
import { spokenNumberEnUsMaxOneDecimal } from "@/lib/reading/spoken-number-en-us"
import { planetSymbolHrefForDisplayName } from "@/lib/solar-system/planet-symbol"
import {
  formatScaledDiameter,
  scaledDiameterMm,
  spokenScaledDiameterSentence,
  type ScaledDiameterUnitSystem,
} from "@/lib/solar-system/scale/scaled-diameter-format"

export type BodyDiameterDetail = {
  name: string
  kindLabel: string
  kind: string
  diameterKm: number
  diameterPx: number
  parentPlanetName: string | null
  typeIntroPredication: string | null
}

export type BodyDiameterStatsSectionProps = {
  detail: BodyDiameterDetail
  /** Live canvas scale (CSS pixels per real-world km). */
  pxPerKm: number
  /** Display calibration (CSS pixels per real-world mm). */
  pxPerMm: number
  /** True when the user has saved a measured display calibration. */
  isCalibrated: boolean
  /** Opens the display calibration dialog (same as Scale panel). */
  onOpenCalibration: () => void
  /**
   * Optional note under “Pixel diameter” (e.g. distance map: true scale vs a 1 px tap target
   * when the body is sub-pixel at the current zoom).
   */
  pixelDiameterFootnote?: string
}

export function BodyDiameterStatsSection({
  detail,
  pxPerKm,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
  pixelDiameterFootnote,
}: BodyDiameterStatsSectionProps) {
  const [diameterUnit, setDiameterUnit] = useState<"km" | "mi">("km")
  const [scaledUnitSystem, setScaledUnitSystem] =
    useState<ScaledDiameterUnitSystem>("metric")

  const subjectLabel = detail.name === "Sun" ? "the Sun" : detail.name
  const titleSymbolHref = planetSymbolHrefForDisplayName(detail.name)

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center justify-between gap-2 font-heading text-2xl font-semibold tracking-tight text-sidebar-foreground">
        <span className="flex min-w-0 items-center gap-2">
          {titleSymbolHref ? (
            <img
              src={titleSymbolHref}
              alt=""
              aria-hidden
              className="size-9 shrink-0 dark:[filter:invert(1)_brightness(1.1)]"
              draggable={false}
            />
          ) : null}
          <span className="min-w-0">{detail.name}</span>
        </span>
        <Badge variant="secondary" className="w-fit shrink-0">
          {detail.kindLabel}
        </Badge>
      </h2>
      {detail.kind === "moon" && detail.parentPlanetName ? (
        <p className="text-base leading-snug text-sidebar-foreground/90">
          {detail.name} is a moon of {detail.parentPlanetName}.
        </p>
      ) : detail.typeIntroPredication ? (
        <p className="text-base leading-snug text-sidebar-foreground/90">
          {subjectLabel} is {detail.typeIntroPredication}.
        </p>
      ) : null}
      <p className="text-base leading-snug text-sidebar-foreground/90">
        See how wide {detail.name == "Sun" ? "the Sun" : detail.name} really is
        below. This is also called the{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<DiameterExplainerSection />}
          popoverContentProps={{
            side: "bottom",
            align: "start",
            className:
              "border border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm",
          }}
        >
          diameter
        </ReadingKeyword>
        .
      </p>
      <dl className="space-y-2 text-base text-sidebar-foreground/90">
        <div>
          <dt className="text-sidebar-foreground/60">Diameter</dt>
          <dd className="mt-0.5 font-medium text-sidebar-foreground">
            <SwitchableReadingNumber
              onToggleUnit={() =>
                setDiameterUnit((u) => (u === "km" ? "mi" : "km"))
              }
              numberAriaLabel={
                diameterUnit === "km"
                  ? "Showing kilometers. Switch to miles."
                  : "Showing miles. Switch to kilometers."
              }
              explainerContent={
                <BigNumberReadingExplainerSection
                  diameterKm={detail.diameterKm}
                  diameterUnit={diameterUnit}
                />
              }
            >
              {formatDiameterNumber(detail.diameterKm, diameterUnit)}{" "}
              {diameterUnit}
            </SwitchableReadingNumber>
          </dd>
        </div>
        <div>
          <dt className="text-sidebar-foreground/60">Pixel diameter</dt>
          <dd className="mt-0.5 font-medium text-sidebar-foreground tabular-nums">
            {formatDiameterPx(detail.diameterPx)}
            {pixelDiameterFootnote ? (
              <p className="mt-1.5 text-xs font-normal leading-snug text-sidebar-foreground/65">
                {pixelDiameterFootnote}
              </p>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-sidebar-foreground/60">Scaled diameter</dt>
          <dd className="mt-0.5 font-medium text-sidebar-foreground">
            {(() => {
              const mm = scaledDiameterMm(detail.diameterKm, pxPerKm, pxPerMm)
              if (!Number.isFinite(mm)) {
                return <span className="tabular-nums">—</span>
              }
              if (!isCalibrated) {
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 px-3 text-sm font-medium"
                    onClick={() => onOpenCalibration()}
                    aria-label="Open display calibration to see scaled diameter on your screen"
                  >
                    Calibrate to see
                  </Button>
                )
              }
              const formatted = formatScaledDiameter(mm, scaledUnitSystem)
              const approxPrefix = "≈ "
              return (
                <SwitchableReadingNumber
                  onToggleUnit={() =>
                    setScaledUnitSystem((s) =>
                      s === "metric" ? "imperial" : "metric"
                    )
                  }
                  numberAriaLabel={
                    scaledUnitSystem === "metric"
                      ? "Showing metric units. Switch to imperial."
                      : "Showing imperial units. Switch to metric."
                  }
                  explainerContent={
                    <ScaledDiameterExplainerSection
                      bodyName={detail.name}
                      mm={mm}
                      system={scaledUnitSystem}
                    />
                  }
                >
                  {approxPrefix}
                  {formatted.display} {formatted.unit}
                </SwitchableReadingNumber>
              )
            })()}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/** Kilometers to statute miles (exact definition uses 1 mi = 1.609344 km). */
const KM_TO_MI = 1 / 1.609344

function formatDiameterNumber(km: number, unit: "km" | "mi"): string {
  if (!Number.isFinite(km) || km < 0) return "—"
  const n = unit === "km" ? km : km * KM_TO_MI
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 })
}

function formatDiameterPx(px: number): string {
  if (!Number.isFinite(px) || px < 0) return "—"
  const digits = px >= 1 ? 1 : px >= 0.01 ? 3 : 4
  return `${px.toLocaleString("en-US", { maximumFractionDigits: digits })} px`
}

function spokenDiameterSentence(km: number, unit: "km" | "mi"): string {
  const n = unit === "km" ? km : km * KM_TO_MI
  const formatted = n.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    useGrouping: false,
  })
  const singular = formatted === "1"
  const unitWords =
    unit === "km"
      ? singular
        ? "kilometer"
        : "kilometers"
      : singular
        ? "mile"
        : "miles"
  const sentence = `${spokenNumberEnUsMaxOneDecimal(n)} ${unitWords}`
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + "."
}

function ScaledDiameterExplainerSection({
  bodyName,
  mm,
  system,
}: {
  bodyName: string
  mm: number
  system: ScaledDiameterUnitSystem
}) {
  const formatted = formatScaledDiameter(mm, system)
  const displayed = `≈ ${formatted.display} ${formatted.unit}`
  const spoken = spokenScaledDiameterSentence(mm, system)

  return (
    <section
      aria-labelledby="scaled-diameter-reading-heading"
      className="rounded-xl px-0.5 py-0.5"
    >
      <h3
        id="scaled-diameter-reading-heading"
        className="font-heading text-sm font-semibold text-sidebar-foreground"
      >
        Say this scaled diameter
      </h3>
      <p className="mt-2 rounded-md bg-sidebar-accent/50 px-2 py-2 font-mono text-sm text-sidebar-foreground tabular-nums">
        {displayed}
      </p>
      <p className="mt-3 text-base leading-relaxed text-sidebar-foreground">
        {spoken}
      </p>
      <p className="mt-3 text-sm leading-snug text-accent-foreground/60">
        That is how wide {bodyName === "Sun" ? "the Sun" : bodyName} is on your
        screen right now. Try the Scale slider on the right to make it bigger or
        smaller.
      </p>
      <p className="mt-3 text-xs leading-snug text-sidebar-foreground/65">
        The <span className="font-mono">≈</span> means "about". We can say "it's
        about {formatted.display} {formatted.unit}". We cannot be exact because
        the screen calibration is not perfect.
      </p>
    </section>
  )
}

function BigNumberReadingExplainerSection({
  diameterKm,
  diameterUnit,
}: {
  diameterKm: number
  diameterUnit: "km" | "mi"
}) {
  const displayed = `${formatDiameterNumber(diameterKm, diameterUnit)} ${diameterUnit}`
  const spoken = spokenDiameterSentence(diameterKm, diameterUnit)

  return (
    <section
      aria-labelledby="big-number-reading-heading"
      className="rounded-xl px-0.5 py-0.5"
    >
      <h3
        id="big-number-reading-heading"
        className="font-heading text-sm font-semibold text-sidebar-foreground"
      >
        Say this diameter
      </h3>
      <p className="mt-2 rounded-md bg-sidebar-accent/50 px-2 py-2 font-mono text-sm text-sidebar-foreground tabular-nums">
        {displayed}
      </p>
      <p className="mt-3 text-base leading-relaxed text-sidebar-foreground">
        {spoken}
      </p>
    </section>
  )
}

function DiameterExplainerSection() {
  return (
    <section
      aria-labelledby="diameter-explainer-heading"
      className="rounded-xl px-0.5 py-0.5"
    >
      <h3
        id="diameter-explainer-heading"
        className="font-heading text-sm font-semibold text-sidebar-foreground"
      >
        Diameter
      </h3>
      <figure className="mt-2">
        <img
          src="/assets/education/diameter.svg"
          alt="Diagram showing a circle with a line passing through its center from one edge to the other, illustrating diameter"
          className="mx-auto h-auto w-full max-w-[200px] rounded-md"
        />
        <figcaption className="sr-only">
          Visual explanation of diameter as distance across a circle through the
          center.
        </figcaption>
      </figure>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        The distance across a circle. The orange line with the arrows is the
        diameter.
      </p>
      <p className="mt-2">
        <a
          href="https://www.mathnasium.com/math-terms/diameter"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/90"
        >
          Mathnasium — Diameter
          <ExternalLink
            aria-hidden
            className="size-3.5 shrink-0 text-primary"
          />
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </p>
    </section>
  )
}

