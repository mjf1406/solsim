import { createPortal } from "react-dom"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { ChevronUp } from "lucide-react"

import { BodyMeasureControls, type BodyMeasureControlsProps } from "./body-measure-controls"

export function SizePageMeasureSidebarPortal(props: BodyMeasureControlsProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <SizeMeasureCollapsibleSection {...props} />,
    rightSidebarContentMount
  )
}

function SizeMeasureCollapsibleSection(props: BodyMeasureControlsProps) {
  return (
    <Collapsible
      defaultOpen={false}
      className="group/measure-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
    >
      <div className="flex w-full items-center gap-2">
        <CollapsibleTrigger
          className={cn(
            "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
            "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
          )}
        >
          Measure
        </CollapsibleTrigger>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <CollapsibleTrigger
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground ring-sidebar-ring outline-none",
              "hover:bg-sidebar-accent/60 focus-visible:ring-2"
            )}
          >
            <ChevronUp
              aria-hidden
              className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/measure-collapsible:rotate-180"
            />
            <span className="sr-only">
              Toggle Measure tool instructions and controls
            </span>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <BodyMeasureControls {...props} />
      </CollapsibleContent>
    </Collapsible>
  )
}
