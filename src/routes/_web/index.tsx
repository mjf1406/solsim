import { createFileRoute } from "@tanstack/react-router"
import { HeroSection } from "./-home-components/hero"

export const Route = createFileRoute("/_web/")({
  component: Index,
})

function Index() {
  return (
    <div>
      <HeroSection />
    </div>
  )
}
