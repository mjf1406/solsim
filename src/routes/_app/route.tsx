import { createFileRoute, Outlet } from "@tanstack/react-router"

import { HeaderSlotPortal, useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app")({
  component: AppShellLayout,
})

function AppShellLayout() {
  const { leftMount, rightMount } = useAppHeaderSlots()

  return (
    <SidebarProvider
      className={cn(
        "min-h-[calc(100svh-var(--app-header-h))] w-full flex-1",
        "[--sidebar-width:14rem] md:[--sidebar-width:15rem]"
      )}
    >
      <Sidebar side="left" collapsible="offcanvas" variant="sidebar">
        <SidebarHeader className="h-0 min-h-0 overflow-hidden border-0 p-0">
          <HeaderSlotPortal side="left" mount={leftMount}>
            <SidebarTrigger />
          </HeaderSlotPortal>
        </SidebarHeader>
        <SidebarContent />
      </Sidebar>

      <SidebarInset className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0!">
        <SidebarProvider className="flex min-h-0 min-w-0 flex-1 flex-row-reverse">
          <Sidebar side="right" collapsible="offcanvas" variant="sidebar">
            <SidebarHeader className="h-0 min-h-0 overflow-hidden border-0 p-0">
              <HeaderSlotPortal side="right" mount={rightMount}>
                <SidebarTrigger />
              </HeaderSlotPortal>
            </SidebarHeader>
            <SidebarContent />
          </Sidebar>

          <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-auto">
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
