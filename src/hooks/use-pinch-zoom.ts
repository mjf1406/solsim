import { useEffect, useRef, type RefObject } from "react"

export type PinchZoomCenter = {
  /** Viewport CSS px */
  clientX: number
  clientY: number
  /** Offset within the gesture target element */
  offsetX: number
  offsetY: number
}

export type UsePinchZoomOptions = {
  enabled?: boolean
  /** Zoom on plain wheel (no ctrl/shift/alt/meta). Default false. */
  wheelZoomPlain?: boolean
  /** Zoom on shift+wheel. Default false. */
  wheelZoomShiftKey?: boolean
  /** Zoom on ctrl+wheel (trackpad pinch). Default true. */
  wheelZoomCtrlKey?: boolean
  onGestureStart?: (center: PinchZoomCenter) => void
  /** Cumulative scale factor since gesture start (1 = unchanged). Pinch + ctrl+wheel. */
  onZoomTo?: (factor: number, center: PinchZoomCenter) => void
  /** One snap stop per mouse-wheel notch (plain / shift+wheel). */
  onWheelZoomStep?: (direction: 1 | -1, center: PinchZoomCenter) => void
  onGestureEnd?: () => void
}

const WHEEL_ZOOM_SENSITIVITY = 0.01
const WHEEL_GESTURE_END_MS = 200
const MIN_PINCH_DISTANCE_PX = 8

function centerFromPointers(
  pointers: Map<number, { x: number; y: number }>,
  target: HTMLElement
): PinchZoomCenter {
  let sumX = 0
  let sumY = 0
  for (const p of pointers.values()) {
    sumX += p.x
    sumY += p.y
  }
  const n = pointers.size
  const clientX = sumX / n
  const clientY = sumY / n
  const rect = target.getBoundingClientRect()
  return {
    clientX,
    clientY,
    offsetX: clientX - rect.left,
    offsetY: clientY - rect.top,
  }
}

function pointerDistance(
  pointers: Map<number, { x: number; y: number }>
): number {
  const pts = [...pointers.values()]
  if (pts.length < 2) return 0
  return Math.hypot(pts[1]!.x - pts[0]!.x, pts[1]!.y - pts[0]!.y)
}

function normalizeWheelDeltaY(e: WheelEvent): number {
  const scale =
    e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
  return e.deltaY * scale
}

function shouldWheelZoom(
  e: WheelEvent,
  opts: {
    wheelZoomPlain: boolean
    wheelZoomShiftKey: boolean
    wheelZoomCtrlKey: boolean
  }
): boolean {
  const hasModifier = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey
  if (opts.wheelZoomCtrlKey && e.ctrlKey) return true
  if (opts.wheelZoomShiftKey && e.shiftKey) return true
  if (opts.wheelZoomPlain && !hasModifier) return true
  return false
}

/**
 * Two-finger pinch (touch pointers) and wheel zoom on a target element.
 * Wheel zoom modes are configurable: plain wheel, shift+wheel, and ctrl+wheel
 * (trackpad pinch). Pinch and ctrl+wheel report cumulative factor; plain/shift
 * wheel steps one snap stop per notch via `onWheelZoomStep`.
 */
export function usePinchZoom(
  targetRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    wheelZoomPlain = false,
    wheelZoomShiftKey = false,
    wheelZoomCtrlKey = true,
    onGestureStart,
    onZoomTo,
    onWheelZoomStep,
    onGestureEnd,
  }: UsePinchZoomOptions
) {
  const callbacksRef = useRef({
    onGestureStart,
    onZoomTo,
    onWheelZoomStep,
    onGestureEnd,
  })
  callbacksRef.current = {
    onGestureStart,
    onZoomTo,
    onWheelZoomStep,
    onGestureEnd,
  }

  const wheelOptsRef = useRef({
    wheelZoomPlain,
    wheelZoomShiftKey,
    wheelZoomCtrlKey,
  })
  wheelOptsRef.current = {
    wheelZoomPlain,
    wheelZoomShiftKey,
    wheelZoomCtrlKey,
  }

  useEffect(() => {
    const target = targetRef.current
    if (!target || !enabled) return

    const activePointers = new Map<number, { x: number; y: number }>()
    let pinchActive = false
    let startPinchDistance = 0

    let wheelActive = false
    let wheelFactor = 1
    let wheelEndTimer: ReturnType<typeof setTimeout> | null = null

    const endWheelGesture = () => {
      if (!wheelActive) return
      wheelActive = false
      wheelFactor = 1
      callbacksRef.current.onGestureEnd?.()
    }

    const scheduleWheelEnd = () => {
      if (wheelEndTimer != null) clearTimeout(wheelEndTimer)
      wheelEndTimer = setTimeout(() => {
        wheelEndTimer = null
        endWheelGesture()
      }, WHEEL_GESTURE_END_MS)
    }

    const endPinchGesture = () => {
      if (!pinchActive) return
      pinchActive = false
      startPinchDistance = 0
      callbacksRef.current.onGestureEnd?.()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (activePointers.size === 2 && !pinchActive) {
        pinchActive = true
        startPinchDistance = pointerDistance(activePointers)
        const center = centerFromPointers(activePointers, target)
        callbacksRef.current.onGestureStart?.(center)
        if (startPinchDistance >= MIN_PINCH_DISTANCE_PX) {
          callbacksRef.current.onZoomTo?.(1, center)
        }
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (!pinchActive || activePointers.size < 2) return

      const dist = pointerDistance(activePointers)
      if (startPinchDistance < MIN_PINCH_DISTANCE_PX) {
        if (dist < MIN_PINCH_DISTANCE_PX) return
        startPinchDistance = dist
      }

      e.preventDefault()
      const factor = dist / startPinchDistance
      callbacksRef.current.onZoomTo?.(
        factor,
        centerFromPointers(activePointers, target)
      )
    }

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId)
      if (pinchActive && activePointers.size < 2) {
        endPinchGesture()
      }
    }

    const onWheel = (e: WheelEvent) => {
      if (!shouldWheelZoom(e, wheelOptsRef.current)) return
      e.preventDefault()
      e.stopPropagation()

      const rect = target.getBoundingClientRect()
      const center: PinchZoomCenter = {
        clientX: e.clientX,
        clientY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      }

      const delta = normalizeWheelDeltaY(e)
      if (delta === 0) return

      // Trackpad pinch (ctrl+wheel): cumulative factor, snapped by caller.
      if (e.ctrlKey) {
        if (!wheelActive) {
          wheelActive = true
          wheelFactor = 1
          callbacksRef.current.onGestureStart?.(center)
        }
        wheelFactor *= Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY)
        callbacksRef.current.onZoomTo?.(wheelFactor, center)
        scheduleWheelEnd()
        return
      }

      // Mouse wheel: one snap stop per notch.
      const direction: 1 | -1 = delta > 0 ? -1 : 1
      callbacksRef.current.onWheelZoomStep?.(direction, center)
    }

    target.addEventListener("pointerdown", onPointerDown)
    target.addEventListener("pointermove", onPointerMove, { passive: false })
    target.addEventListener("pointerup", onPointerUp)
    target.addEventListener("pointercancel", onPointerUp)
    target.addEventListener("wheel", onWheel, { passive: false, capture: true })

    return () => {
      target.removeEventListener("pointerdown", onPointerDown)
      target.removeEventListener("pointermove", onPointerMove)
      target.removeEventListener("pointerup", onPointerUp)
      target.removeEventListener("pointercancel", onPointerUp)
      target.removeEventListener("wheel", onWheel, { capture: true })
      if (wheelEndTimer != null) clearTimeout(wheelEndTimer)
      activePointers.clear()
      endPinchGesture()
      endWheelGesture()
    }
  }, [enabled, targetRef])
}
