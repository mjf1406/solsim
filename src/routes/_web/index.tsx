import { createFileRoute } from "@tanstack/react-router"
import { HeroSection } from "./-home-components/hero"
import { PagesSection } from "./-home-components/pages"
import { FeaturesSection } from "./-home-components/features"

export const Route = createFileRoute("/_web/")({
  component: Index,
})

function Index() {
  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center gap-4">
      <HeroSection />
      <PagesSection />
      <FeaturesSection />
    </div>
  )
}
