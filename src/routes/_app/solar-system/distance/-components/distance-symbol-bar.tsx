import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ASSUMED_SIDEBAR_PX_CSS,
  DISTANCE_CANVAS_BASE_INSET_PX,
} from "@/hooks/use-distance-scale"
import {
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import {
  isBodyBeyondDistanceRenderLimit,
} from "@/lib/solar-system/distance-render-limit"
import { planetSymbolHrefForDisplayName } from "@/lib/solar-system/planet-symbol"
import { cn } from "@/lib/utils"

import {
  collectDistanceBodies,
  type DistanceBody,
  type SolarSystemJson,
  type SizePageModel,
} from "../-data"

function symbolHref(body: DistanceBody): string | null {
  return planetSymbolHrefForDisplayName(body.row.name)
}

function isSymbolBarBody(b: DistanceBody): boolean {
  if (b.kind === "star") return b.row.name === "Sun"
  if (b.kind === "planet" || b.kind === "dwarf") {
    return planetSymbolHrefForDisplayName(b.row.name) != null
  }
  return false
}

const INSET_LEFT_CSS = ASSUMED_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX

function DistanceSymbolBarEntry({
  b,
  href,
  selected,
  beyondLimit,
  tooltipPlain,
  tooltipBeyond,
  onSelectBody,
}: {
  b: DistanceBody
  href: string
  selected: boolean
  beyondLimit: boolean
  tooltipPlain: string
  tooltipBeyond: string
  onSelectBody: (bodyId: string) => void
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false)

  return (
    <Tooltip
      open={beyondLimit ? tooltipOpen : undefined}
      onOpenChange={beyondLimit ? setTooltipOpen : undefined}
    >
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-9 shrink-0 rounded-full p-0",
            selected &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
            beyondLimit && "cursor-default opacity-40 grayscale"
          )}
          aria-label={b.row.name}
          aria-pressed={selected}
          aria-disabled={beyondLimit}
          onClick={(e) => {
            if (beyondLimit) {
              e.preventDefault()
              setTooltipOpen((v) => !v)
              return
            }
            onSelectBody(b.canvasId)
          }}
        >
          <img
            src={href}
            alt=""
            className="size-7 dark:[filter:invert(1)_brightness(1.1)]"
            draggable={false}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {beyondLimit ? tooltipBeyond : tooltipPlain}
      </TooltipContent>
    </Tooltip>
  )
}

export function DistanceSymbolBar({
  model,
  json,
  bodyDisplayFilter,
  pxPerKmSize,
  pxPerKmDistance,
  selectedBodyId,
  onSelectBody,
}: {
  model: SizePageModel
  json: SolarSystemJson
  bodyDisplayFilter: SizeBodyDisplayFilter
  pxPerKmSize: number
  pxPerKmDistance: number
  selectedBodyId: string | null
  onSelectBody: (bodyId: string) => void
}) {
  const distanceBodies = useMemo(
    () => collectDistanceBodies(model, json),
    [model, json]
  )

  const entries = useMemo(() => {
    const filtered = distanceBodies.filter(
      (b) =>
        isSymbolBarBody(b) &&
        isSizeBodyIdVisibleUnderFilter(
          model,
          bodyDisplayFilter,
          b.canvasId,
          pxPerKmSize,
          0
        )
    )
    const sun = filtered.find((b) => b.kind === "star")
    const rest = filtered
      .filter((b) => b.kind !== "star")
      .slice()
      .sort((a, b) => a.distanceFromSunKm - b.distanceFromSunKm)
    return sun ? [sun, ...rest] : rest
  }, [distanceBodies, model, bodyDisplayFilter, pxPerKmSize])

  if (entries.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Jump to a major body by symbol"
    >
      <div
        className="pointer-events-auto flex max-w-[min(100%,42rem)] items-center gap-0.5 overflow-x-auto rounded-full border border-border/60 bg-background/85 px-1.5 py-1 shadow-lg backdrop-blur-md"
      >
        {entries.map((b) => {
          const href = symbolHref(b)
          if (!href) return null
          const selected = b.canvasId === selectedBodyId
          const beyondLimit =
            pxPerKmDistance > 0 &&
            isBodyBeyondDistanceRenderLimit(
              b,
              distanceBodies,
              pxPerKmDistance,
              INSET_LEFT_CSS
            )
          const tooltipBeyond = `${b.row.name} — beyond the render limit at this scale. Try a smaller Distance scale.`
          return (
            <DistanceSymbolBarEntry
              key={b.canvasId}
              b={b}
              href={href}
              selected={selected}
              beyondLimit={beyondLimit}
              tooltipPlain={b.row.name}
              tooltipBeyond={tooltipBeyond}
              onSelectBody={onSelectBody}
            />
          )
        })}
      </div>
    </div>
  )
}
