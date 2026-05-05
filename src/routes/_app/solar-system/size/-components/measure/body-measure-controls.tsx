import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  filterSizeCanvasBodiesForDisplay,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"

import {
  collectSizeCanvasBodies,
  findSizeRowNameById,
  type SizePageModel,
} from "../../-data"

import { formatMeasureRatioForLabel } from "./measure-body-math"
import type { BodyMeasureOverlay } from "./measure-types"

export type BodyMeasureControlsProps = {
  model: SizePageModel
  bodyDisplayFilter: SizeBodyDisplayFilter
  pxPerKm: number
  selectedBodyId: string | null
  unitCanvasId: string | null
  onUnitCanvasIdChange: (canvasId: string | null) => void
  armed: boolean
  onArmedChange: (armed: boolean) => void
  overlay: BodyMeasureOverlay
  onClearOverlay: () => void
}

export function BodyMeasureControls({
  model,
  bodyDisplayFilter,
  pxPerKm,
  selectedBodyId,
  unitCanvasId,
  onUnitCanvasIdChange,
  armed,
  onArmedChange,
  overlay,
  onClearOverlay,
}: BodyMeasureControlsProps) {
  const onCanvasBodies = useMemo(() => {
    const all = collectSizeCanvasBodies(model)
    const visible = filterSizeCanvasBodiesForDisplay(
      all,
      bodyDisplayFilter,
      pxPerKm,
      1
    )
    return [...visible].sort((a, b) => b.row.diameterKm - a.row.diameterKm)
  }, [model, bodyDisplayFilter, pxPerKm])

  const selectedOnCanvas =
    selectedBodyId != null &&
    onCanvasBodies.some((b) => b.canvasId === selectedBodyId)

  const unitName = unitCanvasId
    ? findSizeRowNameById(model, unitCanvasId)
    : null
  const targetName =
    overlay && "targetCanvasId" in overlay
      ? findSizeRowNameById(model, overlay.targetCanvasId)
      : null
  const successUnitName =
    overlay?.kind === "success"
      ? findSizeRowNameById(model, overlay.unitCanvasId)
      : unitName

  const armDisabled = !unitCanvasId || onCanvasBodies.length === 0

  let status: string | null = null
  if (overlay?.kind === "success" && targetName && successUnitName) {
    status = `${targetName} is about ${formatMeasureRatioForLabel(overlay.ratio)} times as wide as ${successUnitName} (diameter).`
  }
  if (overlay?.kind === "reject" && targetName) {
    status = `${targetName} is smaller than the unit — try a larger body.`
  }

  return (
    <div className="space-y-3 border-t border-sidebar-border/80 px-1 pt-3 pb-1">
      <p className="text-xs leading-snug text-sidebar-foreground/80">
        Pick a body as your ruler, then tap Measure and click another disk on
        the canvas.
      </p>

      <div className="space-y-1.5">
        <label
          htmlFor="size-measure-unit"
          className="text-[11px] font-medium text-sidebar-foreground/90"
        >
          Unit (on canvas)
        </label>
        <Select
          value={unitCanvasId ?? undefined}
          onValueChange={(v) => {
            onUnitCanvasIdChange(v)
            onClearOverlay()
          }}
        >
          <SelectTrigger
            id="size-measure-unit"
            size="sm"
            className="h-auto min-h-8 w-full max-w-full rounded-xl border-sidebar-border/70 bg-sidebar-accent/20 py-1.5 whitespace-normal"
          >
            <SelectValue placeholder="Choose a body…" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            className="max-h-60 border-sidebar-border bg-popover"
          >
            {onCanvasBodies.map((b) => (
              <SelectItem key={b.canvasId} value={b.canvasId}>
                {b.row.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full rounded-xl border-sidebar-border/70"
        disabled={!selectedOnCanvas}
        onClick={() => {
          onUnitCanvasIdChange(selectedBodyId)
          onClearOverlay()
        }}
      >
        Use selected body
      </Button>

      <div className="flex flex-wrap gap-2">
        {!armed ? (
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={armDisabled}
            onClick={() => {
              onClearOverlay()
              onArmedChange(true)
            }}
          >
            Measure
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-xl"
            onClick={() => onArmedChange(false)}
          >
            Cancel
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl border-sidebar-border/70"
          disabled={!unitCanvasId}
          onClick={() => {
            onArmedChange(false)
            onUnitCanvasIdChange(null)
            onClearOverlay()
          }}
        >
          Clear unit
        </Button>
      </div>

      {armed ? (
        <p className="text-[11px] leading-snug text-sky-300/90">
          Tap a body on the canvas to measure. Empty tap disarms.
        </p>
      ) : null}

      {status ? (
        <p
          className="text-[11px] leading-snug text-sidebar-foreground/85"
          role="status"
        >
          {status}
        </p>
      ) : null}

      {!unitCanvasId && onCanvasBodies.length === 0 ? (
        <p className="text-[11px] text-sidebar-foreground/60">
          No bodies on canvas at this scale — zoom or change body types.
        </p>
      ) : null}
    </div>
  )
}
