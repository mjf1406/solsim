import { createFileRoute, Outlet } from "@tanstack/react-router"
import { createPortal } from "react-dom"
import { useCallback, useState } from "react"
import { PanelLeftIcon, PanelRightIcon } from "lucide-react"

import { HeaderSlotPortal, useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app")({
  component: AppShellLayout,
})

/** Separate `localStorage` keys so left/right sidebars do not overwrite each other. */
const SIDEBAR_STORAGE_KEY_LEFT = "solsim.sidebar.left"
const SIDEBAR_STORAGE_KEY_RIGHT = "solsim.sidebar.right"

/** Uses outer `SidebarProvider` only — portal target for the mobile bottom dock. */
function SidebarDockLeftTriggerPortal({
  mount,
  show,
}: {
  mount: HTMLElement | null
  show: boolean
}) {
  const { toggleSidebar } = useSidebar()
  if (!show || !mount) return null
  return createPortal(
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-10 w-full max-w-40 gap-2 rounded-xl font-heading shadow-sm"
      aria-label="Open left panel"
      onClick={() => toggleSidebar()}
    >
      <PanelLeftIcon className="size-4 shrink-0" aria-hidden />
      <span className="text-xs">Bodies</span>
    </Button>,
    mount
  )
}

/** Uses inner `SidebarProvider` only — portal target for the mobile bottom dock. */
function SidebarDockRightTriggerPortal({
  mount,
  show,
}: {
  mount: HTMLElement | null
  show: boolean
}) {
  const { toggleSidebar } = useSidebar()
  if (!show || !mount) return null
  return createPortal(
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-10 w-full max-w-40 gap-2 rounded-xl font-heading shadow-sm"
      aria-label="Open right panel"
      onClick={() => toggleSidebar()}
    >
      <PanelRightIcon className="size-4 shrink-0" aria-hidden />
      <span className="text-xs">Tools</span>
    </Button>,
    mount
  )
}

function AppShellLayout() {
  const isMobile = useIsMobile()
  const {
    leftMount,
    rightMount,
    setLeftSidebarContentMount,
    setRightSidebarContentMount,
  } = useAppHeaderSlots()

  const [leftDockMount, setLeftDockMount] = useState<HTMLElement | null>(null)
  const [rightDockMount, setRightDockMount] = useState<HTMLElement | null>(null)

  const setLeftDockRef = useCallback((el: HTMLElement | null) => {
    setLeftDockMount((prev) => (prev === el ? prev : el))
  }, [])
  const setRightDockRef = useCallback((el: HTMLElement | null) => {
    setRightDockMount((prev) => (prev === el ? prev : el))
  }, [])

  return (
    <SidebarProvider
      storageKey={SIDEBAR_STORAGE_KEY_LEFT}
      className={cn(
        "flex min-h-0 w-full flex-1",
        "[--sidebar-width:21rem] md:[--sidebar-width:22.5rem]"
      )}
    >
      <SidebarDockLeftTriggerPortal mount={leftDockMount} show={isMobile} />

      <Sidebar side="left" collapsible="offcanvas" variant="sidebar">
        <SidebarHeader className="h-0 min-h-0 overflow-hidden border-0 p-0">
          {!isMobile && (
            <HeaderSlotPortal side="left" mount={leftMount}>
              <SidebarTrigger />
            </HeaderSlotPortal>
          )}
        </SidebarHeader>
        <SidebarContent className="min-h-0">
          <div
            ref={setLeftSidebarContentMount}
            className="flex min-h-0 flex-1 flex-col gap-2 p-2"
          />
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0!">
        <SidebarProvider
          storageKey={SIDEBAR_STORAGE_KEY_RIGHT}
          className="flex min-h-0 min-w-0 flex-1 flex-row-reverse"
        >
          <SidebarDockRightTriggerPortal mount={rightDockMount} show={isMobile} />

          <Sidebar side="right" collapsible="offcanvas" variant="sidebar">
            <SidebarHeader className="h-0 min-h-0 overflow-hidden border-0 p-0">
              {!isMobile && (
                <HeaderSlotPortal side="right" mount={rightMount}>
                  <SidebarTrigger />
                </HeaderSlotPortal>
              )}
            </SidebarHeader>
            <SidebarContent className="min-h-0">
              <div
                ref={setRightSidebarContentMount}
                className="flex min-h-0 flex-1 flex-col gap-2 p-2"
              />
            </SidebarContent>
          </Sidebar>

          <SidebarInset
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-auto",
              isMobile && "pb-[calc(3.75rem+env(safe-area-inset-bottom))]"
            )}
          >
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </SidebarInset>

      {isMobile ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border/80 bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)] backdrop-blur-md"
          role="toolbar"
          aria-label="Panel shortcuts"
        >
          <div
            ref={setLeftDockRef}
            className="flex min-h-10 flex-1 items-center justify-center px-1"
          />
          <div
            ref={setRightDockRef}
            className="flex min-h-10 flex-1 items-center justify-center px-1"
          />
        </div>
      ) : null}
    </SidebarProvider>
  )
}
