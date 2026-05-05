import { useCallback, useEffect, useRef } from "react"

export type PointerDragDeltaStartArgs = {
  event: PointerEvent
  /** Element that receives `setPointerCapture` after the drag threshold is crossed. */
  captureTarget: HTMLElement
  /** Movement in CSS pixels from pointer down before capture and `onMove` run. */
  dragThresholdPx: number
  onMove: (dx: number, dy: number) => void
  onEnd: () => void
}

/**
 * Pointer drag with optional movement threshold, `setPointerCapture` after the
 * threshold, and `pointermove` / `pointerup` on `window` so drags continue
 * outside the target. Deltas are in the same space as `clientX` / `clientY`
 * (viewport CSS px), which matches fixed-layout canvas movement when the
 * element is not CSS-transformed.
 *
 * Pair with `touch-action: none` on the capture target so touch drags are not
 * eaten by browser scrolling; while dragging, `preventDefault` is used on
 * `pointermove` (listener is non-passive).
 */
export function usePointerDragDelta() {
  const cleanupRef = useRef<(() => void) | null>(null)

  const endSession = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  const startSession = useCallback(
    (args: PointerDragDeltaStartArgs) => {
      endSession()
      const { event, captureTarget, dragThresholdPx, onMove, onEnd } = args
      const pointerId = event.pointerId
      const startX = event.clientX
      const startY = event.clientY
      let lastX = startX
      let lastY = startY
      let active = dragThresholdPx <= 0
      if (active) {
        try {
          captureTarget.setPointerCapture(pointerId)
        } catch {
          /* already captured or unsupported */
        }
      }

      const onWindowMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        if (!active) {
          const dist = Math.hypot(e.clientX - startX, e.clientY - startY)
          if (dist >= dragThresholdPx) {
            e.preventDefault()
            active = true
            try {
              captureTarget.setPointerCapture(pointerId)
            } catch {
              /* already captured or unsupported */
            }
            lastX = e.clientX
            lastY = e.clientY
          }
          return
        }
        e.preventDefault()
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        lastX = e.clientX
        lastY = e.clientY
        onMove(dx, dy)
      }

      const onWindowUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return
        cleanup()
        onEnd()
      }

      const cleanup = () => {
        window.removeEventListener("pointermove", onWindowMove)
        window.removeEventListener("pointerup", onWindowUp)
        window.removeEventListener("pointercancel", onWindowUp)
        if (active) {
          try {
            captureTarget.releasePointerCapture(pointerId)
          } catch {
            /* not captured */
          }
        }
      }

      window.addEventListener("pointermove", onWindowMove, {
        passive: false,
      })
      window.addEventListener("pointerup", onWindowUp)
      window.addEventListener("pointercancel", onWindowUp)
      cleanupRef.current = cleanup
    },
    [endSession]
  )

  useEffect(() => () => endSession(), [endSession])

  return { startSession, endSession }
}
