import { formatInr } from "@/lib/calculations";
import type { InvoiceTotals } from "@/lib/types";

export function TotalsPanel({ totals }: { totals: InvoiceTotals }) {
  const rows = [
    ["Sub Total", formatInr(totals.subTotal)],
    ["SGST 2.50%", formatInr(totals.sgst)],
    ["CGST 2.50%", formatInr(totals.cgst)],
    ["Taxable Amount", formatInr(totals.taxableAmount)],
    ["Rounding Off", formatInr(totals.roundingOff)],
  ] as const;

  return (
    <aside className="totals-panel sticky top-6 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_18px_40px_rgba(20,40,30,0.08)]">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Computed totals
        </p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Auto-calculated from invoice lines
        </p>
      </div>
      <div className="divide-y divide-[var(--line)] px-5">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 py-3 text-sm"
          >
            <span className="text-[var(--ink-soft)]">{label}</span>
            <span className="font-medium tabular-nums text-[var(--ink)]">
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 bg-[var(--accent)] px-5 py-4 text-white">
        <span className="text-sm font-semibold">Final Amount</span>
        <span className="text-lg font-semibold tabular-nums">
          {formatInr(totals.finalAmount)}
        </span>
      </div>
      <p className="border-t border-[var(--line)] px-5 py-3 text-xs leading-relaxed text-[var(--muted)]">
        Rounding off: Sub Total + SGST + CGST is rounded to the nearest whole
        rupee. The difference (positive or negative) is shown as Rounding Off so
        Final Amount is a clean integer.
      </p>
    </aside>
  );
}
