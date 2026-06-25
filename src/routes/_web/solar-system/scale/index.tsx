import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useMemo, useState } from "react"

import { DisplayCalibrationDialog } from "@/components/scale/display-calibration-dialog"
import { useDisplayCalibration } from "@/hooks/use-display-calibration"
import { PAPER_PRINT_MARGIN_MM } from "@/lib/solar-system/scale/paper-formats"

import { FooterSection } from "../../-home-components/footer"
import { buildScaleModel, fetchSolarSystemJson } from "./-data"
import type { UnrenderedBodyEntry } from "./-data"
import {
  defaultPrintConfig,
  fitSunToShortEdgeMm,
  PrintControls,
} from "./-components/print-controls"
import { PrintPreview, PrintRoot, triggerPrint } from "./-components/print-preview"
import { computePrintLayout } from "./-print-layout"
import type { PrintConfig } from "./-print-types"
import {
  DEFAULT_SUN_MM,
  sunDiameterMmForScaleMode,
  type SunSizeUnit,
} from "./-scale-math"
import "./-print.css"

export const Route = createFileRoute("/_web/solar-system/scale/")({
  loader: async () => {
    const json = await fetchSolarSystemJson()
    return { model: buildScaleModel(json) }
  },
  component: SolarSystemScalePage,
})

function omittedToUnrendered(
  omitted: ReturnType<typeof computePrintLayout>["omitted"]
): UnrenderedBodyEntry[] {
  return omitted.map((o) => ({
    body: o.body,
    reason: o.reason,
    scaledMm: o.scaledMm,
    context: o.context,
  }))
}

function SolarSystemScalePage() {
  const { model } = Route.useLoaderData()
  const calibration = useDisplayCalibration()
  const [calibrationDialogOpen, setCalibrationDialogOpen] = useState(false)

  const [sunMm, setSunMm] = useState(DEFAULT_SUN_MM)
  const [unit, setUnit] = useState<SunSizeUnit>("in")
  const [config, setConfig] = useState<PrintConfig>(defaultPrintConfig)

  const mergedConfig = useMemo(
    (): PrintConfig => ({
      ...config,
      sunMm,
      marginMm: PAPER_PRINT_MARGIN_MM,
    }),
    [config, sunMm]
  )

  const layout = useMemo(
    () => computePrintLayout(model, mergedConfig),
    [model, mergedConfig]
  )

  const unrenderedBodies = useMemo(
    () => omittedToUnrendered(layout.omitted),
    [layout.omitted]
  )

  const handleConfigChange = useCallback((patch: Partial<PrintConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleObjectPresetChange = useCallback(
    (mode: string) => {
      const mm = sunDiameterMmForScaleMode(
        mode as Parameters<typeof sunDiameterMmForScaleMode>[0],
        calibration.pxPerMm
      )
      if (Number.isFinite(mm) && mm > 0) setSunMm(mm)
    },
    [calibration.pxPerMm]
  )

  const handleFitSunToShortEdge = useCallback(() => {
    setSunMm(fitSunToShortEdgeMm(config.paperId, config.orientation))
  }, [config.paperId, config.orientation])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-stretch gap-8">
      <article className="w-full space-y-8 px-0 pt-2 pb-14">
        <header className="space-y-2">
          <p className="font-heading text-sm font-medium tracking-wide text-muted-foreground">
            Solar System
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Scale
          </h1>
          <p className="max-w-2xl leading-relaxed text-muted-foreground">
            Choose a real-world size for the Sun and print planets to scale on
            your chosen paper — outline spheres for coloring or full art to hang
            up.
          </p>
        </header>

        <PrintControls
          config={mergedConfig}
          layout={layout}
          sunMm={sunMm}
          unit={unit}
          calibration={calibration}
          unrenderedBodies={unrenderedBodies}
          onConfigChange={handleConfigChange}
          onSunMmChange={setSunMm}
          onUnitChange={setUnit}
          onObjectPresetChange={handleObjectPresetChange}
          onFitSunToShortEdge={handleFitSunToShortEdge}
          onOpenCalibration={() => setCalibrationDialogOpen(true)}
          onPrint={triggerPrint}
        />

        <PrintPreview layout={layout} config={mergedConfig} />
      </article>

      <FooterSection />

      <PrintRoot layout={layout} config={mergedConfig} />

      <DisplayCalibrationDialog
        open={calibrationDialogOpen}
        onOpenChange={setCalibrationDialogOpen}
        pxPerMm={calibration.pxPerMm}
        cardWidthPx={calibration.cardWidthPx}
        onApply={calibration.setCardWidthPx}
        onReset={calibration.reset}
      />
    </div>
  )
}
