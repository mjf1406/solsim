import { BodyDiameterStatsSection } from "@/components/solar-system/body-diameter-stats-section"

import {
  bodyDiameterPositionIntro,
  findSizeBodyDetail,
  kindLabel,
  type SizePageModel,
} from "../-data"

type SelectedBodySidebarProps = {
  model: SizePageModel
  selectedBodyId: string | null
  /** Live canvas scale (CSS pixels per real-world km). */
  pxPerKm: number
  /** Display calibration (CSS pixels per real-world mm); CSS-spec fallback when uncalibrated. */
  pxPerMm: number
  /** True when the user has saved a measured display calibration. */
  isCalibrated: boolean
  /** Opens the display calibration dialog (same as Scale panel). */
  onOpenCalibration: () => void
}

export function SizeSelectedBodySidebarContent({
  model,
  selectedBodyId,
  pxPerKm,
  pxPerMm,
  isCalibrated,
  onOpenCalibration,
}: SelectedBodySidebarProps) {
  const detail = findSizeBodyDetail(model, selectedBodyId, pxPerKm)

  if (!detail) {
    return (
      <p className="text-base leading-snug text-sidebar-foreground/70">
        Select a body to learn about it!
      </p>
    )
  }

  const positionIntro = bodyDiameterPositionIntro(model, detail)

  return (
    <BodyDiameterStatsSection
      detail={{
        name: detail.name,
        kind: detail.kind,
        kindLabel: kindLabel(detail.kind),
        diameterKm: detail.diameterKm,
        diameterPx: detail.diameterPx,
        parentPlanetName: detail.parentPlanetName,
        positionIntro,
      }}
      pxPerKm={pxPerKm}
      pxPerMm={pxPerMm}
      isCalibrated={isCalibrated}
      onOpenCalibration={onOpenCalibration}
      wrapStatsListInCollapsible
      statsListCollapsibleTitle="Diameter numbers"
    />
  )
}
