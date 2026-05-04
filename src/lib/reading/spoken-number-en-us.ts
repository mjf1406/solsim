/** Names for integers 0–19 */
const ZERO_TO_NINETEEN = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const

/** Names for tens 20, 30, … 90 */
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
] as const

function under100(n: number): string {
  if (n < 20) return ZERO_TO_NINETEEN[n]!
  const ten = Math.floor(n / 10)
  const one = n % 10
  if (one === 0) return TENS[ten]!
  return `${TENS[ten]}-${ZERO_TO_NINETEEN[one]}`
}

function under1000(n: number): string {
  if (n === 0) return ""
  if (n < 100) return under100(n)
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const head = `${ZERO_TO_NINETEEN[hundreds]} hundred`
  if (rest === 0) return head
  return `${head} ${under100(rest)}`
}

/** Non‑negative integers only; fits Solar System diameter magnitudes. */
function integerToEnglishWordsNonNegative(n: number): string {
  if (n === 0) return "zero"

  const parts: string[] = []
  let remaining = n

  const billions = Math.floor(remaining / 1_000_000_000)
  if (billions > 0) {
    parts.push(`${under1000(billions)} billion`)
    remaining %= 1_000_000_000
  }

  const millions = Math.floor(remaining / 1_000_000)
  if (millions > 0) {
    parts.push(`${under1000(millions)} million`)
    remaining %= 1_000_000
  }

  const thousands = Math.floor(remaining / 1000)
  if (thousands > 0) {
    parts.push(`${under1000(thousands)} thousand`)
    remaining %= 1000
  }

  if (remaining > 0) {
    parts.push(under1000(remaining))
  }

  return parts.join(" ")
}

/**
 * Lowercase English words for `n`, using the same rounding as
 * `toLocaleString("en-US", { maximumFractionDigits: 1 })` without grouping.
 */
export function spokenNumberEnUsMaxOneDecimal(n: number): string {
  if (!Number.isFinite(n)) return ""

  const formatted = n.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    useGrouping: false,
  })

  const dot = formatted.indexOf(".")
  const intRaw = dot === -1 ? formatted : formatted.slice(0, dot)
  const decRaw = dot === -1 ? undefined : formatted.slice(dot + 1)
  const intNum = Number.parseInt(intRaw, 10)

  let words = integerToEnglishWordsNonNegative(intNum)

  if (decRaw !== undefined && decRaw !== "") {
    const tenth = Number.parseInt(decRaw.charAt(0), 10)
    if (Number.isFinite(tenth) && tenth !== 0) {
      words += ` point ${ZERO_TO_NINETEEN[tenth]}`
    }
  }

  return words
}
