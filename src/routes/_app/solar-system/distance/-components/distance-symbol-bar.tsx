import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
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

export function DistanceSymbolBar({
  model,
  json,
  bodyDisplayFilter,
  pxPerKmSize,
  selectedBodyId,
  onSelectBody,
}: {
  model: SizePageModel
  json: SolarSystemJson
  bodyDisplayFilter: SizeBodyDisplayFilter
  pxPerKmSize: number
  selectedBodyId: string | null
  onSelectBody: (bodyId: string) => void
}) {
  const entries = useMemo(() => {
    const all = collectDistanceBodies(model, json)
    const filtered = all.filter(
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
  }, [model, json, bodyDisplayFilter, pxPerKmSize])

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
          return (
            <Tooltip key={b.canvasId}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-9 shrink-0 rounded-full p-0",
                    selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  aria-label={b.row.name}
                  aria-pressed={selected}
                  onClick={() => onSelectBody(b.canvasId)}
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
                {b.row.name}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
