import { useMemo } from "react"

import { KofiDonation } from "@/components/third-party-brands/kofi-button"
import { PatreonDonation } from "@/components/third-party-brands/patreon-button"

/**
 * Maintainer: update totals here when you refresh this section.
 * Amounts are USD.
 */
const EXPENSE_LINE_ITEMS: ReadonlyArray<{
  id: string
  category: string
  amount: number
}> = [
  { id: "domain", category: "Domain", amount: 7.5 },
  { id: "art", category: "Art assets", amount: 195.47 },
]

/** Individual donations (USD). Dates are ISO `YYYY-MM-DD`. Maintainer: append rows as they come in. */
const DONATION_LINE_ITEMS: ReadonlyArray<{
  id: string
  date: string
  amount: number
}> = []

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDonationDate(isoDate: string) {
  const parts = isoDate.split("-").map(Number)
  const [y, m, d] = parts
  if (parts.length !== 3 || !y || !m || !d) return isoDate
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function AboutDonateSection() {
  const expenseSum = useMemo(
    () => EXPENSE_LINE_ITEMS.reduce((acc, row) => acc + row.amount, 0),
    []
  )

  const donationSum = useMemo(
    () => DONATION_LINE_ITEMS.reduce((acc, row) => acc + row.amount, 0),
    []
  )

  const surplus =
    donationSum > 0 && expenseSum > 0 ? donationSum - expenseSum : null

  return (
    <section
      id="donations"
      aria-labelledby="donations-heading"
      className="scroll-mt-28 space-y-3"
    >
      <h2
        id="donations-heading"
        className="font-heading text-2xl font-semibold tracking-tight"
      >
        Donations
      </h2>
      <p className="leading-relaxed text-muted-foreground">
        Show your support by subscribing to my Patreon or buying me a tea 😁
      </p>
      <p className="leading-relaxed text-muted-foreground">
        I have spent a lot of time on this website. If you and/or your students
        have gotten any use out of it, please consider donating via any of the
        below methods.
      </p>
      <div className="flex flex-wrap gap-5 pt-1">
        <KofiDonation />
        <PatreonDonation />
      </div>

      <div className="space-y-4 pt-8">
        <h3 className="font-heading text-lg font-semibold tracking-tight">
          Where donations go
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Here is how support is allocated. Listed donations and costs are
          updated periodically in the site source.
        </p>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[18rem] text-left text-sm">
            <caption className="border-b px-3 py-2 text-left text-muted-foreground">
              Donations received (USD)
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {DONATION_LINE_ITEMS.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No donations recorded yet.
                  </td>
                </tr>
              ) : (
                DONATION_LINE_ITEMS.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDonationDate(row.date)}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {formatUsd(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium">
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  Total
                </th>
                <td className="px-3 py-2 tabular-nums">
                  {formatUsd(donationSum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[18rem] text-left text-sm">
            <caption className="border-b px-3 py-2 text-left text-muted-foreground">
              Spending breakdown (USD)
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Category
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Amount
                </th>
                {donationSum > 0 ? (
                  <th scope="col" className="px-3 py-2 font-medium">
                    Share of donations
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {EXPENSE_LINE_ITEMS.map((row) => {
                const donationShare =
                  donationSum > 0 ? (row.amount / donationSum) * 100 : null
                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {formatUsd(row.amount)}
                    </td>
                    {donationShare != null ? (
                      <td className="px-3 py-2 text-muted-foreground tabular-nums">
                        {donationShare.toFixed(1)}%
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
            {expenseSum > 0 ? (
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    Total costs
                  </th>
                  <td className="px-3 py-2 tabular-nums">
                    {formatUsd(expenseSum)}
                  </td>
                  {donationSum > 0 ? (
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {((expenseSum / donationSum) * 100).toFixed(1)}%
                    </td>
                  ) : null}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        {donationSum > 0 && expenseSum > 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {surplus != null && surplus >= 0 ? (
              <>
                Listed donations ({formatUsd(donationSum)}) cover these costs
                with{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatUsd(surplus)}
                </span>{" "}
                left after these costs.
              </>
            ) : (
              <>
                These costs ({formatUsd(expenseSum)}) exceed listed donations (
                {formatUsd(donationSum)}) by{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatUsd(Math.abs(surplus ?? 0))}
                </span>
                — the gap is covered from other sources until support catches
                up.
              </>
            )}
          </p>
        ) : null}
      </div>
    </section>
  )
}
