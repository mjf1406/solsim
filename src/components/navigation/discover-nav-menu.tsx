import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import { ComingSoonBadge } from "@/components/ui/coming-soon-badge"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
import { DISCOVER_ITEMS, type DiscoverItem } from "@/lib/discover-items"
import { inheritReadingLevelSearch } from "@/lib/reading-level"
import { cn } from "@/lib/utils"

const CLOSE_DELAY_MS = 220

const flyoutPanelClass =
  "rounded-3xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"

const discoverLinkClass =
  "block rounded-2xl px-3 py-2 text-sm font-heading tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const discoverLinkActive =
  "text-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_55%,transparent),0_10px_30px_-18px_color-mix(in_oklch,var(--primary)_75%,transparent)] bg-[radial-gradient(120%_120%_at_50%_20%,color-mix(in_oklch,var(--primary)_22%,transparent)_0%,color-mix(in_oklch,var(--primary)_10%,transparent)_28%,transparent_70%)]"

function DiscoverLinkRow({ item }: { item: DiscoverItem & { to: string } }) {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          to={item.to}
          search={inheritReadingLevelSearch}
          className={cn(
            discoverLinkClass,
            "text-muted-foreground hover:text-foreground"
          )}
          activeProps={{
            className: cn(discoverLinkClass, discoverLinkActive),
            "aria-current": "page",
          }}
        >
          {item.label}
        </Link>
      </NavigationMenuLink>
    </li>
  )
}

function DiscoverDisabledRow({ label }: { label: string }) {
  return (
    <div
      role="menuitem"
      aria-disabled="true"
      className={cn(
        "flex min-h-9 cursor-not-allowed select-none items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm opacity-50 outline-none"
      )}
    >
      <span className="truncate font-heading tracking-wide text-muted-foreground">
        {label}
      </span>
      <ComingSoonBadge />
    </div>
  )
}

function EarthSystemsFlyoutRow({ item }: { item: DiscoverItem }) {
  const children = item.children
  const [open, setOpen] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }, [cancelClose])

  useEffect(() => {
    return () => cancelClose()
  }, [cancelClose])

  const toggle = () => setOpen((o) => !o)

  if (!children?.length) return null

  return (
    <li className="relative">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex cursor-pointer items-stretch rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onMouseEnter={() => {
          cancelClose()
          setOpen(true)
        }}
        onMouseLeave={scheduleClose}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <div className="flex min-w-0 flex-1 select-none items-center justify-between gap-2 px-3 py-2 opacity-50">
          <span className="truncate font-heading tracking-wide text-muted-foreground">
            {item.label}
          </span>
          <ComingSoonBadge />
        </div>
        <div className="flex items-center pr-2">
          <ChevronRightIcon
            className="size-4 shrink-0 text-foreground"
            aria-hidden
          />
        </div>
      </div>

      {open ? (
        <div
          role="menu"
          aria-label={`${item.label} topics`}
          className={cn(
            "absolute z-100 w-[min(18rem,calc(100vw-2rem))] overflow-hidden p-2.5",
            "max-md:left-0 max-md:right-0 max-md:top-full max-md:mt-2",
            "md:left-full md:top-0 md:ml-2",
            flyoutPanelClass
          )}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <ul className="grid gap-0.5">
            {children.map((c) => (
              <li key={c.id}>
                <DiscoverDisabledRow label={c.label} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

type DiscoverNavMenuProps = {
  navTriggerClass: string
}

export function DiscoverNavMenu({ navTriggerClass }: DiscoverNavMenuProps) {
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className="gap-0">
        <NavigationMenuItem>
          <NavigationMenuTrigger className={navTriggerClass}>
            Discover
          </NavigationMenuTrigger>
          <NavigationMenuContent className="font-heading overflow-visible!">
            <ul className="grid w-[min(18rem,calc(100vw-2rem))] gap-0.5 overflow-visible">
              {DISCOVER_ITEMS.map((item) =>
                item.children?.length ? (
                  <EarthSystemsFlyoutRow key={item.id} item={item} />
                ) : item.to ? (
                  <DiscoverLinkRow
                    key={item.id}
                    item={item as DiscoverItem & { to: string }}
                  />
                ) : (
                  <li key={item.id}>
                    <DiscoverDisabledRow label={item.label} />
                  </li>
                )
              )}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
