import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppHeaderSlotsProvider } from "@/components/navigation/app-header-slots"
import { AppHeader } from "@/components/navigation/app-header"
import { TooltipProvider } from "@/components/ui/tooltip"

function RootLayout() {
  return (
    <AppHeaderSlotsProvider>
      <TooltipProvider delayDuration={0}>
        <AppHeader />
        <div className="min-h-svh pt-(--app-header-h)">
          <Outlet />
        </div>
      </TooltipProvider>
    </AppHeaderSlotsProvider>
  )
}

export const Route = createRootRoute({ component: RootLayout })
