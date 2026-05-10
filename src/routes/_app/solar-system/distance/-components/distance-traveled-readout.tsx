import {
  DISTANCE_UNIT_LABELS,
  DISTANCE_UNITS,
  formatDistance,
  type DistanceUnit,
  type DistanceUnitOrAll,
} from "@/lib/solar-system/distance/distance-units"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const SELECT_ALL = "all"

export function DistanceTraveledReadout({
  km,
  pxPerKmDistance,
  unit,
  onUnitChange,
}: {
  km: number | null
  /** Distance scale: CSS pixels per km (same as DistanceCanvas `pxPerKmDistance`). */
  pxPerKmDistance: number
  unit: DistanceUnitOrAll
  onUnitChange: (unit: DistanceUnitOrAll) => void
}) {
  if (km == null || km < 0) return null

  const selectValue = unit === "all" ? SELECT_ALL : unit
  const isAll = unit === "all"

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-2 pb-1"
      style={{
        bottom:
          "calc(env(safe-area-inset-bottom, 0px) + 0.75rem + 3rem)",
      }}
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto border border-border/60 bg-background/90 shadow-lg backdrop-blur-md",
          isAll
            ? "flex w-full max-w-lg flex-col gap-2 rounded-xl px-3 py-2 sm:max-w-xl"
            : "flex max-w-[min(100%,36rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-full px-3 py-1.5"
        )}
      >
        {isAll ? (
          <>
            <p className="text-[11px] leading-tight text-foreground">
              <span className="font-semibold">From Sun</span>
              <span className="font-normal text-muted-foreground">
                {" "}
                · viewport center
              </span>
            </p>

            <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-0.5 border-t border-border/50 pt-2 sm:grid-cols-2">
              {DISTANCE_UNITS.map((u) => (
                <li
                  key={u}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2 text-[11px] leading-tight"
                >
                  <span className="min-w-0 text-end font-jetbrains-mono text-[12px] tabular-nums tracking-tight text-foreground">
                    {formatDistance(km, u, pxPerKmDistance, {
                      omitUnitSuffix: true,
                    })}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {DISTANCE_UNIT_LABELS[u]}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
              <Select
                value={selectValue}
                onValueChange={(v) => {
                  if (v === SELECT_ALL) {
                    onUnitChange("all")
                    return
                  }
                  if (DISTANCE_UNITS.includes(v as DistanceUnit)) {
                    onUnitChange(v as DistanceUnit)
                  }
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 min-w-[6.5rem] shrink-0 rounded-full px-2.5 text-[11px]"
                >
                  <SelectValue aria-label="Distance unit" />
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                  {DISTANCE_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {DISTANCE_UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                  <SelectItem value={SELECT_ALL}>All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-muted-foreground">
              From Sun:
            </span>

            <div className="min-w-0 flex-1 text-xs text-foreground">
              <span className="font-jetbrains-mono tabular-nums">
                {formatDistance(km, unit, pxPerKmDistance)}
              </span>
            </div>

            <Select
              value={selectValue}
              onValueChange={(v) => {
                if (v === SELECT_ALL) {
                  onUnitChange("all")
                  return
                }
                if (DISTANCE_UNITS.includes(v as DistanceUnit)) {
                  onUnitChange(v as DistanceUnit)
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-7 shrink-0 rounded-full px-2 text-xs"
              >
                <SelectValue aria-label="Distance unit" />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                {DISTANCE_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {DISTANCE_UNIT_LABELS[u]}
                  </SelectItem>
                ))}
                <SelectItem value={SELECT_ALL}>All</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  )
}
