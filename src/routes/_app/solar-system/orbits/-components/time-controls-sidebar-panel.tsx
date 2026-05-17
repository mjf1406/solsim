import { createPortal } from "react-dom"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import {
  TIME_SPEED_PRESETS,
  type TimeSpeedPreset,
} from "@/lib/solar-system/orbits/orbit-period"
import { cn } from "@/lib/utils"
import { ChevronUp, Pause, Play } from "lucide-react"

const SPEED_WIDTH_REF = "100 yr/s"

export type TimeControlsSidebarPortalProps = {
  paused: boolean
  onPausedChange: (paused: boolean) => void
  speedIndex: number
  onSpeedIndexChange: (index: number) => void
}

export function TimeControlsSidebarPortal({
  paused,
  onPausedChange,
  speedIndex,
  onSpeedIndexChange,
}: TimeControlsSidebarPortalProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <TimeControlsCollapsibleSection
      paused={paused}
      onPausedChange={onPausedChange}
      speedIndex={speedIndex}
      onSpeedIndexChange={onSpeedIndexChange}
    />,
    rightSidebarContentMount
  )
}

function TimeControlsCollapsibleSection({
  paused,
  onPausedChange,
  speedIndex,
  onSpeedIndexChange,
}: TimeControlsSidebarPortalProps) {
  const preset: TimeSpeedPreset =
    TIME_SPEED_PRESETS[speedIndex] ?? TIME_SPEED_PRESETS[1]!
  const cycleSpeed = () => {
    onSpeedIndexChange((speedIndex + 1) % TIME_SPEED_PRESETS.length)
  }

  return (
    <div className="mb-2">
      <Collapsible
        defaultOpen={false}
        className="group/time-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
      >
        <div className="flex w-full items-center gap-2">
          <CollapsibleTrigger
            className={cn(
              "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
              "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
            )}
          >
            Time
          </CollapsibleTrigger>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="icon-sm"
              className="shrink-0"
              aria-label={paused ? "Play orbit animation" : "Pause orbit animation"}
              aria-pressed={!paused}
              onClick={(e) => {
                e.preventDefault()
                onPausedChange(!paused)
              }}
            >
              {paused ? (
                <Play aria-hidden className="size-4" />
              ) : (
                <Pause aria-hidden className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              aria-label={`Cycle simulation speed (currently ${preset.label})`}
              onClick={(e) => {
                e.preventDefault()
                cycleSpeed()
              }}
            >
              <span className="inline-grid justify-items-center">
                <span className="invisible col-start-1 row-start-1" aria-hidden>
                  {SPEED_WIDTH_REF}
                </span>
                <span className="col-start-1 row-start-1 flex justify-center">
                  {preset.label}
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
                className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/time-collapsible:rotate-180"
              />
              <span className="sr-only">Toggle Time explainer</span>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="border-t border-sidebar-border/80 px-1 pt-3 pb-1">
            <p className="text-xs leading-snug text-sidebar-foreground/80">
              Speed up simulated time to watch bodies move along their circular
              orbits. Orbital speed follows Kepler&apos;s third law from each
              body&apos;s semi-major axis.
            </p>
            <p className="mt-2 text-xs tabular-nums text-sidebar-foreground/70">
              Current rate:{" "}
              <span className="font-medium text-sidebar-foreground">
                {preset.label}
              </span>
              {paused ? " (paused)" : " (running)"}
            </p>
            <div
              role="group"
              aria-label="Simulation speed presets"
              className="mt-3 flex flex-wrap gap-1.5"
            >
              {TIME_SPEED_PRESETS.map((p, index) => {
                const selected = speedIndex === index
                return (
                  <Button
                    key={p.key}
                    type="button"
                    variant={selected ? "default" : "secondary"}
                    size="sm"
                    className="shrink-0"
                    aria-label={`Set simulation speed to ${p.label}`}
                    aria-pressed={selected}
                    onClick={(e) => {
                      e.preventDefault()
                      onSpeedIndexChange(index)
                    }}
                  >
                    {p.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
