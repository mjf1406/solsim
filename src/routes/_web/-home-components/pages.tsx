import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@tanstack/react-router"

import { SIZE_PAGE_DEFAULT_LINK_SEARCH } from "@/routes/_app/solar-system/size/-url-search"

interface LearningPageProps {
  title: string
  description: string
  to: "/solar-system/size" | "/solar-system/distance"
  search?: typeof SIZE_PAGE_DEFAULT_LINK_SEARCH
}

const pageList: LearningPageProps[] = [
  {
    title: "Solar System Size",
    description:
      "Compare planets, moons, and the Sun at different scales to build intuition for sizes.",
    to: "/solar-system/size",
    search: SIZE_PAGE_DEFAULT_LINK_SEARCH,
  },
  {
    title: "Solar System Distance",
    description:
      "Explore how far apart objects are and how distance scales change what you notice.",
    to: "/solar-system/distance",
  },
]

export const PagesSection = () => {
  return (
    <section id="pages" className="container py-24 sm:py-32">
      <h2 className="mb-2 text-center text-lg tracking-wider text-primary">
        Learn
      </h2>

      <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
        Choose what to learn
      </h2>
      <h3 className="mx-auto mb-8 text-center text-xl text-muted-foreground md:w-1/2">
        From interactive models to leveled texts, choose how to learn about the
        Solar System.
      </h3>

      <div className="mx-auto grid w-full gap-4 sm:grid-cols-2 lg:w-[70%]">
        {pageList.map(({ title, description, to, search }) => (
          <Card
            key={title}
            asChild
            className="h-full bg-muted/60 transition-shadow hover:shadow-lg dark:bg-card"
          >
            <Link to={to} search={search}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  )
}
