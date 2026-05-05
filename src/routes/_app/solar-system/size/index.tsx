import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  createFileRoute,
  type ErrorComponentProps,
  useLoaderData,
} from "@tanstack/react-router"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { ScaleControlSidebarPortal } from "@/components/scale/scale-control-sidebar-panel"
import { useCanvasScale } from "@/hooks/use-canvas-scale"
import { useDisplayCalibration } from "@/hooks/use-display-calibration"

import {
  applyBodyTypePreset,
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"

import {
  buildSizePageModel,
  fetchSciFiSizeCatalog,
  fetchSolarSystemJson,
  findSizeRowNameById,
  type SizeCanvasLabelMode,
  type SizePageModel,
} from "./-data"
import { SizePageBodyTypesSidebarPortal } from "./-components/size-body-types-sidebar-panel"
import { SizeComparisonCanvas } from "./-components/size-canvas"
import { SizeSelectionAttentionOverlay } from "./-components/size-selection-attention-overlay"
import { SizePageEducationNoticesSidebarContent } from "./-components/size-education-notices-sidebar-panel"
import { SizePageLabelsSidebarPortal } from "./-components/size-labels-sidebar-panel"
import { SizeSelectedBodySidebarContent } from "./-components/size-selected-body-sidebar-panel"
// import { SolarSystemSizeDataTables } from "./-components/size-tables"

export const Route = createFileRoute("/_app/solar-system/size/")({
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
    <>
      <SizePageEducationNoticesSidebarContent />
      <SizeSelectedBodySidebarContent
        model={model}
        selectedBodyId={selectedBodyId}
        pxPerKm={pxPerKm}
        pxPerMm={pxPerMm}
        isCalibrated={isCalibrated}
        onOpenCalibration={onOpenCalibration}
      />
    </>,
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
  const { model } = useLoaderData({ from: "/_app/solar-system/size/" })
  const [labelMode, setLabelMode] = useState<SizeCanvasLabelMode>("on")
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null)
  const [bodyDisplayFilter, setBodyDisplayFilter] =
    useState<SizeBodyDisplayFilter>(() => applyBodyTypePreset("planets"))
  const [listSelectionAttentionKey, setListSelectionAttentionKey] =
    useState(0)
  const [selectionAttentionOverlay, setSelectionAttentionOverlay] =
    useState<{
      target: { x: number; y: number }
      playId: number
    } | null>(null)

  const calibration = useDisplayCalibration()
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false)
  const scale = useCanvasScale({
    pxPerMm: calibration.pxPerMm,
    isCalibrated: calibration.isCalibrated,
  })

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

  return (
    <div className="relative isolate min-h-[calc(100svh-var(--app-header-h))] w-full">
      <SizeComparisonCanvas
        model={model}
        labelMode={labelMode}
        selectedBodyId={selectedBodyId}
        onBodySelect={setSelectedBodyId}
        bodyDisplayFilter={bodyDisplayFilter}
        pxPerKm={scale.debouncedPxPerKm}
        listSelectionAttentionKey={listSelectionAttentionKey}
        onListSelectionAttentionTarget={onListSelectionAttentionTarget}
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
      <SizePageLeftSidebarPortal
        model={model}
        selectedBodyId={selectedBodyId}
        pxPerKm={scale.pxPerKm}
        pxPerMm={calibration.pxPerMm}
        isCalibrated={calibration.isCalibrated}
        onOpenCalibration={() => setCalibrationDialogOpen(true)}
      />
      {/* <SolarSystemSizeDataTables model={model} /> */}
    </div>
  )
}
