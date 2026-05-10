import type { LightSpeedMultiplier } from "@/lib/solar-system/distance/light-speed"

export function LightSpeedBanner({
  multiplier,
}: {
  multiplier: LightSpeedMultiplier
}) {
  const title =
    multiplier === 1
      ? "You are now traveling at the speed of light"
      : `You are now traveling at ${multiplier}× the speed of light`

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[25] overflow-visible px-3 pt-2 pb-3 sm:px-6"
      style={{ top: "var(--app-header-h)" }}
      aria-live="polite"
    >
      <div className="mx-auto max-w-4xl overflow-visible rounded-2xl border border-border/60 bg-background/75 px-4 py-3 text-center shadow-lg backdrop-blur-md sm:px-6 sm:py-4">
        {/* Wrapped headline — nowrap + scroll still clipped in some layouts; balance keeps full text visible */}
        <h2 className="font-heading text-balance break-words text-center text-2xl leading-snug tracking-tight text-foreground sm:text-4xl sm:leading-tight md:text-5xl">
          {title}
        </h2>
        <p className="mt-3 text-pretty text-sm leading-snug text-foreground/90 sm:text-base">
          Light is special because it is both a particle and a wave. The
          particle is called the{" "}
          <span className="font-medium text-foreground">photon</span>, which you
          can see as the glowing disc. And the wave is an{" "}
          <span className="font-medium text-foreground">electromagnetic wave</span>, which
          you can see represented by the squiggly line behind the photon.
        </p>
        <p className="mt-2 text-pretty text-xs italic leading-snug text-muted-foreground sm:text-sm">
          Light particles (photons) are not really this big — they&apos;re
          enlarged here so you can see them easily.
        </p>
      </div>
    </div>
  )
}
