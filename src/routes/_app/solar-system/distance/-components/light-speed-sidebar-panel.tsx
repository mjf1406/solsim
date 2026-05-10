import { createPortal } from "react-dom"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronUp } from "lucide-react"

const TOGGLE_WIDTH_REF = "Turn off"

export type LightSpeedSidebarPortalProps = {
  lightSpeedOn: boolean
  onLightSpeedOnChange: (next: boolean) => void
}

export function LightSpeedSidebarPortal({
  lightSpeedOn,
  onLightSpeedOnChange,
}: LightSpeedSidebarPortalProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <LightSpeedCollapsibleSection
      lightSpeedOn={lightSpeedOn}
      onLightSpeedOnChange={onLightSpeedOnChange}
    />,
    rightSidebarContentMount
  )
}

function LightSpeedCollapsibleSection({
  lightSpeedOn,
  onLightSpeedOnChange,
}: LightSpeedSidebarPortalProps) {
  const toggleLabel = lightSpeedOn ? "Turn off" : "Turn on"

  return (
    <div className="mb-2">
      <Collapsible
        defaultOpen={false}
        className="group/light-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
      >
        <div className="flex w-full items-center gap-2">
          <CollapsibleTrigger
            className={cn(
              "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
              "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
            )}
          >
            Light speed
          </CollapsibleTrigger>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0"
              aria-label={
                lightSpeedOn
                  ? "Turn off light speed visualizer"
                  : "Turn on light speed visualizer"
              }
              aria-pressed={lightSpeedOn}
              onClick={(e) => {
                e.preventDefault()
                onLightSpeedOnChange(!lightSpeedOn)
              }}
            >
              <span className="inline-grid justify-items-center">
                <span className="invisible col-start-1 row-start-1" aria-hidden>
                  {TOGGLE_WIDTH_REF}
                </span>
                <span className="col-start-1 row-start-1 flex justify-center">
                  {toggleLabel}
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
                className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/light-collapsible:rotate-180"
              />
              <span className="sr-only">Toggle Light speed explainer</span>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="border-t border-sidebar-border/80 px-1 pt-3 pb-1">
            <p className="text-xs leading-snug text-sidebar-foreground/80">
              Scrolls the distance strip at{" "}
              <span className="font-medium text-sidebar-foreground">
                scaled light speed
              </span>{" "}
              from your current view. Horizontal scrolling is disabled while it
              runs. Use the multiplier next to the distance unit readout to go
              faster than light on this map (still physically impossible in the
              real universe!). Reaching the end of the strip turns this off and
              restores your previous unit.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
