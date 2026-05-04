import { useCallback, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

import { useDismissibleLocalStorage } from "./use-dismissible-local-storage"

const tipVariants = {
  sky: {
    shell:
      "relative rounded-xl border border-sky-500/35 bg-sky-500/10 py-2.5 pr-10 pl-3 text-sm leading-snug",
    text: "text-sky-950/90 dark:text-sky-50/92",
    label: "font-medium text-sky-950 dark:text-sky-100",
    dismiss:
      "absolute top-1.5 right-1.5 text-sky-700/65 hover:text-sky-950 dark:text-sky-200/75 dark:hover:text-sky-100",
  },
  violet: {
    shell:
      "relative rounded-xl border border-violet-500/35 bg-violet-500/10 py-2.5 pr-10 pl-3 text-sm leading-snug",
    text: "text-violet-950/90 dark:text-violet-50/92",
    label: "font-medium text-violet-950 dark:text-violet-100",
    dismiss:
      "absolute top-1.5 right-1.5 text-violet-700/65 hover:text-violet-950 dark:text-violet-200/75 dark:hover:text-violet-100",
  },
} as const

export type DismissibleTipVariant = keyof typeof tipVariants

type DismissibleTipProps = {
  storageKey: string
  variant: DismissibleTipVariant
  dismissSrLabel: string
  children: ReactNode
  className?: string
  onDismissed?: () => void
}

export function DismissibleTip({
  storageKey,
  variant,
  dismissSrLabel,
  children,
  className,
  onDismissed,
}: DismissibleTipProps) {
  const { dismissed, dismiss } = useDismissibleLocalStorage(storageKey)
  const styles = tipVariants[variant]

  const handleDismiss = useCallback(() => {
    dismiss()
    onDismissed?.()
  }, [dismiss, onDismissed])

  if (dismissed) return null

  return (
    <div role="note" className={cn(styles.shell, className)}>
      <div className={styles.text}>{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(styles.dismiss)}
        onClick={handleDismiss}
      >
        <X className="size-3.5" />
        <span className="sr-only">{dismissSrLabel}</span>
      </Button>
    </div>
  )
}

/** Re-export for call sites that build “Tip:” lead copy with consistent label styling. */
export function DismissibleTipLabel({
  variant,
  children,
}: {
  variant: DismissibleTipVariant
  children: ReactNode
}) {
  const styles = tipVariants[variant]
  return <span className={styles.label}>{children}</span>
}
