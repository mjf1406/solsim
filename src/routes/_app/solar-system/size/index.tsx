import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  createFileRoute,
  deepEqual,
  type ErrorComponentProps,
} from "@tanstack/react-router"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { ScaleControlSidebarPortal } from "@/components/scale/scale-control-sidebar-panel"
import { useCanvasScale } from "@/hooks/use-canvas-scale"
import { useDisplayCalibration } from "@/hooks/use-display-calibration"

import {
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import {
  nearestSnapStopIndex,
  snapStopSliderValueForPinchFactor,
  sliderValueToPxPerKm,
  sliderValueToPxPerKmMoonLadder,
  stepSnapStopSliderValue,
} from "@/lib/solar-system/scale/scale-presets"

import {
  buildSizePageModel,
  collectSizeCanvasBodies,
  fetchSciFiSizeCatalog,
  fetchSolarSystemJson,
  findSizeRowNameById,
  type SizeCanvasLabelMode,
  type SizePageModel,
} from "./-data"
import { bodyDiameterRatio } from "./-components/measure/measure-body-math"
import type {
  BodyMeasureOverlay,
  MeasureSubjectKind,
  MeasureTargetHitBody,
} from "./-components/measure/measure-types"
// import { SizePageMeasureSidebarPortal } from "./-components/measure/size-measure-sidebar-section"
import { SizePageBodyTypesSidebarPortal } from "./-components/size-body-types-sidebar-panel"
import { SizeComparisonCanvas } from "./-components/size-canvas"
import { SizeSelectionAttentionOverlay } from "./-components/size-selection-attention-overlay"
import { SizePageEducationNoticesSidebarContent } from "./-components/size-education-notices-sidebar-panel"
import { SizePageLabelsSidebarPortal } from "./-components/size-labels-sidebar-panel"
import { SizeSelectedBodySidebarContent } from "./-components/size-selected-body-sidebar-panel"
import {
  finalizeNavigateSearch,
  parseSizeRouteSearch,
  pxPerKmToSliderForCalibration,
  serializeSizePageSearch,
  sizeSearchToBodyDisplayFilter,
  type SizeRouteSearch,
} from "./-url-search"

export const Route = createFileRoute("/_app/solar-system/size/")({
  validateSearch: (search: Record<string, unknown>): SizeRouteSearch =>
    parseSizeRouteSearch(search),
  loader: async () => {
    const [json, sciFiCatalog] = await Promise.all([
      fetchSolarSystemJson(),
      fetchSciFiSizeCatalog(),
    ])
    return { model: buildSizePageModel(json, sciFiCatalog) }
  },
  errorComponent: SizeRouteError,
  component: SolarSystemSizePage,
})

function SizePageLeftSidebarPortal({
  model,
  selectedBodyId,
  pxPerKm,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
}: {
  model: SizePageModel
  selectedBodyId: string | null
  pxPerKm: number
  pxPerMm: number
  isCalibrated: boolean
  onOpenCalibration: () => void
}) {
  const { leftSidebarContentMount } = useAppHeaderSlots()
  if (!leftSidebarContentMount) return null
  return createPortal(
    <SizeSelectedBodySidebarContent
      model={model}
      selectedBodyId={selectedBodyId}
      pxPerKm={pxPerKm}
      pxPerMm={pxPerMm}
      isCalibrated={isCalibrated}
      onOpenCalibration={onOpenCalibration}
    />,
    leftSidebarContentMount
  )
}

function SizeRouteError({ error }: ErrorComponentProps) {
  const message =
    error instanceof Error ? error.message : "Something went wrong."
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl">Solar System — Size</h1>
      <p className="mt-4 text-sm text-destructive" role="alert">
        {message}
      </p>
    </div>
  )
}

function SolarSystemSizePage() {
  const { model } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const [labelMode, setLabelMode] = useState<SizeCanvasLabelMode>(
    () => search.labels
  )
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(
    () => search.body ?? null
  )
  const [bodyDisplayFilter, setBodyDisplayFilter] =
    useState<SizeBodyDisplayFilter>(() => sizeSearchToBodyDisplayFilter(search))
  const [listSelectionAttentionKey, setListSelectionAttentionKey] = useState(0)
  const [selectionAttentionOverlay, setSelectionAttentionOverlay] = useState<{
    target: { x: number; y: number }
    playId: number
  } | null>(null)

  const [measureSubjectKind] = useState<MeasureSubjectKind>("body")
  const [measureUnitCanvasId, setMeasureUnitCanvasId] = useState<string | null>(
    null
  )
  const [measureArmed, setMeasureArmed] = useState(false)
  const [bodyMeasureOverlay, setBodyMeasureOverlay] =
    useState<BodyMeasureOverlay>(null)

  const calibration = useDisplayCalibration()
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false)
  const scale = useCanvasScale({
    pxPerMm: calibration.pxPerMm,
    isCalibrated: calibration.isCalibrated,
  })

  const pinchStartSliderRef = useRef(scale.sliderValue)

  const pxPerKmAtSliderValue = useCallback(
    (sliderValue: number) =>
      calibration.isCalibrated
        ? sliderValueToPxPerKm(sliderValue, scale.range)
        : sliderValueToPxPerKmMoonLadder(sliderValue),
    [calibration.isCalibrated, scale.range]
  )

  const onPinchZoomStart = useCallback(() => {
    const idx = nearestSnapStopIndex(scale.sliderValue, scale.snapStops)
    pinchStartSliderRef.current =
      scale.snapStops[idx]?.sliderValue ?? scale.sliderValue
  }, [scale.sliderValue, scale.snapStops])

  const onPinchZoomTo = useCallback(
    (factor: number) => {
      scale.setSliderValue(
        snapStopSliderValueForPinchFactor(
          pinchStartSliderRef.current,
          factor,
          scale.snapStops,
          pxPerKmAtSliderValue
        )
      )
    },
    [pxPerKmAtSliderValue, scale.setSliderValue, scale.snapStops]
  )

  const onWheelZoomStep = useCallback(
    (direction: 1 | -1) => {
      scale.setSliderValue(
        stepSnapStopSliderValue(scale.sliderValue, scale.snapStops, direction)
      )
    },
    [scale.setSliderValue, scale.sliderValue, scale.snapStops]
  )

  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  }, [search])

  useEffect(() => {
    /* Router search is external input (link, back/forward). */
    /* eslint-disable react-hooks/set-state-in-effect -- sync URL → UI */
    setLabelMode(search.labels)
    setBodyDisplayFilter(sizeSearchToBodyDisplayFilter(search))
    setSelectedBodyId(search.body ?? null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [search])

  useEffect(() => {
    if (search.zoom == null) return
    scale.setSliderValue(
      pxPerKmToSliderForCalibration({
        pxPerKm: search.zoom,
        isCalibrated: calibration.isCalibrated,
        pxPerMm: calibration.pxPerMm,
      })
    )
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- omit `scale`; identity churn would re-run every paint */
  }, [
    search.zoom,
    calibration.isCalibrated,
    calibration.pxPerMm,
    scale.setSliderValue,
  ])

  useEffect(() => {
    const partial = serializeSizePageSearch({
      selectedBodyId,
      labelMode,
      bodyDisplayFilter,
      debouncedPxPerKm: scale.debouncedPxPerKm,
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
    labelMode,
    navigate,
    scale.debouncedPxPerKm,
    selectedBodyId,
  ])

  const cycleLabelMode = useCallback(() => {
    setLabelMode((m) => (m === "on" ? "auto" : m === "auto" ? "off" : "on"))
  }, [])

  const selectBodyFromBodyTypesList = useCallback((bodyId: string) => {
    setSelectedBodyId(bodyId)
    setListSelectionAttentionKey((k) => k + 1)
  }, [])

  const onListSelectionAttentionTarget = useCallback(
    (p: { x: number; y: number; burstKey: number }) => {
      setSelectionAttentionOverlay({
        target: { x: p.x, y: p.y },
        playId: p.burstKey,
      })
    },
    []
  )

  const clearSelectionAttentionOverlay = useCallback(() => {
    setSelectionAttentionOverlay(null)
  }, [])

  const selectedBodyLabel = findSizeRowNameById(model, selectedBodyId)

  useEffect(() => {
    if (
      !selectedBodyId ||
      isSizeBodyIdVisibleUnderFilter(
        model,
        bodyDisplayFilter,
        selectedBodyId,
        scale.debouncedPxPerKm
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
  }, [model, bodyDisplayFilter, selectedBodyId, scale.debouncedPxPerKm])

  useEffect(() => {
    if (measureUnitCanvasId != null) return
    if (!selectedBodyId) return
    if (
      !isSizeBodyIdVisibleUnderFilter(
        model,
        bodyDisplayFilter,
        selectedBodyId,
        scale.debouncedPxPerKm
      )
    ) {
      return
    }
    let active = true
    queueMicrotask(() => {
      if (active) setMeasureUnitCanvasId(selectedBodyId)
    })
    return () => {
      active = false
    }
  }, [
    measureUnitCanvasId,
    selectedBodyId,
    model,
    bodyDisplayFilter,
    scale.debouncedPxPerKm,
  ])

  useEffect(() => {
    if (!measureUnitCanvasId) return
    if (
      isSizeBodyIdVisibleUnderFilter(
        model,
        bodyDisplayFilter,
        measureUnitCanvasId,
        scale.debouncedPxPerKm
      )
    ) {
      return
    }
    let active = true
    queueMicrotask(() => {
      if (!active) return
      setMeasureUnitCanvasId(null)
      setMeasureArmed(false)
      setBodyMeasureOverlay(null)
    })
    return () => {
      active = false
    }
  }, [
    model,
    bodyDisplayFilter,
    measureUnitCanvasId,
    scale.debouncedPxPerKm,
  ])

  const onMeasurePick = useCallback(
    (hit: MeasureTargetHitBody | null) => {
      setMeasureArmed(false)
      if (!hit || measureSubjectKind !== "body") return
      if (!measureUnitCanvasId) return
      const bodies = collectSizeCanvasBodies(model)
      const unit = bodies.find((b) => b.canvasId === measureUnitCanvasId)
      const target = bodies.find((b) => b.canvasId === hit.canvasId)
      if (!unit || !target) return
      const uk = unit.row.diameterKm
      const tk = target.row.diameterKm
      if (tk < uk) {
        const now = performance.now()
        setBodyMeasureOverlay({
          kind: "reject",
          targetCanvasId: hit.canvasId,
          shakeEndMs: now + 520,
          xEndMs: now + 2000,
        })
        return
      }
      setBodyMeasureOverlay({
        kind: "success",
        targetCanvasId: hit.canvasId,
        unitCanvasId: measureUnitCanvasId,
        ratio: bodyDiameterRatio(tk, uk),
      })
    },
    [measureSubjectKind, measureUnitCanvasId, model]
  )

  useEffect(() => {
    if (bodyMeasureOverlay?.kind !== "reject") return
    const now = performance.now()
    const ms = Math.max(0, bodyMeasureOverlay.xEndMs - now)
    const id = window.setTimeout(() => {
      setBodyMeasureOverlay((prev) => (prev?.kind === "reject" ? null : prev))
    }, ms + 10)
    return () => window.clearTimeout(id)
  }, [bodyMeasureOverlay])

  // const clearBodyMeasureOverlay = useCallback(() => {
  //   setBodyMeasureOverlay(null)
  // }, [])

  return (
    <div className="relative isolate min-h-[calc(100svh-var(--app-header-h))] w-full">
      <SizePageEducationNoticesSidebarContent />
      <SizeComparisonCanvas
        model={model}
        labelMode={labelMode}
        selectedBodyId={selectedBodyId}
        onBodySelect={setSelectedBodyId}
        bodyDisplayFilter={bodyDisplayFilter}
        pxPerKm={scale.debouncedPxPerKm}
        listSelectionAttentionKey={listSelectionAttentionKey}
        onListSelectionAttentionTarget={onListSelectionAttentionTarget}
        measureArmed={measureArmed}
        measureUnitCanvasId={measureUnitCanvasId}
        bodyMeasureOverlay={bodyMeasureOverlay}
        onMeasurePick={onMeasurePick}
        onPinchZoomStart={onPinchZoomStart}
        onPinchZoomTo={onPinchZoomTo}
        onWheelZoomStep={onWheelZoomStep}
      />
      <ScaleControlSidebarPortal
        cycleButtonLabel={scale.cycleButtonLabel}
        sliderValue={scale.sliderValue}
        readout={scale.readout}
        isPending={scale.isPending}
        setSliderValue={scale.setSliderValue}
        cycleMode={scale.cycleMode}
        snapStops={scale.snapStops}
        calibration={calibration}
        calibrationDialogOpen={calibrationDialogOpen}
        onCalibrationDialogOpenChange={setCalibrationDialogOpen}
      />
      <SizePageBodyTypesSidebarPortal
        model={model}
        bodyDisplayFilter={bodyDisplayFilter}
        setBodyDisplayFilter={setBodyDisplayFilter}
        pxPerKm={scale.debouncedPxPerKm}
        selectedBodyId={selectedBodyId}
        onSelectBody={selectBodyFromBodyTypesList}
      />
      {selectionAttentionOverlay ? (
        <SizeSelectionAttentionOverlay
          target={selectionAttentionOverlay.target}
          playId={selectionAttentionOverlay.playId}
          onDone={clearSelectionAttentionOverlay}
        />
      ) : null}
      <SizePageLabelsSidebarPortal
        labelMode={labelMode}
        onCycleLabelMode={cycleLabelMode}
        selectedBodyLabel={selectedBodyLabel}
      />
      {/*
        Measure sidebar section scaffold (needs refinement before shipping).

        <SizePageMeasureSidebarPortal
          model={model}
          bodyDisplayFilter={bodyDisplayFilter}
          pxPerKm={scale.debouncedPxPerKm}
          selectedBodyId={selectedBodyId}
          unitCanvasId={measureUnitCanvasId}
          onUnitCanvasIdChange={setMeasureUnitCanvasId}
          armed={measureArmed}
          onArmedChange={setMeasureArmed}
          overlay={bodyMeasureOverlay}
          onClearOverlay={clearBodyMeasureOverlay}
        />
      */}
      <SizePageLeftSidebarPortal
        model={model}
        selectedBodyId={selectedBodyId}
        pxPerKm={scale.pxPerKm}
        pxPerMm={calibration.pxPerMm}
        isCalibrated={calibration.isCalibrated}
        onOpenCalibration={() => setCalibrationDialogOpen(true)}
      />
    </div>
  )
}
