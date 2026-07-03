import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@tanstack/react-router"

interface TeacherResourceProps {
  title: string
  description: string
  to: "/teachers/scale-prints"
}

const resourceList: TeacherResourceProps[] = [
  {
    title: "Scale prints",
    description:
      "Print planets, moons, and the Sun to scale on standard paper—ready for classroom walls and hands-on comparison.",
    to: "/teachers/scale-prints",
  },
]

export const TeachersSection = () => {
  return (
    <section id="teachers" className="container py-24 sm:py-32">
      <h2 className="mb-2 text-center text-lg tracking-wider text-primary">
        Teachers
      </h2>

      <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
        Printable classroom materials
      </h2>
      <h3 className="mx-auto mb-8 text-center text-xl text-muted-foreground md:w-1/2">
        Worksheets and cutouts that pair with the interactive models—same
        concepts, ready for off-screen learning.
      </h3>

      <div className="mx-auto grid w-full gap-4 sm:grid-cols-2 lg:w-[70%]">
        {resourceList.map(({ title, description, to }) => (
          <Card
            key={title}
            asChild
            className="h-full bg-muted/60 transition-shadow hover:shadow-lg dark:bg-card"
          >
            <Link to={to}>
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
