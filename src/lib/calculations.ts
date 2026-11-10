import { CGST_RATE, SGST_RATE } from "./constants";
import type { GoodsLine, InvoiceTotals } from "./types";

/** Round to 2 decimal places using cents to avoid float drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineAmount(qty: number, rate: number): number {
  return round2((Number(qty) || 0) * (Number(rate) || 0));
}

function toNumber(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function computeTotals(goods: GoodsLine[]): InvoiceTotals {
  const lineAmounts = goods.map((g) =>
    lineAmount(toNumber(g.qty), toNumber(g.rate)),
  );
  const subTotal = round2(lineAmounts.reduce((sum, amount) => sum + amount, 0));
  const sgst = round2(subTotal * SGST_RATE);
  const cgst = round2(subTotal * CGST_RATE);
  // Matches demo label: tax total shown as "Taxable Amount"
  const taxableAmount = round2(sgst + cgst);
  const rawFinal = round2(subTotal + sgst + cgst);
  // Round to nearest whole rupee (same idea as the demo invoice).
  const finalAmount = Math.round(rawFinal);
  const roundingOff = round2(finalAmount - rawFinal);

  return {
    subTotal,
    sgst,
    cgst,
    taxableAmount,
    roundingOff,
    finalAmount,
    lineAmounts,
  };
}

export function formatInr(value: number, symbol: "rupee" | "rs" = "rupee"): string {
  const absolute = Math.abs(value);
  const formatted = absolute.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = symbol === "rs" ? "Rs." : "₹";
  if (value < 0) return `-${prefix} ${formatted}`;
  return `${prefix} ${formatted}`;
}

export function formatQty(value: number | string): string {
  const n = toNumber(value);
  if (!n) return "";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatRate(value: number | string): string {
  const n = toNumber(value);
  if (!n) return "";
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatAmount(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Convert HTML date (YYYY-MM-DD) to demo style DD-MM-YYYY. */
export function formatInvoiceDate(value: string, empty = "—"): string {
  if (!value) return empty;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}
