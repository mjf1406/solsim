import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/solar-system/size")({
  component: SolarSystemSizePage,
})

function SolarSystemSizePage() {
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl">Solar System — Size</h1>
      <p className="text-muted-foreground mt-2 text-sm">Placeholder content.</p>
    </div>
  )
}
