import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  createFileRoute,
  deepEqual,
  type ErrorComponentProps,
} from "@tanstack/react-router"

import { CanvasBottomHudStack } from "@/components/solar-system/body-symbol-bar-shell"
import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { ScaleControlSidebarPortal } from "@/components/scale/scale-control-sidebar-panel"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useCanvasScale } from "@/hooks/use-canvas-scale"
import { useDisplayCalibration } from "@/hooks/use-display-calibration"
import {
  ASSUMED_LEFT_SIDEBAR_PX_CSS,
  DISTANCE_CANVAS_BASE_INSET_PX,
  DISTANCE_FIT_ORBIT_PX_OPTIONS,
  pxPerKmForFitDistance,
  useAssumedDistanceFitViewportWidthPx,
} from "@/hooks/use-distance-scale"
import {
  nearestSnapStopIndex,
  pxPerKmToSliderValue,
  sliderValueToPxPerKm,
  snapStopSliderValueForPinchFactor,
  stepSnapStopSliderValue,
  type ScaleSliderStop,
} from "@/lib/solar-system/scale/scale-presets"

import { findDistanceRegionByCanvasId } from "@/lib/solar-system/distance-regions"
import { type SizeBodyDisplayFilter } from "@/lib/solar-system/body-type-display"
import type { DistanceInclusionContext } from "@/lib/solar-system/distance-render-limit"

import {
  buildSizePageModel,
  collectDistanceBodies,
  fetchSciFiSizeCatalog,
  fetchSolarSystemJson,
  findDistanceBodyDetail,
  KM_PER_AU,
  type SolarSystemJson,
  type SizePageModel,
} from "./-data"
import { isDistancePageBodySelectable } from "./-distance-page-select"
import type { DistanceUnitOrAll } from "@/lib/solar-system/distance/distance-units"
import type { LightSpeedMultiplier } from "@/lib/solar-system/distance/light-speed"

import { DistanceCanvas } from "./-components/distance-canvas"
import { LightSpeedBanner } from "./-components/light-speed-banner"
import { LightSpeedEtaReadout } from "./-components/light-speed-eta-readout"
import { LightSpeedMultiplierControl } from "./-components/light-speed-multiplier-control"
import { LightSpeedSidebarPortal } from "./-components/light-speed-sidebar-panel"
import { OrbitToolSidebarPortal } from "./-components/orbit-tool-sidebar-panel"
import { DistanceSymbolBar } from "./-components/distance-symbol-bar"
import { DistanceTraveledReadout } from "./-components/distance-traveled-readout"
import { DistanceSelectedBodySidebarContent } from "./-components/distance-selected-body-sidebar-panel"
import { SizePageBodyTypesSidebarPortal } from "../size/-components/size-body-types-sidebar-panel"
import {
  distanceSearchToBodyDisplayFilter,
  finalizeNavigateSearch,
  parseDistanceRouteSearch,
  serializeDistancePageSearch,
  type DistanceRouteSearch,
} from "./-url-search"

export const Route = createFileRoute("/_app/solar-system/distance/")({
  validateSearch: (search: Record<string, unknown>): DistanceRouteSearch =>
    parseDistanceRouteSearch(search),
  loader: async () => {
    const [json, sciFiCatalog] = await Promise.all([
      fetchSolarSystemJson(),
      fetchSciFiSizeCatalog(),
    ])
    return { json, model: buildSizePageModel(json, sciFiCatalog) }
  },
  errorComponent: DistanceRouteError,
  component: SolarSystemDistancePage,
})

function DistanceRouteError({ error }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : "Something went wrong."
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl">Solar System — Distance</h1>
      <p className="mt-4 text-sm text-destructive" role="alert">
        {message}
      </p>
    </div>
  )
}

function DistancePageLeftSidebarPortal({
  model,
  json,
  selectedBodyId,
  pxPerKmSize,
  pxPerKmDistance,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
}: {
  model: SizePageModel
  json: SolarSystemJson
  selectedBodyId: string | null
  pxPerKmSize: number
  pxPerKmDistance: number
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
}) {
  const { leftSidebarContentMount } = useAppHeaderSlots()
  if (!leftSidebarContentMount) return null
  return createPortal(
    <DistanceSelectedBodySidebarContent
      model={model}
      json={json}
      selectedBodyId={selectedBodyId}
      pxPerKmSize={pxPerKmSize}
      pxPerKmDistance={pxPerKmDistance}
      pxPerMm={pxPerMm}
      isCalibrated={isCalibrated}
      onOpenCalibration={onOpenCalibration}
    />,
    leftSidebarContentMount
  )
}

function nextScaleStopSliderValue(
  currentSliderValue: number,
  snapStops: ScaleSliderStop[]
): number | null {
  if (snapStops.length === 0) return null
  let bestIndex = 0
  let bestDistance = Infinity
  for (let i = 0; i < snapStops.length; i++) {
    const stop = snapStops[i]
    if (!stop) continue
    const distance = Math.abs(stop.sliderValue - currentSliderValue)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = i
    }
  }
  return snapStops[(bestIndex + 1) % snapStops.length]?.sliderValue ?? null
}

function SolarSystemDistancePage() {
  const { model, json } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const distanceBodies = useMemo(
    () => collectDistanceBodies(model, json),
    [model, json]
  )

  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(
    () => search.body ?? null
  )
  const [bodyDisplayFilter, setBodyDisplayFilter] =
    useState<SizeBodyDisplayFilter>(() =>
      distanceSearchToBodyDisplayFilter(search)
    )
  /** Bump so DistanceCanvas scrolls when picking from body-types list only (not canvas clicks). */
  const [scrollToBodyListToken, setScrollToBodyListToken] = useState(0)
  const [scrollToBodyListId, setScrollToBodyListId] = useState<string | null>(
    null
  )
  const [orbitOn, setOrbitOn] = useState(() => search.orbit === true)
  const [centerKmFromSun, setCenterKmFromSun] = useState<number | null>(null)
  const [distanceUnit, setDistanceUnit] =
    useState<DistanceUnitOrAll>("km")
  const [lightSpeedOn, setLightSpeedOn] = useState(false)
  const [lightSpeedMult, setLightSpeedMult] =
    useState<LightSpeedMultiplier>(1)
  const priorDistanceUnitRef = useRef<DistanceUnitOrAll | null>(null)

  const calibration = useDisplayCalibration()
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false)
  const [scaleLinked, setScaleLinked] = useState(true)

  const fitWidthPx = useAssumedDistanceFitViewportWidthPx()

  const distanceSizeExtraStops = useMemo(() => {
    const w = fitWidthPx
    return [
      {
        key: "fit_mercury",
        label: "Fit Mercury",
        pxPerKm: pxPerKmForFitDistance(
          0.387098 * KM_PER_AU,
          w,
          DISTANCE_FIT_ORBIT_PX_OPTIONS
        ),
      },
      {
        key: "fit_mars",
        label: "Fit Mars",
        pxPerKm: pxPerKmForFitDistance(
          1.523679 * KM_PER_AU,
          w,
          DISTANCE_FIT_ORBIT_PX_OPTIONS
        ),
      },
      {
        key: "fit_jupiter",
        label: "Fit Jupiter",
        pxPerKm: pxPerKmForFitDistance(
          5.2026 * KM_PER_AU,
          w,
          DISTANCE_FIT_ORBIT_PX_OPTIONS
        ),
      },
      {
        key: "fit_neptune",
        label: "Fit Neptune",
        pxPerKm: pxPerKmForFitDistance(
          30.07 * KM_PER_AU,
          w,
          DISTANCE_FIT_ORBIT_PX_OPTIONS
        ),
      },
    ] as const
  }, [fitWidthPx])

  const fitMarsPxPerKm = useMemo(
    () =>
      pxPerKmForFitDistance(
        1.523679 * KM_PER_AU,
        fitWidthPx,
        DISTANCE_FIT_ORBIT_PX_OPTIONS
      ),
    [fitWidthPx]
  )

  const sizeScale = useCanvasScale({
    pxPerMm: calibration.pxPerMm,
    isCalibrated: calibration.isCalibrated,
    alwaysUseLogRange: true,
    extraStops: distanceSizeExtraStops,
    initialPxPerKm: fitMarsPxPerKm,
  })
  const distanceScale = useCanvasScale({
    pxPerMm: calibration.pxPerMm,
    isCalibrated: calibration.isCalibrated,
    alwaysUseLogRange: true,
    extraStops: distanceSizeExtraStops,
    initialPxPerKm: fitMarsPxPerKm,
  })

  const distanceInclusionContext =
    useMemo<DistanceInclusionContext | null>(() => {
      if (!(distanceScale.debouncedPxPerKm > 0)) return null
      return {
        bodies: distanceBodies,
        pxPerKmDistance: distanceScale.debouncedPxPerKm,
        insetLeftPx:
          ASSUMED_LEFT_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX,
      }
    }, [distanceBodies, distanceScale.debouncedPxPerKm])

  const handleScaleLinkedChange = useCallback(
    (nextLinked: boolean) => {
      setScaleLinked(nextLinked)
      if (!nextLinked) return
      sizeScale.setSliderValue(
        pxPerKmToSliderValue(distanceScale.pxPerKm, sizeScale.range)
      )
    },
    [distanceScale.pxPerKm, sizeScale]
  )

  const setSizeSliderValue = useCallback(
    (value: number) => {
      sizeScale.setSliderValue(value)
      if (!scaleLinked) return
      const pxPerKm = sliderValueToPxPerKm(value, sizeScale.range)
      distanceScale.setSliderValue(
        pxPerKmToSliderValue(pxPerKm, distanceScale.range)
      )
    },
    [distanceScale, scaleLinked, sizeScale]
  )

  const setDistanceSliderValue = useCallback(
    (value: number) => {
      distanceScale.setSliderValue(value)
      if (!scaleLinked) return
      const pxPerKm = sliderValueToPxPerKm(value, distanceScale.range)
      sizeScale.setSliderValue(pxPerKmToSliderValue(pxPerKm, sizeScale.range))
    },
    [distanceScale, scaleLinked, sizeScale]
  )

  const cycleSizeScale = useCallback(() => {
    if (!scaleLinked) {
      sizeScale.cycleMode()
      return
    }
    const next = nextScaleStopSliderValue(sizeScale.sliderValue, sizeScale.snapStops)
    if (next != null) setSizeSliderValue(next)
  }, [scaleLinked, setSizeSliderValue, sizeScale])

  const cycleDistanceScale = useCallback(() => {
    if (!scaleLinked) {
      distanceScale.cycleMode()
      return
    }
    const next = nextScaleStopSliderValue(
      distanceScale.sliderValue,
      distanceScale.snapStops
    )
    if (next != null) setDistanceSliderValue(next)
  }, [distanceScale, scaleLinked, setDistanceSliderValue])

  const pinchStartSliderRef = useRef(distanceScale.sliderValue)

  const pxPerKmAtDistanceSlider = useCallback(
    (sliderValue: number) =>
      sliderValueToPxPerKm(sliderValue, distanceScale.range),
    [distanceScale.range]
  )

  const onPinchZoomStart = useCallback(() => {
    const idx = nearestSnapStopIndex(
      distanceScale.sliderValue,
      distanceScale.snapStops
    )
    pinchStartSliderRef.current =
      distanceScale.snapStops[idx]?.sliderValue ?? distanceScale.sliderValue
  }, [distanceScale.sliderValue, distanceScale.snapStops])

  const onPinchZoomTo = useCallback(
    (factor: number) => {
      setDistanceSliderValue(
        snapStopSliderValueForPinchFactor(
          pinchStartSliderRef.current,
          factor,
          distanceScale.snapStops,
          pxPerKmAtDistanceSlider
        )
      )
    },
    [
      distanceScale.snapStops,
      pxPerKmAtDistanceSlider,
      setDistanceSliderValue,
    ]
  )

  const onWheelZoomStep = useCallback(
    (direction: 1 | -1) => {
      setDistanceSliderValue(
        stepSnapStopSliderValue(
          distanceScale.sliderValue,
          distanceScale.snapStops,
          direction
        )
      )
    },
    [
      distanceScale.sliderValue,
      distanceScale.snapStops,
      setDistanceSliderValue,
    ]
  )

  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  }, [search])

  useEffect(() => {
    /* Router search is external input (link, back/forward). */
    /* eslint-disable react-hooks/set-state-in-effect -- sync URL → UI */
    setBodyDisplayFilter(distanceSearchToBodyDisplayFilter(search))
    setSelectedBodyId(search.body ?? null)
    setOrbitOn(search.orbit === true)
    setScrollToBodyListToken(0)
    setScrollToBodyListId(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [search])

  useEffect(() => {
    if (search.zoom_size == null) return
    const px = search.zoom_size
    const r = sizeScale.range
    const clamped = Math.min(r.maxPxPerKm, Math.max(r.minPxPerKm, px))
    sizeScale.setSliderValue(pxPerKmToSliderValue(clamped, r))
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- omit sizeScale identity churn */
  }, [search.zoom_size, sizeScale.range, sizeScale.setSliderValue])

  useEffect(() => {
    if (search.zoom_dist == null) return
    distanceScale.setSliderValue(
      pxPerKmToSliderValue(search.zoom_dist, distanceScale.range)
    )
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- omit distanceScale identity churn */
  }, [search.zoom_dist, distanceScale.range, distanceScale.setSliderValue])

  useEffect(() => {
    const partial = serializeDistancePageSearch({
      selectedBodyId,
      bodyDisplayFilter,
      debouncedPxPerKmSize: sizeScale.debouncedPxPerKm,
      debouncedPxPerKmDistance: distanceScale.debouncedPxPerKm,
      orbitOn,
    })
    const nextSearch = finalizeNavigateSearch(partial)
    const id = window.setTimeout(() => {
      if (deepEqual(nextSearch, searchRef.current)) return
      navigate({
        replace: true,
        search: nextSearch,
      })
    }, 400)
    return () => window.clearTimeout(id)
  }, [
    bodyDisplayFilter,
    navigate,
    selectedBodyId,
    sizeScale.debouncedPxPerKm,
    distanceScale.debouncedPxPerKm,
    orbitOn,
  ])

  const orbitSidebarProps = useMemo(() => {
    const distanceRegion = findDistanceRegionByCanvasId(selectedBodyId)
    const distanceRegionLabel = distanceRegion?.label ?? null
    const detail = findDistanceBodyDetail(model, json, selectedBodyId)
    const selectedBodyKind = detail?.kind ?? null
    const hasOrbitData =
      detail != null &&
      detail.kind !== "star" &&
      detail.perihelionKm != null &&
      detail.aphelionKm != null &&
      Number.isFinite(detail.perihelionKm) &&
      Number.isFinite(detail.aphelionKm) &&
      detail.perihelionKm >= 0 &&
      detail.aphelionKm >= 0
    return { selectedBodyKind, hasOrbitData, distanceRegionLabel }
  }, [model, json, selectedBodyId])

  const selectBodyFromBodyTypesList = useCallback((bodyId: string) => {
    setSelectedBodyId(bodyId)
    setScrollToBodyListId(bodyId)
    setScrollToBodyListToken((t) => t + 1)
  }, [])

  const turnLightSpeedOff = useCallback(() => {
    setLightSpeedOn(false)
    setLightSpeedMult(1)
    const saved = priorDistanceUnitRef.current
    priorDistanceUnitRef.current = null
    if (saved != null) setDistanceUnit(saved)
  }, [])

  const turnLightSpeedOn = useCallback(() => {
    setDistanceUnit((current) => {
      priorDistanceUnitRef.current = current
      return "ltime"
    })
    setLightSpeedOn(true)
  }, [])

  const onLightSpeedSidebarChange = useCallback(
    (next: boolean) => {
      if (next) turnLightSpeedOn()
      else turnLightSpeedOff()
    },
    [turnLightSpeedOff, turnLightSpeedOn]
  )

  useEffect(() => {
    if (
      !selectedBodyId ||
      isDistancePageBodySelectable(
        model,
        json,
        bodyDisplayFilter,
        selectedBodyId,
        sizeScale.debouncedPxPerKm,
        distanceScale.debouncedPxPerKm,
        ASSUMED_LEFT_SIDEBAR_PX_CSS + DISTANCE_CANVAS_BASE_INSET_PX
      )
    ) {
      return
    }
    let active = true
    queueMicrotask(() => {
      if (active) setSelectedBodyId(null)
    })
    return () => {
      active = false
    }
  }, [
    model,
    json,
    bodyDisplayFilter,
    selectedBodyId,
    sizeScale.debouncedPxPerKm,
    distanceScale.debouncedPxPerKm,
  ])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative isolate min-h-[calc(100svh-var(--app-header-h))] w-full">
        <DistanceCanvas
          model={model}
          json={json}
          onBodySelect={setSelectedBodyId}
          selectedBodyId={selectedBodyId}
          bodyDisplayFilter={bodyDisplayFilter}
          pxPerKmSize={sizeScale.debouncedPxPerKm}
          pxPerKmDistance={distanceScale.debouncedPxPerKm}
          scrollToBodyId={scrollToBodyListId}
          scrollToBodyToken={scrollToBodyListToken}
          orbitOn={orbitOn}
          onCenterKmFromSunChange={setCenterKmFromSun}
          lightSpeedActive={lightSpeedOn}
          lightSpeedMultiplier={lightSpeedMult}
          onLightSpeedReachedEnd={turnLightSpeedOff}
          onPinchZoomStart={onPinchZoomStart}
          onPinchZoomTo={onPinchZoomTo}
          onWheelZoomStep={onWheelZoomStep}
        />

        {lightSpeedOn ? <LightSpeedBanner multiplier={lightSpeedMult} /> : null}

        {lightSpeedOn ? (
          <LightSpeedEtaReadout
            distanceBodies={distanceBodies}
            bodyDisplayFilter={bodyDisplayFilter}
            pxPerKmSize={sizeScale.debouncedPxPerKm}
            centerKmFromSun={centerKmFromSun}
            multiplier={lightSpeedMult}
            onSelectBody={setSelectedBodyId}
          />
        ) : null}

        <CanvasBottomHudStack aria-label="Distance canvas controls">
          <DistanceTraveledReadout
            km={centerKmFromSun}
            pxPerKmDistance={distanceScale.debouncedPxPerKm}
            unit={distanceUnit}
            onUnitChange={setDistanceUnit}
            disableUnitSelect={lightSpeedOn}
            trailingControl={
              lightSpeedOn ? (
                <LightSpeedMultiplierControl
                  multiplier={lightSpeedMult}
                  onMultiplierChange={setLightSpeedMult}
                  distanceUnit={distanceUnit}
                  pxPerKmDistance={distanceScale.debouncedPxPerKm}
                />
              ) : null
            }
          />

          <DistanceSymbolBar
            model={model}
            json={json}
            bodyDisplayFilter={bodyDisplayFilter}
            pxPerKmSize={sizeScale.debouncedPxPerKm}
            pxPerKmDistance={distanceScale.debouncedPxPerKm}
            selectedBodyId={selectedBodyId}
            onSelectBody={selectBodyFromBodyTypesList}
          />
        </CanvasBottomHudStack>

        <ScaleControlSidebarPortal
          title="Diameter"
          cycleButtonLabel={sizeScale.cycleButtonLabel}
          sliderValue={sizeScale.sliderValue}
          readout={sizeScale.readout}
          isPending={sizeScale.isPending}
          setSliderValue={setSizeSliderValue}
          cycleMode={cycleSizeScale}
          snapStops={sizeScale.snapStops}
          calibration={calibration}
          linked={scaleLinked}
          onLinkedChange={handleScaleLinkedChange}
          linkLabel="Link with Distance"
          calibrationDialogOpen={calibrationDialogOpen}
          onCalibrationDialogOpenChange={setCalibrationDialogOpen}
        />

        <ScaleControlSidebarPortal
          title="Distance"
          showCalibrationControls={false}
          cycleButtonLabel={distanceScale.cycleButtonLabel}
          sliderValue={distanceScale.sliderValue}
          readout={distanceScale.readout}
          isPending={distanceScale.isPending}
          setSliderValue={setDistanceSliderValue}
          cycleMode={cycleDistanceScale}
          snapStops={distanceScale.snapStops}
          calibration={calibration}
          linked={scaleLinked}
          onLinkedChange={handleScaleLinkedChange}
          linkLabel="Link with Size"
          calibrationDialogOpen={false}
          onCalibrationDialogOpenChange={() => {}}
        />

        <SizePageBodyTypesSidebarPortal
          model={model}
          bodyDisplayFilter={bodyDisplayFilter}
          setBodyDisplayFilter={setBodyDisplayFilter}
          pxPerKm={sizeScale.debouncedPxPerKm}
          selectedBodyId={selectedBodyId}
          onSelectBody={selectBodyFromBodyTypesList}
          distanceInclusionContext={distanceInclusionContext}
        />

        <OrbitToolSidebarPortal
          selectedBodyKind={orbitSidebarProps.selectedBodyKind}
          hasOrbitData={orbitSidebarProps.hasOrbitData}
          distanceRegionLabel={orbitSidebarProps.distanceRegionLabel}
          orbitOn={orbitOn}
          onOrbitOnChange={setOrbitOn}
        />

        <LightSpeedSidebarPortal
          lightSpeedOn={lightSpeedOn}
          onLightSpeedOnChange={onLightSpeedSidebarChange}
        />

        <DistancePageLeftSidebarPortal
          model={model}
          json={json}
          selectedBodyId={selectedBodyId}
          pxPerKmSize={sizeScale.pxPerKm}
          pxPerKmDistance={distanceScale.pxPerKm}
          pxPerMm={calibration.pxPerMm}
          isCalibrated={calibration.isCalibrated}
          onOpenCalibration={() => setCalibrationDialogOpen(true)}
        />
      </div>
    </TooltipProvider>
  )
}
