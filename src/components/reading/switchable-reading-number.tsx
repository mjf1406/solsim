import type { ReactNode } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PencilRuler } from "lucide-react"

/** Matches the unit-toggle control in the sidebar (tighter offset than tip copy). */
export const READING_NUMBER_TOGGLE_CLASSNAME =
  "font-inherit inline cursor-pointer border-0 bg-transparent p-0 text-inherit tabular-nums underline decoration-dotted underline-offset-8 hover:text-sidebar-foreground"

/** Sample style for education copy (“Numbers look like …”). */
export const READING_NUMBER_SAMPLE_CLASSNAME =
  "underline decoration-dotted underline-offset-1"

export function ReadingNumberExplainerIcon({
  className,
}: {
  className?: string
}) {
  return (
    <PencilRuler
      className={cn("inline-block size-4 shrink-0", className)}
      aria-hidden
    />
  )
}

type SwitchableReadingNumberProps = {
  children: ReactNode
  onToggleUnit: () => void
  numberAriaLabel: string
  explainerContent: ReactNode
  explainerTriggerAriaLabel?: string
  popoverContentClassName?: string
}

export function SwitchableReadingNumber({
  children,
  onToggleUnit,
  numberAriaLabel,
  explainerContent,
  explainerTriggerAriaLabel = "How to read this number",
  popoverContentClassName,
}: SwitchableReadingNumberProps) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      <button
        type="button"
        className={READING_NUMBER_TOGGLE_CLASSNAME}
        onClick={onToggleUnit}
        aria-label={numberAriaLabel}
      >
        {children}
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="-m-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
            aria-label={explainerTriggerAriaLabel}
          >
            <PencilRuler className="size-4 shrink-0" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className={cn(
            "border border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-sm",
            popoverContentClassName
          )}
        >
          {explainerContent}
        </PopoverContent>
      </Popover>
    </span>
  )
}
