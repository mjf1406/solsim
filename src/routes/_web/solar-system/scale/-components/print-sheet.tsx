import { cn } from "@/lib/utils"

import type { BodyPlacement, PrintArtMode, PrintPage } from "../-print-types"
import { ClippedScaledDisk, ClippedScaledDiskSvg, ScaledDisk } from "./scaled-disk"

function RegistrationMarks({
  marginMm,
  widthMm,
  heightMm,
}: {
  marginMm: number
  widthMm: number
  heightMm: number
}) {
  const markLen = 4
  const inset = marginMm
  const corners = [
    { x: inset, y: inset, dx: 1, dy: 1 },
    { x: widthMm - inset, y: inset, dx: -1, dy: 1 },
    { x: inset, y: heightMm - inset, dx: 1, dy: -1 },
    { x: widthMm - inset, y: heightMm - inset, dx: -1, dy: -1 },
  ]

  return (
    <>
      {corners.map((c, i) => (
        <g key={i}>
          <line
            x1={c.x}
            y1={c.y}
            x2={c.x + c.dx * markLen}
            y2={c.y}
            stroke="black"
            strokeWidth="0.2"
          />
          <line
            x1={c.x}
            y1={c.y}
            x2={c.x}
            y2={c.y + c.dy * markLen}
            stroke="black"
            strokeWidth="0.2"
          />
        </g>
      ))}
    </>
  )
}

function PlacementLabel({
  placement,
  style,
}: {
  placement: BodyPlacement
  style?: React.CSSProperties
}) {
  return (
    <div
      className="absolute text-center leading-tight text-black"
      style={{
        fontSize: "3mm",
        ...style,
      }}
    >
      <div className="font-medium">{placement.label}</div>
      {placement.subtitle ? (
        <div style={{ fontSize: "2.5mm", opacity: 0.7 }}>{placement.subtitle}</div>
      ) : null}
    </div>
  )
}

function BodyPlacementView({
  placement,
  artMode,
  mode,
  page,
  placementIndex,
}: {
  placement: BodyPlacement
  artMode: PrintArtMode
  mode: "preview" | "print"
  page: PrintPage
  placementIndex: number
}) {
  const body = placement.body
  if (!body) return null

  if (
    placement.kind === "sun_tile" ||
    placement.kind === "body_tile" ||
    placement.kind === "sun_limb"
  ) {
    if (
      placement.clipLeftMm == null ||
      placement.clipTopMm == null ||
      placement.clipWidthMm == null ||
      placement.clipHeightMm == null
    ) {
      return null
    }
    return (
      <>
        {mode === "print" ? (
          <ClippedScaledDiskSvg
            name={body.name}
            kind={body.kind}
            diameterMm={placement.diameterMm}
            artMode={artMode}
            centerXMm={placement.centerXMm}
            centerYMm={placement.centerYMm}
            clipLeftMm={placement.clipLeftMm}
            clipTopMm={placement.clipTopMm}
            clipWidthMm={placement.clipWidthMm}
            clipHeightMm={placement.clipHeightMm}
            sheetWidthMm={page.sheetWidthMm}
            sheetHeightMm={page.sheetHeightMm}
            clipId={`p${page.pageNumber}-pl${placementIndex}`}
          />
        ) : (
          <ClippedScaledDisk
            name={body.name}
            kind={body.kind}
            diameterMm={placement.diameterMm}
            artMode={artMode}
            centerXMm={placement.centerXMm}
            centerYMm={placement.centerYMm}
            clipLeftMm={placement.clipLeftMm}
            clipTopMm={placement.clipTopMm}
            clipWidthMm={placement.clipWidthMm}
            clipHeightMm={placement.clipHeightMm}
          />
        )}
        <PlacementLabel
          placement={placement}
          style={{
            left: `${placement.clipLeftMm}mm`,
            top: `${Math.max(0, placement.clipTopMm - 8)}mm`,
            width: `${placement.clipWidthMm}mm`,
          }}
        />
      </>
    )
  }

  const radius = placement.diameterMm / 2
  const labelWidth = placement.labelWidthMm ?? placement.diameterMm
  const labelTop = placement.centerYMm + radius + 2
  const diskLeft = placement.centerXMm - radius

  return (
    <>
      <div
        className="absolute"
        style={{
          left: `${diskLeft}mm`,
          top: `${placement.centerYMm - radius}mm`,
        }}
      >
        <ScaledDisk
          name={body.name}
          kind={body.kind}
          diameterMm={placement.diameterMm}
          artMode={artMode}
        />
      </div>
      <PlacementLabel
        placement={placement}
        style={{
          left: `${placement.centerXMm - labelWidth / 2}mm`,
          top: `${labelTop}mm`,
          width: `${labelWidth}mm`,
        }}
      />
    </>
  )
}

function SheetContent({
  page,
  artMode,
  mode,
}: {
  page: PrintPage
  artMode: PrintArtMode
  mode: "preview" | "print"
}) {
  return (
    <div
      className="relative h-full w-full"
      style={{
        width: `${page.sheetWidthMm}mm`,
        height: `${page.sheetHeightMm}mm`,
      }}
    >
      {page.title ? (
        <div
          className="absolute font-semibold"
          style={{
            left: `${page.marginMm}mm`,
            top: `${page.marginMm}mm`,
            fontSize: "4mm",
          }}
        >
          {page.title}
        </div>
      ) : null}

      {page.placements.map((placement, i) => {
        if (placement.kind === "appendix_line") {
          const colWidth =
            (page.printableWidthMm - 8) / 2
          return (
            <div
              key={i}
              className="absolute text-black"
              style={{
                left: `${placement.centerXMm}mm`,
                top: `${placement.centerYMm}mm`,
                fontSize: "3mm",
                maxWidth: `${colWidth - 4}mm`,
              }}
            >
              {placement.label}
            </div>
          )
        }

        return (
          <BodyPlacementView
            key={i}
            placement={placement}
            artMode={artMode}
            mode={mode}
            page={page}
            placementIndex={i}
          />
        )
      })}

      {page.placements.some((p) => p.showRegistrationMarks) ? (
        <svg
          className="pointer-events-none absolute inset-0"
          width={`${page.sheetWidthMm}mm`}
          height={`${page.sheetHeightMm}mm`}
          viewBox={`0 0 ${page.sheetWidthMm} ${page.sheetHeightMm}`}
        >
          <RegistrationMarks
            marginMm={page.marginMm}
            widthMm={page.sheetWidthMm}
            heightMm={page.sheetHeightMm}
          />
        </svg>
      ) : null}

      <div
        className="print-margin-guide pointer-events-none absolute border border-dashed border-black/20"
        style={{
          left: `${page.marginMm}mm`,
          top: `${page.marginMm}mm`,
          width: `${page.printableWidthMm}mm`,
          height: `${page.printableHeightMm}mm`,
        }}
      />
    </div>
  )
}

export type PrintSheetProps = {
  page: PrintPage
  artMode: PrintArtMode
  mode?: "preview" | "print"
  previewScale?: number
  className?: string
}

export function PrintSheet({
  page,
  artMode,
  mode = "preview",
  previewScale = 1,
  className,
}: PrintSheetProps) {
  if (mode === "print") {
    const printHeightMm = page.sheetHeightMm - 0.5
    return (
      <div
        className={cn("print-page overflow-hidden bg-white text-black", className)}
        style={{
          width: `${page.sheetWidthMm}mm`,
          height: `${printHeightMm}mm`,
        }}
        data-page={page.pageNumber}
      >
        <SheetContent page={page} artMode={artMode} mode={mode} />
      </div>
    )
  }

  const outerWidth = page.sheetWidthMm * previewScale
  const outerHeight = page.sheetHeightMm * previewScale

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{
        width: `${outerWidth}mm`,
        height: `${outerHeight}mm`,
      }}
    >
      <div
        className="absolute top-0 left-0 overflow-hidden bg-white text-black shadow-md"
        style={{
          width: `${page.sheetWidthMm}mm`,
          height: `${page.sheetHeightMm}mm`,
          transform: `scale(${previewScale})`,
          transformOrigin: "top left",
        }}
        data-page={page.pageNumber}
      >
        <SheetContent page={page} artMode={artMode} mode="preview" />
      </div>
    </div>
  )
}
