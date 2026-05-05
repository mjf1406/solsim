import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import {
  type CalibratorReference,
  calibrationReferenceWidthMm,
  calibrationRulerWidthMm,
  CREDIT_CARD_HEIGHT_MM,
  CREDIT_CARD_WIDTH_MM,
  PASSPORT_LONG_EDGE_MM,
  PASSPORT_SHORT_EDGE_MM,
  type RulerUnit,
} from "@/hooks/use-display-calibration"
import { CSS_PX_PER_MM } from "@/lib/solar-system/scale/scale-presets"
import { cn } from "@/lib/utils"

type DisplayCalibrationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Currently active CSS pixels per mm (calibrated or default). */
  pxPerMm: number
  /** Saved calibration card width (CSS px) if any, else null. */
  cardWidthPx: number | null
  /** Persists a new calibration. */
  onApply: (cardWidthPx: number) => void
  /** Forgets the saved calibration; UI snaps back to the CSS spec default. */
  onReset: () => void
}

/** Slider range: same relative span as the original card-only dialog. */
function minMaxPxForReference(refMm: number): { minPx: number; maxPx: number } {
  return {
    minPx: Math.round(refMm * 1.5),
    maxPx: Math.round(refMm * 8),
  }
}

function clampDraft(px: number, refMm: number): number {
  const { minPx, maxPx } = minMaxPxForReference(refMm)
  return Math.min(maxPx, Math.max(minPx, px))
}

function draftToUiPercent(
  draftPx: number,
  minPx: number,
  maxPx: number
): number {
  const span = maxPx - minPx
  if (!(span > 0)) return 0
  const c = Math.min(maxPx, Math.max(minPx, draftPx))
  return Math.round(((c - minPx) / span) * 100)
}

function uiPercentToDraft(
  percent: number,
  minPx: number,
  maxPx: number
): number {
  const u = Math.min(100, Math.max(0, percent)) / 100
  return Math.round(minPx + u * (maxPx - minPx))
}

export function DisplayCalibrationDialog({
  open,
  onOpenChange,
  pxPerMm,
  cardWidthPx,
  onApply,
  onReset,
}: DisplayCalibrationDialogProps) {
  const [calibratorRef, setCalibratorRef] =
    useState<CalibratorReference>("credit_card")
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>("cm")
  const rulerMajorTicks = rulerUnit === "cm" ? 10 : 4
  const refMm =
    calibratorRef === "ruler"
      ? calibrationRulerWidthMm(rulerUnit)
      : calibrationReferenceWidthMm(calibratorRef)
  const { minPx, maxPx } = useMemo(() => minMaxPxForReference(refMm), [refMm])

  const defaultDraftPx = useMemo(
    () => Math.round(CREDIT_CARD_WIDTH_MM * CSS_PX_PER_MM),
    []
  )
  const [draft, setDraft] = useState<number>(defaultDraftPx)

  const [prevOpen, setPrevOpen] = useState<boolean>(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      const mm =
        calibratorRef === "ruler"
          ? calibrationRulerWidthMm(rulerUnit)
          : calibrationReferenceWidthMm(calibratorRef)
      const { minPx: lo, maxPx: hi } = minMaxPxForReference(mm)
      if (cardWidthPx != null) {
        const ppm = cardWidthPx / CREDIT_CARD_WIDTH_MM
        setDraft(Math.min(hi, Math.max(lo, Math.round(ppm * mm))))
      } else {
        setDraft(Math.min(hi, Math.max(lo, Math.round(mm * CSS_PX_PER_MM))))
      }
    }
  }

  const prevCalibratorRef = useRef(calibratorRef)
  useEffect(() => {
    if (!open) {
      prevCalibratorRef.current = calibratorRef
      return
    }
    if (prevCalibratorRef.current === calibratorRef) return
    const oldMm =
      prevCalibratorRef.current === "ruler"
        ? calibrationRulerWidthMm(rulerUnit)
        : calibrationReferenceWidthMm(prevCalibratorRef.current)
    const newMm =
      calibratorRef === "ruler"
        ? calibrationRulerWidthMm(rulerUnit)
        : calibrationReferenceWidthMm(calibratorRef)
    prevCalibratorRef.current = calibratorRef
    const { minPx: lo, maxPx: hi } = minMaxPxForReference(newMm)
    setDraft((d) => {
      const ppm = d / oldMm
      return Math.min(hi, Math.max(lo, Math.round(ppm * newMm)))
    })
  }, [calibratorRef, open, rulerUnit])

  const prevRulerUnit = useRef(rulerUnit)
  useEffect(() => {
    if (!open) {
      prevRulerUnit.current = rulerUnit
      return
    }
    if (calibratorRef !== "ruler") {
      prevRulerUnit.current = rulerUnit
      return
    }
    if (prevRulerUnit.current === rulerUnit) return

    const oldMm = calibrationRulerWidthMm(prevRulerUnit.current)
    const newMm = calibrationRulerWidthMm(rulerUnit)
    prevRulerUnit.current = rulerUnit

    const { minPx: lo, maxPx: hi } = minMaxPxForReference(newMm)
    setDraft((d) => {
      const ppm = d / oldMm
      return Math.min(hi, Math.max(lo, Math.round(ppm * newMm)))
    })
  }, [calibratorRef, open, rulerUnit])

  const draftClamped = clampDraft(draft, refMm)

  const aspectCredit = CREDIT_CARD_HEIGHT_MM / CREDIT_CARD_WIDTH_MM
  const aspectPassport = PASSPORT_SHORT_EDGE_MM / PASSPORT_LONG_EDGE_MM
  const cardHeightPx =
    calibratorRef === "credit_card"
      ? Math.round(draftClamped * aspectCredit)
      : calibratorRef === "passport"
        ? Math.round(draftClamped * aspectPassport)
        : Math.max(20, Math.min(48, Math.round(draftClamped * 0.42)))

  const draftPxPerMm = draftClamped / refMm

  const cornerClass =
    calibratorRef === "ruler"
      ? "h-3 w-3 border-t-2 border-l-2"
      : "h-5 w-5 border-t-2 border-l-2"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "inset-10 flex max-h-none max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto overflow-x-hidden",
          "min-h-0 w-auto gap-6 sm:max-w-none"
        )}
      >
        <DialogHeader>
          <DialogTitle>Calibrate display</DialogTitle>
          <DialogDescription className="sr-only">
            Choose a reference, match the outline with the slider, then save.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={calibratorRef}
          onValueChange={(v: string) =>
            setCalibratorRef(v as CalibratorReference)
          }
          className="grid w-full grid-cols-3 items-start gap-2 sm:gap-3"
          aria-label="Calibration reference object"
        >
          <div className="relative min-w-0">
            <RadioGroupItem
              id="cal-ref-ruler"
              value="ruler"
              className="peer sr-only focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="cal-ref-ruler"
              className={cn(
                "flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-muted bg-muted/20 p-2 text-center shadow-sm transition-colors",
                "hover:bg-muted/40 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              )}
            >
              <div className="pointer-events-none flex h-12 w-full items-center justify-center overflow-hidden rounded-md px-2">
                <div className="relative h-5 w-full max-w-[140px] overflow-hidden rounded-md border border-foreground/20 bg-muted/10">
                  <div className="absolute inset-0 bg-linear-to-r from-foreground/10 via-foreground/5 to-foreground/10" />
                  <div className="absolute inset-y-0 left-0 w-4 bg-foreground/10" />
                  {Array.from({ length: rulerMajorTicks }, (_, i) => i + 1).map(
                    (n) => (
                      <div
                        key={n}
                        className="absolute inset-y-0 w-px bg-foreground/25"
                        style={{
                          left: `${(n / rulerMajorTicks) * 100}%`,
                        }}
                      />
                    )
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium leading-tight sm:text-xs">
                Ruler
              </span>
            </Label>
          </div>
          <div className="relative min-w-0">
            <RadioGroupItem
              id="cal-ref-card"
              value="credit_card"
              className="peer sr-only focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="cal-ref-card"
              className={cn(
                "flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-muted bg-muted/20 p-2 text-center shadow-sm transition-colors",
                "hover:bg-muted/40 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              )}
            >
              <img
                src="/credit-card.svg"
                alt=""
                className="pointer-events-none max-h-12 w-full object-contain"
              />
              <span className="text-[11px] font-medium leading-tight sm:text-xs">
                Credit card
              </span>
            </Label>
          </div>
          <div className="relative min-w-0">
            <RadioGroupItem
              id="cal-ref-passport"
              value="passport"
              className="peer sr-only focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Label
              htmlFor="cal-ref-passport"
              className={cn(
                "flex min-h-[104px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-muted bg-muted/20 p-2 text-center shadow-sm transition-colors",
                "hover:bg-muted/40 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              )}
            >
              <div className="pointer-events-none flex h-12 w-full items-center justify-center overflow-hidden">
                <img
                  src="/us-passport.svg"
                  alt=""
                  className="max-h-12 w-full -rotate-90 object-contain"
                />
              </div>
              <span className="text-[11px] font-medium leading-tight sm:text-xs">
                Passport
              </span>
            </Label>
          </div>
        </RadioGroup>

        <div className="flex min-h-0 flex-1 flex-col items-stretch gap-4 py-2">
          <div
            className={cn(
              "flex min-h-[min(50dvh,420px)] w-full items-center justify-center",
              "rounded-2xl border border-border/60 bg-muted/30 px-4 py-10 shadow-inner md:px-8 md:py-12",
              (calibratorRef === "ruler" || calibratorRef === "passport") &&
                "overflow-visible"
            )}
          >
            <div
              className={cn(
                "relative shrink-0 transition-[width,height] duration-100",
                calibratorRef === "ruler" || calibratorRef === "passport"
                  ? "overflow-visible"
                  : "overflow-hidden"
              )}
              style={{
                width: `${draftClamped}px`,
                height: `${cardHeightPx}px`,
              }}
              aria-hidden
            >
              <span
                className={cn(
                  "pointer-events-none absolute top-0 left-0 z-10 border-foreground/70",
                  cornerClass
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "pointer-events-none absolute top-0 right-0 z-10 border-t-2 border-r-2 border-foreground/70",
                  calibratorRef === "ruler" ? "h-3 w-3" : "h-5 w-5"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "pointer-events-none absolute bottom-0 left-0 z-10 border-b-2 border-l-2 border-foreground/70",
                  calibratorRef === "ruler" ? "h-3 w-3" : "h-5 w-5"
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "pointer-events-none absolute right-0 bottom-0 z-10 border-r-2 border-b-2 border-foreground/70",
                  calibratorRef === "ruler" ? "h-3 w-3" : "h-5 w-5"
                )}
                aria-hidden
              />
              {calibratorRef === "credit_card" ? (
                <img
                  src="/credit-card.svg"
                  alt=""
                  className="pointer-events-none size-full rounded-xl object-fill shadow-sm"
                  aria-hidden
                />
              ) : calibratorRef === "passport" ? (
                <div className="pointer-events-none relative size-full overflow-hidden rounded-xl shadow-sm">
                  {/*
                    SVG is short×long in file space; calibration box is long×wide × short×tall.
                    Rotate a short×long inner rect -90° so it exactly covers the outer box; object-fill
                    then matches credit card (corners = bracket corners).
                  */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
                    style={{
                      width: `${cardHeightPx}px`,
                      height: `${draftClamped}px`,
                    }}
                  >
                    <img
                      src="/us-passport.svg"
                      alt=""
                      className="size-full rounded-xl object-fill"
                      aria-hidden
                    />
                  </div>
                </div>
              ) : (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl bg-muted/10 shadow-sm">
                  <div className="absolute inset-0 bg-linear-to-r from-foreground/10 via-foreground/5 to-foreground/10" />
                  <div className="absolute inset-y-0 left-0 w-[10%] bg-foreground/10" />
                  {Array.from({ length: rulerMajorTicks }, (_, i) => i + 1).map(
                    (n) => (
                      <div
                        key={n}
                        className="absolute inset-y-0 w-px bg-foreground/25"
                        style={{
                          left: `${(n / rulerMajorTicks) * 100}%`,
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </div>
          {calibratorRef === "ruler" && (
            <div className="flex w-full items-center justify-center">
              <div
                className="inline-flex rounded-lg border border-border/60 bg-muted/20 p-1 shadow-sm"
                role="group"
                aria-label="Ruler length"
              >
                <button
                  type="button"
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-medium ring-ring outline-none transition-colors",
                    rulerUnit === "cm"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/40",
                    "focus-visible:ring-2"
                  )}
                  onClick={() => setRulerUnit("cm")}
                  aria-pressed={rulerUnit === "cm"}
                >
                  10 cm
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-medium ring-ring outline-none transition-colors",
                    rulerUnit === "in"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/40",
                    "focus-visible:ring-2"
                  )}
                  onClick={() => setRulerUnit("in")}
                  aria-pressed={rulerUnit === "in"}
                >
                  4 in
                </button>
              </div>
            </div>
          )}
          <Collapsible
            defaultOpen={false}
            className="group/cal-how w-full rounded-lg border border-border/60 bg-muted/20"
          >
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground ring-ring outline-none",
                "hover:bg-muted/50 focus-visible:ring-2"
              )}
            >
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/cal-how:rotate-180"
              />
              <span>How to calibrate your display</span>
              <span className="sr-only">
                , expand for step-by-step instructions
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pt-0 pb-3">
              <ol className="list-decimal space-y-2 pl-4 text-left text-sm text-muted-foreground">
                <li>
                  Pick the same object you chose above (ruler, ID-1 card, or
                  passport long edge).
                </li>
                <li>
                  Hold it flat to the screen and align its edges with the
                  rectangle and corner marks below.
                </li>
                <li>
                  Adjust the slider until the on-screen width matches the real
                  object.
                </li>
                <li>Click the Save button.</li>
              </ol>
            </CollapsibleContent>
          </Collapsible>
          <div className="w-full max-w-none">
            <Slider
              value={[draftToUiPercent(draft, minPx, maxPx)]}
              onValueChange={(v) => {
                if (typeof v[0] === "number")
                  setDraft(uiPercentToDraft(v[0], minPx, maxPx))
              }}
              aria-label="Reference object width in pixels"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{draftClamped} px</span>
              <span>{draftPxPerMm.toFixed(2)} px / mm</span>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Current:{" "}
            <span className="text-foreground">
              {pxPerMm.toFixed(2)} px / mm
            </span>
            {cardWidthPx ? " (calibrated)" : " (CSS default)"}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onReset()
              onOpenChange(false)
            }}
          >
            Reset to default
          </Button>
          <Button
            onClick={() => {
              const pxPerMmMeasured = draftClamped / refMm
              const equivalentCardWidthPx =
                pxPerMmMeasured * CREDIT_CARD_WIDTH_MM
              onApply(equivalentCardWidthPx)
              onOpenChange(false)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
