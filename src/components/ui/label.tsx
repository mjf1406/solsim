import * as React from "react"
import { Label as LabelNamespace } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelNamespace.Root>) {
  return (
    <LabelNamespace.Root
      data-slot="label"
      className={cn(
        "text-sm font-medium leading-none text-foreground select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
