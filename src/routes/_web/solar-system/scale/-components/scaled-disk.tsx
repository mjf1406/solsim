import { placeholderSrc } from "@/lib/solar-system/placeholders"
import type { SizeBodyKind } from "@/routes/_app/solar-system/size/-data"
import { cn } from "@/lib/utils"

import type { PrintArtMode } from "../-print-types"

export type ScaledDiskProps = {
  name: string
  kind: SizeBodyKind
  diameterMm: number
  artMode: PrintArtMode
  className?: string
}

export function ScaledDisk({
  name,
  kind,
  diameterMm,
  artMode,
  className,
}: ScaledDiskProps) {
  if (!(diameterMm > 0)) return null

  if (artMode === "outline") {
    return (
      <div
        className={cn("box-border rounded-full border-black bg-transparent", className)}
        style={{
          width: `${diameterMm}mm`,
          height: `${diameterMm}mm`,
          borderWidth: "0.4mm",
        }}
        aria-hidden
      />
    )
  }

  const src = placeholderSrc(name, kind)
  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{
        width: `${diameterMm}mm`,
        height: `${diameterMm}mm`,
        borderRadius: "50%",
      }}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

export type ClippedScaledDiskProps = ScaledDiskProps & {
  centerXMm: number
  centerYMm: number
  clipLeftMm: number
  clipTopMm: number
  clipWidthMm: number
  clipHeightMm: number
}

export type ClippedScaledDiskSvgProps = ClippedScaledDiskProps & {
  sheetWidthMm: number
  sheetHeightMm: number
  clipId: string
}

/** SVG-based tile clip for print — reliable in Chrome PDF vs nested overflow divs. */
export function ClippedScaledDiskSvg({
  name,
  kind,
  diameterMm,
  artMode,
  centerXMm,
  centerYMm,
  clipLeftMm,
  clipTopMm,
  clipWidthMm,
  clipHeightMm,
  sheetWidthMm,
  sheetHeightMm,
  clipId,
}: ClippedScaledDiskSvgProps) {
  const radius = diameterMm / 2
  const viewportClipId = `${clipId}-viewport`
  const circleClipId = `${clipId}-circle`

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={`${sheetWidthMm}mm`}
      height={`${sheetHeightMm}mm`}
      viewBox={`0 0 ${sheetWidthMm} ${sheetHeightMm}`}
      aria-hidden
    >
      <defs>
        <clipPath id={viewportClipId}>
          <rect
            x={clipLeftMm}
            y={clipTopMm}
            width={clipWidthMm}
            height={clipHeightMm}
          />
        </clipPath>
        {artMode === "full" ? (
          <clipPath id={circleClipId}>
            <circle cx={centerXMm} cy={centerYMm} r={radius} />
          </clipPath>
        ) : null}
      </defs>
      <g clipPath={`url(#${viewportClipId})`}>
        {artMode === "outline" ? (
          <circle
            cx={centerXMm}
            cy={centerYMm}
            r={radius}
            fill="none"
            stroke="black"
            strokeWidth={0.4}
          />
        ) : (
          <g clipPath={`url(#${circleClipId})`}>
            <image
              href={placeholderSrc(name, kind)}
              x={centerXMm - radius}
              y={centerYMm - radius}
              width={diameterMm}
              height={diameterMm}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        )}
      </g>
    </svg>
  )
}

/** Disk positioned in sheet space, clipped to a viewport (sun tiles / limb). */
export function ClippedScaledDisk({
  name,
  kind,
  diameterMm,
  artMode,
  centerXMm,
  centerYMm,
  clipLeftMm,
  clipTopMm,
  clipWidthMm,
  clipHeightMm,
}: ClippedScaledDiskProps) {
  const radius = diameterMm / 2
  const left = centerXMm - radius
  const top = centerYMm - radius

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: `${clipLeftMm}mm`,
        top: `${clipTopMm}mm`,
        width: `${clipWidthMm}mm`,
        height: `${clipHeightMm}mm`,
      }}
    >
      <div
        className="absolute"
        style={{
          left: `${left - clipLeftMm}mm`,
          top: `${top - clipTopMm}mm`,
        }}
      >
        <ScaledDisk
          name={name}
          kind={kind}
          diameterMm={diameterMm}
          artMode={artMode}
        />
      </div>
    </div>
  )
}
