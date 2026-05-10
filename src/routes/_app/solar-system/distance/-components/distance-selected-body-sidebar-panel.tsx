import { useMemo, useState, type ReactNode } from "react"
import { ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ReadingKeyword } from "@/components/reading/reading-keyword"
import { SwitchableReadingNumber } from "@/components/reading/switchable-reading-number"
import { BodyDiameterStatsSection } from "@/components/solar-system/body-diameter-stats-section"
import {
  formatScaledDiameter,
  scaledDiameterMm,
  spokenScaledDiameterSentence,
  type ScaledDiameterUnitSystem,
} from "@/lib/solar-system/scale/scaled-diameter-format"
import {
  findDistanceRegionByCanvasId,
  formatDistanceRegionAuTitle,
  type DistanceRegion,
} from "@/lib/solar-system/distance-regions"

import {
  collectDistanceBodies,
  findDistanceBodyDetail,
  formatDistanceNumber,
  formatDistancePx,
  spokenDistanceSentence,
  type SolarSystemJson,
  type SizePageModel,
} from "../-data"
import {
  findSizeBodyDetail,
  findSizeRowNameById,
  sizeBodyKindPredicationPhrase,
} from "../../size/-data"

const ORBIT_KEYWORD_POPOVER_PROPS = {
  side: "bottom" as const,
  align: "start" as const,
  className:
    "border border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm max-w-xs",
}

function DistanceRegionSidebarPanel({
  region,
  pxPerKmDistance,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
}: {
  region: DistanceRegion
  pxPerKmDistance: number
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
}) {
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km")
  const [scaledUnitSystem, setScaledUnitSystem] =
    useState<ScaledDiameterUnitSystem>("metric")

  const innerKm = region.innerKm
  const outerKm = region.outerKm
  const widthKm = outerKm - innerKm
  const innerAuTitle = formatDistanceRegionAuTitle(region.innerAu)
  const outerAuTitle = formatDistanceRegionAuTitle(region.outerAu)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold text-sidebar-foreground">
          {region.label}
        </h2>
        <p className="mt-2 text-base leading-snug text-sidebar-foreground/85">
          {region.description}
        </p>
      </div>
      <dl className="space-y-2 text-base text-sidebar-foreground/90">
        <DistanceRow
          title={
            <span className="text-sidebar-foreground/60">
              Inner edge ({innerAuTitle})
            </span>
          }
          km={innerKm}
          pxPerKmDistance={pxPerKmDistance}
          pxPerMm={pxPerMm}
          isCalibrated={isCalibrated}
          onOpenCalibration={onOpenCalibration}
          distanceUnit={distanceUnit}
          onToggleUnit={() => setDistanceUnit((u) => (u === "km" ? "mi" : "km"))}
          scaledUnitSystem={scaledUnitSystem}
          onToggleScaledUnit={() =>
            setScaledUnitSystem((s) => (s === "metric" ? "imperial" : "metric"))
          }
          sayThisTitle={`Say this ${region.label} inner edge distance`}
        />
        <DistanceRow
          title={
            <span className="text-sidebar-foreground/60">
              Outer edge ({outerAuTitle})
            </span>
          }
          km={outerKm}
          pxPerKmDistance={pxPerKmDistance}
          pxPerMm={pxPerMm}
          isCalibrated={isCalibrated}
          onOpenCalibration={onOpenCalibration}
          distanceUnit={distanceUnit}
          onToggleUnit={() => setDistanceUnit((u) => (u === "km" ? "mi" : "km"))}
          scaledUnitSystem={scaledUnitSystem}
          onToggleScaledUnit={() =>
            setScaledUnitSystem((s) => (s === "metric" ? "imperial" : "metric"))
          }
          sayThisTitle={`Say this ${region.label} outer edge distance`}
        />
        <DistanceRow
          title={<span className="text-sidebar-foreground/60">Approximate width</span>}
          km={widthKm}
          pxPerKmDistance={pxPerKmDistance}
          pxPerMm={pxPerMm}
          isCalibrated={isCalibrated}
          onOpenCalibration={onOpenCalibration}
          distanceUnit={distanceUnit}
          onToggleUnit={() => setDistanceUnit((u) => (u === "km" ? "mi" : "km"))}
          scaledUnitSystem={scaledUnitSystem}
          onToggleScaledUnit={() =>
            setScaledUnitSystem((s) => (s === "metric" ? "imperial" : "metric"))
          }
          sayThisTitle={`Say this ${region.label} width`}
        />
      </dl>
    </div>
  )
}

type DistanceSelectedBodySidebarProps = {
  model: SizePageModel
  json: SolarSystemJson
  selectedBodyId: string | null
  /** Size scale (disk diameter): CSS pixels per real-world km. */
  pxPerKmSize: number
  /** Distance scale (x-axis): CSS pixels per real-world km. */
  pxPerKmDistance: number
  /** Display calibration (CSS pixels per real-world mm). */
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
}

export function DistanceSelectedBodySidebarContent({
  model,
  json,
  selectedBodyId,
  pxPerKmSize,
  pxPerKmDistance,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
}: DistanceSelectedBodySidebarProps) {
  const bodies = useMemo(
    () => collectDistanceBodies(model, json),
    [model, json]
  )
  const distanceKmById = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of bodies) {
      m.set(b.canvasId, b.distanceFromSunKm)
    }
    return m
  }, [bodies])

  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km")
  const [scaledUnitSystem, setScaledUnitSystem] =
    useState<ScaledDiameterUnitSystem>("metric")

  const distanceRegion = findDistanceRegionByCanvasId(selectedBodyId)
  if (distanceRegion) {
    return (
      <DistanceRegionSidebarPanel
        region={distanceRegion}
        pxPerKmDistance={pxPerKmDistance}
        pxPerMm={pxPerMm}
        isCalibrated={isCalibrated}
        onOpenCalibration={onOpenCalibration}
      />
    )
  }

  const detailSize = findSizeBodyDetail(model, selectedBodyId, pxPerKmSize)
  const detailDistance = findDistanceBodyDetail(model, json, selectedBodyId)

  if (!detailSize || !detailDistance) {
    return (
      <p className="text-base leading-snug text-sidebar-foreground/70">
        Select a body to learn about it!
      </p>
    )
  }

  const typeIntroPredication = sizeBodyKindPredicationPhrase(detailSize.kind)

  const kmFromSun = detailDistance.distanceFromSunKm

  const prevKm = detailDistance.prevSunOrbiterId
    ? distanceKmById.get(detailDistance.prevSunOrbiterId) ?? null
    : null
  const nextKm = detailDistance.nextSunOrbiterId
    ? distanceKmById.get(detailDistance.nextSunOrbiterId) ?? null
    : null

  const dPrevKm =
    prevKm != null && Number.isFinite(prevKm) && Number.isFinite(kmFromSun)
      ? Math.abs(kmFromSun - prevKm)
      : null
  const dNextKm =
    nextKm != null && Number.isFinite(nextKm) && Number.isFinite(kmFromSun)
      ? Math.abs(nextKm - kmFromSun)
      : null

  const prevName = detailDistance.prevSunOrbiterId
    ? findSizeRowNameById(model, detailDistance.prevSunOrbiterId)
    : null
  const nextName = detailDistance.nextSunOrbiterId
    ? findSizeRowNameById(model, detailDistance.nextSunOrbiterId)
    : null

  const showOrbitSection = detailDistance.kind !== "star"
  const isMoon = detailDistance.kind === "moon"
  const parentLabel = detailDistance.parentPlanetName ?? "its parent"

  return (
    <div className="flex flex-col gap-3">
      <BodyDiameterStatsSection
        detail={{
          name: detailSize.name,
          kind: detailSize.kind,
          kindLabel: detailDistance.kindLabel,
          diameterKm: detailSize.diameterKm,
          diameterPx: detailSize.diameterPx,
          parentPlanetName: detailSize.parentPlanetName,
          typeIntroPredication,
        }}
        pxPerKm={pxPerKmSize}
        pxPerMm={pxPerMm}
        isCalibrated={isCalibrated}
        onOpenCalibration={onOpenCalibration}
        pixelDiameterFootnote={
          detailSize.diameterPx < 1
            ? "You can't see this one, can you? It's too small!"
            : undefined
        }
      />

      {showOrbitSection ? (
        <>
          {isMoon ? (
            <p className="text-base leading-snug text-sidebar-foreground/90">
              {detailSize.name}&apos;s orbit around {parentLabel} has a few special
              measurements. Its average distance from {parentLabel} is called the{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<SemiMajorAxisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                semi-major axis
              </ReadingKeyword>
              . The two extreme points of the orbit are called{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<ApsisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                apsides
              </ReadingKeyword>
              : the closest is the{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<PeriapsisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                periapsis
              </ReadingKeyword>
              , and the farthest is the{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<ApoapsisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                apoapsis
              </ReadingKeyword>
              .
            </p>
          ) : (
            <p className="text-base leading-snug text-sidebar-foreground/90">
              {detailSize.name}&apos;s orbit has a few special measurements. Its average
              distance from the Sun is called the{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<SemiMajorAxisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                semi-major axis
              </ReadingKeyword>
              . The two extreme points of the orbit are called{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<ApsisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                apsides
              </ReadingKeyword>
              : the closest is the{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<PeriapsisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                periapsis
              </ReadingKeyword>{" "}
              (or{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<PerihelionExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                perihelion
              </ReadingKeyword>{" "}
              for orbits around the Sun), and the farthest is the{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<ApoapsisExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                apoapsis
              </ReadingKeyword>{" "}
              (or{" "}
              <ReadingKeyword
                variant="inline"
                popoverContent={<AphelionExplainer />}
                popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
              >
                aphelion
              </ReadingKeyword>
              ).
            </p>
          )}

          <dl className="space-y-2 text-base text-sidebar-foreground/90">
            <DistanceRow
              title={
                isMoon ? (
                  <span className="text-sidebar-foreground/60">
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<SemiMajorAxisExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Semi-major axis
                    </ReadingKeyword>
                    {` (around ${parentLabel})`}
                  </span>
                ) : (
                  <span className="text-sidebar-foreground/60">
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<SemiMajorAxisExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Semi-major axis
                    </ReadingKeyword>
                  </span>
                )
              }
              km={detailDistance.semiMajorAxisKm}
              pxPerKmDistance={pxPerKmDistance}
              pxPerMm={pxPerMm}
              isCalibrated={isCalibrated}
              onOpenCalibration={onOpenCalibration}
              distanceUnit={distanceUnit}
              onToggleUnit={() =>
                setDistanceUnit((u) => (u === "km" ? "mi" : "km"))
              }
              scaledUnitSystem={scaledUnitSystem}
              onToggleScaledUnit={() =>
                setScaledUnitSystem((s) =>
                  s === "metric" ? "imperial" : "metric"
                )
              }
              sayThisTitle="Say this semi-major axis distance"
            />
            <DistanceRow
              title={
                isMoon ? (
                  <span className="text-sidebar-foreground/60">
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<PeriapsisExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Periapsis
                    </ReadingKeyword>
                    {` (around ${parentLabel})`}
                  </span>
                ) : (
                  <span className="text-sidebar-foreground/60">
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<PeriapsisExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Periapsis
                    </ReadingKeyword>
                    {" / "}
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<PerihelionExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Perihelion
                    </ReadingKeyword>
                  </span>
                )
              }
              km={detailDistance.perihelionKm}
              pxPerKmDistance={pxPerKmDistance}
              pxPerMm={pxPerMm}
              isCalibrated={isCalibrated}
              onOpenCalibration={onOpenCalibration}
              distanceUnit={distanceUnit}
              onToggleUnit={() =>
                setDistanceUnit((u) => (u === "km" ? "mi" : "km"))
              }
              scaledUnitSystem={scaledUnitSystem}
              onToggleScaledUnit={() =>
                setScaledUnitSystem((s) =>
                  s === "metric" ? "imperial" : "metric"
                )
              }
              sayThisTitle={
                isMoon
                  ? "Say this periapsis distance"
                  : "Say this perihelion distance"
              }
            />
            <DistanceRow
              title={
                isMoon ? (
                  <span className="text-sidebar-foreground/60">
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<ApoapsisExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Apoapsis
                    </ReadingKeyword>
                    {` (around ${parentLabel})`}
                  </span>
                ) : (
                  <span className="text-sidebar-foreground/60">
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<ApoapsisExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Apoapsis
                    </ReadingKeyword>
                    {" / "}
                    <ReadingKeyword
                      variant="inline"
                      popoverContent={<AphelionExplainer />}
                      popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
                    >
                      Aphelion
                    </ReadingKeyword>
                  </span>
                )
              }
              km={detailDistance.aphelionKm}
              pxPerKmDistance={pxPerKmDistance}
              pxPerMm={pxPerMm}
              isCalibrated={isCalibrated}
              onOpenCalibration={onOpenCalibration}
              distanceUnit={distanceUnit}
              onToggleUnit={() =>
                setDistanceUnit((u) => (u === "km" ? "mi" : "km"))
              }
              scaledUnitSystem={scaledUnitSystem}
              onToggleScaledUnit={() =>
                setScaledUnitSystem((s) =>
                  s === "metric" ? "imperial" : "metric"
                )
              }
              sayThisTitle={
                isMoon
                  ? "Say this apoapsis distance"
                  : "Say this aphelion distance"
              }
            />
            {!isMoon && detailDistance.prevSunOrbiterId ? (
              <DistanceRow
                title={
                  prevName
                    ? `Distance to ${prevName}`
                    : "Distance to previous body"
                }
                km={dPrevKm}
                pxPerKmDistance={pxPerKmDistance}
                pxPerMm={pxPerMm}
                isCalibrated={isCalibrated}
                onOpenCalibration={onOpenCalibration}
                distanceUnit={distanceUnit}
                onToggleUnit={() =>
                  setDistanceUnit((u) => (u === "km" ? "mi" : "km"))
                }
                scaledUnitSystem={scaledUnitSystem}
                onToggleScaledUnit={() =>
                  setScaledUnitSystem((s) =>
                    s === "metric" ? "imperial" : "metric"
                  )
                }
                sayThisTitle={
                  prevName
                    ? `Say this distance to ${prevName}`
                    : "Say this distance to the previous body"
                }
              />
            ) : null}
            {!isMoon && detailDistance.nextSunOrbiterId ? (
              <DistanceRow
                title={
                  nextName
                    ? `Distance to ${nextName}`
                    : "Distance to next body"
                }
                km={dNextKm}
                pxPerKmDistance={pxPerKmDistance}
                pxPerMm={pxPerMm}
                isCalibrated={isCalibrated}
                onOpenCalibration={onOpenCalibration}
                distanceUnit={distanceUnit}
                onToggleUnit={() =>
                  setDistanceUnit((u) => (u === "km" ? "mi" : "km"))
                }
                scaledUnitSystem={scaledUnitSystem}
                onToggleScaledUnit={() =>
                  setScaledUnitSystem((s) =>
                    s === "metric" ? "imperial" : "metric"
                  )
                }
                sayThisTitle={
                  nextName
                    ? `Say this distance to ${nextName}`
                    : "Say this distance to the next body"
                }
              />
            ) : null}
          </dl>
        </>
      ) : null}
    </div>
  )
}

function orbitExplainerLink(href: string, label: string) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/90"
    >
      {label}
      <ExternalLink aria-hidden className="size-3.5 shrink-0 text-primary" />
      <span className="sr-only">(opens in new tab)</span>
    </a>
  )
}

function SemiMajorAxisExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Semi-major axis
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        For an elliptical orbit, the semi-major axis is half of the longest diameter
        of the ellipse. It is usually written as <span className="font-mono">a</span>.
        It is close to the average distance between the orbiting body and the body it
        goes around.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Semi-major_and_semi-minor_axes",
        "Wikipedia — semi-major axis"
      )}
    </section>
  )
}

function ApsisExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Apsides
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        The <strong>apsides</strong> are the two extreme points of an orbit: the
        closest approach and the farthest separation. The singular is{" "}
        <strong>apsis</strong>; the plural is <strong>apsides</strong>.
      </p>
      {orbitExplainerLink("https://en.wikipedia.org/wiki/Apsis", "Wikipedia — apsis")}
    </section>
  )
}

function PeriapsisExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Periapsis
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        <strong>Periapsis</strong> is the point in an orbit where the orbiting body is
        closest to the thing it orbits (the central body).
      </p>
      {orbitExplainerLink("https://en.wikipedia.org/wiki/Apsis", "Wikipedia — periapsis")}
    </section>
  )
}

function PerihelionExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Perihelion
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        <strong>Perihelion</strong> is periapsis for an orbit around the Sun: the
        closest the object gets to the Sun along its path.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Perihelion_and_aphelion",
        "Wikipedia — perihelion and aphelion"
      )}
    </section>
  )
}

function ApoapsisExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Apoapsis
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        <strong>Apoapsis</strong> is the point in an orbit where the orbiting body is
        farthest from the central body.
      </p>
      {orbitExplainerLink("https://en.wikipedia.org/wiki/Apsis", "Wikipedia — apoapsis")}
    </section>
  )
}

function AphelionExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Aphelion
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        <strong>Aphelion</strong> is apoapsis for an orbit around the Sun: the farthest
        the object gets from the Sun along its path.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Perihelion_and_aphelion",
        "Wikipedia — perihelion and aphelion"
      )}
    </section>
  )
}

function DistanceRow({
  title,
  km,
  pxPerKmDistance,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
  distanceUnit,
  onToggleUnit,
  scaledUnitSystem,
  onToggleScaledUnit,
  sayThisTitle,
}: {
  title: ReactNode
  km: number | null
  pxPerKmDistance: number
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
  distanceUnit: "km" | "mi"
  onToggleUnit: () => void
  scaledUnitSystem: ScaledDiameterUnitSystem
  onToggleScaledUnit: () => void
  sayThisTitle: string
}) {
  const px =
    km != null && Number.isFinite(km) && pxPerKmDistance > 0
      ? km * pxPerKmDistance
      : null

  const kmOk = km != null && Number.isFinite(km)

  return (
    <div>
      <dt className="text-sidebar-foreground/60">{title}</dt>
      <dd className="mt-0.5 space-y-1 font-medium text-sidebar-foreground">
        <div>
          {kmOk ? (
            <SwitchableReadingNumber
              onToggleUnit={onToggleUnit}
              numberAriaLabel={
                distanceUnit === "km"
                  ? "Showing kilometers. Switch to miles."
                  : "Showing miles. Switch to kilometers."
              }
              explainerContent={
                <DistanceReadingExplainerSection
                  title={sayThisTitle}
                  km={km}
                  unit={distanceUnit}
                />
              }
            >
              {formatDistanceNumber(km, distanceUnit)} {distanceUnit}
            </SwitchableReadingNumber>
          ) : (
            <span className="tabular-nums">—</span>
          )}
        </div>
        <div className="tabular-nums text-sidebar-foreground/85">
          {px != null ? formatDistancePx(px) : "—"}
        </div>
        <div>
          {(() => {
            if (!kmOk) {
              return <span className="tabular-nums text-sidebar-foreground/85">—</span>
            }
            const mm = scaledDiameterMm(km, pxPerKmDistance, pxPerMm)
            if (!Number.isFinite(mm)) {
              return <span className="tabular-nums text-sidebar-foreground/85">—</span>
            }
            if (!isCalibrated) {
              return (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 text-sm font-medium"
                  onClick={() => onOpenCalibration()}
                  aria-label="Open display calibration to see scaled distance on your screen"
                >
                  Calibrate to see
                </Button>
              )
            }
            const formatted = formatScaledDiameter(mm, scaledUnitSystem)
            const approxPrefix = "≈ "
            return (
              <SwitchableReadingNumber
                onToggleUnit={onToggleScaledUnit}
                numberAriaLabel={
                  scaledUnitSystem === "metric"
                    ? "Showing metric units. Switch to imperial."
                    : "Showing imperial units. Switch to metric."
                }
                explainerContent={
                  <ScaledDistanceExplainerSection
                    title={sayThisTitle.replace("Say this", "Say this scaled")}
                    mm={mm}
                    system={scaledUnitSystem}
                  />
                }
              >
                {approxPrefix}
                {formatted.display} {formatted.unit}
              </SwitchableReadingNumber>
            )
          })()}
        </div>
      </dd>
    </div>
  )
}

function DistanceReadingExplainerSection({
  title,
  km,
  unit,
}: {
  title: string
  km: number
  unit: "km" | "mi"
}) {
  const displayed = `${formatDistanceNumber(km, unit)} ${unit}`
  const spoken = spokenDistanceSentence(km, unit)
  return (
    <section
      aria-labelledby="distance-reading-heading"
      className="rounded-xl px-0.5 py-0.5"
    >
      <h3
        id="distance-reading-heading"
        className="font-heading text-sm font-semibold text-sidebar-foreground"
      >
        {title}
      </h3>
      <p className="mt-2 rounded-md bg-sidebar-accent/50 px-2 py-2 font-mono text-sm text-sidebar-foreground tabular-nums">
        {displayed}
      </p>
      <p className="mt-3 text-base leading-relaxed text-sidebar-foreground">
        {spoken}
      </p>
    </section>
  )
}

function ScaledDistanceExplainerSection({
  title,
  mm,
  system,
}: {
  title: string
  mm: number
  system: ScaledDiameterUnitSystem
}) {
  const formatted = formatScaledDiameter(mm, system)
  const displayed = `≈ ${formatted.display} ${formatted.unit}`
  const spoken = spokenScaledDiameterSentence(mm, system)
  return (
    <section
      aria-labelledby="scaled-distance-reading-heading"
      className="rounded-xl px-0.5 py-0.5"
    >
      <h3
        id="scaled-distance-reading-heading"
        className="font-heading text-sm font-semibold text-sidebar-foreground"
      >
        {title}
      </h3>
      <p className="mt-2 rounded-md bg-sidebar-accent/50 px-2 py-2 font-mono text-sm text-sidebar-foreground tabular-nums">
        {displayed}
      </p>
      <p className="mt-3 text-base leading-relaxed text-sidebar-foreground">
        {spoken}
      </p>
      <p className="mt-3 text-sm leading-snug text-accent-foreground/60">
        That is how far this distance is on your screen right now. Try the Scale
        Distance slider on the right to make it bigger or smaller.
      </p>
    </section>
  )
}

