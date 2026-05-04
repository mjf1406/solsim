import * as React from "react"
import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme/theme-provider"
import { Button } from "@/components/ui/button"

function subscribeHtmlDarkClass(onStoreChange: () => void) {
  const obs = new MutationObserver(onStoreChange)
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onStoreChange)
  return () => {
    obs.disconnect()
    mq.removeEventListener("change", onStoreChange)
  }
}

function useResolvedIsDark() {
  return React.useSyncExternalStore(
    subscribeHtmlDarkClass,
    () => document.documentElement.classList.contains("dark"),
    () => false
  )
}

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const isDark = useResolvedIsDark()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:text-foreground"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Moon aria-hidden className="size-4" />
      ) : (
        <Sun aria-hidden className="size-4" />
      )}
    </Button>
  )
}
