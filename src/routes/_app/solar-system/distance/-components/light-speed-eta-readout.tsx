import { useMemo } from "react"

import {
  filterSizeCanvasBodiesForDisplay,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { formatLightTimeFromKm } from "@/lib/solar-system/distance/distance-units"
import type { LightSpeedMultiplier } from "@/lib/solar-system/distance/light-speed"

import type { DistanceBody } from "../-data"

export function LightSpeedEtaReadout({
  distanceBodies,
  bodyDisplayFilter,
  pxPerKmSize,
  centerKmFromSun,
  multiplier,
  onSelectBody,
}: {
  distanceBodies: DistanceBody[]
  bodyDisplayFilter: SizeBodyDisplayFilter
  pxPerKmSize: number
  centerKmFromSun: number | null
  multiplier: LightSpeedMultiplier
  /** Selects the ETA target body so the left sidebar shows its details. */
  onSelectBody: (canvasId: string) => void
}) {
  const targets = useMemo(() => {
    const filtered = filterSizeCanvasBodiesForDisplay(
      distanceBodies,
      bodyDisplayFilter,
      Math.max(pxPerKmSize, Number.EPSILON),
      0
    ) as DistanceBody[]
    return filtered
      .filter(
        (b) =>
          b.kind !== "star" &&
          b.kind !== "moon" &&
          Number.isFinite(b.distanceFromSunKm)
      )
      .sort((a, b) => a.distanceFromSunKm - b.distanceFromSunKm)
  }, [distanceBodies, bodyDisplayFilter, pxPerKmSize])

  const next = useMemo(() => {
    if (centerKmFromSun == null) return null
    return (
      targets.find((t) => t.distanceFromSunKm > centerKmFromSun + 1) ?? null
    )
  }, [targets, centerKmFromSun])

  if (next == null) return null

  const remainingKm = next.distanceFromSunKm - (centerKmFromSun ?? 0)
  if (!(remainingKm > 0)) return null

  /** Time for light (1× c) to travel from the Sun to the viewport center. */
  const kmFromSun = Math.max(0, centerKmFromSun ?? 0)
  const totalLightFromSun = formatLightTimeFromKm(kmFromSun)

  /** Time for light alone (1× c) to cross the remaining gap — physics, independent of multiplier. */
  const lightTravelTime = formatLightTimeFromKm(remainingKm)
  /** Wall-clock time until the viewport reaches the body at the chosen simulated speed. */
  const realTimeEta = formatLightTimeFromKm(remainingKm / multiplier)

  return (
    <div
      className="pointer-events-none fixed top-1/2 right-0 z-[24] -translate-y-1/2 px-3"
      aria-live="polite"
    >
      <div className="pointer-events-auto rounded-2xl border border-border/60 bg-background/80 px-3 py-2 text-right shadow-lg backdrop-blur-md md:mr-[calc(var(--sidebar-width,15rem)+0.5rem)]">
        <p className="font-jetbrains-mono text-base leading-tight tabular-nums text-foreground sm:text-lg">
          {totalLightFromSun}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          total light travel from Sun
        </p>
        <div className="my-2 border-b border-border/50" aria-hidden />

        {multiplier === 1 ? (
          <>
            <p className="font-jetbrains-mono text-base leading-tight tabular-nums text-foreground sm:text-lg">
              {lightTravelTime}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              light travel & real time
            </p>
          </>
        ) : (
          <>
            <p className="font-jetbrains-mono text-base leading-tight tabular-nums text-foreground sm:text-lg">
              {lightTravelTime}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              light travel left
            </p>
            <p className="mt-2 font-jetbrains-mono text-base leading-tight tabular-nums text-foreground sm:text-lg">
              {realTimeEta}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              real time{" "}
              <span className="normal-case">({multiplier}× speed)</span>
            </p>
          </>
        )}
        <button
          type="button"
          className="mt-2 w-full rounded-md text-end text-[11px] uppercase tracking-wide text-muted-foreground transition-colors hover:text-sky-400 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => onSelectBody(next.canvasId)}
          aria-label={`Select ${next.row.name} in the sidebar`}
        >
          until {next.row.name}
        </button>
      </div>
    </div>
  )
}
