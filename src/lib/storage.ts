"use client";

import {
  DRAFT_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "./constants";
import {
  emptyDraft,
  emptySettings,
  type AppSettings,
  type InvoiceDraft,
  type ReceiptData,
} from "./types";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSettings(): AppSettings {
  const saved = readJson<AppSettings>(SETTINGS_STORAGE_KEY);
  if (saved) {
    return {
      business: { ...emptySettings().business, ...saved.business },
      bank: { ...emptySettings().bank, ...saved.bank },
    };
  }

  // One-time migration from the old combined draft.
  const legacy = readJson<ReceiptData>(LEGACY_STORAGE_KEY);
  if (legacy?.business || legacy?.bank) {
    const migrated: AppSettings = {
      business: { ...emptySettings().business, ...legacy.business },
      bank: { ...emptySettings().bank, ...legacy.bank },
    };
    saveSettings(migrated);
    return migrated;
  }

  return emptySettings();
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadDraft(): InvoiceDraft {
  const saved = readJson<InvoiceDraft>(DRAFT_STORAGE_KEY);
  if (saved) {
    return {
      ...emptyDraft(),
      ...saved,
      invoiceTo: { ...emptyDraft().invoiceTo, ...saved.invoiceTo },
      invoice: { ...emptyDraft().invoice, ...saved.invoice },
      goods:
        Array.isArray(saved.goods) && saved.goods.length > 0
          ? saved.goods
          : emptyDraft().goods,
    };
  }

  const legacy = readJson<ReceiptData>(LEGACY_STORAGE_KEY);
  if (legacy) {
    const migrated: InvoiceDraft = {
      invoiceTo: { ...emptyDraft().invoiceTo, ...legacy.invoiceTo },
      invoice: { ...emptyDraft().invoice, ...legacy.invoice },
      goods:
        Array.isArray(legacy.goods) && legacy.goods.length > 0
          ? legacy.goods
          : emptyDraft().goods,
    };
    saveDraft(migrated);
    return migrated;
  }

  return emptyDraft();
}

export function saveDraft(draft: InvoiceDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
}
