import { createPortal } from "react-dom"
import { ChevronUp } from "lucide-react"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { type DisplayCalibration } from "@/hooks/use-display-calibration"
import {
  formatKmPerPx,
  formatScaleRatio,
  SCALE_MODE_BUTTON_WIDTH_REF,
  type ScaleReadout,
  type ScaleSliderStop,
} from "@/lib/solar-system/scale/scale-presets"
import { cn } from "@/lib/utils"

import { DisplayCalibrationDialog } from "./display-calibration-dialog"

type ScaleControlSidebarPanelProps = {
  /** Collapsible title shown in the sidebar. */
  title?: string
  /** When false, hides display calibration UI and dialog. */
  showCalibrationControls?: boolean
  /** Label for the cycle preset button (nearest Moon ladder step or named preset). */
  cycleButtonLabel: string
  /** Slider value, 0..1. */
  sliderValue: number
  /** Live readout (kmPerPx, ratio). */
  readout: ScaleReadout
  /** Slider in flight (slider moved but canvas hasn't applied yet). */
  isPending?: boolean
  setSliderValue: (value: number) => void
  cycleMode: () => void
  snapStops: ScaleSliderStop[]
  calibration: DisplayCalibration
  /** Optional scale-link switch, used by pages with multiple scale controls. */
  linked?: boolean
  onLinkedChange?: (linked: boolean) => void
  linkLabel?: string
  /** Controlled display calibration dialog (lifted so other panels can open it). */
  calibrationDialogOpen: boolean
  onCalibrationDialogOpenChange: (open: boolean) => void
}

/** Shadcn `Slider` defaults to 0–100; scale math stays 0–1 internally. */
function scaleSliderUiValue(normalized: number): number {
  return Math.round(Math.min(100, Math.max(0, normalized * 100)))
}

export type ScaleControlSidebarPortalProps = ScaleControlSidebarPanelProps

/** Right-sidebar portal wrapper; renders nothing until the slot is mounted. */
export function ScaleControlSidebarPortal(
  props: ScaleControlSidebarPortalProps
) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <ScaleControlCollapsibleSection {...props} />,
    rightSidebarContentMount
  )
}

function ScaleControlCollapsibleSection({
  title = "Scale",
  showCalibrationControls = true,
  cycleButtonLabel,
  sliderValue,
  readout,
  isPending,
  setSliderValue,
  cycleMode,
  snapStops,
  calibration,
  linked,
  onLinkedChange,
  linkLabel = "Link scales",
  calibrationDialogOpen,
  onCalibrationDialogOpenChange,
}: ScaleControlSidebarPanelProps) {
  const ratioPrefix = calibration.isCalibrated ? "" : "≈ "

  const cycleAriaLabel = calibration.isCalibrated
    ? "Cycle through named Sun size presets from ping pong to locomotive, including 1 pixel Moon"
    : "Cycle scale along the Moon ladder from x1/8 to x128 relative to the 1 pixel Moon scale"

  return (
    <div className="mb-2">
      <Collapsible
        defaultOpen={true}
        className="group/scale-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
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
              onClick={(e) => {
                e.preventDefault()
                cycleMode()
              }}
              aria-label={cycleAriaLabel}
            >
              <span className="inline-grid justify-items-center">
                <span className="invisible col-start-1 row-start-1" aria-hidden>
                  {SCALE_MODE_BUTTON_WIDTH_REF}
                </span>
                <span className="col-start-1 row-start-1 flex justify-center">
                  {cycleButtonLabel}
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
                className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/scale-collapsible:rotate-180"
              />
              <span className="sr-only">Toggle scale slider and readout</span>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-sidebar-border/80 px-1 pt-3 pb-1 text-xs leading-snug text-sidebar-foreground/80">
            <ScaleSlider
              sliderValue={sliderValue}
              onChange={setSliderValue}
              snapStops={snapStops}
              isPending={isPending}
              ariaLabel={
                calibration.isCalibrated
                  ? "Canvas scale (vertical, named object size presets)"
                  : "Canvas scale (vertical, equal steps from x1/8 to x128 versus 1 pixel Moon)"
              }
            />
            <ScaleReadoutBlock readout={readout} ratioPrefix={ratioPrefix} />
            {showCalibrationControls ? (
              <>
                <Collapsible
                  defaultOpen={false}
                  className="group/unlock-scale rounded-lg border border-sidebar-border/70 bg-sidebar-accent/25"
                >
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
                      "hover:bg-sidebar-accent/50 focus-visible:ring-2"
                    )}
                  >
                    <ChevronUp
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/unlock-scale:rotate-180"
                    />
                    <span className="min-w-0">
                      Want to make the Sun the same size as real objects, like a
                      tennis ball or basketball?
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-2 pt-0 pb-2">
                    <ol className="list-decimal space-y-2 pl-4 text-[11px] text-sidebar-foreground/85">
                      <li>
                        Get a ruler, driver&apos;s license, passport, or credit
                        card.
                      </li>
                      <li className="marker:font-medium">
                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1.5">
                          <span>Then</span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 shrink-0 px-2 text-[11px]"
                            onClick={() => onCalibrationDialogOpenChange(true)}
                          >
                            Calibrate
                          </Button>
                        </span>
                      </li>
                    </ol>
                  </CollapsibleContent>
                </Collapsible>
                {calibration.isCalibrated ? (
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-sidebar-foreground/60">
                      Display calibrated
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="shrink-0 px-1.5 text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground"
                      onClick={() => calibration.reset()}
                      aria-label="Clear display calibration and use CSS default pixel density"
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <p className="text-[11px] text-sidebar-foreground/60">
                    Using CSS default pixel density
                  </p>
                )}
              </>
            ) : null}
            {onLinkedChange ? (
              <ScaleLinkToggle
                checked={linked ?? false}
                onCheckedChange={onLinkedChange}
                label={linkLabel}
              />
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {showCalibrationControls ? (
        <DisplayCalibrationDialog
          open={calibrationDialogOpen}
          onOpenChange={onCalibrationDialogOpenChange}
          pxPerMm={calibration.pxPerMm}
          cardWidthPx={calibration.cardWidthPx}
          onApply={calibration.setCardWidthPx}
          onReset={calibration.reset}
        />
      ) : null}
    </div>
  )
}

function ScaleLinkToggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/25 px-2 py-2">
      <span className="min-w-0 text-[11px] font-medium text-sidebar-foreground">
        {label}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  )
}

function ScaleSlider({
  sliderValue,
  onChange,
  snapStops,
  isPending,
  ariaLabel,
}: {
  sliderValue: number
  onChange: (value: number) => void
  snapStops: ScaleSliderStop[]
  isPending?: boolean
  ariaLabel: string
}) {
  return (
    <div
      className={cn(
        "grid h-80 min-h-80 w-full grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2",
        isPending && "opacity-95"
      )}
    >
      {/* One shared row height: ticks use the same box as the Radix track so % matches the thumb. */}
      <div className="relative min-h-0 min-w-0">
        <Slider
          orientation="vertical"
          className="absolute inset-0 h-full w-full touch-none data-vertical:min-h-0! data-vertical:items-stretch data-vertical:justify-center"
          value={[scaleSliderUiValue(sliderValue)]}
          onValueChange={(v) => {
            if (typeof v[0] === "number") onChange(v[0] / 100)
          }}
          aria-label={ariaLabel}
        />
        <div
          className="pointer-events-none absolute inset-0 z-5 flex justify-center"
          aria-hidden
        >
          {snapStops.map((stop) => (
            <span
              key={stop.key}
              className="absolute left-3/4 h-px w-7 -translate-x-full -translate-y-1/2 bg-sidebar-foreground/40"
              style={{
                bottom: `${stop.sliderValue * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="relative min-h-0 min-w-0">
        {snapStops.map((stop) => (
          <button
            key={stop.key}
            type="button"
            onClick={() => onChange(stop.sliderValue)}
            className={cn(
              "absolute top-auto right-0 left-0 z-20 translate-y-[calc(-50%+8px)] pr-0.5 text-left",
              "text-[10px] leading-none text-sidebar-foreground/70",
              "rounded py-0 pl-0.5 ring-sidebar-ring outline-none",
              "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2"
            )}
            style={{
              bottom: `${stop.sliderValue * 100}%`,
            }}
          >
            {stop.caption}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScaleReadoutBlock({
  readout,
  ratioPrefix,
}: {
  readout: ScaleReadout
  ratioPrefix: string
}) {
  return (
    <div className="rounded-lg bg-sidebar-accent/40 px-2 py-2 font-mono text-[11px] text-sidebar-foreground">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sidebar-foreground/60">1 px =</span>
        <span className="tabular-nums">{formatKmPerPx(readout.kmPerPx)}</span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="text-sidebar-foreground/60">Ratio</span>
        <span className="tabular-nums">
          {ratioPrefix}
          {formatScaleRatio(readout.ratio)}
        </span>
      </div>
    </div>
  )
}
