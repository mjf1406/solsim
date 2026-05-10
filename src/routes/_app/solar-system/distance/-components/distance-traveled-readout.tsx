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
          "pointer-events-auto flex max-w-[min(100%,36rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border/60 bg-background/85 px-3 py-1.5 shadow-lg backdrop-blur-md"
        )}
      >
        {unit === "all" ? (
          <span className="sr-only">Distance from Sun at viewport center</span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            From Sun:
          </span>
        )}

        <div
          className={cn(
            "min-w-0 flex-1 text-xs text-foreground",
            unit === "all" && "w-full flex-initial"
          )}
        >
          {unit === "all" ? (
            <ul className="grid gap-0.5">
              {DISTANCE_UNITS.map((u) => (
                <li key={u}>
                  <span className="text-muted-foreground">
                    {DISTANCE_UNIT_LABELS[u]}:
                  </span>{" "}
                  <span className="font-jetbrains-mono tabular-nums">
                    {formatDistance(km, u, pxPerKmDistance)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="font-jetbrains-mono tabular-nums">
              {formatDistance(km, unit, pxPerKmDistance)}
            </span>
          )}
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
          <SelectTrigger size="sm" className="h-7 shrink-0 rounded-full px-2 text-xs">
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
    </div>
  )
}
