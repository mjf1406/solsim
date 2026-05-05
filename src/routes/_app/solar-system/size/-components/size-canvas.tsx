import {
  useCallback,
  useLayoutEffect,
  useRef,
  type PointerEvent,
} from "react"

import {
  bodyCircleLabelRect,
  CANVAS_BODY_LABEL_AVOIDANCE_PAD,
  CANVAS_BODY_LABEL_FONT,
  CANVAS_BODY_LABEL_OUTSIDE_GAP_PX,
  type CanvasBodyLabelRect,
  canvasLabelFitsInsideDisk,
  canvasLabelRectsOverlap,
  clampStarDiskDragsInViewport,
  drawCanvasBodyLabel,
  inflateCanvasLabelRect,
  leftSliverAnchorCenter,
  measureCanvasLabelBox,
  OVERSIZED_DISK_VISIBLE_ARC_PX,
  shouldAnchorDiskOnLeft,
} from "@/lib/canvas"
import { usePointerDragDelta } from "@/hooks/use-pointer-drag-delta"
import { getCanvasLocalCssPoint } from "@/lib/pointer/canvas-client-xy"
import {
  defaultSizeBodyDisplayFilter,
  filterSizeCanvasBodiesForDisplay,
  type SizeBodyDisplayFilter,
} from "@/lib/solar-system/body-type-display"
import { cn } from "@/lib/utils"

import {
  collectSizeCanvasBodies,
  moonReferenceDiameterKm,
  type SizeBodyKind,
  type SizeCanvasBody,
  type SizeCanvasLabelMode,
  type SizePageModel,
} from "../-data"

/**
 * Scale: parent supplies `pxPerKm`. The default (when no prop is provided) keeps
 * the legacy "Moon = 1 CSS px" behavior using `moonReferenceDiameterKm(model)`.
 * Body pixel centers are frozen on first layout for each canvasId and reused for every
 * subsequent redraw at any scale; only the radius changes around that fixed point.
 * The Sun is special-cased: when its diameter exceeds a fraction of the viewport
 * it is anchored off the left edge so only a sliver remains visible, leaving
 * room for the other bodies. Drag offsets are clamped each frame so the disk
 * cannot be dragged fully off-screen.
 */

const PLACEHOLDER_BASE = "/assets/placeholders"

/** Matches page backdrop `#020617`; canvas clears each frame to this flat fill. */
const SPACE_FLAT_FILL = "#020617"

function placeholderSrc(name: string, kind: SizeBodyKind): string {
  const n = name.trim().toLowerCase()
  if (kind === "star" || n === "sun") return `${PLACEHOLDER_BASE}/sun.svg`
  if (kind === "asteroid") return `${PLACEHOLDER_BASE}/asteroid.svg`
  if (kind === "comet") return `${PLACEHOLDER_BASE}/comet.svg`
  if (kind === "dwarf") return `${PLACEHOLDER_BASE}/dwarf-planet.svg`
  if (kind === "planet") {
    const map: Record<string, string> = {
      mercury: "mercury",
      venus: "venus",
      earth: "earth",
      mars: "mars",
      jupiter: "jupiter",
      saturn: "saturn",
      uranus: "uranus",
      neptune: "neptune",
    }
    const file = map[n]
    if (file) return `${PLACEHOLDER_BASE}/${file}.svg`
    return `${PLACEHOLDER_BASE}/dwarf-planet.svg`
  }
  return `${PLACEHOLDER_BASE}/natural-satellite.svg`
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => {
        imageCache.delete(src)
        reject(new Error(`Failed to load ${src}`))
      }
      img.decoding = "async"
      img.src = src
    })
    imageCache.set(src, p)
  }
  return p
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  diameterPx: number
): void {
  const r = diameterPx / 2
  if (r <= 0) return
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, cx - r, cy - r, diameterPx, diameterPx)
  ctx.restore()
}

/** Ring outside the body disk so selection stays visible on the dark backdrop. Pulses size and opacity over time (call from a redraw loop while selected). */
function drawSelectionIndicator(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  bodyRadiusPx: number
): void {
  const r = bodyRadiusPx
  if (!(r > 0)) return
  const t = performance.now() / 280
  const pulse = (Math.sin(t) + 1) / 2

  const basePad = Math.max(2.5, Math.min(10, r * 0.14))
  const pad = basePad * (1 + 0.2 * pulse)
  const ringR = r + pad
  const lineWInner =
    Math.max(1.5, Math.min(4, r * 0.1 + 1)) * (0.88 + 0.42 * pulse)

  ctx.save()
  const outerR = ringR + (3 + 9 * pulse) * (0.5 + Math.min(r * 0.02, 0.5))
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 + 0.28 * pulse})`
  ctx.lineWidth = 2 + 3.5 * pulse
  ctx.shadowColor = "rgba(56, 189, 248, 0.4)"
  ctx.shadowBlur = 6 + 14 * pulse
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.72 + 0.23 * pulse})`
  ctx.lineWidth = lineWInner
  ctx.shadowColor = "rgba(56, 189, 248, 0.55)"
  ctx.shadowBlur = Math.min(18, ringR * 0.42) * (0.72 + 0.38 * pulse)
  ctx.stroke()
  ctx.restore()
}

/** Minimum gap from viewport edges for body disks; left/right add app sidebar overlap below. */
const SIZE_CANVAS_BASE_INSET_PX = 14

/** Padding from canvas edges (CSS px); left/right include offcanvas sidebar overlap with the fixed canvas. */
type CanvasViewportInset = {
  top: number
  right: number
  bottom: number
  left: number
}

function uniformCanvasInset(all: number): CanvasViewportInset {
  return { top: all, right: all, bottom: all, left: all }
}

/** Horizontal overlap between `canvasRect` and sidebar panels (fixed full-view canvas vs offcanvas sidebars). */
function measureSidebarOverlapCssPx(canvasRect: DOMRect): {
  left: number
  right: number
} {
  let left = 0
  let right = 0
  if (canvasRect.width <= 0 || canvasRect.height <= 0) {
    return { left: 0, right: 0 }
  }

  const nodes = document.querySelectorAll<HTMLElement>(
    '[data-slot="sidebar-container"], [data-slot="sidebar"][data-mobile="true"]'
  )
  for (const el of nodes) {
    const pr = el.getBoundingClientRect()
    if (pr.width < 2 || pr.height < 2) continue

    const iy0 = Math.max(canvasRect.top, pr.top)
    const iy1 = Math.min(canvasRect.bottom, pr.bottom)
    if (iy1 - iy0 < 24) continue

    const ix0 = Math.max(canvasRect.left, pr.left)
    const ix1 = Math.min(canvasRect.right, pr.right)
    if (ix1 <= ix0) continue

    const sideAttr = el.getAttribute("data-side")
    if (sideAttr === "left") {
      left = Math.max(left, ix1 - canvasRect.left)
    } else if (sideAttr === "right") {
      right = Math.max(right, canvasRect.right - ix0)
    } else {
      const panelMid = (pr.left + pr.right) / 2
      const canvasMid = (canvasRect.left + canvasRect.right) / 2
      if (panelMid < canvasMid) {
        left = Math.max(left, ix1 - canvasRect.left)
      } else {
        right = Math.max(right, canvasRect.right - ix0)
      }
    }
  }

  return { left, right }
}

/**
 * Picks (cx,cy) from unit-square (ux,uy) within a valid region where the body disk
 * stays inside the padded viewport on all sides and the label (same rules as
 * {@link drawCanvasBodyLabel}) fits without clipping, including to the right.
 */
function centerForBodyInViewportWithLabel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  diameterPx: number,
  text: string,
  inset: CanvasViewportInset,
  ux: number,
  uy: number
): { cx: number; cy: number } {
  const r = diameterPx / 2
  if (!(r > 0) || w <= 0 || h <= 0) return { cx: w / 2, cy: h / 2 }

  ctx.save()
  ctx.font = CANVAS_BODY_LABEL_FONT
  const { w: tw, h: th } = measureCanvasLabelBox(ctx, text)
  ctx.restore()

  const { top: it, right: ir, bottom: ib, left: il } = inset
  const inside = canvasLabelFitsInsideDisk(tw, th, r)

  let minCx = r + il
  let maxCx = w - r - ir
  let minCy = r + it
  let maxCy = h - r - ib

  minCy = Math.max(minCy, it + th / 2)
  maxCy = Math.min(maxCy, h - ib - th / 2)

  if (inside) {
    minCx = Math.max(minCx, il + tw / 2)
    maxCx = Math.min(maxCx, w - ir - tw / 2)
  } else {
    maxCx = Math.min(
      maxCx,
      w - ir - r - CANVAS_BODY_LABEL_OUTSIDE_GAP_PX - tw
    )
  }

  if (minCx > maxCx) {
    const mid = (minCx + maxCx) / 2
    const fallback = Math.min(w - r - ir, Math.max(r + il, mid))
    minCx = maxCx = fallback
  }
  if (minCy > maxCy) {
    const mid = (minCy + maxCy) / 2
    const fallback = Math.min(h - r - ib, Math.max(r + it, mid))
    minCy = maxCy = fallback
  }

  const aw = maxCx - minCx
  const ah = maxCy - minCy
  const cx = aw > 0 ? minCx + ux * aw : (minCx + maxCx) / 2
  const cy = ah > 0 ? minCy + uy * ah : (minCy + maxCy) / 2
  return { cx, cy }
}

/** Keep a circle of radius `r` fully inside the viewport with a margin from each edge. */
function clampCircleCenter(
  cx: number,
  cy: number,
  r: number,
  w: number,
  h: number,
  inset: CanvasViewportInset
): { cx: number; cy: number } {
  if (!(r > 0) || w <= 0 || h <= 0) return { cx, cy }
  const { top: it, right: ir, bottom: ib, left: il } = inset
  const minX = r + il
  const maxX = w - r - ir
  const minY = r + it
  const maxY = h - r - ib
  if (minX > maxX || minY > maxY) return { cx: w / 2, cy: h / 2 }
  return {
    cx: Math.min(maxX, Math.max(minX, cx)),
    cy: Math.min(maxY, Math.max(minY, cy)),
  }
}

function bodyCircleAndLabelFitViewport(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameterPx: number,
  text: string,
  w: number,
  h: number,
  inset: CanvasViewportInset
): boolean {
  const r = diameterPx / 2
  if (!(r > 0)) return true
  const { top: it, right: ir, bottom: ib, left: il } = inset
  if (
    cx - r < il ||
    cx + r > w - ir ||
    cy - r < it ||
    cy + r > h - ib
  ) {
    return false
  }
  const lr = bodyCircleLabelRect(ctx, text, cx, cy, diameterPx)
  return (
    lr.left >= il &&
    lr.top >= it &&
    lr.right <= w - ir &&
    lr.bottom <= h - ib
  )
}

/** Shift (cx,cy) minimally so the disk and its label rect both respect viewport `inset`. */
function nudgeBodyCenterToFitViewport(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameterPx: number,
  text: string,
  w: number,
  h: number,
  inset: CanvasViewportInset
): { cx: number; cy: number } {
  const { top: it, right: ir, bottom: ib, left: il } = inset
  let x = cx
  let y = cy
  for (let i = 0; i < 24; i++) {
    if (bodyCircleAndLabelFitViewport(ctx, x, y, diameterPx, text, w, h, inset)) {
      return { cx: x, cy: y }
    }
    const r = diameterPx / 2
    const lr = bodyCircleLabelRect(ctx, text, x, y, diameterPx)
    let dx = 0
    let dy = 0
    if (lr.right > w - ir) dx = w - ir - lr.right
    if (lr.left < il) dx = Math.max(dx, il - lr.left)
    if (lr.bottom > h - ib) dy = h - ib - lr.bottom
    if (lr.top < it) dy = Math.max(dy, it - lr.top)
    if (x - r < il) dx = Math.max(dx, il + r - x)
    if (x + r > w - ir) dx = Math.min(dx, w - ir - r - x)
    if (y - r < it) dy = Math.max(dy, it + r - y)
    if (y + r > h - ib) dy = Math.min(dy, h - ib - r - y)
    if (dx === 0 && dy === 0) break
    x += dx
    y += dy
  }
  return clampCircleCenter(x, y, diameterPx / 2, w, h, inset)
}

const MOON_ORBIT_GAP_PX = 4
const MOON_LABEL_SEARCH_STEPS = 32
const MOON_LABEL_DIST_STEP_PX = 5
const MOON_LABEL_ANGLE_SLICES = 24

type LayoutEntry = SizeCanvasBody & {
  src: string
  diameterPx: number
}

type HitLayoutSnapshot = {
  entries: Array<{ canvasId: string; diameterPx: number }>
  posById: Map<string, { cx: number; cy: number }>
  /** Label bounds in CSS px when drawn; inflated slightly for hit targets. */
  labelRectById: Map<string, CanvasBodyLabelRect>
}

function pointInLabelHitRect(
  x: number,
  y: number,
  rect: CanvasBodyLabelRect
): boolean {
  return (
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  )
}

/** Topmost body id under CSS pixel (x,y), or null (same stacking as pointer down). */
function hitTestBodyIdAt(
  snap: HitLayoutSnapshot,
  x: number,
  y: number,
  labelMode: SizeCanvasLabelMode,
  selectedBodyId: string | null
): string | null {
  for (let i = snap.entries.length - 1; i >= 0; i--) {
    const entry = snap.entries[i]
    if (entry.diameterPx < 1) continue
    const pos = snap.posById.get(entry.canvasId)
    if (!pos) continue
    const id = entry.canvasId
    if (shouldDrawBodyLabel(labelMode, selectedBodyId, id)) {
      const labelRect = snap.labelRectById.get(id)
      if (labelRect && pointInLabelHitRect(x, y, labelRect)) {
        return id
      }
    }
    const r = entry.diameterPx / 2
    const dx = x - pos.cx
    const dy = y - pos.cy
    if (dx * dx + dy * dy <= r * r) {
      return id
    }
  }
  return null
}

function shouldDrawBodyLabel(
  labelMode: SizeCanvasLabelMode,
  selectedBodyId: string | null,
  bodyId: string
): boolean {
  if (labelMode === "off") return false
  if (labelMode === "on") return true
  return selectedBodyId != null && bodyId === selectedBodyId
}

/**
 * Computes the natural fresh layout center for a non-dependent body (anything
 * except moons whose parent is also visible). Only used when there is no frozen
 * center yet for this id.
 */
function freshCenterForNonDependent(
  ctx: CanvasRenderingContext2D,
  e: LayoutEntry,
  wCss: number,
  hCss: number,
  inset: CanvasViewportInset,
  positionFractionById: Map<string, { ux: number; uy: number }>
): { cx: number; cy: number } {
  const frac = positionFractionById.get(e.canvasId) ?? { ux: 0.5, uy: 0.5 }
  let { cx, cy } = centerForBodyInViewportWithLabel(
    ctx,
    wCss,
    hCss,
    e.diameterPx,
    e.row.name,
    inset,
    frac.ux,
    frac.uy
  )
  ;({ cx, cy } = nudgeBodyCenterToFitViewport(
    ctx,
    cx,
    cy,
    e.diameterPx,
    e.row.name,
    wCss,
    hCss,
    inset
  ))
  return { cx, cy }
}

/**
 * Computes the natural fresh layout center for a dependent moon orbiting its
 * parent. Tries angles around the parent and falls back to clamped + nudged
 * placement.
 */
function freshCenterForDependentMoon(
  ctx: CanvasRenderingContext2D,
  e: LayoutEntry,
  parentEntry: LayoutEntry,
  parentPos: { cx: number; cy: number },
  wCss: number,
  hCss: number,
  inset: CanvasViewportInset,
  baseAng: number,
  avoid: CanvasBodyLabelRect[]
): {
  cx: number
  cy: number
  moonRectInfl: CanvasBodyLabelRect
} {
  const moonR = e.diameterPx / 2
  const parentR = parentEntry.diameterPx / 2
  const minDist0 = parentR + moonR + MOON_ORBIT_GAP_PX

  for (let k = 0; k < MOON_LABEL_ANGLE_SLICES; k++) {
    const ang = baseAng + (k * (2 * Math.PI)) / MOON_LABEL_ANGLE_SLICES
    let dist = minDist0
    for (let s = 0; s < MOON_LABEL_SEARCH_STEPS; s++) {
      let cx = parentPos.cx + Math.cos(ang) * dist
      let cy = parentPos.cy + Math.sin(ang) * dist
      ;({ cx, cy } = clampCircleCenter(cx, cy, moonR, wCss, hCss, inset))

      const moonRectInfl = inflateCanvasLabelRect(
        bodyCircleLabelRect(ctx, e.row.name, cx, cy, e.diameterPx),
        CANVAS_BODY_LABEL_AVOIDANCE_PAD
      )

      let clear = bodyCircleAndLabelFitViewport(
        ctx,
        cx,
        cy,
        e.diameterPx,
        e.row.name,
        wCss,
        hCss,
        inset
      )
      if (clear) {
        for (const a of avoid) {
          if (canvasLabelRectsOverlap(moonRectInfl, a)) {
            clear = false
            break
          }
        }
      }
      if (clear) {
        return { cx, cy, moonRectInfl }
      }
      dist += MOON_LABEL_DIST_STEP_PX
    }
  }

  const ang = baseAng
  const dist = minDist0
  let cx = parentPos.cx + Math.cos(ang) * dist
  let cy = parentPos.cy + Math.sin(ang) * dist
  ;({ cx, cy } = clampCircleCenter(cx, cy, moonR, wCss, hCss, inset))
  ;({ cx, cy } = nudgeBodyCenterToFitViewport(
    ctx,
    cx,
    cy,
    e.diameterPx,
    e.row.name,
    wCss,
    hCss,
    inset
  ))
  const moonRectInfl = inflateCanvasLabelRect(
    bodyCircleLabelRect(ctx, e.row.name, cx, cy, e.diameterPx),
    CANVAS_BODY_LABEL_AVOIDANCE_PAD
  )
  return { cx, cy, moonRectInfl }
}

/**
 * Resolves the effective on-screen position of every renderable entry.
 *
 * - Each canvasId has its center frozen on first layout in `frozenCenterById`; later
 *   redraws (including scale changes) reuse it without nudging or clamping.
 * - The Sun is special-cased: when its diameter exceeds the off-screen threshold
 *   its effective center jumps to a fixed left-edge anchor so only a sliver of
 *   its right edge is visible.
 * - User drag offsets are applied last on top of either the frozen or anchored
 *   center; stars clamp those offsets in `redraw` (anchor + frozen) before this runs.
 * - Dragging a planet or dwarf also applies that same offset to dependent moons
 *   (same parent rule as initial moon placement: planet or dwarf parent only).
 */
function computePositionsById(
  ctx: CanvasRenderingContext2D,
  entries: LayoutEntry[],
  wCss: number,
  hCss: number,
  positionFractionById: Map<string, { ux: number; uy: number }>,
  moonOrbitAngleById: Map<string, number>,
  inset: CanvasViewportInset,
  dragOffsetById: Map<string, { x: number; y: number }>,
  frozenCenterById: Map<string, { cx: number; cy: number }>
): Map<string, { cx: number; cy: number }> {
  const posById = new Map<string, { cx: number; cy: number }>()
  const hostEntryByCatalogId = new Map<string, LayoutEntry>()
  for (const e of entries) {
    if (e.kind === "planet" || e.kind === "dwarf") {
      hostEntryByCatalogId.set(e.row.id, e)
    }
  }

  for (const e of entries) {
    if (e.kind === "moon" && e.parentPlanetId) continue
    if (e.diameterPx < 1) continue
    let center = frozenCenterById.get(e.canvasId)
    if (!center) {
      center = freshCenterForNonDependent(
        ctx,
        e,
        wCss,
        hCss,
        inset,
        positionFractionById
      )
      frozenCenterById.set(e.canvasId, center)
    }
    posById.set(e.canvasId, { cx: center.cx, cy: center.cy })
  }

  const moonLabelRectsByParent = new Map<string, CanvasBodyLabelRect[]>()

  for (const e of entries) {
    if (!(e.kind === "moon" && e.parentPlanetId)) continue
    if (e.diameterPx < 1) continue
    const pid = e.parentPlanetId
    const parentEntry = hostEntryByCatalogId.get(pid)
    const parentPos = parentEntry
      ? posById.get(parentEntry.canvasId)
      : undefined

    let center = frozenCenterById.get(e.canvasId)
    if (!center) {
      if (
        !parentPos ||
        !parentEntry ||
        parentEntry.diameterPx < 1 ||
        !(parentEntry.kind === "planet" || parentEntry.kind === "dwarf")
      ) {
        center = freshCenterForNonDependent(
          ctx,
          e,
          wCss,
          hCss,
          inset,
          positionFractionById
        )
        frozenCenterById.set(e.canvasId, center)
      } else {
        const baseAng = moonOrbitAngleById.get(e.canvasId) ?? 0
        const parentRectInfl = inflateCanvasLabelRect(
          bodyCircleLabelRect(
            ctx,
            parentEntry.row.name,
            parentPos.cx,
            parentPos.cy,
            parentEntry.diameterPx
          ),
          CANVAS_BODY_LABEL_AVOIDANCE_PAD
        )
        const siblingRects = moonLabelRectsByParent.get(pid) ?? []
        const avoid: CanvasBodyLabelRect[] = [parentRectInfl, ...siblingRects]
        const placed = freshCenterForDependentMoon(
          ctx,
          e,
          parentEntry,
          parentPos,
          wCss,
          hCss,
          inset,
          baseAng,
          avoid
        )
        center = { cx: placed.cx, cy: placed.cy }
        frozenCenterById.set(e.canvasId, center)
        const nextSiblings = moonLabelRectsByParent.get(pid) ?? []
        nextSiblings.push(placed.moonRectInfl)
        moonLabelRectsByParent.set(pid, nextSiblings)
      }
    }
    posById.set(e.canvasId, { cx: center.cx, cy: center.cy })
  }

  for (const e of entries) {
    if (e.kind !== "star") continue
    if (e.diameterPx < 1) continue
    if (!shouldAnchorDiskOnLeft(e.diameterPx, wCss, hCss)) continue
    const anchor = leftSliverAnchorCenter(
      e.diameterPx,
      hCss,
      OVERSIZED_DISK_VISIBLE_ARC_PX,
      inset.left
    )
    posById.set(e.canvasId, anchor)
  }

  for (const e of entries) {
    if (e.diameterPx < 1) continue
    const d = dragOffsetById.get(e.canvasId)
    if (!d || (d.x === 0 && d.y === 0)) continue
    const pos = posById.get(e.canvasId)
    if (!pos) continue
    posById.set(e.canvasId, { cx: pos.cx + d.x, cy: pos.cy + d.y })
  }

  for (const parent of entries) {
    if (parent.diameterPx < 1) continue
    if (!(parent.kind === "planet" || parent.kind === "dwarf")) continue
    const d = dragOffsetById.get(parent.canvasId)
    if (!d || (d.x === 0 && d.y === 0)) continue
    const pid = parent.row.id
    for (const m of entries) {
      if (m.diameterPx < 1) continue
      if (!(m.kind === "moon" && m.parentPlanetId === pid)) continue
      const pos = posById.get(m.canvasId)
      if (!pos) continue
      posById.set(m.canvasId, { cx: pos.cx + d.x, cy: pos.cy + d.y })
    }
  }

  return posById
}

const DRAG_THRESHOLD_CSS_PX = 5
/** Slightly larger so touch drags start reliably after `touch-none` suppresses scroll. */
const DRAG_THRESHOLD_TOUCH_CSS_PX = 10

export function SizeComparisonCanvas({
  model,
  labelMode = "on",
  selectedBodyId = null,
  onBodySelect,
  bodyDisplayFilter = defaultSizeBodyDisplayFilter(),
  pxPerKm,
}: {
  model: SizePageModel
  labelMode?: SizeCanvasLabelMode
  selectedBodyId?: string | null
  onBodySelect?: (bodyId: string | null) => void
  bodyDisplayFilter?: SizeBodyDisplayFilter
  /**
   * CSS pixels per kilometer. When omitted, falls back to the legacy
   * `1 / moonReferenceDiameterKm(model)` (Moon = 1 px). Changes to this prop are
   * applied without recomputing body centers (centers stay frozen).
   */
  pxPerKm?: number
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layoutHitRef = useRef<HitLayoutSnapshot | null>(null)
  const redrawRef = useRef<(() => Promise<void>) | null>(null)

  const positionFractionByIdRef = useRef<
    Map<string, { ux: number; uy: number }>
  >(new Map())
  const moonOrbitAngleByIdRef = useRef<Map<string, number>>(new Map())
  const bodyDragOffsetByIdRef = useRef<Map<string, { x: number; y: number }>>(
    new Map()
  )
  /** Cached pixel center per canvasId; populated on first layout, reused thereafter. */
  const frozenCenterByIdRef = useRef<Map<string, { cx: number; cy: number }>>(
    new Map()
  )
  /** Last viewport size; used to detect significant resizes that invalidate frozen centers. */
  const lastViewportSizeRef = useRef<{ w: number; h: number } | null>(null)
  const isDraggingRef = useRef(false)

  const labelModeRef = useRef(labelMode)
  const selectedBodyIdRef = useRef(selectedBodyId)
  const bodyDisplayFilterRef = useRef(bodyDisplayFilter)
  const pxPerKmRef = useRef<number | undefined>(pxPerKm)

  const { startSession: startPointerDrag } = usePointerDragDelta()

  const onCanvasPointerDown = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      if (!onBodySelect) return
      const canvas = canvasRef.current
      const snap = layoutHitRef.current
      if (!canvas || !snap) return
      const { x, y } = getCanvasLocalCssPoint(canvas, e.clientX, e.clientY)
      const hit = hitTestBodyIdAt(
        snap,
        x,
        y,
        labelModeRef.current,
        selectedBodyIdRef.current
      )
      onBodySelect(hit)
      if (!hit) return

      startPointerDrag({
        event: e.nativeEvent,
        captureTarget: canvas,
        dragThresholdPx:
          e.nativeEvent.pointerType === "touch"
            ? DRAG_THRESHOLD_TOUCH_CSS_PX
            : DRAG_THRESHOLD_CSS_PX,
        onMove: (dx, dy) => {
          const prev = bodyDragOffsetByIdRef.current.get(hit) ?? { x: 0, y: 0 }
          bodyDragOffsetByIdRef.current.set(hit, {
            x: prev.x + dx,
            y: prev.y + dy,
          })
          isDraggingRef.current = true
          const c = canvasRef.current
          if (c) c.style.cursor = "grabbing"
          void redrawRef.current?.()
        },
        onEnd: () => {
          isDraggingRef.current = false
          const c = canvasRef.current
          if (c) c.style.cursor = "default"
          void redrawRef.current?.()
        },
      })
    },
    [onBodySelect, startPointerDrag]
  )

  const onCanvasPointerMove = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      if (!onBodySelect) return
      const canvas = canvasRef.current
      const snap = layoutHitRef.current
      if (!canvas || !snap) return
      if (isDraggingRef.current) {
        canvas.style.cursor = "grabbing"
        return
      }
      const { x, y } = getCanvasLocalCssPoint(canvas, e.clientX, e.clientY)
      const hit = hitTestBodyIdAt(
        snap,
        x,
        y,
        labelModeRef.current,
        selectedBodyIdRef.current
      )
      canvas.style.cursor = hit ? "grab" : "default"
    },
    [onBodySelect]
  )

  const onCanvasPointerLeave = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas && !isDraggingRef.current) canvas.style.cursor = "default"
  }, [])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const bodiesForSeed = collectSizeCanvasBodies(model)
    positionFractionByIdRef.current = new Map()
    for (const b of bodiesForSeed) {
      positionFractionByIdRef.current.set(b.canvasId, {
        ux: Math.random(),
        uy: Math.random(),
      })
    }
    moonOrbitAngleByIdRef.current = new Map()
    for (const b of bodiesForSeed) {
      if (b.kind === "moon" && b.parentPlanetId) {
        moonOrbitAngleByIdRef.current.set(
          b.canvasId,
          Math.random() * Math.PI * 2
        )
      }
    }
    bodyDragOffsetByIdRef.current = new Map()
    frozenCenterByIdRef.current = new Map()
    lastViewportSizeRef.current = null

    let cancelled = false
    const resizeObserver = new ResizeObserver(() => {
      void redraw()
    })
    resizeObserver.observe(wrapper)
    const onWinResize = () => {
      void redraw()
    }
    window.addEventListener("resize", onWinResize)

    async function redraw() {
      if (!wrapper) return
      const wCss = wrapper.clientWidth ?? 0
      const hCss = wrapper?.clientHeight ?? 0
      if (wCss < 16 || hCss < 16) return

      const last = lastViewportSizeRef.current
      const viewportChangedSignificantly =
        last == null ||
        Math.abs(last.w - wCss) > 2 ||
        Math.abs(last.h - hCss) > 2
      if (viewportChangedSignificantly) {
        frozenCenterByIdRef.current = new Map()
        lastViewportSizeRef.current = { w: wCss, h: hCss }
      }

      const allBodies = collectSizeCanvasBodies(model)
      const moonKm = moonReferenceDiameterKm(model)
      const pxPerKm = pxPerKmRef.current ?? 1 / moonKm
      const bodies = filterSizeCanvasBodiesForDisplay(
        allBodies,
        bodyDisplayFilterRef.current,
        pxPerKm,
        1
      )
      const ordered = [...bodies].sort(
        (a, b) => b.row.diameterKm - a.row.diameterKm
      )

      const drawOrder = ordered

      const entries = drawOrder.map((b) => ({
        ...b,
        src: placeholderSrc(b.row.name, b.kind),
        diameterPx: b.row.diameterKm * pxPerKm,
      }))

      const settled = await Promise.allSettled(
        entries.map((e) => loadImage(e.src))
      )
      if (cancelled) return

      const dpr =
        typeof window !== "undefined"
          ? Math.min(window.devicePixelRatio ?? 1, 3)
          : 1

      if (!canvas) return
      canvas.style.width = `${wCss}px`
      canvas.style.height = `${hCss}px`
      canvas.width = Math.round(wCss * dpr) ?? 0
      canvas.height = Math.round(hCss * dpr) ?? 0

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = SPACE_FLAT_FILL
      ctx.fillRect(0, 0, wCss, hCss)

      const baseInset = uniformCanvasInset(SIZE_CANVAS_BASE_INSET_PX)
      const sidebarOverlap = measureSidebarOverlapCssPx(
        wrapper.getBoundingClientRect()
      )
      const viewportInset: CanvasViewportInset = {
        top: baseInset.top,
        bottom: baseInset.bottom,
        left: baseInset.left + sidebarOverlap.left,
        right: baseInset.right + sidebarOverlap.right,
      }

      clampStarDiskDragsInViewport(
        entries.map((e) => ({
          kind: e.kind,
          id: e.canvasId,
          diameterPx: e.diameterPx,
        })),
        wCss,
        hCss,
        viewportInset,
        bodyDragOffsetByIdRef.current,
        frozenCenterByIdRef.current
      )

      const posById = computePositionsById(
        ctx,
        entries,
        wCss,
        hCss,
        positionFractionByIdRef.current,
        moonOrbitAngleByIdRef.current,
        viewportInset,
        bodyDragOffsetByIdRef.current,
        frozenCenterByIdRef.current
      )

      const labelRectById = new Map<string, CanvasBodyLabelRect>()
      for (const e of entries) {
        if (e.diameterPx < 1) continue
        const pos = posById.get(e.canvasId)
        if (!pos) continue
        const raw = bodyCircleLabelRect(
          ctx,
          e.row.name,
          pos.cx,
          pos.cy,
          e.diameterPx
        )
        labelRectById.set(
          e.canvasId,
          inflateCanvasLabelRect(raw, 6)
        )
      }

      layoutHitRef.current = {
        entries: entries.map((e) => ({
          canvasId: e.canvasId,
          diameterPx: e.diameterPx,
        })),
        posById,
        labelRectById,
      }

      settled.forEach((res, i) => {
        const e = entries[i]
        const r = e.diameterPx / 2
        if (!(r > 0)) return
        if (e.diameterPx < 1) return
        const pos = posById.get(e.canvasId)
        if (!pos) return
        const { cx, cy } = pos
        if (res.status === "fulfilled") {
          const img = res.value
          drawBody(ctx, img, cx, cy, e.diameterPx)
        } else {
          ctx.save()
          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(128, 128, 128, 0.45)"
          ctx.fill()
          ctx.restore()
        }
        if (
          shouldDrawBodyLabel(
            labelModeRef.current,
            selectedBodyIdRef.current,
            e.canvasId
          )
        ) {
          drawCanvasBodyLabel(ctx, e.row.name, cx, cy, r)
        }
      })

      const selId = selectedBodyIdRef.current
      if (selId) {
        for (let i = 0; i < entries.length; i++) {
          const e = entries[i]
          if (e.canvasId !== selId) continue
          const r = e.diameterPx / 2
          if (!(r > 0) || e.diameterPx < 1) break
          const pos = posById.get(e.canvasId)
          if (!pos) break
          drawSelectionIndicator(ctx, pos.cx, pos.cy, r)
          break
        }
      }
    }

    let moFrame = 0
    const scheduleLayoutRedraw = () => {
      if (moFrame) cancelAnimationFrame(moFrame)
      moFrame = requestAnimationFrame(() => {
        moFrame = 0
        void redraw()
      })
    }
    const mo = new MutationObserver(scheduleLayoutRedraw)
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    })

    const onSidebarTransitionEnd = (e: Event) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (
        t.closest(
          '[data-slot="sidebar-container"], [data-slot="sidebar"][data-mobile="true"]'
        )
      ) {
        scheduleLayoutRedraw()
      }
    }
    document.addEventListener("transitionend", onSidebarTransitionEnd)

    redrawRef.current = redraw
    void redraw()

    return () => {
      cancelled = true
      redrawRef.current = null
      resizeObserver.disconnect()
      window.removeEventListener("resize", onWinResize)
      document.removeEventListener("transitionend", onSidebarTransitionEnd)
      mo.disconnect()
      if (moFrame) cancelAnimationFrame(moFrame)
    }
  }, [model])

  useLayoutEffect(() => {
    labelModeRef.current = labelMode
    selectedBodyIdRef.current = selectedBodyId
    void redrawRef.current?.()
  }, [labelMode, selectedBodyId])

  /** While a body is selected, redraw on a modest cadence so the selection ring can pulse. */
  useLayoutEffect(() => {
    if (!selectedBodyId) return
    let rafId = 0
    let cancelled = false
    let lastRedraw = 0
    const loop = (now: number) => {
      if (cancelled || !selectedBodyIdRef.current) return
      if (now - lastRedraw >= 32) {
        lastRedraw = now
        void redrawRef.current?.()
      }
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [selectedBodyId])

  useLayoutEffect(() => {
    bodyDisplayFilterRef.current = bodyDisplayFilter
    void redrawRef.current?.()
  }, [bodyDisplayFilter])

  useLayoutEffect(() => {
    pxPerKmRef.current = pxPerKm
    void redrawRef.current?.()
  }, [pxPerKm])

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none fixed inset-x-0 top-(--app-header-h) z-1 h-[calc(100svh-var(--app-header-h))] bg-[#020617]"
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 block size-full",
          onBodySelect
            ? "pointer-events-auto touch-none select-none"
            : "pointer-events-none"
        )}
        aria-label="Scaled bodies: tap or click a disk or its name label to select. Drag with finger or pointer to reposition (move a few pixels first to start a drag). Moons sit near their planet; Moon is one pixel; larger drawn behind."
        onPointerDown={onBodySelect ? onCanvasPointerDown : undefined}
        onPointerMove={onBodySelect ? onCanvasPointerMove : undefined}
        onPointerLeave={onBodySelect ? onCanvasPointerLeave : undefined}
      />
    </div>
  )
}
