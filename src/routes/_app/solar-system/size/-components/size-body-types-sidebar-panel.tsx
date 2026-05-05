import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react"
import { createPortal } from "react-dom"

import { BodyTypeDisplayCollapsible } from "@/components/solar-system/body-type-display-collapsible"
import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  BODY_TYPE_PRESET_BUTTON_WIDTH_REF,
  bodyCanvasInclusion,
  cycleBodyTypePreset,
  presetCycleButtonLabel,
  SIZE_BODY_KIND_ORDER,
  statsByKindForModel,
  type KindRowVisibility,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { cn } from "@/lib/utils"
import {
  collectSizeCanvasBodies,
  kindLabel,
  type SizeBodyKind,
  type SizePageModel,
} from "../-data"

type SizePageBodyTypesSidebarPortalProps = {
  model: SizePageModel
  bodyDisplayFilter: SizeBodyDisplayFilter
  setBodyDisplayFilter: Dispatch<SetStateAction<SizeBodyDisplayFilter>>
  pxPerKm: number
  selectedBodyId: string | null
  onSelectBody: (bodyId: string) => void
}

export function SizePageBodyTypesSidebarPortal({
  model,
  bodyDisplayFilter,
  setBodyDisplayFilter,
  pxPerKm,
  selectedBodyId,
  onSelectBody,
}: SizePageBodyTypesSidebarPortalProps) {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <SizeBodyTypesCollapsibleSection
      model={model}
      bodyDisplayFilter={bodyDisplayFilter}
      setBodyDisplayFilter={setBodyDisplayFilter}
      pxPerKm={pxPerKm}
      selectedBodyId={selectedBodyId}
      onSelectBody={onSelectBody}
    />,
    rightSidebarContentMount
  )
}

function SizeBodyTypesCollapsibleSection({
  model,
  bodyDisplayFilter,
  setBodyDisplayFilter,
  pxPerKm,
  selectedBodyId,
  onSelectBody,
}: SizePageBodyTypesSidebarPortalProps) {
  const setKindVisibility = useCallback(
    (kind: SizeBodyKind, v: KindRowVisibility) => {
      setBodyDisplayFilter((prev) => ({
        ...prev,
        kindVisibility: { ...prev.kindVisibility, [kind]: v },
      }))
    },
    [setBodyDisplayFilter]
  )

  const rows = useMemo(() => {
    const stats = statsByKindForModel(model, 1, pxPerKm)
    const allBodies = collectSizeCanvasBodies(model)
    const byKind = new Map<SizeBodyKind, typeof allBodies>()
    for (const k of SIZE_BODY_KIND_ORDER) {
      byKind.set(k, [])
    }
    for (const b of allBodies) {
      byKind.get(b.kind)!.push(b)
    }
    for (const k of SIZE_BODY_KIND_ORDER) {
      byKind.get(k)!.sort((a, b) =>
        a.row.name.localeCompare(b.row.name, undefined, { sensitivity: "base" })
      )
    }

    return SIZE_BODY_KIND_ORDER.map((kind) => {
      const bodies = byKind.get(kind) ?? []
      const detailContent =
        bodies.length === 0 ? (
          <p className="text-[11px] text-sidebar-foreground/60">No bodies.</p>
        ) : (
          <ul className="space-y-1 border-l border-sidebar-border/60 pl-2">
            {bodies.map((b) => {
              const { onCanvas, reasonLabel } = bodyCanvasInclusion(
                b,
                bodyDisplayFilter,
                allBodies,
                pxPerKm,
                1
              )
              const isSelected = selectedBodyId === b.canvasId
              return (
                <li key={b.canvasId} className="leading-snug">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start justify-between gap-2 rounded-md px-1 py-0.5 text-left text-[11px] ring-sidebar-ring transition-colors",
                      "hover:bg-sidebar-accent/55 focus-visible:ring-2 focus-visible:outline-none",
                      isSelected &&
                        "bg-sidebar-accent/70 text-sidebar-foreground ring-1 ring-sky-400/60"
                    )}
                    aria-label={`Select ${b.row.name} on canvas`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectBody(b.canvasId)}
                  >
                    <span className="min-w-0 truncate text-sidebar-foreground/95">
                      {b.row.name}
                    </span>
                    <span
                      className={cn(
                        "max-w-[min(12rem,48%)] shrink-0 text-right leading-snug",
                        onCanvas
                          ? "text-sidebar-foreground"
                          : "text-sidebar-foreground/60"
                      )}
                    >
                      {reasonLabel}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )

      return {
        kind,
        label: kindLabel(kind),
        total: stats[kind].total,
        renderable: stats[kind].renderable,
        visibility: bodyDisplayFilter.kindVisibility[kind],
        onSetVisibility: (v: KindRowVisibility) => setKindVisibility(kind, v),
        detailContent,
      }
    })
  }, [
    model,
    bodyDisplayFilter,
    pxPerKm,
    setKindVisibility,
    selectedBodyId,
    onSelectBody,
  ])

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
            <p>
              Click a body type row (name, counts, or chevron) to expand and see
              every body and whether it would appear on the canvas at the current
              scale. Click a body name to select it on the canvas.
            </p>
          </div>
        }
      />
    </div>
  )
}
