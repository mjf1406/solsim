import {
  SIZE_PAGE_DEFAULT_LINK_SEARCH,
  type SizeRouteSearch,
} from "@/routes/_app/solar-system/size/-url-search"

export type MainNavChildLink = {
  to: string
  label: string
  /** When set, passed to TanStack `<Link search={…}>` (required for routes with `validateSearch`). */
  search?: SizeRouteSearch
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
      {
        to: "/solar-system/size",
        label: "Size",
        search: SIZE_PAGE_DEFAULT_LINK_SEARCH,
      },
      { to: "/solar-system/distance", label: "Distance" },
      { to: "/solar-system/orbits", label: "Orbits" },
    ],
  },
  { kind: "link", to: "/about", label: "About" },
  { kind: "link", to: "/teacher", label: "Teachers" },
]
