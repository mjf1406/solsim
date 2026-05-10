import { useId, useLayoutEffect, useRef, type RefObject } from "react"

import {
  LIGHT_SPEED_PHOTON_DIAMETER_PX,
  LIGHT_SPEED_TRAIL_WIDTH_PX,
  LIGHT_SPEED_WAVE_AMPLITUDE_PX,
} from "@/lib/solar-system/distance/light-speed"
import { cn } from "@/lib/utils"

function buildWavePath(
  width: number,
  height: number,
  amplitude: number,
  cycles: number
): string {
  const mid = height / 2
  const steps = 48
  const dx = width / steps
  let d = `M ${width} ${mid}`
  for (let i = 1; i <= steps; i++) {
    const x = width - i * dx
    const t = (i / steps) * cycles * Math.PI * 2
    const y = mid + amplitude * Math.sin(t)
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return d
}

const TRAIL_HEIGHT = LIGHT_SPEED_WAVE_AMPLITUDE_PX * 2 + 24
const WAVE_CYCLES = 3.5

const wavePath = buildWavePath(
  LIGHT_SPEED_TRAIL_WIDTH_PX,
  TRAIL_HEIGHT,
  LIGHT_SPEED_WAVE_AMPLITUDE_PX,
  WAVE_CYCLES
)

export function LightSpeedPhoton({
  wrapperRef,
  active,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>
  active: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const waveGradId = useId().replace(/:/g, "")

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
      const vw = w.clientWidth
      const cx = w.scrollLeft + vw / 2
      el.style.left = `${cx}px`
      el.style.top = `${w.clientHeight / 2}px`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, wrapperRef])

  if (!active) return null

  const r = LIGHT_SPEED_PHOTON_DIAMETER_PX / 2

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
        className="absolute overflow-visible"
        style={{
          right: r + 2,
          top: "50%",
          width: LIGHT_SPEED_TRAIL_WIDTH_PX,
          height: TRAIL_HEIGHT,
          transform: "translateY(-50%)",
        }}
      >
        <svg
          className="light-speed-wave-shift h-full w-full overflow-visible"
          viewBox={`0 0 ${LIGHT_SPEED_TRAIL_WIDTH_PX} ${TRAIL_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={waveGradId}
              x1="100%"
              y1="0%"
              x2="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(254,240,138,0.95)" />
              <stop offset="55%" stopColor="rgba(251,191,36,0.45)" />
              <stop offset="100%" stopColor="rgba(251,191,36,0)" />
            </linearGradient>
          </defs>
          <path
            d={wavePath}
            fill="none"
            stroke={`url(#${waveGradId})`}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={wavePath}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth={0.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="light-speed-wave-shift-delay"
          />
        </svg>
      </div>

      <div
        className="relative rounded-full bg-white"
        style={{
          width: LIGHT_SPEED_PHOTON_DIAMETER_PX,
          height: LIGHT_SPEED_PHOTON_DIAMETER_PX,
          boxShadow:
            "0 0 6px 2px rgba(254,240,138,0.95), 0 0 18px 6px rgba(251,191,36,0.65), 0 0 28px 10px rgba(245,158,11,0.35)",
        }}
      />
      <style>{`
        @keyframes lightSpeedWaveShift {
          from { transform: translateX(0); }
          to { transform: translateX(18px); }
        }
        .light-speed-wave-shift {
          animation: lightSpeedWaveShift 1.1s linear infinite;
        }
        .light-speed-wave-shift-delay {
          animation: lightSpeedWaveShift 1.1s linear infinite reverse;
          animation-delay: -0.35s;
        }
      `}</style>
    </div>
  )
}
