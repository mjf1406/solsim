import { createFileRoute } from "@tanstack/react-router"

import {
  buildSizePageModel,
  fetchSciFiSizeCatalog,
  fetchSolarSystemJson,
} from "../size/-data"
import { SolarSystemSizeDataTables } from "../size/-components/size-tables"

export const Route = createFileRoute("/_app/solar-system/data/")({
  loader: async () => {
    const [json, sciFiCatalog] = await Promise.all([
      fetchSolarSystemJson(),
      fetchSciFiSizeCatalog(),
    ])
    return { model: buildSizePageModel(json, sciFiCatalog) }
  },
  component: SolarSystemDataPage,
})

function SolarSystemDataPage() {
  const { model } = Route.useLoaderData()
  return (
    <div className="p-6">
      <SolarSystemSizeDataTables model={model} />
    </div>
  )
}
