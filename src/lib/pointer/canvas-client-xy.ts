/**
 * Viewport `clientX` / `clientY` to element-local **CSS pixels** (the element’s
 * content box, top-left = 0,0). Use for canvas hit-testing and drags when the
 * 2D context is transformed to match this CSS size.
 */
export function getCanvasLocalCssPoint(
  el: HTMLElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return { x: clientX - r.left, y: clientY - r.top }
}
