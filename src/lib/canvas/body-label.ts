export const CANVAS_BODY_LABEL_FONT =
  '600 12px "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif'

/** Larger canvas labels (e.g. `/distance` strip); `/size` keeps {@link CANVAS_BODY_LABEL_FONT}. */
export const CANVAS_BODY_LABEL_FONT_LARGE =
  '600 16px "Space Grotesk Variable", ui-sans-serif, system-ui, sans-serif'

/** Stroke width for label outline; paired with white fill for legibility. */
export const CANVAS_BODY_LABEL_STROKE_WIDTH = 3

export const CANVAS_BODY_LABEL_OUTSIDE_GAP_PX = 3

/** Pads label AABBs so stroke, outline bleed, and a minimum gap separate neighboring labels. */
export const CANVAS_BODY_LABEL_AVOIDANCE_PAD =
  CANVAS_BODY_LABEL_STROKE_WIDTH + 6

export type CanvasBodyLabelRect = {
  left: number
  top: number
  right: number
  bottom: number
}

function fallbackFontPx(font: string): number {
  const m = font.match(/(\d+(?:\.\d+)?)px/)
  return m ? parseFloat(m[1]) : 12
}

export function measureCanvasLabelBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string = CANVAS_BODY_LABEL_FONT
): { w: number; h: number } {
  ctx.save()
  ctx.font = font
  const metrics = ctx.measureText(text)
  const px = fallbackFontPx(font)
  const ascent =
    metrics.actualBoundingBoxAscent > 0
      ? metrics.actualBoundingBoxAscent
      : px * 0.72
  const descent =
    metrics.actualBoundingBoxDescent > 0
      ? metrics.actualBoundingBoxDescent
      : px * 0.22
  ctx.restore()
  const w = metrics.width
  return { w, h: ascent + descent }
}

export function canvasLabelFitsInsideDisk(
  w: number,
  h: number,
  r: number
): boolean {
  if (!(r > 0)) return false
  const hw = w / 2
  const hh = h / 2
  return hw * hw + hh * hh <= r * r * 0.96
}

export function inflateCanvasLabelRect(
  r: CanvasBodyLabelRect,
  pad: number
): CanvasBodyLabelRect {
  return {
    left: r.left - pad,
    top: r.top - pad,
    right: r.right + pad,
    bottom: r.bottom + pad,
  }
}

export function canvasLabelRectsOverlap(
  a: CanvasBodyLabelRect,
  b: CanvasBodyLabelRect
): boolean {
  return !(
    a.right <= b.left ||
    b.right <= a.left ||
    a.bottom <= b.top ||
    b.bottom <= a.top
  )
}

export type BodyCircleLabelRectOptions = {
  /** When true, always place the label to the right of the disk (never centered inside). */
  forceOutside?: boolean
  /** Canvas font string; default {@link CANVAS_BODY_LABEL_FONT}. */
  font?: string
}

/**
 * Axis-aligned bounds for a body label drawn like {@link drawCanvasBodyLabel}:
 * centered in the disk when the text fits, otherwise to the right of the circle.
 */
export function bodyCircleLabelRect(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  bodyDiameterPx: number,
  opts?: BodyCircleLabelRectOptions
): CanvasBodyLabelRect {
  const r = bodyDiameterPx / 2
  const font = opts?.font ?? CANVAS_BODY_LABEL_FONT
  const { w, h } = measureCanvasLabelBox(ctx, text, font)
  const inside =
    opts?.forceOutside !== true && canvasLabelFitsInsideDisk(w, h, r)
  if (inside) {
    return {
      left: cx - w / 2,
      top: cy - h / 2,
      right: cx + w / 2,
      bottom: cy + h / 2,
    }
  }
  const left = cx + r + CANVAS_BODY_LABEL_OUTSIDE_GAP_PX
  return {
    left,
    top: cy - h / 2,
    right: left + w,
    bottom: cy + h / 2,
  }
}

export type DrawCanvasBodyLabelOptions = {
  font?: string
}

export function drawCanvasBodyLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  bodyRadiusPx: number,
  opts?: DrawCanvasBodyLabelOptions
): void {
  const font = opts?.font ?? CANVAS_BODY_LABEL_FONT
  ctx.save()
  ctx.font = font
  const { w, h } = measureCanvasLabelBox(ctx, text, font)
  const inside = canvasLabelFitsInsideDisk(w, h, bodyRadiusPx)

  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.miterLimit = 2
  ctx.lineWidth = CANVAS_BODY_LABEL_STROKE_WIDTH
  ctx.strokeStyle = "#000000"
  ctx.fillStyle = "#ffffff"
  ctx.textBaseline = "middle"

  if (inside) {
    ctx.textAlign = "center"
    ctx.strokeText(text, cx, cy)
    ctx.fillText(text, cx, cy)
  } else {
    ctx.textAlign = "left"
    const x = cx + bodyRadiusPx + CANVAS_BODY_LABEL_OUTSIDE_GAP_PX
    ctx.strokeText(text, x, cy)
    ctx.fillText(text, x, cy)
  }
  ctx.restore()
}
