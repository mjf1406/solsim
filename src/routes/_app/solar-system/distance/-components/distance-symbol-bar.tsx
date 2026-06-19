import { useMemo, useState } from "react"

import { BodySymbolBarTrack } from "@/components/solar-system/body-symbol-bar-shell"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ASSUMED_LEFT_SIDEBAR_PX_CSS,
  DISTANCE_CANVAS_BASE_INSET_PX,
} from "@/hooks/use-distance-scale"
import {
  DISTANCE_REGIONS,
  type DistanceRegion,
} from "@/lib/solar-system/distance-regions"
import {
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import {
  isBodyBeyondDistanceRenderLimit,
  MAX_SAFE_DISTANCE_RENDER_PX,
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

const INSET_LEFT_CSS =
  ASSUMED_LEFT_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX

type SymbolBarRow =
  | { kind: "body"; body: DistanceBody; href: string }
  | { kind: "region"; region: DistanceRegion }

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
            className="size-7 dark:filter-[invert(1)_brightness(1.1)]"
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

function DistanceSymbolBarRegionEntry({
  region,
  selected,
  beyondLimit,
  onSelectBody,
}: {
  region: DistanceRegion
  selected: boolean
  beyondLimit: boolean
  onSelectBody: (bodyId: string) => void
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipBeyond = `${region.label} — beyond the render limit at this scale. Try a smaller Distance scale.`

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
          aria-label={region.label}
          aria-pressed={selected}
          aria-disabled={beyondLimit}
          onClick={(e) => {
            if (beyondLimit) {
              e.preventDefault()
              setTooltipOpen((v) => !v)
              return
            }
            onSelectBody(region.canvasId)
          }}
        >
          <img
            src={region.iconSrc}
            alt=""
            className={cn(
              "size-7",
              !region.iconKeepColors &&
                "dark:filter-[invert(1)_brightness(1.1)]"
            )}
            draggable={false}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {beyondLimit ? tooltipBeyond : region.label}
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

  const rows = useMemo(() => {
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
    const nonSun = filtered
      .filter((b) => b.kind !== "star")
      .slice()
      .sort((a, b) => a.distanceFromSunKm - b.distanceFromSunKm)

    type Sortable =
      | { kind: "body"; body: DistanceBody; href: string; sortKm: number }
      | { kind: "region"; region: DistanceRegion; sortKm: number }

    const merged: Sortable[] = []
    for (const b of nonSun) {
      const href = symbolHref(b)
      if (!href) continue
      merged.push({
        kind: "body",
        body: b,
        href,
        sortKm: b.distanceFromSunKm,
      })
    }
    for (const region of DISTANCE_REGIONS) {
      merged.push({
        kind: "region",
        region,
        sortKm: (region.innerKm + region.outerKm) / 2,
      })
    }
    merged.sort((a, b) => a.sortKm - b.sortKm)

    const out: SymbolBarRow[] = []
    if (sun) {
      const href = symbolHref(sun)
      if (href) out.push({ kind: "body", body: sun, href })
    }
    for (const m of merged) {
      if (m.kind === "body") {
        out.push({ kind: "body", body: m.body, href: m.href })
      } else {
        out.push({ kind: "region", region: m.region })
      }
    }

    return out
  }, [distanceBodies, model, bodyDisplayFilter, pxPerKmSize])

  if (rows.length === 0) return null

  return (
    <BodySymbolBarTrack>
        {rows.map((row) => {
          if (row.kind === "region") {
            const r = row.region
            const beyondLimit =
              pxPerKmDistance > 0 &&
              INSET_LEFT_CSS + r.outerKm * pxPerKmDistance >
                MAX_SAFE_DISTANCE_RENDER_PX
            return (
              <DistanceSymbolBarRegionEntry
                key={`symbol-bar-${r.canvasId}`}
                region={r}
                selected={selectedBodyId === r.canvasId}
                beyondLimit={beyondLimit}
                onSelectBody={onSelectBody}
              />
            )
          }

          const b = row.body
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
              href={row.href}
              selected={selected}
              beyondLimit={beyondLimit}
              tooltipPlain={b.row.name}
              tooltipBeyond={tooltipBeyond}
              onSelectBody={onSelectBody}
            />
          )
        })}
    </BodySymbolBarTrack>
  )
}
