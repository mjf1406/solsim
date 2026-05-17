import { useId, useMemo } from "react"
import { ExternalLink } from "lucide-react"

import { ReadingKeyword } from "@/components/reading/reading-keyword"
import { BodyDiameterStatsSection } from "@/components/solar-system/body-diameter-stats-section"
import { findDistanceRegionByCanvasId } from "@/lib/solar-system/distance-regions"
import type { OrbitPathModel } from "@/lib/solar-system/orbits/orbit-path-sample"

import {
  collectDistanceBodies,
  findDistanceBodyDetail,
  type SolarSystemJson,
  type SizePageModel,
} from "../../distance/-data"
import {
  DistanceFromSunSidebarSection,
  DistanceRegionSidebarPanel,
  SidebarStatsDataCollapsible,
} from "../../distance/-components/distance-selected-body-sidebar-panel"
import {
  bodyDiameterPositionIntro,
  findSizeBodyDetail,
} from "../../size/-data"

const ORBIT_KEYWORD_POPOVER_PROPS = {
  side: "bottom" as const,
  align: "start" as const,
  className:
    "border border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm max-w-xs",
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

function CircularOrbitExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Circular orbit
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        A circular orbit is a perfect ring: the distance to what you orbit stays
        the same all the way around. It is a simple, friendly model that is easy
        to draw on a map.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Circular_orbit",
        "Wikipedia — circular orbit"
      )}
    </section>
  )
}

function KeplerianOrbitExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Keplerian orbit
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        A Keplerian orbit follows the rules Johannes Kepler discovered centuries
        ago. Real paths in space are usually ellipses, not perfect circles, and
        bodies move a little faster when they are closer and a little slower when
        they are farther away.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Kepler%27s_laws_of_planetary_motion",
        "Wikipedia — Kepler's laws"
      )}
    </section>
  )
}

function EllipseExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Ellipse
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        An ellipse is like a circle that got gently squeezed. Many orbits are
        elliptical: the Sun (or a planet, for a moon) sits at one special point
        called a focus, not in the middle of the oval.
      </p>
      {orbitExplainerLink("https://en.wikipedia.org/wiki/Ellipse", "Wikipedia — ellipse")}
    </section>
  )
}

function FocusExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Focus
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        On an elliptical path, a focus is one of two &quot;anchor points&quot; that
        define the shape. For a planet around the Sun, the Sun sits at one focus.
        The other focus is empty space.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Ellipse#Focus",
        "Wikipedia — ellipse focus"
      )}
    </section>
  )
}

function EccentricityExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Eccentricity
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        Eccentricity is a number that tells you how squished an orbit is. Zero
        means a perfect circle. Bigger numbers (closer to 1) mean a longer, thinner
        ellipse.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Orbital_eccentricity",
        "Wikipedia — orbital eccentricity"
      )}
    </section>
  )
}

function PrecessionExplainer() {
  return (
    <section className="rounded-xl px-0.5 py-0.5">
      <h3 className="font-heading text-sm font-semibold text-sidebar-foreground">
        Precession
      </h3>
      <p className="mt-2 text-sm leading-snug text-sidebar-foreground/85">
        Precession is a slow, gentle turning of an orbit over a very long time.
        The closest and farthest points can drift around the path, like a hula hoop
        that slowly wobbles. Mercury&apos;s orbit is a famous example.
      </p>
      {orbitExplainerLink(
        "https://en.wikipedia.org/wiki/Apsidal_precession",
        "Wikipedia — apsidal precession"
      )}
    </section>
  )
}

function OrbitSidebarSection({
  bodyName,
  eccentricity,
  orbitModel,
}: {
  bodyName: string
  eccentricity: number | null
  orbitModel: OrbitPathModel
}) {
  const headingId = useId()
  const eOk = eccentricity != null && Number.isFinite(eccentricity)
  const pathLabel = orbitModel === "circle" ? "circular" : "Keplerian"

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="font-heading text-lg font-semibold text-sidebar-foreground"
      >
        Orbit
      </h2>
      <p className="text-base leading-snug text-sidebar-foreground/90">
        On this top-down map, paths can be drawn as a{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<CircularOrbitExplainer />}
          popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
        >
          circular orbit
        </ReadingKeyword>{" "}
        (a smooth ring) or as a{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<KeplerianOrbitExplainer />}
          popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
        >
          Keplerian
        </ReadingKeyword>{" "}
        path (a squished oval that better matches real motion). Right now you are
        viewing <span className="font-medium">{pathLabel}</span> paths.
      </p>
      <p className="text-base leading-snug text-sidebar-foreground/90">
        Most real orbits are{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<EllipseExplainer />}
          popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
        >
          elliptical
        </ReadingKeyword>
        : the Sun or planet you go around sits at one{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<FocusExplainer />}
          popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
        >
          focus
        </ReadingKeyword>
        , not in the center of the oval. How stretched the path is is called{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<EccentricityExplainer />}
          popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
        >
          eccentricity
        </ReadingKeyword>
        .
        {eOk ? (
          <>
            {" "}
            For {bodyName}, eccentricity is about{" "}
            <span className="font-medium tabular-nums">{eccentricity.toPrecision(4)}</span>
            {eccentricity < 0.01
              ? " — very close to a circle!"
              : eccentricity < 0.2
                ? " — a little squished."
                : " — noticeably squished."}
          </>
        ) : null}
      </p>
      <p className="text-base leading-snug text-sidebar-foreground/90">
        Every orbit has a closest point and a farthest point (you can read about
        those in the distance section above). Over thousands of years, the whole
        oval can slowly spin through{" "}
        <ReadingKeyword
          variant="inline"
          popoverContent={<PrecessionExplainer />}
          popoverContentProps={ORBIT_KEYWORD_POPOVER_PROPS}
        >
          precession
        </ReadingKeyword>
        — a long, slow wobble, not a quick spin like a day on Earth.
      </p>

      <SidebarStatsDataCollapsible title="Orbit measurements">
        <dl className="space-y-2 text-base text-sidebar-foreground/90">
          <div>
            <dt className="text-sidebar-foreground/60">Eccentricity</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-sidebar-foreground">
              {eOk ? eccentricity.toPrecision(6) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sidebar-foreground/60">Orbit path on canvas</dt>
            <dd className="mt-0.5 font-medium text-sidebar-foreground">
              {orbitModel === "circle" ? "Circle" : "Kepler"}
            </dd>
          </div>
        </dl>
      </SidebarStatsDataCollapsible>
    </section>
  )
}

type OrbitsSelectedBodySidebarProps = {
  model: SizePageModel
  json: SolarSystemJson
  selectedBodyId: string | null
  pxPerKmSize: number
  pxPerKmDistance: number
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
  orbitModel: OrbitPathModel
}

export function OrbitsSelectedBodySidebarContent({
  model,
  json,
  selectedBodyId,
  pxPerKmSize,
  pxPerKmDistance,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
  orbitModel,
}: OrbitsSelectedBodySidebarProps) {
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

  const positionIntro = bodyDiameterPositionIntro(model, detailSize)
  const selectedBody = bodies.find((b) => b.canvasId === selectedBodyId)
  const rawE = selectedBody?.raw?.elements?.e
  const eccentricity =
    rawE != null && Number.isFinite(rawE) ? rawE : null

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
          positionIntro,
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
        wrapStatsListInCollapsible
        statsListCollapsibleTitle="Size on this screen"
      />

      {detailDistance.kind !== "star" ? (
        <DistanceFromSunSidebarSection
          detailSize={detailSize}
          detailDistance={detailDistance}
          model={model}
          distanceKmById={distanceKmById}
          pxPerKmDistance={pxPerKmDistance}
          pxPerMm={pxPerMm}
          isCalibrated={isCalibrated}
          onOpenCalibration={onOpenCalibration}
        />
      ) : null}

      {detailDistance.kind !== "star" ? (
        <OrbitSidebarSection
          bodyName={detailSize.name}
          eccentricity={eccentricity}
          orbitModel={orbitModel}
        />
      ) : null}
    </div>
  )
}
