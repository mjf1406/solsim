import { useCallback, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

import { useDismissibleLocalStorage } from "./use-dismissible-local-storage"

type WarningBannerProps = {
  storageKey: string
  dismissSrLabel: string
  title?: ReactNode
  children: ReactNode
  className?: string
  /** Called after dismiss is persisted (e.g. parent re-checks whether the whole strip should hide). */
  onDismissed?: () => void
}

export function WarningBanner({
  storageKey,
  dismissSrLabel,
  title,
  children,
  className,
  onDismissed,
}: WarningBannerProps) {
  const { dismissed, dismiss } = useDismissibleLocalStorage(storageKey)

  const handleDismiss = useCallback(() => {
    dismiss()
    onDismissed?.()
  }, [dismiss, onDismissed])

  if (dismissed) return null

  return (
    <div
      role="note"
      className={cn(
        "relative rounded-xl border border-amber-500/45 bg-amber-500/20 py-2.5 pr-10 pl-3 text-sm leading-snug text-sidebar-foreground",
        className
      )}
    >
      {title != null ? (
        <p className="font-medium text-amber-950 dark:text-amber-100">{title}</p>
      ) : null}
      {children}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-1.5 right-1.5 text-amber-900/55 hover:text-amber-950 dark:text-amber-100/65 dark:hover:text-amber-100"
        onClick={handleDismiss}
      >
        <X className="size-3.5" />
        <span className="sr-only">{dismissSrLabel}</span>
      </Button>
    </div>
  )
}
