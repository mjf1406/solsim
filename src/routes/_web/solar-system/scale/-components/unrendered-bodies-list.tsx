import { ChevronDown } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  formatScaledDiameter,
  type ScaledDiameterUnitSystem,
} from "@/lib/solar-system/scale/scaled-diameter-format"

import type { UnrenderedBodyEntry } from "../-data"

export type UnrenderedBodiesListProps = {
  entries: UnrenderedBodyEntry[]
  unitSystem?: ScaledDiameterUnitSystem
}

export function UnrenderedBodiesList({
  entries,
  unitSystem = "metric",
}: UnrenderedBodiesListProps) {
  if (entries.length === 0) return null

  return (
    <Collapsible defaultOpen={false} className="group/unrendered">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/unrendered:rotate-180"
            aria-hidden
          />
          <span className="font-medium">
            {entries.length} object{entries.length === 1 ? "" : "s"} too small
            to show at this scale
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm">
          {entries.map((entry) => {
            const { body, reason, scaledMm, context } = entry
            const sizeLabel =
              reason === "too_small" && scaledMm != null
                ? formatScaledDiameter(scaledMm, unitSystem)
                : null

            return (
              <li
                key={`${body.id}-${context ?? ""}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/40 py-1.5 last:border-0"
              >
                <span>
                  <span className="font-medium">{body.name}</span>
                  {context ? (
                    <span className="text-muted-foreground"> · {context}</span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {reason === "unknown_size"
                    ? "Size unknown"
                    : sizeLabel && sizeLabel.display !== "—"
                      ? `${sizeLabel.display} ${sizeLabel.unit}`
                      : "Too small"}
                </span>
              </li>
            )
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}
