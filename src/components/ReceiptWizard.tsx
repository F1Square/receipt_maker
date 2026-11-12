"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { STEPS, TERMS_AND_CONDITIONS } from "@/lib/constants";
import {
  computeTotals,
  formatAmount,
  formatInvoiceDate,
  lineAmount,
} from "@/lib/calculations";
import {
  clearDraft,
  loadDraft,
  loadSettings,
  saveDraft,
  saveSettings,
} from "@/lib/storage";
import {
  emptyDraft,
  emptySettings,
  type AppSettings,
  type GoodsLine,
  type InvoiceDraft,
} from "@/lib/types";
import {
  digitsOnly,
  formatIndianPhoneDisplay,
  sanitizeDecimal,
  sanitizeGoodsDescription,
  validateGoods,
  validateInvoiceMeta,
  validateInvoiceTo,
  validateSettings,
} from "@/lib/validation";
import { FormField } from "./FormField";
import { SettingsPanel } from "./SettingsPanel";
import { TotalsPanel } from "./TotalsPanel";

function newGoodsLine(): GoodsLine {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: "",
    hsnSac: "",
    qty: "",
    rate: "",
  };
}

function normalizeLoadedGoods(goods: GoodsLine[]): GoodsLine[] {
  return goods.map((line) => ({
    ...line,
    qty: line.qty === undefined || line.qty === null ? "" : String(line.qty),
    rate: line.rate === undefined || line.rate === null ? "" : String(line.rate),
  }));
}

export function ReceiptWizard() {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(() => emptySettings());
  const [draft, setDraft] = useState<InvoiceDraft>(() => emptyDraft());
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const nextSettings = loadSettings();
    const nextDraft = loadDraft();
    setSettings(nextSettings);
    setDraft({
      ...nextDraft,
      goods: normalizeLoadedGoods(nextDraft.goods),
    });
    setHydrated(true);
    if (validateSettings(nextSettings)) {
      setSettingsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDraft(draft);
  }, [draft, hydrated]);

  const totals = useMemo(() => computeTotals(draft.goods), [draft.goods]);
  const profileError = validateSettings(settings);
  const profileReady = !profileError;

  function updateInvoiceTo<K extends keyof InvoiceDraft["invoiceTo"]>(
    key: K,
    value: InvoiceDraft["invoiceTo"][K],
  ) {
    setDraft((prev) => ({
      ...prev,
      invoiceTo: { ...prev.invoiceTo, [key]: value },
    }));
  }

  function updateInvoice<K extends keyof InvoiceDraft["invoice"]>(
    key: K,
    value: InvoiceDraft["invoice"][K],
  ) {
    setDraft((prev) => ({
      ...prev,
      invoice: { ...prev.invoice, [key]: value },
    }));
  }

  function updateGoods(id: string, patch: Partial<GoodsLine>) {
    setDraft((prev) => ({
      ...prev,
      goods: prev.goods.map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    }));
  }

  function addGoodsLine() {
    setDraft((prev) => ({
      ...prev,
      goods: [...prev.goods, newGoodsLine()],
    }));
  }

  function removeGoodsLine(id: string) {
    setDraft((prev) => ({
      ...prev,
      goods:
        prev.goods.length <= 1
          ? prev.goods
          : prev.goods.filter((line) => line.id !== id),
    }));
  }

  function validateStep(index: number): string | null {
    if (!profileReady) {
      return (
        profileError ||
        "Save business and bank details first (Update profile)."
      );
    }
    if (index === 0) return validateInvoiceTo(draft.invoiceTo);
    if (index === 1) return validateInvoiceMeta(draft.invoice);
    if (index === 2) return validateGoods(draft.goods);
    return null;
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    if (step === 0 && draft.invoiceTo.contactNo.trim()) {
      setDraft((prev) => ({
        ...prev,
        invoiceTo: {
          ...prev.invoiceTo,
          contactNo: formatIndianPhoneDisplay(prev.invoiceTo.contactNo),
          gstinPan: prev.invoiceTo.gstinPan.trim().toUpperCase(),
        },
      }));
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function resetInvoiceDraft() {
    clearDraft();
    setDraft(emptyDraft());
    setStep(0);
    setError("");
  }

  function handleSaveSettings(next: AppSettings) {
    setSettings(next);
    saveSettings(next);
    setError("");
  }

  function downloadPdf() {
    const message =
      validateStep(0) || validateStep(1) || validateStep(2) || null;
    if (message) {
      setError(message);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business: settings.business,
            bank: settings.bank,
            ...draft,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error || "Could not generate PDF.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const filename =
          response.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] || "tax-invoice.pdf";
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
        // Fresh invoice after each successful PDF download.
        clearDraft();
        setDraft(emptyDraft());
        setStep(0);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Download failed.");
      }
    });
  }

  return (
    <>
      <div className="mx-auto mb-6 flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Saved business profile
          </p>
          <p className="truncate text-sm font-semibold text-[var(--ink)]">
            {settings.business.name || "Not set yet"}
          </p>
          <p className="truncate text-xs text-[var(--ink-soft)]">
            {profileReady
              ? `${settings.bank.bankName} · A/c ${settings.bank.accountNo}`
              : "Add business & bank once — reused on every invoice."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
        >
          {profileReady ? "Update profile" : "Set up profile"}
        </button>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="wizard-shell overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(18,36,28,0.1)]">
          <div className="border-b border-[var(--line)] px-5 py-5 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
                  {STEPS[step].title}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {STEPS[step].subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={resetInvoiceDraft}
                className="text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
              >
                Clear invoice draft
              </button>
            </div>

            <ol className="mt-6 flex gap-2 overflow-x-auto pb-1">
              {STEPS.map((item, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <li key={item.id} className="min-w-[110px] flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index <= step) {
                          setError("");
                          setStep(index);
                        }
                      }}
                      className={`w-full rounded-lg border px-2 py-2 text-left transition ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : done
                            ? "border-[var(--line)] bg-white/70"
                            : "border-transparent bg-transparent opacity-60"
                      }`}
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-[var(--ink)]">
                        {item.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="px-5 py-6 sm:px-8">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FormField
                    label="Name"
                    name="customerName"
                    mode="text"
                    value={draft.invoiceTo.name}
                    onChange={(v) => updateInvoiceTo("name", v)}
                    placeholder="Customer / firm name"
                    hint="Must include letters"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormField
                    label="Address"
                    name="customerAddress"
                    mode="address"
                    value={draft.invoiceTo.address}
                    onChange={(v) => updateInvoiceTo("address", v)}
                    placeholder="Full billing address"
                    multiline
                    required
                  />
                </div>
                <FormField
                  label="GSTIN / PAN"
                  name="customerGstinPan"
                  mode="alphanumeric"
                  value={draft.invoiceTo.gstinPan}
                  onChange={(v) => updateInvoiceTo("gstinPan", v)}
                  placeholder="GSTIN or PAN"
                  hint="Optional · valid GSTIN (15) or PAN (10)"
                  maxLength={15}
                />
                <FormField
                  label="Contact no"
                  name="customerContact"
                  mode="phone"
                  value={draft.invoiceTo.contactNo}
                  onChange={(v) => updateInvoiceTo("contactNo", v)}
                  placeholder="9876543210"
                  hint="Optional · Indian mobile starting with 6–9"
                  maxLength={12}
                />
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Invoice date"
                  name="invoiceDate"
                  type="date"
                  value={draft.invoice.invoiceDate}
                  onChange={(v) => updateInvoice("invoiceDate", v)}
                  required
                />
                <FormField
                  label="Invoice no"
                  name="invoiceNo"
                  mode="digits"
                  value={draft.invoice.invoiceNo}
                  onChange={(v) => updateInvoice("invoiceNo", v)}
                  placeholder="7"
                  hint="Digits only"
                  maxLength={12}
                  required
                />
                <FormField
                  label="Challan date"
                  name="challanDate"
                  type="date"
                  value={draft.invoice.challanDate}
                  onChange={(v) => updateInvoice("challanDate", v)}
                />
                <FormField
                  label="Challan no"
                  name="challanNo"
                  mode="digits"
                  value={draft.invoice.challanNo}
                  onChange={(v) => updateInvoice("challanNo", v)}
                  placeholder="7"
                  hint="Digits only"
                  maxLength={12}
                />
                <FormField
                  label="State"
                  name="state"
                  mode="text"
                  value={draft.invoice.state}
                  onChange={(v) => updateInvoice("state", v)}
                  placeholder="Gujarat"
                  hint="Letters only"
                  required
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="hidden grid-cols-[48px_minmax(0,1.4fr)_100px_88px_88px_100px_40px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)] md:grid">
                  <span>Sr</span>
                  <span>Description of goods</span>
                  <span>HSN/SAC</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Amount</span>
                  <span />
                </div>

                {draft.goods.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/70 p-3 md:grid-cols-[48px_minmax(0,1.4fr)_100px_88px_88px_100px_40px] md:items-end"
                  >
                    <div className="flex h-10 items-center justify-center rounded-md bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                      {index + 1}
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)] md:hidden">
                        Description
                      </span>
                      <input
                        value={line.description}
                        onChange={(e) =>
                          updateGoods(line.id, {
                            description: sanitizeGoodsDescription(e.target.value),
                          })
                        }
                        placeholder="Lace Four-side Border"
                        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)] md:hidden">
                        HSN/SAC
                      </span>
                      <input
                        value={line.hsnSac}
                        inputMode="numeric"
                        onChange={(e) =>
                          updateGoods(line.id, {
                            hsnSac: digitsOnly(e.target.value),
                          })
                        }
                        placeholder="Digits"
                        maxLength={8}
                        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)] md:hidden">
                        Qty
                      </span>
                      <input
                        inputMode="decimal"
                        value={line.qty}
                        onChange={(e) =>
                          updateGoods(line.id, {
                            qty: sanitizeDecimal(e.target.value),
                          })
                        }
                        placeholder="0"
                        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)] md:hidden">
                        Rate
                      </span>
                      <input
                        inputMode="decimal"
                        value={line.rate}
                        onChange={(e) =>
                          updateGoods(line.id, {
                            rate: sanitizeDecimal(e.target.value),
                          })
                        }
                        placeholder="0"
                        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                      />
                    </label>
                    <div className="flex h-10 items-center justify-end rounded-md bg-[var(--paper)] px-3 text-sm font-medium tabular-nums text-[var(--ink)]">
                      {formatAmount(
                        lineAmount(Number(line.qty) || 0, Number(line.rate) || 0),
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() => removeGoodsLine(line.id)}
                      className="flex h-10 items-center justify-center rounded-md text-[var(--muted)] transition hover:bg-red-50 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addGoodsLine}
                  className="rounded-lg border border-dashed border-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
                >
                  + Add next goods line
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <ReviewBlock title="Invoice To">
                    <p className="font-semibold">{draft.invoiceTo.name}</p>
                    <p>{draft.invoiceTo.address}</p>
                    <p>GSTIN/PAN: {draft.invoiceTo.gstinPan || "—"}</p>
                    <p>Contact: {draft.invoiceTo.contactNo || "—"}</p>
                  </ReviewBlock>
                  <ReviewBlock title="Invoice details">
                    <p>
                      Invoice Date:{" "}
                      {formatInvoiceDate(draft.invoice.invoiceDate)}
                    </p>
                    <p>Invoice No: {draft.invoice.invoiceNo}</p>
                    <p>
                      Challan Date:{" "}
                      {formatInvoiceDate(draft.invoice.challanDate)}
                    </p>
                    <p>Challan No: {draft.invoice.challanNo || "—"}</p>
                    <p>State: {draft.invoice.state}</p>
                  </ReviewBlock>
                </div>

                <ReviewBlock title="Invoice information">
                  <ul className="space-y-2">
                    {draft.goods
                      .filter((g) => g.description.trim())
                      .map((g, i) => (
                        <li
                          key={g.id}
                          className="flex flex-wrap justify-between gap-2 border-b border-[var(--line)] pb-2 text-sm last:border-0"
                        >
                          <span>
                            {i + 1}. {g.description}
                            {g.hsnSac ? ` (${g.hsnSac})` : ""}
                          </span>
                          <span className="tabular-nums text-[var(--ink-soft)]">
                            {g.qty} × {g.rate} ={" "}
                            {formatAmount(
                              lineAmount(Number(g.qty) || 0, Number(g.rate) || 0),
                            )}
                          </span>
                        </li>
                      ))}
                  </ul>
                </ReviewBlock>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ReviewBlock title="Business (from saved profile)">
                    <p className="font-semibold">{settings.business.name}</p>
                    <p>{settings.business.address}</p>
                    <p>Contact: {settings.business.contactNo}</p>
                    <p>GST / PAN: {settings.business.gstin}</p>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="mt-2 text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Update profile
                    </button>
                  </ReviewBlock>
                  <ReviewBlock title="Bank (from saved profile)">
                    <p>{settings.bank.bankName}</p>
                    <p>{settings.bank.accountHolderName}</p>
                    <p>A/c: {settings.bank.accountNo}</p>
                    <p>IFSC: {settings.bank.ifscCode}</p>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="mt-2 text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Update profile
                    </button>
                  </ReviewBlock>
                </div>

                <ReviewBlock title="Terms & conditions (fixed)">
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
                    {TERMS_AND_CONDITIONS.map((term) => (
                      <li key={term}>{term}</li>
                    ))}
                  </ol>
                </ReviewBlock>

                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isPending ? "Preparing PDF…" : "Download Tax Invoice PDF"}
                </button>
              </div>
            )}

            {error ? (
              <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Continue
                </button>
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  Invoice draft auto-saves in this browser.
                </p>
              )}
            </div>
          </div>
        </section>

        <TotalsPanel totals={totals} />
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </>
  );
}

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {title}
      </h3>
      <div className="mt-3 space-y-1 text-sm text-[var(--ink)]">{children}</div>
    </div>
  );
}
