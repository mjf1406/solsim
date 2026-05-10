import { createFileRoute } from "@tanstack/react-router"

import { FooterSection } from "../../-home-components/footer"

export const Route = createFileRoute("/_web/lessons/scale/")({
  component: ScaleLessonPage,
})

function ScaleLessonPage() {
  return (
    <div className="mx-auto flex w-full flex-col items-stretch">
      <article className="min-h-screen w-full max-w-3xl self-center px-6 pt-6 pb-14 lg:px-8">
        <header className="mb-10 space-y-2">
          <p className="font-heading text-sm font-medium tracking-wide text-muted-foreground">
            Lessons
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Scale
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            How big things are in space—and why maps and models have to lie a
            little.
          </p>
        </header>
        <div className="space-y-4 leading-relaxed text-muted-foreground">
          <p>🚧 This lesson is being written. Check back soon.</p>
        </div>
      </article>
      <FooterSection />
    </div>
  )
}
