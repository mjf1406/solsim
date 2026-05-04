import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { ReadingKeyword } from "@/components/reading/reading-keyword"
import { SwitchableReadingNumber } from "@/components/reading/switchable-reading-number"

import {
  findSizeBodyDetail,
  formatDiameterNumber,
  formatDiameterPx,
  kindLabel,
  spokenDiameterSentence,
  type SizePageModel,
} from "../-data"

type SelectedBodySidebarProps = {
  model: SizePageModel
  selectedBodyId: string | null
}

export function SizeSelectedBodySidebarContent({
  model,
  selectedBodyId,
}: SelectedBodySidebarProps) {
  const [diameterUnit, setDiameterUnit] = useState<"km" | "mi">("km")
  const detail = findSizeBodyDetail(model, selectedBodyId)

  if (!detail) {
    return (
      <p className="text-base leading-snug text-sidebar-foreground/70">
        Select a body to learn about it!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center justify-between gap-2 font-heading text-2xl font-semibold tracking-tight text-sidebar-foreground">
        {detail.name}
        <Badge variant="secondary" className="w-fit shrink-0">
          {kindLabel(detail.kind)}
        </Badge>
      </h2>
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
            {detail.diameterKm != null && Number.isFinite(detail.diameterKm) ? (
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
            ) : (
              <span className="tabular-nums">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sidebar-foreground/60">Pixel diameter</dt>
          <dd className="mt-0.5 font-medium text-sidebar-foreground tabular-nums">
            {formatDiameterPx(detail.diameterPx)}
          </dd>
        </div>
      </dl>
    </div>
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
