import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  createFileRoute,
  deepEqual,
  type ErrorComponentProps,
} from "@tanstack/react-router"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { ScaleControlSidebarPortal } from "@/components/scale/scale-control-sidebar-panel"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useCanvasScale } from "@/hooks/use-canvas-scale"
import { useDisplayCalibration } from "@/hooks/use-display-calibration"
import {
  DISTANCE_FIT_ORBIT_PX_OPTIONS,
  pxPerKmForFitDistance,
  pxPerKmToSliderValueForDistanceRange,
  useAssumedDistanceFitViewportWidthPx,
  useDistanceScale,
} from "@/hooks/use-distance-scale"
import { pxPerKmToSliderValue } from "@/lib/solar-system/scale/scale-presets"

import {
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"

import {
  buildSizePageModel,
  fetchSciFiSizeCatalog,
  fetchSolarSystemJson,
  KM_PER_AU,
  type SolarSystemJson,
  type SizePageModel,
} from "./-data"
import { DistanceCanvas } from "./-components/distance-canvas"
import { DistanceSymbolBar } from "./-components/distance-symbol-bar"
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

function SolarSystemDistancePage() {
  const { model, json } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

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

  const calibration = useDisplayCalibration()
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false)

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

  const fitMarsPxPerKmSize = useMemo(
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
    initialPxPerKm: fitMarsPxPerKmSize,
  })
  const distanceScale = useDistanceScale()

  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  }, [search])

  useEffect(() => {
    /* Router search is external input (link, back/forward). */
    /* eslint-disable react-hooks/set-state-in-effect -- sync URL → UI */
    setBodyDisplayFilter(distanceSearchToBodyDisplayFilter(search))
    setSelectedBodyId(search.body ?? null)
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
      pxPerKmToSliderValueForDistanceRange(search.zoom_dist, distanceScale.range)
    )
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- omit distanceScale identity churn */
  }, [search.zoom_dist, distanceScale.range, distanceScale.setSliderValue])

  useEffect(() => {
    const partial = serializeDistancePageSearch({
      selectedBodyId,
      bodyDisplayFilter,
      debouncedPxPerKmSize: sizeScale.debouncedPxPerKm,
      debouncedPxPerKmDistance: distanceScale.debouncedPxPerKm,
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
  ])

  const selectBodyFromBodyTypesList = useCallback((bodyId: string) => {
    setSelectedBodyId(bodyId)
    setScrollToBodyListId(bodyId)
    setScrollToBodyListToken((t) => t + 1)
  }, [])

  useEffect(() => {
    if (
      !selectedBodyId ||
      isSizeBodyIdVisibleUnderFilter(
        model,
        bodyDisplayFilter,
        selectedBodyId,
        sizeScale.debouncedPxPerKm,
        0
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
  }, [model, bodyDisplayFilter, selectedBodyId, sizeScale.debouncedPxPerKm])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative isolate min-h-[calc(100svh-var(--app-header-h))] w-full">
        <DistanceCanvas
          model={model}
          json={json}
          onBodySelect={setSelectedBodyId}
          bodyDisplayFilter={bodyDisplayFilter}
          pxPerKmSize={sizeScale.debouncedPxPerKm}
          pxPerKmDistance={distanceScale.debouncedPxPerKm}
          scrollToBodyId={scrollToBodyListId}
          scrollToBodyToken={scrollToBodyListToken}
        />

        <DistanceSymbolBar
          model={model}
          json={json}
          bodyDisplayFilter={bodyDisplayFilter}
          pxPerKmSize={sizeScale.debouncedPxPerKm}
          selectedBodyId={selectedBodyId}
          onSelectBody={selectBodyFromBodyTypesList}
        />

      <ScaleControlSidebarPortal
        title="Scale Size"
        cycleButtonLabel={sizeScale.cycleButtonLabel}
        sliderValue={sizeScale.sliderValue}
        readout={sizeScale.readout}
        isPending={sizeScale.isPending}
        setSliderValue={sizeScale.setSliderValue}
        cycleMode={sizeScale.cycleMode}
        snapStops={sizeScale.snapStops}
        calibration={calibration}
        calibrationDialogOpen={calibrationDialogOpen}
        onCalibrationDialogOpenChange={setCalibrationDialogOpen}
      />

      <ScaleControlSidebarPortal
        title="Scale Distance"
        showCalibrationControls={false}
        cycleButtonLabel={distanceScale.cycleButtonLabel}
        sliderValue={distanceScale.sliderValue}
        readout={distanceScale.readout}
        isPending={distanceScale.isPending}
        setSliderValue={distanceScale.setSliderValue}
        cycleMode={distanceScale.cycleMode}
        snapStops={distanceScale.snapStops}
        calibration={calibration}
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
