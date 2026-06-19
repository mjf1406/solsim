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
  DISTANCE_FIT_ORBIT_PX_OPTIONS,
  pxPerKmForFitDistance,
  useAssumedDistanceFitViewportWidthPx,
} from "@/hooks/use-distance-scale"
import {
  DEFAULT_TIME_SPEED_INDEX,
  TIME_SPEED_PRESETS,
} from "@/lib/solar-system/orbits/orbit-period"
import {
  pxPerKmToSliderValue,
  sliderValueToPxPerKm,
  type ScaleSliderStop,
} from "@/lib/solar-system/scale/scale-presets"
import { type SizeBodyDisplayFilter } from "@/lib/solar-system/body-type-display"

import {
  buildSizePageModel,
  fetchSciFiSizeCatalog,
  fetchSolarSystemJson,
  KM_PER_AU,
  type SolarSystemJson,
  type SizePageModel,
} from "../distance/-data"
import type { OrbitPathModel } from "@/lib/solar-system/orbits/orbit-path-sample"
import { SizePageBodyTypesSidebarPortal } from "../size/-components/size-body-types-sidebar-panel"

import { OrbitsCanvas } from "./-components/orbits-canvas"
import { OrbitPathModelSidebarPortal } from "./-components/orbit-path-model-sidebar-panel"
import { TimeControlsSidebarPortal } from "./-components/time-controls-sidebar-panel"
import { OrbitsSymbolBar } from "./-components/orbits-symbol-bar"
import { OrbitsSelectedBodySidebarContent } from "./-components/orbits-selected-body-sidebar-panel"
import { isOrbitsPageBodySelectable } from "./-orbits-page-select"
import {
  finalizeOrbitsNavigateSearch,
  orbitsSearchToBodyDisplayFilter,
  parseOrbitsRouteSearch,
  serializeOrbitsPageSearch,
  type OrbitsRouteSearch,
} from "./-url-search"

export const Route = createFileRoute("/_app/solar-system/orbits/")({
  validateSearch: (search: Record<string, unknown>): OrbitsRouteSearch =>
    parseOrbitsRouteSearch(search),
  loader: async () => {
    const [json, sciFiCatalog] = await Promise.all([
      fetchSolarSystemJson(),
      fetchSciFiSizeCatalog(),
    ])
    return { json, model: buildSizePageModel(json, sciFiCatalog) }
  },
  errorComponent: OrbitsRouteError,
  component: SolarSystemOrbitsPage,
})

function OrbitsRouteError({ error }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : "Something went wrong."
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl">Solar System — Orbits</h1>
      <p className="mt-4 text-sm text-destructive" role="alert">
        {message}
      </p>
    </div>
  )
}

function OrbitsPageLeftSidebarPortal({
  model,
  json,
  selectedBodyId,
  pxPerKmSize,
  pxPerKmDistance,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
  orbitModel,
}: {
  model: SizePageModel
  json: SolarSystemJson
  selectedBodyId: string | null
  pxPerKmSize: number
  pxPerKmDistance: number
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
  orbitModel: OrbitPathModel
}) {
  const { leftSidebarContentMount } = useAppHeaderSlots()
  if (!leftSidebarContentMount) return null
  return createPortal(
    <OrbitsSelectedBodySidebarContent
      model={model}
      json={json}
      selectedBodyId={selectedBodyId}
      pxPerKmSize={pxPerKmSize}
      pxPerKmDistance={pxPerKmDistance}
      pxPerMm={pxPerMm}
      isCalibrated={isCalibrated}
      onOpenCalibration={onOpenCalibration}
      orbitModel={orbitModel}
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

function SolarSystemOrbitsPage() {
  const { model, json } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(
    () => search.body ?? null
  )
  const [bodyDisplayFilter, setBodyDisplayFilter] =
    useState<SizeBodyDisplayFilter>(() =>
      orbitsSearchToBodyDisplayFilter(search)
    )
  const [paused, setPaused] = useState(true)
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_TIME_SPEED_INDEX)
  const [centerOnBodyId, setCenterOnBodyId] = useState<string | null>(null)
  const [centerOnBodyToken, setCenterOnBodyToken] = useState(0)

  const simSpeedSecondsPerWallSecond =
    TIME_SPEED_PRESETS[speedIndex]?.simSecondsPerWallSecond ??
    TIME_SPEED_PRESETS[DEFAULT_TIME_SPEED_INDEX]!.simSecondsPerWallSecond

  const calibration = useDisplayCalibration()
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false)
  const [scaleLinked, setScaleLinked] = useState(false)

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

  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  }, [search])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync URL → UI */
    setBodyDisplayFilter(orbitsSearchToBodyDisplayFilter(search))
    setSelectedBodyId(search.body ?? null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [search])

  useEffect(() => {
    if (search.zoom_size == null) return
    const px = search.zoom_size
    const r = sizeScale.range
    const clamped = Math.min(r.maxPxPerKm, Math.max(r.minPxPerKm, px))
    sizeScale.setSliderValue(pxPerKmToSliderValue(clamped, r))
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [search.zoom_size, sizeScale.range, sizeScale.setSliderValue])

  useEffect(() => {
    if (search.zoom_dist == null) return
    distanceScale.setSliderValue(
      pxPerKmToSliderValue(search.zoom_dist, distanceScale.range)
    )
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [search.zoom_dist, distanceScale.range, distanceScale.setSliderValue])

  useEffect(() => {
    const partial = serializeOrbitsPageSearch({
      selectedBodyId,
      bodyDisplayFilter,
      debouncedPxPerKmSize: sizeScale.debouncedPxPerKm,
      debouncedPxPerKmDistance: distanceScale.debouncedPxPerKm,
    })
    const nextSearch = finalizeOrbitsNavigateSearch(partial)
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

  const orbitModel: OrbitPathModel = search.orbit_model ?? "circle"

  const onSymbolBarSelect = useCallback((bodyId: string) => {
    setSelectedBodyId(bodyId)
    setCenterOnBodyId(bodyId)
    setCenterOnBodyToken((t) => t + 1)
  }, [])

  useEffect(() => {
    if (
      !selectedBodyId ||
      isOrbitsPageBodySelectable(
        model,
        json,
        bodyDisplayFilter,
        selectedBodyId,
        sizeScale.debouncedPxPerKm,
        distanceScale.debouncedPxPerKm
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
        <OrbitsCanvas
          model={model}
          json={json}
          onBodySelect={setSelectedBodyId}
          selectedBodyId={selectedBodyId}
          bodyDisplayFilter={bodyDisplayFilter}
          pxPerKmSize={sizeScale.debouncedPxPerKm}
          pxPerKmDistance={distanceScale.debouncedPxPerKm}
          orbitModel={orbitModel}
          paused={paused}
          simSpeedSecondsPerWallSecond={simSpeedSecondsPerWallSecond}
          centerOnBodyId={centerOnBodyId}
          centerOnBodyToken={centerOnBodyToken}
        />

        <CanvasBottomHudStack aria-label="Jump to a major body by symbol">
          <OrbitsSymbolBar
            model={model}
            json={json}
            bodyDisplayFilter={bodyDisplayFilter}
            pxPerKmSize={sizeScale.debouncedPxPerKm}
            pxPerKmDistance={distanceScale.debouncedPxPerKm}
            selectedBodyId={selectedBodyId}
            onSelectBody={onSymbolBarSelect}
          />
        </CanvasBottomHudStack>

        <ScaleControlSidebarPortal
          title="Scale Size"
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
          title="Scale Distance"
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
          onSelectBody={setSelectedBodyId}
        />

        <OrbitPathModelSidebarPortal />

        <TimeControlsSidebarPortal
          paused={paused}
          onPausedChange={setPaused}
          speedIndex={speedIndex}
          onSpeedIndexChange={setSpeedIndex}
        />

        <OrbitsPageLeftSidebarPortal
          model={model}
          json={json}
          selectedBodyId={selectedBodyId}
          pxPerKmSize={sizeScale.pxPerKm}
          pxPerKmDistance={distanceScale.pxPerKm}
          pxPerMm={calibration.pxPerMm}
          isCalibrated={calibration.isCalibrated}
          onOpenCalibration={() => setCalibrationDialogOpen(true)}
          orbitModel={orbitModel}
        />
      </div>
    </TooltipProvider>
  )
}
