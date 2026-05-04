import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { DiscoverNavMenu } from "@/components/discover-nav-menu"
import { useAppHeaderSlots } from "@/components/app-header-slots"
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
import { inheritReadingLevelSearch } from "@/lib/reading-level"
import { DWARFS, PLANETS } from "@/lib/sim-pages"
import { cn } from "@/lib/utils"

export function NavItem({
  to,
  search,
  children,
}: {
  to: string
  search?: typeof inheritReadingLevelSearch
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
        search={search}
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
  const { setLeftMount, setRightMount } = useAppHeaderSlots()

  const navTriggerClass = cn(
    navigationMenuTriggerStyle(),
    "font-heading tracking-wide text-muted-foreground hover:text-foreground data-open:text-foreground"
  )

  const navLinkClass =
    "relative rounded-xl px-3 py-2 font-heading tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  const navLinkActive =
    "text-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_55%,transparent),0_10px_30px_-18px_color-mix(in_oklch,var(--primary)_75%,transparent)] bg-[radial-gradient(120%_120%_at_50%_20%,color-mix(in_oklch,var(--primary)_22%,transparent)_0%,color-mix(in_oklch,var(--primary)_10%,transparent)_28%,transparent_70%)]"

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-(--app-header-h) border-b bg-background/70 text-sm shadow-sm backdrop-blur">
      <div className="grid h-full grid-cols-[minmax(2.5rem,auto)_1fr_minmax(2.5rem,auto)] items-center gap-2 px-2 sm:px-3">
        <div
          ref={setLeftMount}
          className="flex min-h-9 min-w-9 items-center justify-start"
        />

        <nav
          className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:gap-2"
          aria-label="Main"
        >
          <NavItem to="/" search={inheritReadingLevelSearch}>
            Home
          </NavItem>

          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-0">
              <NavigationMenuItem>
                <NavigationMenuTrigger className={navTriggerClass}>
                  Planets
                </NavigationMenuTrigger>
                <NavigationMenuContent className="font-heading">
                  <ul className="grid w-[min(18rem,calc(100vw-2rem))] gap-0.5">
                    {PLANETS.map((p) => (
                      <li key={p.slug}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={`/${p.slug}-system`}
                            search={inheritReadingLevelSearch}
                            className={cn(
                              navLinkClass,
                              "text-muted-foreground hover:text-foreground"
                            )}
                            activeProps={{
                              className: cn(navLinkClass, navLinkActive),
                              "aria-current": "page",
                            }}
                          >
                            {p.name}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <NavigationMenu viewport={false}>
            <NavigationMenuList className="gap-0">
              <NavigationMenuItem>
                <NavigationMenuTrigger className={navTriggerClass}>
                  Dwarf Planets
                </NavigationMenuTrigger>
                <NavigationMenuContent className="font-heading">
                  <ul className="grid w-[min(18rem,calc(100vw-2rem))] gap-0.5">
                    {DWARFS.map((d) => (
                      <li key={d.slug}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={`/${d.slug}-system`}
                            search={inheritReadingLevelSearch}
                            className={cn(
                              navLinkClass,
                              "text-muted-foreground hover:text-foreground"
                            )}
                            activeProps={{
                              className: cn(navLinkClass, navLinkActive),
                              "aria-current": "page",
                            }}
                          >
                            {d.name}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <DiscoverNavMenu navTriggerClass={navTriggerClass} />

          <NavItem to="/solar-system" search={inheritReadingLevelSearch}>
            Solar System
          </NavItem>

          <NavItem to="/about" search={inheritReadingLevelSearch}>
            About
          </NavItem>
        </nav>

        <div
          ref={setRightMount}
          className="flex min-h-9 min-w-9 items-center justify-end"
        />
      </div>
    </header>
  )
}
