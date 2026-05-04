import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { mainNav } from "@/lib/navigation/main-nav"
import { cn } from "@/lib/utils"

export function NavItem({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  const base =
    "relative rounded-xl px-3 py-2 font-heading tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  const active =
    "text-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_55%,transparent),0_10px_30px_-18px_color-mix(in_oklch,var(--primary)_75%,transparent)] bg-[radial-gradient(120%_120%_at_50%_20%,color-mix(in_oklch,var(--primary)_22%,transparent)_0%,color-mix(in_oklch,var(--primary)_10%,transparent)_28%,transparent_70%)]"

  return (
    <Button asChild variant="ghost" className="px-0">
      <Link
        to={to}
        className={cn(base, "text-muted-foreground hover:text-foreground")}
        activeProps={{
          className: cn(base, active),
          "aria-current": "page",
        }}
      >
        {children}
      </Link>
    </Button>
  )
}

export function AppHeader() {
  const { setLeftMount, setRightMount, leftSlotOccupied, rightSlotOccupied } =
    useAppHeaderSlots()

  const navTriggerClass = cn(
    navigationMenuTriggerStyle(),
    "font-heading tracking-wide text-muted-foreground hover:text-foreground data-open:text-foreground"
  )

  const navLinkClass =
    "relative rounded-xl px-3 py-2 font-heading tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  const navLinkActive =
    "text-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_55%,transparent),0_10px_30px_-18px_color-mix(in_oklch,var(--primary)_75%,transparent)] bg-[radial-gradient(120%_120%_at_50%_20%,color-mix(in_oklch,var(--primary)_22%,transparent)_0%,color-mix(in_oklch,var(--primary)_10%,transparent)_28%,transparent_70%)]"

  const gridCols = cn(
    "grid h-full items-center gap-2 px-2 sm:px-3",
    !leftSlotOccupied && !rightSlotOccupied && "grid-cols-[0fr_1fr_auto]",
    leftSlotOccupied &&
      !rightSlotOccupied &&
      "grid-cols-[minmax(2.25rem,auto)_1fr_auto]",
    !leftSlotOccupied &&
      rightSlotOccupied &&
      "grid-cols-[0fr_1fr_minmax(2.25rem,auto)]",
    leftSlotOccupied &&
      rightSlotOccupied &&
      "grid-cols-[minmax(2.25rem,auto)_1fr_minmax(2.25rem,auto)]"
  )

  const slotCell = (occupied: boolean, align: "start" | "end") =>
    cn(
      "flex min-h-9 items-center overflow-hidden transition-[min-width,opacity] duration-150",
      occupied
        ? "min-w-9"
        : "pointer-events-none min-w-0 max-w-0 opacity-0",
      align === "start" ? "justify-start" : "justify-end"
    )

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-(--app-header-h) border-b bg-background/70 text-sm shadow-sm backdrop-blur">
      <div className={gridCols}>
        <div ref={setLeftMount} className={slotCell(leftSlotOccupied, "start")} />

        <nav
          className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:gap-2"
          aria-label="Main"
        >
          {mainNav.map((entry) =>
            entry.kind === "link" ? (
              <NavItem key={entry.to} to={entry.to}>
                {entry.label}
              </NavItem>
            ) : (
              <NavigationMenu key={entry.label} viewport={false}>
                <NavigationMenuList className="gap-0">
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className={navTriggerClass}>
                      {entry.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="font-heading">
                      <ul className="grid w-[min(18rem,calc(100vw-2rem))] gap-0.5">
                        {entry.items.map((item) => (
                          <li key={item.to}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={item.to}
                                className={cn(
                                  navLinkClass,
                                  "text-muted-foreground hover:text-foreground"
                                )}
                                activeProps={{
                                  className: cn(navLinkClass, navLinkActive),
                                  "aria-current": "page",
                                }}
                              >
                                {item.label}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            )
          )}
        </nav>

        <div className="flex min-h-9 items-center justify-end gap-0.5 sm:gap-1">
          <ThemeToggle />
          <div
            ref={setRightMount}
            className={slotCell(rightSlotOccupied, "end")}
          />
        </div>
      </div>
    </header>
  )
}
