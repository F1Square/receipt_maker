"use client";

import {
  sanitizeAddress,
  sanitizeAlphanumeric,
  sanitizeDecimal,
  sanitizeTextName,
  normalizeIndianPhone,
} from "@/lib/validation";

export type FieldMode =
  | "text"
  | "address"
  | "phone"
  | "digits"
  | "decimal"
  | "alphanumeric"
  | "free";

type FormFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "date" | "tel";
  multiline?: boolean;
  hint?: string;
  mode?: FieldMode;
  maxLength?: number;
  error?: string;
};

function applyMode(mode: FieldMode, raw: string): string {
  switch (mode) {
    case "text":
      return sanitizeTextName(raw);
    case "address":
      return sanitizeAddress(raw);
    case "phone":
      return normalizeIndianPhone(raw);
    case "digits":
      return raw.replace(/\D/g, "");
    case "decimal":
      return sanitizeDecimal(raw);
    case "alphanumeric":
      return sanitizeAlphanumeric(raw);
    case "free":
    default:
      return raw;
  }
}

export function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  multiline,
  hint,
  mode = "free",
  maxLength,
  error,
}: FormFieldProps) {
  const shared = `w-full rounded-md border bg-white/80 px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:ring-2 ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-[var(--line)] focus:border-[var(--accent)] focus:ring-[var(--accent-soft)]"
  }`;

  const inputMode =
    mode === "phone" || mode === "digits"
      ? "numeric"
      : mode === "decimal"
        ? "decimal"
        : undefined;

  function handleChange(raw: string) {
    let next = applyMode(mode, raw);
    if (typeof maxLength === "number") next = next.slice(0, maxLength);
    onChange(next);
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
        {required ? <span className="text-[var(--accent)]"> *</span> : null}
      </span>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          className={`${shared} min-h-[88px] resize-y`}
          aria-invalid={Boolean(error)}
        />
      ) : (
        <input
          name={name}
          type={type === "tel" || mode === "phone" ? "tel" : type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={shared}
          aria-invalid={Boolean(error)}
        />
      )}
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--muted)]">{hint}</span>
      ) : null}
    </label>
  );
}
