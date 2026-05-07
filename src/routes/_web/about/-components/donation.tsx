import { useMemo, useState } from "react"

import { KofiDonation } from "@/components/third-party-brands/kofi-button"
import { PatreonDonation } from "@/components/third-party-brands/patreon-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Maintainer: update totals here when you refresh this section.
 * Amounts are USD.
 */
const DEFAULT_REPORTED_TOTAL_DONATED = ""

const EXPENSE_LINE_ITEMS: ReadonlyArray<{
  id: string
  category: string
  amount: number
}> = [
  { id: "domain", category: "Domain", amount: 7.5 },
  { id: "art", category: "Art assets", amount: 175 },
]

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function AboutDonateSection() {
  const [totalDonatedInput, setTotalDonatedInput] = useState(
    DEFAULT_REPORTED_TOTAL_DONATED
  )

  const totalDonated = useMemo(() => {
    const n = Number.parseFloat(totalDonatedInput.replace(/,/g, ""))
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [totalDonatedInput])

  const expenseSum = useMemo(
    () => EXPENSE_LINE_ITEMS.reduce((acc, row) => acc + row.amount, 0),
    []
  )

  const surplus =
    totalDonated != null && expenseSum > 0 ? totalDonated - expenseSum : null

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
          Here is how support is allocated. You can enter the cumulative total
          raised so readers can compare donations to listed costs (figures are
          updated periodically in the site source).
        </p>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="total-donated-input">
            Total donated to date (USD)
          </Label>
          <Input
            id="total-donated-input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            aria-describedby="total-donated-hint"
            value={totalDonatedInput}
            onChange={(e) => setTotalDonatedInput(e.target.value)}
            className="tabular-nums"
          />
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
                {totalDonated != null && totalDonated > 0 ? (
                  <th scope="col" className="px-3 py-2 font-medium">
                    Share of donations
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {EXPENSE_LINE_ITEMS.map((row) => {
                const donationShare =
                  totalDonated != null && totalDonated > 0
                    ? (row.amount / totalDonated) * 100
                    : null
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
                  {totalDonated != null && totalDonated > 0 ? (
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {((expenseSum / totalDonated) * 100).toFixed(1)}%
                    </td>
                  ) : null}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        {totalDonated != null && expenseSum > 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {surplus != null && surplus >= 0 ? (
              <>
                Entered donations ({formatUsd(totalDonated)}) cover these costs
                with{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatUsd(surplus)}
                </span>{" "}
                left after these costs.
              </>
            ) : (
              <>
                These costs ({formatUsd(expenseSum)}) exceed entered donations (
                {formatUsd(totalDonated)}) by{" "}
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
