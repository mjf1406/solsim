import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { icons } from "lucide-react"

interface FeaturesProps {
  icon: string
  title: string
  description: string
}

const featureList: FeaturesProps[] = [
  {
    icon: "School",
    title: "Built for classrooms",
    description:
      "Works on laptops and tablets, so students can explore at school or at home.",
  },
  {
    icon: "Sigma",
    title: "Tap for hard numbers",
    description:
      "Reveal real measurements and quick facts while you explore—no guessing required.",
  },
  {
    icon: "PencilRuler",
    title: "Change units as you go",
    description:
      "Switch between units (like km, miles, AU) to match the lesson and build intuition.",
  },
  {
    icon: "RulerDimensionLine",
    title: "Interactive scale models",
    description:
      "Drag, compare, and rescale bodies to understand size and distance relationships.",
  },
  {
    icon: "BookText",
    title: "Leveled reading support",
    description:
      "Optional readings, keywords, and number helpers to support different learners.",
  },
  {
    icon: "GraduationCap",
    title: "Teacher-friendly",
    description:
      "Use the same concepts on-screen and off-screen with printable activities and worksheets.",
  },
]

export const FeaturesSection = () => {
  return (
    <section id="features" className="container py-24 sm:py-32">
      <h2 className="mb-2 text-center text-lg tracking-wider text-primary">
        Features
      </h2>

      <h2 className="mb-4 text-center text-3xl font-bold md:text-4xl">
        Features that help you learn and teach
      </h2>

      <h3 className="mx-auto mb-8 text-center text-xl text-muted-foreground md:w-1/2">
        These features are designed for differentiation and to make your life as
        a teacher easier.
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureList.map(({ icon, title, description }) => (
          <Card
            key={title}
            className="h-full transition-shadow hover:shadow-md"
          >
            <CardHeader className="flex flex-col items-center text-center">
              <div className="mb-1 inline-flex items-center justify-center rounded-full bg-primary/20 p-2 ring-8 ring-primary/10">
                <Icon
                  name={icon as keyof typeof icons}
                  color="var(--primary)"
                  size={24}
                  className="text-primary"
                />
              </div>

              <CardTitle>{title}</CardTitle>
            </CardHeader>

            <CardContent className="text-center text-muted-foreground">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
