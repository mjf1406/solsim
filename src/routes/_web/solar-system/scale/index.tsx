import { createFileRoute } from "@tanstack/react-router"

import { FooterSection } from "../../-home-components/footer"

export const Route = createFileRoute("/_web/solar-system/scale/")({
  component: SolarSystemScalePage,
})

function SolarSystemScalePage() {
  return (
    <div className="mx-auto flex w-full flex-col items-stretch">
      <article className="min-h-screen w-full max-w-3xl self-center px-6 pt-6 pb-14 lg:px-8">
        <header className="mb-10 space-y-2">
          <p className="font-heading text-sm font-medium tracking-wide text-muted-foreground">
            Solar System
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Scale
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Explore how we zoom in and out to compare sizes and distances across
            the solar system.
          </p>
        </header>
        <div className="space-y-4 leading-relaxed text-muted-foreground">
          <p>🚧 This page is being built. Check back soon.</p>
        </div>
      </article>
      <FooterSection />
    </div>
  )
}
