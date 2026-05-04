import { useCallback, useState } from "react"

export function useDismissibleLocalStorage(storageKey: string) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(storageKey) === "1"
  })

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      window.localStorage.setItem(storageKey, "1")
    } catch {
      /* storage full or unavailable */
    }
  }, [storageKey])

  return { dismissed, dismiss }
}
