import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { PAPER_FORMATS } from "@/lib/solar-system/scale/paper-formats"
import { cn } from "@/lib/utils"

import type { PrintLayoutResult, PrintConfig } from "../-print-types"
import { PrintSheet } from "./print-sheet"

const FALLBACK_PREVIEW_SCALE = 0.55
const MAX_PREVIEW_SCALE = 0.72

function usePreviewScale(sheetWidthMm: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(FALLBACK_PREVIEW_SCALE)

  useEffect(() => {
    const el = containerRef.current
    if (!el || sheetWidthMm <= 0) return

    const update = (widthPx: number) => {
      if (widthPx > 0) {
        setPreviewScale(
          Math.min(MAX_PREVIEW_SCALE, widthPx / sheetWidthMm)
        )
      }
    }

    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      update(width)
    })
    ro.observe(el)
    update(el.getBoundingClientRect().width)

    return () => ro.disconnect()
  }, [sheetWidthMm])

  return { containerRef, previewScale }
}

function pageSizeCss(config: PrintConfig): string {
  const format = PAPER_FORMATS[config.paperId]
  const widthMm =
    config.orientation === "portrait" ? format.widthMm : format.heightMm
  const heightMm =
    config.orientation === "portrait" ? format.heightMm : format.widthMm
  return `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`
}

export type PrintPreviewProps = {
  layout: PrintLayoutResult
  config: PrintConfig
  className?: string
}

export function PrintPreview({ layout, config, className }: PrintPreviewProps) {
  const sheetWidthMm = layout.pages[0]?.sheetWidthMm ?? 210
  const { containerRef, previewScale } = usePreviewScale(sheetWidthMm)

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label="Print preview"
    >
      <h2 className="font-heading text-lg font-semibold">Sheet preview</h2>
      <div
        ref={containerRef}
        className="flex w-full flex-col items-center gap-6"
      >
        {layout.pages.map((page) => (
          <div key={page.pageNumber} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Page {page.pageNumber} — {page.section}
            </span>
            <PrintSheet
              page={page}
              artMode={config.artMode}
              mode="preview"
              previewScale={previewScale}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export type PrintRootProps = {
  layout: PrintLayoutResult
  config: PrintConfig
}

/** Hidden print-only container; shown via @media print CSS. */
export function PrintRoot({ layout, config }: PrintRootProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null)

  const applyPageSize = () => {
    const css = pageSizeCss(config)
    if (styleRef.current) {
      styleRef.current.textContent = css
    } else {
      const el = document.createElement("style")
      el.setAttribute("data-print-page-size", config.paperId)
      el.textContent = css
      document.head.appendChild(el)
      styleRef.current = el
    }
  }

  useEffect(() => {
    applyPageSize()
    const onBeforePrint = () => applyPageSize()
    window.addEventListener("beforeprint", onBeforePrint)
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint)
      styleRef.current?.remove()
      styleRef.current = null
    }
  }, [config])

  return createPortal(
    <div className="print-root">
      {layout.pages.map((page) => (
        <PrintSheet
          key={page.pageNumber}
          page={page}
          artMode={config.artMode}
          mode="print"
        />
      ))}
    </div>,
    document.body
  )
}

export function triggerPrint(): void {
  window.print()
}
