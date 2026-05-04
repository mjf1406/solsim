import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/solar-system/distance/")({
  component: SolarSystemDistancePage,
})

function SolarSystemDistancePage() {
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl">Solar System — Distance</h1>
      <p className="text-muted-foreground mt-2 text-sm">Placeholder content.</p>
    </div>
  )
}
