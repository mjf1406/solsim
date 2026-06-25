import { MonitorSmartphone, Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { DisplayCalibration } from "@/hooks/use-display-calibration"
import {
  PAPER_FORMATS,
  SCALE_PRINT_PAPER_IDS,
  sunMmForPaperId,
  type PaperOrientation,
  type ScalePrintPaperId,
} from "@/lib/solar-system/scale/paper-formats"

import type { PrintLayoutResult } from "../-print-types"
import { formatLayoutSummary } from "../-print-layout"
import type {
  PlanetLayoutMode,
  PrintArtMode,
  PrintConfig,
  SunPrintMode,
} from "../-print-types"
import {
  DEFAULT_SUN_MM,
  REAL_WORLD_SUN_PRESETS,
  sunMmToUnitValue,
  type SunSizeUnit,
  unitValueToSunMm,
} from "../-scale-math"
import { UnrenderedBodiesList } from "./unrendered-bodies-list"
import type { UnrenderedBodyEntry } from "../-data"

export type PrintControlsProps = {
  config: PrintConfig
  layout: PrintLayoutResult
  sunMm: number
  unit: SunSizeUnit
  calibration: DisplayCalibration
  unrenderedBodies: UnrenderedBodyEntry[]
  onConfigChange: (patch: Partial<PrintConfig>) => void
  onSunMmChange: (sunMm: number) => void
  onUnitChange: (unit: SunSizeUnit) => void
  onObjectPresetChange: (mode: string) => void
  onFitSunToShortEdge: () => void
  onOpenCalibration: () => void
  onPrint: () => void
}

export function PrintControls({
  config,
  layout,
  sunMm,
  unit,
  calibration,
  unrenderedBodies,
  onConfigChange,
  onSunMmChange,
  onUnitChange,
  onObjectPresetChange,
  onFitSunToShortEdge,
  onOpenCalibration,
  onPrint,
}: PrintControlsProps) {
  const unitValue = sunMmToUnitValue(sunMm, unit)
  const displayValue =
    Number.isFinite(unitValue) && unitValue > 0
      ? String(Math.round(unitValue * 1000) / 1000)
      : ""

  return (
    <section
      className="space-y-4 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm"
      aria-labelledby="print-controls-heading"
    >
      <div className="space-y-1">
        <h2 id="print-controls-heading" className="font-heading text-lg font-semibold">
          Print layout
        </h2>
        <p className="text-sm text-muted-foreground">
          Set the Sun&apos;s real-world size and paper format. Preview sheets below,
          then print at <strong>100% scale</strong> (no &quot;fit to page&quot;).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="sun-size-value">Sun diameter</Label>
          <div className="flex gap-2">
            <Input
              id="sun-size-value"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder="4"
              value={displayValue}
              onChange={(e) => {
                const n = Number.parseFloat(e.target.value)
                const mm = unitValueToSunMm(n, unit)
                if (Number.isFinite(mm) && mm > 0) onSunMmChange(mm)
              }}
              className="min-w-0 flex-1"
            />
            <Select
              value={unit}
              onValueChange={(v) => onUnitChange(v as SunSizeUnit)}
            >
              <SelectTrigger className="w-[5.5rem] shrink-0" aria-label="Unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">in</SelectItem>
                <SelectItem value="cm">cm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select onValueChange={onObjectPresetChange}>
              <SelectTrigger className="w-full" aria-label="Real-world object">
                <SelectValue placeholder="Real-world object…" />
              </SelectTrigger>
              <SelectContent>
                {REAL_WORLD_SUN_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFitSunToShortEdge}
            >
              Fit Sun to short edge
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paper-format">Paper</Label>
          <Select
            value={config.paperId}
            onValueChange={(v) =>
              onConfigChange({ paperId: v as ScalePrintPaperId })
            }
          >
            <SelectTrigger id="paper-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCALE_PRINT_PAPER_IDS.map((id) => (
                <SelectItem key={id} value={id}>
                  {PAPER_FORMATS[id].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={config.orientation}
            onValueChange={(v) =>
              onConfigChange({ orientation: v as PaperOrientation })
            }
          >
            <SelectTrigger className="w-full" aria-label="Orientation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="art-mode">Art style</Label>
          <Select
            value={config.artMode}
            onValueChange={(v) =>
              onConfigChange({ artMode: v as PrintArtMode })
            }
          >
            <SelectTrigger id="art-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outline">Outline (for coloring)</SelectItem>
              <SelectItem value="full">Full art</SelectItem>
            </SelectContent>
          </Select>

          <Label htmlFor="planet-layout">Planet layout</Label>
          <Select
            value={config.planetLayout}
            onValueChange={(v) =>
              onConfigChange({ planetLayout: v as PlanetLayoutMode })
            }
          >
            <SelectTrigger id="planet-layout" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pack">Pack on pages</SelectItem>
              <SelectItem value="one_per_page">One per page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sun-mode">Sun on paper</Label>
          <Select
            value={config.sunMode}
            onValueChange={(v) =>
              onConfigChange({ sunMode: v as SunPrintMode })
            }
          >
            <SelectTrigger id="sun-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit_if_possible">
                Fit on one page if possible
              </SelectItem>
              <SelectItem value="tile">Tile across pages</SelectItem>
              <SelectItem value="limb_edge">Limb edge only</SelectItem>
            </SelectContent>
          </Select>

          <Label htmlFor="tile-overlap">Tile overlap (mm)</Label>
          <Input
            id="tile-overlap"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={config.tileOverlapMm}
            onChange={(e) => {
              const n = Number.parseFloat(e.target.value)
              if (!Number.isFinite(n) || n < 0) return
              const format = PAPER_FORMATS[config.paperId]
              const sheetW =
                config.orientation === "portrait"
                  ? format.widthMm
                  : format.heightMm
              const sheetH =
                config.orientation === "portrait"
                  ? format.heightMm
                  : format.widthMm
              const printableW = sheetW - 2 * config.marginMm
              const printableH = sheetH - 2 * config.marginMm
              const maxOverlap = Math.min(printableW, printableH) - 1
              onConfigChange({
                tileOverlapMm: Math.min(n, Math.max(0, maxOverlap)),
              })
            }}
          />
          <p className="text-xs text-muted-foreground">
            Extra mm repeated on adjacent tiles for gluing.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.includeMoons}
              onCheckedChange={(checked) =>
                onConfigChange({ includeMoons: checked })
              }
            />
            Include moons
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.includeBelts}
              onCheckedChange={(checked) =>
                onConfigChange({ includeBelts: checked })
              }
            />
            Include belt bodies
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={config.includeAppendix}
              onCheckedChange={(checked) =>
                onConfigChange({ includeAppendix: checked })
              }
            />
            Include appendix
          </label>
          <p className="text-xs text-muted-foreground">
            Print list of bodies too small to draw.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <Badge variant="secondary">{formatLayoutSummary(layout.summary)}</Badge>
        {layout.sunTileWarning ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {layout.sunTileWarning}
          </p>
        ) : null}
        <div className="flex flex-1 flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onOpenCalibration}
          >
            <MonitorSmartphone className="size-4" aria-hidden />
            Calibrate display
          </Button>
          <Button type="button" size="sm" className="gap-2" onClick={onPrint}>
            <Printer className="size-4" aria-hidden />
            Print
          </Button>
        </div>
      </div>

      {calibration.isCalibrated ? (
        <p className="text-xs text-muted-foreground">
          Display calibrated — preview approximates printed sizes on your screen.
        </p>
      ) : null}

      <UnrenderedBodiesList entries={unrenderedBodies} />
    </section>
  )
}

export function defaultPrintConfig(): PrintConfig {
  return {
    paperId: "a4",
    orientation: "portrait",
    sunMm: DEFAULT_SUN_MM,
    artMode: "outline",
    planetLayout: "pack",
    sunMode: "fit_if_possible",
    includeMoons: false,
    includeBelts: false,
    includeAppendix: false,
    marginMm: 10,
    tileOverlapMm: 20,
  }
}

export function fitSunToShortEdgeMm(
  paperId: ScalePrintPaperId,
  orientation: PaperOrientation
): number {
  return sunMmForPaperId(paperId, orientation, "short")
}
