import { createFileRoute } from "@tanstack/react-router"

import LoadingScreen from "@/components/navigation/loading-screen"

export const Route = createFileRoute("/_web/loading/")({
  component: LoadingTestPage,
})

function LoadingTestPage() {
  return <LoadingScreen />
}
