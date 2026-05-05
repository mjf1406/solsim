import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react"
import { createPortal } from "react-dom"

import { BodyTypeDisplayCollapsible } from "@/components/solar-system/body-type-display-collapsible"
import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  BODY_TYPE_PRESET_BUTTON_WIDTH_REF,
  cycleBodyTypePreset,
  presetCycleButtonLabel,
  SIZE_BODY_KIND_ORDER,
  statsByKindForModel,
  type KindRowVisibility,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { kindLabel, type SizeBodyKind, type SizePageModel } from "../-data"

type SizePageBodyTypesSidebarPortalProps = {
  model: SizePageModel
  bodyDisplayFilter: SizeBodyDisplayFilter
  setBodyDisplayFilter: Dispatch<SetStateAction<SizeBodyDisplayFilter>>
}

export function SizePageBodyTypesSidebarPortal({
  model,
  bodyDisplayFilter,
  setBodyDisplayFilter,
}: SizePageBodyTypesSidebarPortalProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <SizeBodyTypesCollapsibleSection
      model={model}
      bodyDisplayFilter={bodyDisplayFilter}
      setBodyDisplayFilter={setBodyDisplayFilter}
    />,
    rightSidebarContentMount
  )
}

function SizeBodyTypesCollapsibleSection({
  model,
  bodyDisplayFilter,
  setBodyDisplayFilter,
}: SizePageBodyTypesSidebarPortalProps) {
  const stats = useMemo(() => statsByKindForModel(model, 1), [model])

  const setKindVisibility = useCallback(
    (kind: SizeBodyKind, v: KindRowVisibility) => {
      setBodyDisplayFilter((prev) => ({
        ...prev,
        kindVisibility: { ...prev.kindVisibility, [kind]: v },
      }))
    },
    [setBodyDisplayFilter]
  )

  const rows = useMemo(
    () =>
      SIZE_BODY_KIND_ORDER.map((kind) => ({
        kind,
        label: kindLabel(kind),
        total: stats[kind].total,
        renderable: stats[kind].renderable,
        visibility: bodyDisplayFilter.kindVisibility[kind],
        onSetVisibility: (v: KindRowVisibility) => setKindVisibility(kind, v),
      })),
    [bodyDisplayFilter.kindVisibility, stats, setKindVisibility]
  )

  const onCycleMode = useCallback(() => {
    setBodyDisplayFilter((prev) => cycleBodyTypePreset(prev))
  }, [setBodyDisplayFilter])

  return (
    <div className="mb-2">
      <BodyTypeDisplayCollapsible
        title="Body types"
        modeButtonWidthRef={BODY_TYPE_PRESET_BUTTON_WIDTH_REF}
        modeButtonLabel={presetCycleButtonLabel(bodyDisplayFilter)}
        onCycleMode={onCycleMode}
        cycleAriaLabel="Cycle body preset: Planets, Planets and moons, or Auto. Custom resets to Planets."
        rows={rows}
        expandedHelp={
          <div className="space-y-2 text-xs leading-snug text-sidebar-foreground/80">
            <p>
              <span className="font-medium text-sidebar-foreground">Auto</span>{" "}
              mode turns all the below body types on, showing all bodies that
              are at least 1 pixel in diameter.
            </p>
            <p>
              <span className="font-medium text-sidebar-foreground">
                Planets
              </span>{" "}
              mode shows the Sun and the eight planets.
            </p>
            <p>
              <span className="font-medium text-sidebar-foreground">
                Planets &amp; Moons
              </span>{" "}
              mode shows the Sun, the eight planets, and the largest moons of
              the eight planets if the moon is at least 1 pixel in diameter.
            </p>
            <p>
              <span className="font-medium text-sidebar-foreground">
                Visible / Hidden:
              </span>{" "}
              <span className="text-sidebar-foreground italic">Visible</span>{" "}
              means the body will be shown if it is at least 1 pixel in
              diameter.{" "}
              <span className="text-sidebar-foreground italic">Hidden</span>{" "}
              means it will never be shown.
            </p>
          </div>
        }
      />
    </div>
  )
}
