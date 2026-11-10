/** Strip everything except digits. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Allow letters, spaces, and common name punctuation. */
export function sanitizeTextName(value: string): string {
  return value.replace(/[^A-Za-z\u0900-\u097F .,'&\-]/g, "");
}

/** Goods description: letters required later; digits allowed while typing. */
export function sanitizeGoodsDescription(value: string): string {
  return value.replace(/[^A-Za-z0-9\u0900-\u097F .,'&\-\/()]/g, "");
}

/** Address: letters, digits, and common address symbols. */
export function sanitizeAddress(value: string): string {
  return value.replace(/[^A-Za-z0-9\u0900-\u097F .,'\-/#&()]/g, "");
}

/** Alphanumeric uppercase (GSTIN / PAN / IFSC / HSN). */
export function sanitizeAlphanumeric(value: string, upper = true): string {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, "");
  return upper ? cleaned.toUpperCase() : cleaned;
}

/** Decimal amount/qty: digits and at most one dot. */
export function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return (
    cleaned.slice(0, firstDot + 1) +
    cleaned.slice(firstDot + 1).replace(/\./g, "")
  );
}

/** Indian mobile: 10 digits starting 6–9, optional +91 / 91. */
export function normalizeIndianPhone(value: string): string {
  return digitsOnly(value).slice(0, 12);
}

export function isIndianPhone(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(digits);
  }
  return false;
}

export function formatIndianPhoneDisplay(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`.trim();
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return value.trim();
}

export function hasLetters(value: string): boolean {
  return /[A-Za-z\u0900-\u097F]/.test(value);
}

export function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function isPositiveDecimal(value: string | number): boolean {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Indian GSTIN: 15 chars, e.g. 24CYKPB5375F1ZH */
export function isGstin(value: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
    value.trim().toUpperCase(),
  );
}

/** PAN: ABCDE1234F */
export function isPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());
}

export function isGstinOrPan(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (!v) return true; // optional on customer
  return isGstin(v) || isPan(v);
}

/** IFSC: 4 letters + 0 + 6 alphanumeric */
export function isIfsc(value: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase());
}

export function validateTextRequired(
  label: string,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!hasLetters(trimmed)) return `${label} must include letters.`;
  return null;
}

export function validateDigitsRequired(
  label: string,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!isDigitsOnly(trimmed)) return `${label} must contain digits only.`;
  return null;
}

export function validateIndianPhone(
  label: string,
  value: string,
  required = true,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return required ? `${label} is required.` : null;
  if (!isIndianPhone(trimmed)) {
    return `${label} must be a valid Indian mobile (10 digits, starts with 6–9).`;
  }
  return null;
}

export function validateSettings(settings: {
  business: {
    name: string;
    address: string;
    contactNo: string;
    gstin: string;
  };
  bank: {
    bankName: string;
    accountHolderName: string;
    accountNo: string;
    ifscCode: string;
  };
}): string | null {
  return (
    validateTextRequired("Business name", settings.business.name) ||
    validateTextRequired("Business address", settings.business.address) ||
    validateIndianPhone("Business contact no", settings.business.contactNo) ||
    (!isGstin(settings.business.gstin)
      ? "Business GSTIN must be a valid 15-character GSTIN."
      : null) ||
    validateTextRequired("Bank name", settings.bank.bankName) ||
    validateTextRequired(
      "Account holder name",
      settings.bank.accountHolderName,
    ) ||
    validateDigitsRequired("Account no", settings.bank.accountNo) ||
    (settings.bank.accountNo.trim().length < 9
      ? "Account no must be at least 9 digits."
      : null) ||
    (!isIfsc(settings.bank.ifscCode)
      ? "IFSC must be 11 characters (e.g. CNRB0007376)."
      : null)
  );
}

export function validateInvoiceTo(invoiceTo: {
  name: string;
  address: string;
  gstinPan: string;
  contactNo: string;
}): string | null {
  return (
    validateTextRequired("Customer name", invoiceTo.name) ||
    validateTextRequired("Customer address", invoiceTo.address) ||
    (!isGstinOrPan(invoiceTo.gstinPan)
      ? "GSTIN / PAN format is invalid."
      : null) ||
    validateIndianPhone("Customer contact no", invoiceTo.contactNo, false)
  );
}

export function validateInvoiceMeta(invoice: {
  invoiceDate: string;
  invoiceNo: string;
  challanDate: string;
  challanNo: string;
  state: string;
}): string | null {
  if (!invoice.invoiceDate) return "Invoice date is required.";
  const invoiceNoError = validateDigitsRequired(
    "Invoice no",
    invoice.invoiceNo,
  );
  if (invoiceNoError) return invoiceNoError;
  if (invoice.challanNo.trim() && !isDigitsOnly(invoice.challanNo)) {
    return "Challan no must contain digits only.";
  }
  return validateTextRequired("State", invoice.state);
}

export function validateGoods(
  goods: Array<{
    description: string;
    hsnSac: string;
    qty: string | number;
    rate: string | number;
  }>,
): string | null {
  const filled = goods.filter(
    (g) => g.description.trim() || String(g.qty).trim() || String(g.rate).trim(),
  );
  if (filled.length === 0) {
    return "Add at least one goods line with description, qty, and rate.";
  }

  for (let i = 0; i < filled.length; i += 1) {
    const line = filled[i];
    const label = `Goods line ${i + 1}`;
    if (!hasLetters(line.description)) {
      return `${label}: description must include letters.`;
    }
    if (line.hsnSac.trim() && !isDigitsOnly(line.hsnSac.trim())) {
      return `${label}: HSN/SAC must be digits only.`;
    }
    if (!isPositiveDecimal(line.qty)) {
      return `${label}: qty must be a number greater than 0.`;
    }
    if (!isPositiveDecimal(line.rate)) {
      return `${label}: rate must be a number greater than 0.`;
    }
  }
  return null;
}
