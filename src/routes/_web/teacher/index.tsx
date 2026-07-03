import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_web/teacher/")({
  beforeLoad: () => {
    throw redirect({ to: "/teachers" })
  },
})
