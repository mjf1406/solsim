import { createFileRoute } from "@tanstack/react-router"
import { FooterSection } from "../-home-components/footer"

export const Route = createFileRoute("/_web/teacher/")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="mx-auto flex w-full flex-col items-stretch">
      <article className="min-h-screen w-full max-w-3xl self-center px-6 pt-6 pb-14 lg:px-8">
        <header className="mb-10 space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Teacher
          </h1>
        </header>
        <div>🚧 Under construction 🚧</div>
      </article>
      <FooterSection />
    </div>
  )
}
