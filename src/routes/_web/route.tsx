import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_web")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="p-4 lg:p-8">
      <Outlet />
    </div>
  )
}
