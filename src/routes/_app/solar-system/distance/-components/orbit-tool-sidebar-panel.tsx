import { createPortal } from "react-dom"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SizeBodyKind } from "@/routes/_app/solar-system/size/-data"
import { ChevronUp } from "lucide-react"

/** Invisible width anchor so the toggle button doesn’t jump when the label changes. */
const ORBIT_TOGGLE_BUTTON_WIDTH_REF = "Hide range"

export type OrbitToolSidebarPortalProps = {
  selectedBodyKind: SizeBodyKind | null
  hasOrbitData: boolean
  /** When set, a distance region (belt/cloud) is selected — orbit range does not apply. */
  distanceRegionLabel?: string | null
  orbitOn: boolean
  onOrbitOnChange: (next: boolean) => void
}

export function OrbitToolSidebarPortal({
  selectedBodyKind,
  hasOrbitData,
  distanceRegionLabel = null,
  orbitOn,
  onOrbitOnChange,
}: OrbitToolSidebarPortalProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <OrbitToolCollapsibleSection
      selectedBodyKind={selectedBodyKind}
      hasOrbitData={hasOrbitData}
      distanceRegionLabel={distanceRegionLabel}
      orbitOn={orbitOn}
      onOrbitOnChange={onOrbitOnChange}
    />,
    rightSidebarContentMount
  )
}

function OrbitToolCollapsibleSection({
  selectedBodyKind,
  hasOrbitData,
  distanceRegionLabel = null,
  orbitOn,
  onOrbitOnChange,
}: OrbitToolSidebarPortalProps) {
  let helper: string
  if (distanceRegionLabel) {
    helper = `The ${distanceRegionLabel} is a region, not a single orbit.`
  } else if (selectedBodyKind == null) {
    helper = "Select a body to see its orbit range."
  } else if (selectedBodyKind === "star") {
    helper = "The Sun has no parent — pick a planet, moon, or other body."
  } else if (!hasOrbitData) {
    helper = "No orbit data for this body."
  } else {
    helper =
      "Shows perihelion/periapsis and aphelion/apoapsis disks for the selected body relative to its parent, connected along the distance strip."
  }

  const toggleLabel = orbitOn ? "Hide range" : "Show range"

  const orbitToggleDisabled =
    Boolean(distanceRegionLabel) || selectedBodyKind == null

  return (
    <div className="mb-2">
      <Collapsible
        defaultOpen={false}
        className="group/orbit-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
      >
        <div className="flex w-full items-center gap-2">
          <CollapsibleTrigger
            className={cn(
              "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
              "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
            )}
          >
            Orbit
          </CollapsibleTrigger>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0"
              disabled={orbitToggleDisabled}
              aria-label={
                orbitOn
                  ? "Hide perihelion and aphelion range on the canvas"
                  : "Show perihelion and aphelion range on the canvas"
              }
              aria-pressed={orbitOn}
              onClick={(e) => {
                e.preventDefault()
                onOrbitOnChange(!orbitOn)
              }}
            >
              <span className="inline-grid justify-items-center">
                <span className="invisible col-start-1 row-start-1" aria-hidden>
                  {ORBIT_TOGGLE_BUTTON_WIDTH_REF}
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
                className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/orbit-collapsible:rotate-180"
              />
              <span className="sr-only">Toggle Orbit explainer</span>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="border-t border-sidebar-border/80 px-1 pt-3 pb-1">
            <p className="text-xs leading-snug text-sidebar-foreground/80">
              {helper}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
