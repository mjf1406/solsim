import { useMemo, useState } from "react"

import { BodySymbolBarTrack } from "@/components/solar-system/body-symbol-bar-shell"
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
import { MAX_SAFE_DISTANCE_RENDER_PX } from "@/lib/solar-system/distance-render-limit"
import { cn } from "@/lib/utils"

import {
  collectDistanceBodies,
  type DistanceBody,
  type SolarSystemJson,
  type SizePageModel,
} from "../../distance/-data"

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

function orbitRadiusKm(body: DistanceBody): number | null {
  if (body.kind === "star") return null
  if (body.kind === "moon") {
    const r = body.moonOrbitKm ?? body.semiMajorAxisKm
    return r != null && Number.isFinite(r) ? r : null
  }
  const r = body.semiMajorAxisKm
  return r != null && Number.isFinite(r) ? r : null
}

function isBeyondPolarRenderLimit(
  body: DistanceBody,
  pxPerKmDistance: number
): boolean {
  const rKm = orbitRadiusKm(body)
  if (rKm == null || !(pxPerKmDistance > 0)) return false
  return rKm * pxPerKmDistance > MAX_SAFE_DISTANCE_RENDER_PX
}

function OrbitsSymbolBarEntry({
  b,
  href,
  selected,
  beyondLimit,
  onSelectBody,
}: {
  b: DistanceBody
  href: string
  selected: boolean
  beyondLimit: boolean
  onSelectBody: (bodyId: string) => void
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const tooltipBeyond = `${b.row.name} — beyond the render limit at this scale. Try a smaller Distance scale.`

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
        {beyondLimit ? tooltipBeyond : b.row.name}
      </TooltipContent>
    </Tooltip>
  )
}

export function OrbitsSymbolBar({
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
      .sort((a, b) => {
        const ar = orbitRadiusKm(a) ?? 0
        const br = orbitRadiusKm(b) ?? 0
        return ar - br
      })

    const out: { body: DistanceBody; href: string }[] = []
    if (sun) {
      const href = symbolHref(sun)
      if (href) out.push({ body: sun, href })
    }
    for (const b of nonSun) {
      const href = symbolHref(b)
      if (href) out.push({ body: b, href })
    }
    return out
  }, [distanceBodies, model, bodyDisplayFilter, pxPerKmSize])

  if (rows.length === 0) return null

  return (
    <BodySymbolBarTrack>
        {rows.map(({ body: b, href }) => {
          const beyondLimit =
            pxPerKmDistance > 0 && isBeyondPolarRenderLimit(b, pxPerKmDistance)
          return (
            <OrbitsSymbolBarEntry
              key={b.canvasId}
              b={b}
              href={href}
              selected={selectedBodyId === b.canvasId}
              beyondLimit={beyondLimit}
              onSelectBody={onSelectBody}
            />
          )
        })}
    </BodySymbolBarTrack>
  )
}
