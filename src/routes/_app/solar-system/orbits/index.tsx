import { createPortal } from "react-dom"
import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"

import { OrbitsScaleSidebarsPlaceholder } from "./-components/orbits-scale-sidebars-placeholder"
import { OrbitsSelectedBodySidebarContent } from "./-components/orbits-selected-body-sidebar-panel"

export const Route = createFileRoute("/_app/solar-system/orbits/")({
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

function OrbitsPageLeftSidebarPortal() {
  const { leftSidebarContentMount } = useAppHeaderSlots()
  if (!leftSidebarContentMount) return null
  return createPortal(
    <OrbitsSelectedBodySidebarContent />,
    leftSidebarContentMount
  )
}

function SolarSystemOrbitsPage() {
  return (
    <div className="relative isolate min-h-[calc(100svh-var(--app-header-h))] w-full">
      <div className="p-6">
        <h1 className="font-heading text-2xl">Solar System — Orbits</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </div>
      <OrbitsPageLeftSidebarPortal />
      <OrbitsScaleSidebarsPlaceholder />
    </div>
  )
}
