import type { ReactNode } from "react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { useIsMobile } from "@/hooks/use-mobile"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { mainNav } from "@/lib/navigation/main-nav"
import { cn } from "@/lib/utils"

export function NavItem({
  to,
  hash,
  children,
}: {
  to: string
  hash?: string
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
        {...(hash != null ? { hash } : {})}
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

function MobileMainNavSheet() {
  const [open, setOpen] = useState(false)

  const navLinkClass =
    "relative flex w-full rounded-xl px-3 py-3 font-heading tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

  const navLinkActive =
    "text-foreground ring-1 ring-primary/30 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_55%,transparent),0_10px_30px_-18px_color-mix(in_oklch,var(--primary)_75%,transparent)] bg-[radial-gradient(120%_120%_at_50%_20%,color-mix(in_oklch,var(--primary)_22%,transparent)_0%,color-mix(in_oklch,var(--primary)_10%,transparent)_28%,transparent_70%)]"

  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon className="size-5" />
      </Button>
      <SheetContent
        side="left"
        className="flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-0 p-0 sm:max-w-sm"
      >
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="font-heading">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation links
          </SheetDescription>
        </SheetHeader>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 pb-8 font-heading">
          {mainNav.map((entry) =>
            entry.kind === "link" ? (
              <Link
                key={entry.to + (entry.hash ?? "")}
                to={entry.to}
                {...(entry.hash != null ? { hash: entry.hash } : {})}
                onClick={close}
                className={cn(
                  navLinkClass,
                  "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
                activeProps={{
                  className: cn(navLinkClass, navLinkActive),
                  "aria-current": "page",
                }}
              >
                {entry.label}
              </Link>
            ) : (
              <Accordion
                key={entry.label}
                type="single"
                collapsible
                className="rounded-2xl border bg-muted/30"
              >
                <AccordionItem value={entry.label} className="border-0">
                  <AccordionTrigger className="rounded-2xl px-3 py-3 font-heading hover:no-underline">
                    {entry.label}
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-3">
                    <ul className="flex flex-col gap-0.5 px-3">
                      {entry.items.map((item) => (
                        <li key={item.to + String(item.search ?? "") + (item.hash ?? "")}>
                          <Link
                            to={item.to}
                            {...(item.search != null ? { search: item.search } : {})}
                            {...(item.hash != null ? { hash: item.hash } : {})}
                            onClick={close}
                            className={cn(
                              navLinkClass,
                              "py-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                            )}
                            activeProps={{
                              className: cn(navLinkClass, navLinkActive, "py-2"),
                              "aria-current": "page",
                            }}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export function AppHeader() {
  const isMobile = useIsMobile()
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
      {isMobile ? (
        <div className="flex h-full items-center justify-between gap-2 px-2 sm:px-3">
          <MobileMainNavSheet />
          <div className="min-w-0 flex-1" aria-hidden />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <div
              ref={setRightMount}
              className={slotCell(rightSlotOccupied, "end")}
            />
          </div>
        </div>
      ) : (
        <div className={cn("grid h-full", gridCols)}>
          <div
            ref={setLeftMount}
            className={slotCell(leftSlotOccupied, "start")}
          />

          <nav
            className="flex min-w-0 flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:gap-2"
            aria-label="Main"
          >
            {mainNav.map((entry) =>
              entry.kind === "link" ? (
                <NavItem key={entry.to + (entry.hash ?? "")} to={entry.to} hash={entry.hash}>
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
                            <li key={item.to + (item.hash ?? "")}>
                              <NavigationMenuLink asChild>
                                <Link
                                  to={item.to}
                                  {...(item.search != null
                                    ? { search: item.search }
                                    : {})}
                                  {...(item.hash != null ? { hash: item.hash } : {})}
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
      )}
    </header>
  )
}
