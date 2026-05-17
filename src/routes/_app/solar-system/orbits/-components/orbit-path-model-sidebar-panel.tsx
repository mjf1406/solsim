import { createPortal } from "react-dom"

import { useAppHeaderSlots } from "@/components/navigation/app-header-slots"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import {
  BODY_CLASS_STYLE,
  type BodyClass,
  type OrbitStyle,
} from "@/lib/constants"
import { cn } from "@/lib/utils"
import { ChevronUp } from "lucide-react"

const ORBIT_TYPE_BUTTON_WIDTH_REF = "Circle"

const ORBIT_CLASS_EXPLAINERS: {
  bodyClass: BodyClass
  label: string
  description: string
}[] = [
  {
    bodyClass: "planet",
    label: "Planet",
    description: "Solid grey ring at semi-major axis",
  },
  {
    bodyClass: "dwarf-planet",
    label: "Dwarf planet",
    description: "Dashed lavender ring",
  },
  {
    bodyClass: "asteroid",
    label: "Asteroid",
    description: "Short-dash grey ring",
  },
  {
    bodyClass: "comet",
    label: "Comet",
    description: "Sparse-dotted cyan ring",
  },
  {
    bodyClass: "natural-satellite",
    label: "Natural satellite (moon)",
    description: "Dashed light grey ring around its parent",
  },
]

function OrbitLineSwatch({ style }: { style: OrbitStyle }) {
  const dash = style.dash.length > 0 ? style.dash.join(" ") : undefined
  return (
    <svg
      aria-hidden
      width={40}
      height={10}
      className="shrink-0 overflow-visible"
    >
      <line
        x1={2}
        y1={5}
        x2={38}
        y2={5}
        stroke={style.color}
        strokeWidth={style.width}
        strokeOpacity={style.alpha > 0 ? style.alpha : 0.45}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function OrbitPathModelSidebarPortal() {
  const { rightSidebarContentMount } = useAppHeaderSlots()
  if (!rightSidebarContentMount) return null
  return createPortal(
    <OrbitPathModelCollapsibleSection />,
    rightSidebarContentMount
  )
}

function OrbitPathModelCollapsibleSection() {
  return (
    <div className="mb-2">
      <Collapsible
        defaultOpen={false}
        className="group/orbit-model-collapsible rounded-xl border border-sidebar-border bg-sidebar/40 px-2 py-2"
      >
        <div className="flex w-full items-center gap-2">
          <CollapsibleTrigger
            className={cn(
              "w-fit shrink-0 rounded-xl px-1 py-1.5 text-left text-sm font-medium text-sidebar-foreground ring-sidebar-ring outline-none",
              "-mx-1 hover:bg-sidebar-accent/60 focus-visible:ring-2"
            )}
          >
            Orbits
          </CollapsibleTrigger>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0"
              disabled
              aria-label="Circle orbits (only mode available)"
              aria-pressed
            >
              <span className="inline-grid justify-items-center">
                <span className="invisible col-start-1 row-start-1" aria-hidden>
                  {ORBIT_TYPE_BUTTON_WIDTH_REF}
                </span>
                <span className="col-start-1 row-start-1 flex justify-center">
                  Circular
                </span>
              </span>
            </Button>
            <CollapsibleTrigger
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground ring-sidebar-ring outline-none",
                "hover:bg-sidebar-accent/60 focus-visible:ring-2"
              )}
            >
              <ChevronUp
                aria-hidden
                className="size-4 text-sidebar-foreground/70 transition-transform duration-200 group-data-[state=open]/orbit-model-collapsible:rotate-180"
              />
              <span className="sr-only">Toggle Orbit Type explainer</span>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="space-y-3 border-t border-sidebar-border/80 px-1 pt-3 pb-1">
            <div className="space-y-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 px-2.5 py-2 text-xs leading-snug text-sidebar-foreground/90">
              <p>
                <span className="font-medium text-sidebar-foreground">
                  Circular
                </span>{" "}
                mode shows all orbits as circles. This is not how they are in
                real life. We show them this way to make it easier to understand
                the Solar System.
              </p>
              <p>
                <span className="font-medium text-sidebar-foreground">
                  Keplerian
                </span>{" "}
                mode shows the orbits as ellipses. This is how they are in real
                life.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-sidebar-foreground/85">
              {ORBIT_CLASS_EXPLAINERS.map((row) => (
                <li key={row.bodyClass} className="flex items-center gap-2">
                  <OrbitLineSwatch style={BODY_CLASS_STYLE[row.bodyClass]} />
                  <span>
                    <span className="font-medium text-sidebar-foreground/95">
                      {row.label}
                    </span>
                    {" — "}
                    {row.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
