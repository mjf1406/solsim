import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "@tanstack/react-router"

import { SIZE_PAGE_DEFAULT_LINK_SEARCH } from "@/routes/_app/solar-system/size/-url-search"
import { ArrowRight } from "lucide-react"

export const HeroSection = () => {
  return (
    <section className="container w-full">
      <div className="mx-auto grid place-items-center gap-8 py-20 md:py-32 lg:max-w-7xl">
        <div className="space-y-8 text-center">
          <Badge variant="outline" className="py-2 text-sm">
            <span className="mr-2 text-primary">
              <Badge>New</Badge>
            </span>
            <span>
              {" "}
              We've launched with{" "}
              <Link
                to="/solar-system/size"
                search={SIZE_PAGE_DEFAULT_LINK_SEARCH}
                className="underline"
              >
                Size
              </Link>{" "}
              and{" "}
              <Link to="/solar-system/distance" className="underline">
                Distance
              </Link>{" "}
              on {new Date("2026-05-06").toLocaleDateString()}!
            </span>
          </Badge>

          <div className="mx-auto max-w-3xl text-center text-4xl font-bold md:text-6xl">
            <h1>
              SolSim is a
              <span className="bg-linear-to-r from-[#D247BF] to-primary bg-clip-text px-2 text-transparent">
                sandbox
              </span>
              to learn about the Solar System
            </h1>
          </div>

          <p className="mx-auto max-w-screen-sm text-xl text-muted-foreground">
            Learners explore simulations and leveled readings; teachers get
            printable activities and worksheets for the same ideas off-screen.
          </p>

          <div className="space-y-4 md:space-y-0 md:space-x-4">
            <Button className="group/arrow w-5/6 font-bold md:w-1/4">
              Start learning!
              <ArrowRight className="ml-2 size-5 transition-transform group-hover/arrow:translate-x-1" />
            </Button>
            {/* <Button variant="secondary" className="w-5/6 font-bold md:w-1/4">
              Learn more
            </Button> */}
            <Button
              asChild
              variant="outline"
              className="w-5/6 font-bold md:w-1/4"
            >
              <Link to="/teacher">I'm a teacher</Link>
            </Button>
          </div>
        </div>

        <div className="group relative mt-14">
          <div className="absolute top-2 left-1/2 mx-auto h-24 w-[90%] -translate-x-1/2 transform rounded-full bg-primary/50 blur-3xl lg:-top-8 lg:h-80"></div>
          <img
            width={1200}
            height={1200}
            className="relative mx-auto w-full rounded-lg border border-t-2 border-secondary border-t-primary/30 leading-none md:w-[1200px] dark:hidden"
            src="/hero-image-light.jpeg"
            alt="Dashboard preview (light theme)"
          />
          <img
            width={1200}
            height={1200}
            className="relative mx-auto hidden w-full rounded-lg border border-t-2 border-secondary border-t-primary/30 leading-none md:w-[1200px] dark:block"
            src="/hero-image-dark.jpeg"
            alt="Dashboard preview (dark theme)"
          />

          <div className="absolute bottom-0 left-0 h-20 w-full rounded-lg bg-linear-to-b from-background/0 via-background/50 to-background md:h-28"></div>
        </div>
      </div>
    </section>
  )
}
