import { ReceiptWizard } from "@/components/ReceiptWizard";

export default function Home() {
  return (
    <main className="relative z-10 flex flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mx-auto mb-8 w-full max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Local tax invoice tool
        </p>
        <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
          Receipt Maker
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
          Each invoice only needs customer, invoice, and goods details. Business
          and bank stay saved in this browser — update them only when they
          change. Totals update automatically.
        </p>
      </header>

      <ReceiptWizard />
    </main>
  );
}
