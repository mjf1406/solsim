import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_web/about/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>🚧 Under construction 🚧</div>
}
