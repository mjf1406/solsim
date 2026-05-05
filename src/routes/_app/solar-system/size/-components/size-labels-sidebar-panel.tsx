import { createPortal } from "react-dom"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ChevronUp } from "lucide-react"

import { type SizeCanvasLabelMode } from "../-data"

/** Widest mode label; used to reserve button width while cycling. */
const LABEL_MODE_WIDTH_REF = "Auto"

function modeButtonLabel(mode: SizeCanvasLabelMode): string {
  return mode === "on" ? "On" : mode === "auto" ? "Auto" : "Off"
}

type LabelsSidebarPanelProps = {
  labelMode: SizeCanvasLabelMode
  onCycleLabelMode: () => void
  selectedBodyLabel: string | null
}

export function SizePageLabelsSidebarPortal(props: LabelsSidebarPanelProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <SizeLabelsCollapsibleSection {...props} />,
    rightSidebarContentMount
  )
}

function SizeLabelsCollapsibleSection({
  labelMode,
  onCycleLabelMode,
  selectedBodyLabel,
}: LabelsSidebarPanelProps) {
  return (
    <Collapsible
      defaultOpen={false}
      className="group/labels-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
    >
      <div className="flex w-full items-center gap-2">
        <CollapsibleTrigger
          className={cn(
            "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
            "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
          )}
        >
          Labels
        </CollapsibleTrigger>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="shrink-0"
            onClick={(e) => {
              e.preventDefault()
              onCycleLabelMode()
            }}
          >
            <span className="inline-grid justify-items-center">
              <span className="invisible col-start-1 row-start-1" aria-hidden>
                {LABEL_MODE_WIDTH_REF}
              </span>
              <span className="col-start-1 row-start-1 flex justify-center">
                {modeButtonLabel(labelMode)}
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
              className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/labels-collapsible:rotate-180"
            />
            <span className="sr-only">
              Toggle descriptions for On, Auto, and Off label modes
            </span>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="space-y-2 border-t border-sidebar-border/80 px-1 pt-3 pb-1 text-xs leading-snug text-sidebar-foreground/80">
          <p>
            <span className="font-medium text-sidebar-foreground">On</span> mode
            shows every body's label.
          </p>
          <p>
            <span className="font-medium text-sidebar-foreground">Auto</span>{" "}
            mode shows only the label of the selected body.
            {labelMode === "auto" && (
              <span className="mt-1 block text-sidebar-foreground/70">
                {selectedBodyLabel
                  ? `Selected: ${selectedBodyLabel}`
                  : "No body selected yet."}
              </span>
            )}
          </p>
          <p>
            <span className="font-medium text-sidebar-foreground">Off</span>{" "}
            mode hides all labels.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
