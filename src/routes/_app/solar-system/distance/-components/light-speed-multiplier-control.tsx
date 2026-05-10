import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  formatDistance,
  type DistanceUnit,
  type DistanceUnitOrAll,
} from "@/lib/solar-system/distance/distance-units"
import {
  isLightSpeedMultiplier,
  LIGHT_SPEED_MULTIPLIERS,
  lightSpeedKmPerSecond,
  type LightSpeedMultiplier,
} from "@/lib/solar-system/distance/light-speed"

export function LightSpeedMultiplierControl({
  multiplier,
  onMultiplierChange,
  distanceUnit,
  pxPerKmDistance,
}: {
  multiplier: LightSpeedMultiplier
  onMultiplierChange: (m: LightSpeedMultiplier) => void
  distanceUnit: DistanceUnitOrAll
  pxPerKmDistance: number
}) {
  const unitForSpeed: DistanceUnit =
    distanceUnit === "all" ? "ltime" : distanceUnit
  const kmPerSec = lightSpeedKmPerSecond(multiplier)
  const speedLabel =
    unitForSpeed === "ltime"
      ? `${formatDistance(kmPerSec, "ltime")} / s`
      : `${formatDistance(kmPerSec, unitForSpeed, pxPerKmDistance)} / s`

  return (
    <div className="flex min-w-0 shrink-0 flex-row items-center gap-2">
      <Select
        value={String(multiplier)}
        onValueChange={(v) => {
          const n = Number(v)
          if (isLightSpeedMultiplier(n)) onMultiplierChange(n)
        }}
      >
        <SelectTrigger
          size="sm"
          className="h-7 w-[4.25rem] shrink-0 rounded-full px-2 text-xs"
          aria-label="Light speed multiplier"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {LIGHT_SPEED_MULTIPLIERS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m}×
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="whitespace-nowrap text-[11px] leading-none text-muted-foreground">
        {speedLabel}
      </span>
    </div>
  )
}
