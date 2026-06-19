import { useEffect, useLayoutEffect, useRef, type RefObject } from "react"

import {
  LIGHT_SPEED_PARTICLE_COUNT,
  lightSpeedParticleSpeedPxPerSec,
  lightSpeedParticleStreakLengthPx,
} from "@/lib/solar-system/distance/light-speed"
import { cn } from "@/lib/utils"

type Particle = {
  x: number
  y: number
  lengthJitter: number
  opacity: number
}

function spawnParticle(viewportW: number, viewportH: number): Particle {
  return {
    x: viewportW + Math.random() * viewportW * 0.4,
    y: Math.random() * viewportH,
    lengthJitter: 0.7 + Math.random() * 0.6,
    opacity: 0.15 + Math.random() * 0.35,
  }
}

function initParticles(viewportW: number, viewportH: number): Particle[] {
  return Array.from({ length: LIGHT_SPEED_PARTICLE_COUNT }, () => {
    const p = spawnParticle(viewportW, viewportH)
    p.x = Math.random() * viewportW
    return p
  })
}

export function LightSpeedParticles({
  wrapperRef,
  active,
  multiplier,
}: {
  wrapperRef: RefObject<HTMLDivElement | null>
  active: boolean
  multiplier: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const multiplierRef = useRef(multiplier)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    multiplierRef.current = multiplier
  }, [multiplier])

  useLayoutEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let width = 0
    let height = 0

    const resize = () => {
      const w = wrapper.clientWidth
      const h = wrapper.clientHeight
      if (w <= 0 || h <= 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = w
      height = h
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (particlesRef.current.length === 0) {
        particlesRef.current = initParticles(w, h)
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrapper)

    const tick = (now: number) => {
      const w = wrapperRef.current
      const c = canvasRef.current
      if (!w || !c || width <= 0 || height <= 0) {
        raf = requestAnimationFrame(tick)
        return
      }

      const dt = Math.min(0.08, Math.max(0, (now - last) / 1000))
      last = now

      const mult = multiplierRef.current
      const speed = lightSpeedParticleSpeedPxPerSec(mult)
      const baseLength = lightSpeedParticleStreakLengthPx(mult)
      const particles = particlesRef.current

      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x -= speed * dt
        const streakLen = baseLength * p.lengthJitter

        if (p.x + streakLen < 0) {
          const next = spawnParticle(width, height)
          p.x = next.x
          p.y = next.y
          p.lengthJitter = next.lengthJitter
          p.opacity = next.opacity
        }

        const x0 = p.x
        const x1 = p.x + streakLen
        const grad = ctx.createLinearGradient(x0, p.y, x1, p.y)
        grad.addColorStop(0, `rgba(255,255,255,0)`)
        grad.addColorStop(0.35, `rgba(254,240,138,${p.opacity * 0.5})`)
        grad.addColorStop(1, `rgba(251,191,36,${p.opacity})`)

        ctx.strokeStyle = grad
        ctx.lineWidth = 1 + Math.min(2, streakLen / 80)
        ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(x0, p.y)
        ctx.lineTo(x1, p.y)
        ctx.stroke()
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      particlesRef.current = []
    }
  }, [active, wrapperRef])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-(--app-header-h) z-[20]",
        "h-[calc(100svh-var(--app-header-h))] w-full"
      )}
      aria-hidden
    />
  )
}
