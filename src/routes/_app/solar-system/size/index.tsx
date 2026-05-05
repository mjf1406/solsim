import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  createFileRoute,
  type ErrorComponentProps,
  useLoaderData,
} from "@tanstack/react-router"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"

import {
  applyBodyTypePreset,
  isSizeBodyIdVisibleUnderFilter,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"

import {
  buildSizePageModel,
  fetchSolarSystemJson,
  findSizeRowNameById,
  type SizeCanvasLabelMode,
  type SizePageModel,
} from "./-data"
import { SizePageBodyTypesSidebarPortal } from "./-components/size-body-types-sidebar-panel"
import { SizeComparisonCanvas } from "./-components/size-canvas"
import { SizePageEducationNoticesSidebarContent } from "./-components/size-education-notices-sidebar-panel"
import { SizePageLabelsSidebarPortal } from "./-components/size-labels-sidebar-panel"
import { SizeSelectedBodySidebarContent } from "./-components/size-selected-body-sidebar-panel"
// import { SolarSystemSizeDataTables } from "./-components/size-tables"

export const Route = createFileRoute("/_app/solar-system/size/")({
  loader: async () => {
    const json = await fetchSolarSystemJson()
    return { model: buildSizePageModel(json) }
  },
  errorComponent: SizeRouteError,
  component: SolarSystemSizePage,
})

function SizePageLeftSidebarPortal({
  model,
  selectedBodyId,
}: {
  model: SizePageModel
  selectedBodyId: string | null
}) {
  const { leftSidebarContentMount } = useAppHeaderSlots()
  if (!leftSidebarContentMount) return null
  return createPortal(
    <>
      <SizePageEducationNoticesSidebarContent />
      <SizeSelectedBodySidebarContent
        model={model}
        selectedBodyId={selectedBodyId}
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
    useState<SizeBodyDisplayFilter>(() => applyBodyTypePreset("auto"))

  const cycleLabelMode = useCallback(() => {
    setLabelMode((m) => (m === "on" ? "auto" : m === "auto" ? "off" : "on"))
  }, [])

  const selectedBodyLabel = findSizeRowNameById(model, selectedBodyId)

  useEffect(() => {
    if (
      !selectedBodyId ||
      isSizeBodyIdVisibleUnderFilter(model, bodyDisplayFilter, selectedBodyId)
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
  }, [model, bodyDisplayFilter, selectedBodyId])

  return (
    <div className="relative isolate min-h-[calc(100svh-var(--app-header-h))] w-full">
      <SizeComparisonCanvas
        model={model}
        labelMode={labelMode}
        selectedBodyId={selectedBodyId}
        onBodySelect={setSelectedBodyId}
        bodyDisplayFilter={bodyDisplayFilter}
      />
      <SizePageBodyTypesSidebarPortal
        model={model}
        bodyDisplayFilter={bodyDisplayFilter}
        setBodyDisplayFilter={setBodyDisplayFilter}
      />
      <SizePageLabelsSidebarPortal
        labelMode={labelMode}
        onCycleLabelMode={cycleLabelMode}
        selectedBodyLabel={selectedBodyLabel}
      />
      <SizePageLeftSidebarPortal
        model={model}
        selectedBodyId={selectedBodyId}
      />
      {/* <SolarSystemSizeDataTables model={model} /> */}
    </div>
  )
}
