import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react"
import { createPortal } from "react-dom"

type SizeSelectionAttentionOverlayProps = {
  /** Viewport client coordinates */
  target: { x: number; y: number }
  /** Changes restart beam geometry / timers */
  playId: number
  onDone: () => void
}

export function SizeSelectionAttentionOverlay({
  target,
  playId,
  onDone,
}: SizeSelectionAttentionOverlayProps) {
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1,
    h: typeof window !== "undefined" ? window.innerHeight : 1,
  }))
  useEffect(() => {
    const ro = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    window.addEventListener("resize", ro)
    return () => window.removeEventListener("resize", ro)
  }, [])

  const edges = useMemo(
    () => [
      { x1: viewport.w / 2, y1: 0, x2: target.x, y2: target.y },
      { x1: viewport.w / 2, y1: viewport.h, x2: target.x, y2: target.y },
      { x1: 0, y1: viewport.h / 2, x2: target.x, y2: target.y },
      { x1: viewport.w, y1: viewport.h / 2, x2: target.x, y2: target.y },
    ],
    [target.x, target.y, viewport.w, viewport.h]
  )

  const lengths = useMemo(
    () =>
      edges.map((e) =>
        Math.hypot(e.x2 - e.x1, e.y2 - e.y1)
      ),
    [edges]
  )

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ms = reduced ? 280 : 880
    const id = window.setTimeout(onDone, ms)
    return () => window.clearTimeout(id)
  }, [playId, onDone])

  const portalTarget =
    typeof document !== "undefined" ? document.body : null
  if (!portalTarget) return null

  return createPortal(
    <svg
      className="selection-attention-overlay-wrap pointer-events-none fixed inset-0 z-15 size-full"
      width={viewport.w}
      height={viewport.h}
      viewBox={`0 0 ${viewport.w} ${viewport.h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {edges.map((e, i) => (
        <line
          key={`${playId}-${i}`}
          className="selection-attention-beam-line"
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="rgb(56 189 248)"
          strokeOpacity={0.85}
          strokeWidth={2}
          strokeLinecap="round"
          style={
            {
              strokeDasharray: lengths[i],
              strokeDashoffset: lengths[i],
              animationDelay: `${i * 45}ms`,
            } satisfies CSSProperties
          }
        />
      ))}
    </svg>,
    portalTarget
  )
}
