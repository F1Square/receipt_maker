export const SGST_RATE = 0.025;
export const CGST_RATE = 0.025;

export const TERMS_AND_CONDITIONS = [
  "Payment must be made by bank account Transfer Only.",
  "Any complaint for the goods should be made within 2 days.",
  "We are not responsible for any loss or damage to the goods.",
  "Goods sold will not be taken back.",
] as const;

export const JURISDICTION_LINE = "SUBJECT TO SURAT JURISDICTION";

/** Per-invoice draft (changes every time). */
export const DRAFT_STORAGE_KEY = "receipt_maker_invoice_draft_v2";

/** Business + bank profile (rarely changes). */
export const SETTINGS_STORAGE_KEY = "receipt_maker_settings_v1";

/** Legacy combined draft key — used once for migration. */
export const LEGACY_STORAGE_KEY = "receipt_maker_draft_v1";

export const STEPS = [
  {
    id: "invoiceTo",
    title: "Invoice To",
    subtitle: "Customer details for this invoice",
  },
  {
    id: "invoice",
    title: "Invoice details",
    subtitle: "Dates, numbers, and state",
  },
  {
    id: "goods",
    title: "Invoice information",
    subtitle: "Description of goods and amounts",
  },
  {
    id: "review",
    title: "Review",
    subtitle: "Check totals and download PDF",
  },
] as const;
