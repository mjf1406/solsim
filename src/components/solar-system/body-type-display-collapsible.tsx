import type { ReactNode } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SizeBodyKind } from "@/routes/_app/solar-system/size/-data"
import { ChevronUp } from "lucide-react"

const HIDDEN_COUNT = "\u00d7"

export type BodyTypeDisplayRow = {
  kind: SizeBodyKind
  label: string
  total: number
  renderable: number
  visibility: "visible" | "hidden"
  onSetVisibility: (v: "visible" | "hidden") => void
}

type BodyTypeDisplayCollapsibleProps = {
  title: string
  /** Widest label string for fixed-width cycle button (invisible layer). */
  modeButtonWidthRef: string
  modeButtonLabel: string
  onCycleMode: () => void
  cycleAriaLabel: string
  rows: BodyTypeDisplayRow[]
  defaultOpen?: boolean
  expandedHelp?: ReactNode
}

export function BodyTypeDisplayCollapsible({
  title,
  modeButtonWidthRef,
  modeButtonLabel,
  onCycleMode,
  cycleAriaLabel,
  rows,
  defaultOpen = false,
  expandedHelp,
}: BodyTypeDisplayCollapsibleProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/bodytypes-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
    >
      <div className="flex w-full items-center gap-2">
        <CollapsibleTrigger
          className={cn(
            "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
            "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
          )}
        >
          {title}
        </CollapsibleTrigger>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="shrink-0"
            aria-label={cycleAriaLabel}
            onClick={(e) => {
              e.preventDefault()
              onCycleMode()
            }}
          >
            <span className="inline-grid justify-items-center">
              <span className="invisible col-start-1 row-start-1" aria-hidden>
                {modeButtonWidthRef}
              </span>
              <span className="col-start-1 row-start-1 flex justify-center">
                {modeButtonLabel}
              </span>
            </span>
          </Button>
          <CollapsibleTrigger
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground ring-sidebar-ring outline-none",
              "hover:bg-sidebar-accent/60 focus-visible:ring-2"
            )}
          >
            <ChevronUp
              aria-hidden
              className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/bodytypes-collapsible:rotate-180"
            />
            <span className="sr-only">Toggle body type options</span>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="space-y-3 border-t border-sidebar-border/80 px-1 pt-3 pb-1">
          {expandedHelp}
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.kind}
                className="flex items-center gap-2 text-xs text-sidebar-foreground"
              >
                <span className="min-w-0 flex-1 font-medium text-sidebar-foreground/95">
                  {row.label}
                </span>
                <span
                  className="shrink-0 tabular-nums text-sidebar-foreground/70"
                  aria-live="polite"
                >
                  {row.visibility === "hidden"
                    ? HIDDEN_COUNT
                    : `${row.renderable}\u00a0/\u00a0${row.total}`}
                </span>
                <Button
                  type="button"
                  role="switch"
                  aria-checked={row.visibility === "visible"}
                  aria-label={`${row.label}: ${row.visibility === "visible" ? "visible on canvas when scale allows" : "hidden"}. Toggle.`}
                  variant={
                    row.visibility === "visible" ? "default" : "outline"
                  }
                  size="sm"
                  className="h-7 shrink-0 px-2 text-[11px]"
                  onClick={() =>
                    row.onSetVisibility(
                      row.visibility === "visible" ? "hidden" : "visible"
                    )
                  }
                >
                  <span className="inline-grid justify-items-center">
                    <span className="invisible col-start-1 row-start-1" aria-hidden>
                      Visible
                    </span>
                    <span className="col-start-1 row-start-1">
                      {row.visibility === "visible" ? "Visible" : "Hidden"}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
