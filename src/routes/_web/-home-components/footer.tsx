import { Separator } from "@/components/ui/separator"
import { APP_NAME } from "@/lib/constants"
import { ExternalLink } from "lucide-react"
import { Link } from "@tanstack/react-router"

export const FooterSection = () => {
  return (
    <footer id="footer" className="container py-24 sm:py-32">
      <div className="rounded-2xl border border-secondary bg-card p-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between md:gap-12">
          <Link to="/" className="flex w-fit items-center font-bold">
            <img
              src="/sun-with-sunglasses.webp"
              alt=""
              draggable={false}
              aria-hidden
              className="mr-2 h-9 w-9 shrink-0 rounded-lg object-contain select-none"
            />

            <h3 className="text-2xl">{APP_NAME}</h3>
          </Link>

          <div className="flex flex-col gap-8 sm:flex-row sm:gap-12 md:gap-16">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold">Contact</h3>
              <a
                href="https://github.com/mjf1406/solsim"
                className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary/90"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold">Inspiration</h3>
              <a
                href="https://spaceplace.nasa.gov/"
                className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary/90"
                target="_blank"
                rel="noopener noreferrer"
              >
                NASA Space Place
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(opens in new tab)</span>
              </a>
              <a
                href="https://joshworth.com/dev/pixelspace/pixelspace_solarsystem.html"
                className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary/90"
                target="_blank"
                rel="noopener noreferrer"
              >
                Josh Worth — Pixel Solar System
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(opens in new tab)</span>
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-6" />
        <section>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Designed and developed by{" "}
            <a
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-primary/90"
              href="https://github.com/mjf1406"
              target="_blank"
              rel="noopener noreferrer"
            >
              Michael Fitzgerald
              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">(opens in new tab)</span>
            </a>
            .
          </p>
        </section>
      </div>
    </footer>
  )
}
