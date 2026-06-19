import { useEffect, useState } from "react"

/** Horizontal overlap between a viewport rect and fixed sidebar panels. */
export function measureSidebarOverlapCssPx(viewportRect: DOMRect): {
  left: number
  right: number
} {
  let left = 0
  let right = 0
  if (viewportRect.width <= 0 || viewportRect.height <= 0) {
    return { left: 0, right: 0 }
  }

  const nodes = document.querySelectorAll<HTMLElement>(
    '[data-slot="sidebar-container"], [data-slot="sidebar"][data-mobile="true"]'
  )
  for (const el of nodes) {
    const pr = el.getBoundingClientRect()
    if (pr.width < 2 || pr.height < 2) continue

    const iy0 = Math.max(viewportRect.top, pr.top)
    const iy1 = Math.min(viewportRect.bottom, pr.bottom)
    if (iy1 - iy0 < 24) continue

    const ix0 = Math.max(viewportRect.left, pr.left)
    const ix1 = Math.min(viewportRect.right, pr.right)
    if (ix1 <= ix0) continue

    const sideAttr = el.getAttribute("data-side")
    if (sideAttr === "left") {
      left = Math.max(left, ix1 - viewportRect.left)
    } else if (sideAttr === "right") {
      right = Math.max(right, viewportRect.right - ix0)
    } else {
      const panelMid = (pr.left + pr.right) / 2
      const viewportMid = (viewportRect.left + viewportRect.right) / 2
      if (panelMid < viewportMid) {
        left = Math.max(left, ix1 - viewportRect.left)
      } else {
        right = Math.max(right, viewportRect.right - ix0)
      }
    }
  }

  return { left, right }
}

function measureViewportSidebarInsets(): { left: number; right: number } {
  if (typeof window === "undefined") return { left: 0, right: 0 }
  return measureSidebarOverlapCssPx(
    new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  )
}

/** Live left/right insets (CSS px) for fixed overlays that should sit between open sidebars. */
export function useSidebarHorizontalInsetPx(): { left: number; right: number } {
  const [insets, setInsets] = useState(measureViewportSidebarInsets)

  useEffect(() => {
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setInsets(measureViewportSidebarInsets())
      })
    }

    schedule()
    window.addEventListener("resize", schedule)

    const onTransitionEnd = (e: Event) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (
        t.closest(
          '[data-slot="sidebar-container"], [data-slot="sidebar"][data-mobile="true"]'
        )
      ) {
        schedule()
      }
    }
    document.addEventListener("transitionend", onTransitionEnd)

    const mo = new MutationObserver(schedule)
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "data-collapsible", "data-side"],
    })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", schedule)
      document.removeEventListener("transitionend", onTransitionEnd)
      mo.disconnect()
    }
  }, [])

  return insets
}
