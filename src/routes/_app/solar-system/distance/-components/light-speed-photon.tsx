import { useLayoutEffect, useRef, type RefObject } from "react"

import { LIGHT_SPEED_PHOTON_DIAMETER_PX } from "@/lib/solar-system/distance/light-speed"
import { cn } from "@/lib/utils"

export function LightSpeedPhoton({
  wrapperRef,
  worldXRef,
  active,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>
  worldXRef: RefObject<number | null>
  active: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    const root = rootRef.current
    const wrapper = wrapperRef.current
    if (!root || !wrapper) return

    let raf = 0
    const tick = () => {
      const w = wrapperRef.current
      const el = rootRef.current
      if (!w || !el) return
      const cx = worldXRef.current ?? w.scrollLeft + w.clientWidth / 2
      el.style.left = `${cx}px`
      el.style.top = `${w.clientHeight / 2}px`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, wrapperRef, worldXRef])

  if (!active) return null

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute z-[45]",
        "-translate-x-1/2 -translate-y-1/2"
      )}
      aria-hidden
    >
      <div
        className="rounded-full bg-white"
        style={{
          width: LIGHT_SPEED_PHOTON_DIAMETER_PX,
          height: LIGHT_SPEED_PHOTON_DIAMETER_PX,
          boxShadow:
            "0 0 6px 2px rgba(254,240,138,0.95), 0 0 18px 6px rgba(251,191,36,0.65), 0 0 28px 10px rgba(245,158,11,0.35)",
        }}
      />
    </div>
  )
}
