import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_web")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="max-h-[calc(100svh-var(--app-header-h))] overflow-y-auto p-4 scrollbar-both-edges lg:p-8">
      <Outlet />
    </div>
  )
}
