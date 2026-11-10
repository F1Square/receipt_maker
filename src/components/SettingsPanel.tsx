"use client";

import { useEffect, useState } from "react";
import { emptySettings, type AppSettings } from "@/lib/types";
import {
  formatIndianPhoneDisplay,
  validateSettings,
} from "@/lib/validation";
import { FormField } from "./FormField";

type SettingsPanelProps = {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
};

export function SettingsPanel({
  open,
  settings,
  onClose,
  onSave,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setError("");
    }
  }, [open, settings]);

  if (!open) return null;

  function updateBusiness<K extends keyof AppSettings["business"]>(
    key: K,
    value: AppSettings["business"][K],
  ) {
    setDraft((prev) => ({
      ...prev,
      business: { ...prev.business, [key]: value },
    }));
  }

  function updateBank<K extends keyof AppSettings["bank"]>(
    key: K,
    value: AppSettings["bank"][K],
  ) {
    setDraft((prev) => ({
      ...prev,
      bank: { ...prev.bank, [key]: value },
    }));
  }

  function handleSave() {
    const message = validateSettings(draft);
    if (message) {
      setError(message);
      return;
    }
    onSave({
      business: {
        ...draft.business,
        contactNo: formatIndianPhoneDisplay(draft.business.contactNo),
        gstin: draft.business.gstin.trim().toUpperCase(),
      },
      bank: {
        ...draft.bank,
        ifscCode: draft.bank.ifscCode.trim().toUpperCase(),
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(18,36,28,0.45)] p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_30px_80px_rgba(18,36,28,0.28)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Saved profile
            </p>
            <h2
              id="settings-title"
              className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]"
            >
              Business & bank details
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              These stay the same on every invoice. Update only when needed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg leading-none text-[var(--muted)] hover:bg-white hover:text-[var(--ink)]"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-8 px-5 py-6 sm:px-6">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Business details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  label="Business name"
                  name="businessName"
                  mode="text"
                  value={draft.business.name}
                  onChange={(v) => updateBusiness("name", v)}
                  placeholder="DHARMIK CREATION"
                  hint="Letters only (spaces and & allowed)"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <FormField
                  label="Address"
                  name="businessAddress"
                  mode="address"
                  value={draft.business.address}
                  onChange={(v) => updateBusiness("address", v)}
                  placeholder="Shop / building, area, city, PIN"
                  multiline
                  required
                />
              </div>
              <FormField
                label="Contact no"
                name="businessContact"
                mode="phone"
                value={draft.business.contactNo}
                onChange={(v) => updateBusiness("contactNo", v)}
                placeholder="9876543210 or 919876543210"
                hint="Indian mobile: 10 digits starting with 6–9"
                maxLength={12}
                required
              />
              <FormField
                label="GSTIN number"
                name="businessGstin"
                mode="alphanumeric"
                value={draft.business.gstin}
                onChange={(v) => updateBusiness("gstin", v)}
                placeholder="24CYKPB5375F1ZH"
                hint="15-character GSTIN"
                maxLength={15}
                required
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Bank details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Bank name"
                name="bankName"
                mode="text"
                value={draft.bank.bankName}
                onChange={(v) => updateBank("bankName", v)}
                placeholder="CANARA Bank"
                required
              />
              <FormField
                label="Account holder name"
                name="accountHolderName"
                mode="text"
                value={draft.bank.accountHolderName}
                onChange={(v) => updateBank("accountHolderName", v)}
                placeholder="Same as business / proprietor"
                required
              />
              <FormField
                label="Account no"
                name="accountNo"
                mode="digits"
                value={draft.bank.accountNo}
                onChange={(v) => updateBank("accountNo", v)}
                hint="Digits only"
                maxLength={18}
                required
              />
              <FormField
                label="IFSC code"
                name="ifscCode"
                mode="alphanumeric"
                value={draft.bank.ifscCode}
                onChange={(v) => updateBank("ifscCode", v)}
                placeholder="CNRB0007376"
                hint="11 characters, e.g. CNRB0007376"
                maxLength={11}
                required
              />
            </div>
          </section>

          <p className="rounded-lg border border-[var(--line)] bg-white/70 px-3 py-2 text-sm text-[var(--ink-soft)]">
            Terms & conditions stay fixed from your demo invoice and are not
            editable here.
          </p>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-[var(--line)] bg-[var(--panel)] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDraft(emptySettings())}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Clear fields
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
          >
            Save profile
          </button>
        </div>
      </div>
    </div>
  );
}
