import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_web/teachers/")({
  beforeLoad: () => {
    throw redirect({ to: "/", hash: "teachers" })
  },
})
