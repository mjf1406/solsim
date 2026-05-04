import {
  createFileRoute,
  type ErrorComponentProps,
  useLoaderData,
} from "@tanstack/react-router"

import { buildSizePageModel, fetchSolarSystemJson } from "./-data"
import { SolarSystemSizeDataTables } from "./-components/size-tables"

export const Route = createFileRoute("/_app/solar-system/size/")({
  loader: async () => {
    const json = await fetchSolarSystemJson()
    return { model: buildSizePageModel(json) }
  },
  errorComponent: SizeRouteError,
  component: SolarSystemSizePage,
})

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

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl">Solar System — Size</h1>
        <p className="text-sm text-muted-foreground">{model.physicalNote}</p>
        <p className="text-sm text-muted-foreground">
          Diameters use <code className="text-foreground">diameter_km</code>{" "}
          from the snapshot when present; otherwise{" "}
          <code className="text-foreground">2 × mean_radius_km</code>. Dwarf
          planets: five largest in this dataset by that diameter. Moons: five
          largest per planet or dwarf planet.
        </p>
      </header>

      <SolarSystemSizeDataTables model={model} />
    </div>
  )
}
