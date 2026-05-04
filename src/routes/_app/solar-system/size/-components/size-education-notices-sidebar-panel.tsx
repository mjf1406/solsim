import { useReducer } from "react"

import {
  DismissibleTip,
  DismissibleTipLabel,
} from "@/components/banners/dismissible-tip"
import { WarningBanner } from "@/components/banners/warning-banner"
import { ReadingKeyword } from "@/components/reading/reading-keyword"
import {
  ReadingNumberExplainerIcon,
  READING_NUMBER_SAMPLE_CLASSNAME,
} from "@/components/reading/switchable-reading-number"

const HEADS_UP_DISMISSED_KEY = "solsim.solar-system.size.heads-up-dismissed"
const KEYWORD_TIP_DISMISSED_KEY =
  "solsim.solar-system.size.keyword-tip-dismissed"
const DIAMETER_UNITS_TIP_DISMISSED_KEY =
  "solsim.solar-system.size.diameter-units-tip-dismissed"
const READ_BIG_NUMBER_TIP_DISMISSED_KEY =
  "solsim.solar-system.size.read-big-number-tip-dismissed"

const EDUCATION_NOTICE_KEYS = [
  HEADS_UP_DISMISSED_KEY,
  KEYWORD_TIP_DISMISSED_KEY,
  DIAMETER_UNITS_TIP_DISMISSED_KEY,
  READ_BIG_NUMBER_TIP_DISMISSED_KEY,
] as const

function allEducationNoticesDismissed() {
  if (typeof window === "undefined") return false
  return EDUCATION_NOTICE_KEYS.every(
    (key) => window.localStorage.getItem(key) === "1"
  )
}

/** Education notices above sidebar body detail; sticky and individually dismissable. */
export function SizePageEducationNoticesSidebarContent() {
  const [, bumpStrip] = useReducer((count: number) => count + 1, 0)

  if (allEducationNoticesDismissed()) return null

  return (
    <div className="sticky top-0 z-1 flex shrink-0 flex-col gap-2 pb-2">
      <WarningBanner
        storageKey={HEADS_UP_DISMISSED_KEY}
        dismissSrLabel="Dismiss heads up notice"
        title="Heads up"
        onDismissed={bumpStrip}
      >
        <p className="mt-1 text-sidebar-foreground/90">
          This page is only about sizes. It shows how wide the Sun, planets, and
          other bodies are.{" "}
        </p>
        <p className="mt-2 text-sidebar-foreground/90">
          All the diameters on this page are to scale. The default scale is 1 px
          = 3,474.8 km (Moon's diameter).
        </p>
      </WarningBanner>

      <DismissibleTip
        storageKey={KEYWORD_TIP_DISMISSED_KEY}
        variant="sky"
        dismissSrLabel="Dismiss keyword tip"
        onDismissed={bumpStrip}
      >
        <p>
          <DismissibleTipLabel variant="sky">Tip:</DismissibleTipLabel> Key
          words look like <ReadingKeyword>this</ReadingKeyword>. Tap one to
          learn what it means.
        </p>
      </DismissibleTip>

      <DismissibleTip
        storageKey={DIAMETER_UNITS_TIP_DISMISSED_KEY}
        variant="sky"
        dismissSrLabel="Dismiss unit switcher tip"
        onDismissed={bumpStrip}
      >
        <p>
          <DismissibleTipLabel variant="sky">Tip:</DismissibleTipLabel> Numbers
          look like{" "}
          <span className={READING_NUMBER_SAMPLE_CLASSNAME}>this</span>. Tap
          one to switch between units, like switching between kilometers and
          miles.
        </p>
      </DismissibleTip>

      <DismissibleTip
        storageKey={READ_BIG_NUMBER_TIP_DISMISSED_KEY}
        variant="violet"
        dismissSrLabel="Dismiss reading big numbers tip"
        onDismissed={bumpStrip}
      >
        <p>
          <DismissibleTipLabel variant="violet">Tip:</DismissibleTipLabel> Tap
          the <ReadingNumberExplainerIcon /> icon next to a big number to learn
          how to read it.
        </p>
      </DismissibleTip>
    </div>
  )
}
