import {
  createFileRoute,
  type ErrorComponentProps,
  useLoaderData,
} from "@tanstack/react-router"

import { buildSizePageModel, fetchSolarSystemJson } from "./-data"
// import { SolarSystemSizeDataTables } from "./-components/size-tables"

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
  // const { model } = useLoaderData({ from: "/_app/solar-system/size/" })

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      {/* <SolarSystemSizeDataTables model={model} /> */}
    </div>
  )
}
