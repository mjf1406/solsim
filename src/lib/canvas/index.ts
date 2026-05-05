export {
  bodyCircleLabelRect,
  CANVAS_BODY_LABEL_AVOIDANCE_PAD,
  CANVAS_BODY_LABEL_FONT,
  CANVAS_BODY_LABEL_OUTSIDE_GAP_PX,
  CANVAS_BODY_LABEL_STROKE_WIDTH,
  canvasLabelFitsInsideDisk,
  canvasLabelRectsOverlap,
  type CanvasBodyLabelRect,
  drawCanvasBodyLabel,
  inflateCanvasLabelRect,
  measureCanvasLabelBox,
} from "./body-label"
export {
  clampDragOffsetForLeftAnchoredDisk,
  clampOversizedStarDragsIfAnchored,
  clampStarDiskDragsInViewport,
  leftSliverAnchorCenter,
  OVERSIZED_DISK_THRESHOLD_FRAC,
  OVERSIZED_DISK_VISIBLE_ARC_PX,
  shouldAnchorDiskOnLeft,
  type OversizedAnchorDragEntry,
  type OversizedViewportInset,
} from "./oversized-left-sliver-anchor"
