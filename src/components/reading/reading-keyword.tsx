import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const variants = {
  tip: "font-bold italic",
  inline: "cursor-pointer font-extrabold italic hover:text-primary/90",
} as const

export type ReadingKeywordVariant = keyof typeof variants

export type ReadingKeywordProps = ComponentPropsWithoutRef<"span"> & {
  variant?: ReadingKeywordVariant
  /** When set, the keyword is wrapped in a popover trigger and opens this content */
  popoverContent?: ReactNode
  popoverProps?: ComponentPropsWithoutRef<typeof Popover>
  popoverContentProps?: ComponentPropsWithoutRef<typeof PopoverContent>
}

export const ReadingKeyword = forwardRef<HTMLSpanElement, ReadingKeywordProps>(
  function ReadingKeyword(
    {
      className,
      variant = "tip",
      popoverContent,
      popoverProps,
      popoverContentProps,
      ...props
    },
    ref
  ) {
    const keyword = (
      <span
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      />
    )

    if (popoverContent == null) {
      return keyword
    }

    return (
      <Popover {...popoverProps}>
        <PopoverTrigger asChild>{keyword}</PopoverTrigger>
        <PopoverContent {...popoverContentProps}>{popoverContent}</PopoverContent>
      </Popover>
    )
  }
)
