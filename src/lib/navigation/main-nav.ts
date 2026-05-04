export type MainNavChildLink = {
  to: string
  label: string
}

export type MainNavLink = {
  kind: "link"
  to: string
  label: string
}

export type MainNavGroup = {
  kind: "group"
  label: string
  items: MainNavChildLink[]
}

export type MainNavEntry = MainNavLink | MainNavGroup

export const mainNav: MainNavEntry[] = [
  { kind: "link", to: "/", label: "Home" },
  {
    kind: "group",
    label: "Solar System",
    items: [
      { to: "/solar-system/size", label: "Size" },
      { to: "/solar-system/distance", label: "Distance" },
    ],
  },
  { kind: "link", to: "/about", label: "About" },
  { kind: "link", to: "/teacher", label: "Teachers" },
]
