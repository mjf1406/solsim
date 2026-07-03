import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_web/solar-system/scale/")({
  beforeLoad: () => {
    throw redirect({ to: "/teachers/scale-prints" })
  },
})
