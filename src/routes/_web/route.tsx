import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_web")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 scrollbar-stable lg:p-8">
      <Outlet />
    </div>
  )
}
