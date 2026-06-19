import type { ReactNode } from "react"

import { useSidebarHorizontalInsetPx } from "@/hooks/use-sidebar-horizontal-inset-px"
import { cn } from "@/lib/utils"

/**
 * Fixed bottom HUD stack in the canvas gutter between open sidebars.
 * Children stack bottom-to-top in document order (readout above symbol bar).
 */
export function CanvasBottomHudStack({
  children,
  className,
  "aria-label": ariaLabel,
}: {
  children: ReactNode
  className?: string
  "aria-label"?: string
}) {
  const insets = useSidebarHorizontalInsetPx()

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-(--canvas-symbol-bar-bottom) z-10 flex flex-col items-center gap-2 px-2",
        className
      )}
      style={{ left: insets.left, right: insets.right }}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

/** Shared chrome for symbol-bar icon rows. */
export function BodySymbolBarTrack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-border/60 bg-background/85 px-1.5 py-1 shadow-lg backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  )
}
