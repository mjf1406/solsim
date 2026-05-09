import { createPortal } from "react-dom"
import type { ReactNode } from "react"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { cn } from "@/lib/utils"

function PlaceholderShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "mb-2 rounded-xl border border-sidebar-border bg-sidebar/40 px-3 py-3",
        "text-sm text-sidebar-foreground/70"
      )}
    >
      <p className="font-medium text-sidebar-foreground">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  )
}

/** Right sidebar scaffold: two stacked panels like `/solar-system/distance`. */
export function OrbitsScaleSidebarsPlaceholder() {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <>
      <PlaceholderShell title="Scale Size">Coming soon.</PlaceholderShell>
      <PlaceholderShell title="Scale Distance">Coming soon.</PlaceholderShell>
    </>,
    rightSidebarContentMount
  )
}
