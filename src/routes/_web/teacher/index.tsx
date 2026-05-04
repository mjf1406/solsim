import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_web/teacher/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_web/teacher/"!</div>
}
