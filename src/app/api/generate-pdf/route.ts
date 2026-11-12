import { NextResponse } from "next/server";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import type { ReceiptData } from "@/lib/types";
import {
  validateGoods,
  validateInvoiceMeta,
  validateInvoiceTo,
  validateSettings,
} from "@/lib/validation";

function isValidPayload(body: unknown): body is ReceiptData {
  if (!body || typeof body !== "object") return false;
  const data = body as ReceiptData;
  return Boolean(
    data.business &&
      data.invoiceTo &&
      data.invoice &&
      Array.isArray(data.goods) &&
      data.bank,
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isValidPayload(body)) {
      return NextResponse.json(
        { error: "Invalid invoice payload." },
        { status: 400 },
      );
    }

    const settingsError = validateSettings({
      business: body.business,
      bank: body.bank,
    });
    if (settingsError) {
      return NextResponse.json({ error: settingsError }, { status: 400 });
    }

    const invoiceError =
      validateInvoiceTo(body.invoiceTo) ||
      validateInvoiceMeta(body.invoice) ||
      validateGoods(body.goods);
    if (invoiceError) {
      return NextResponse.json({ error: invoiceError }, { status: 400 });
    }

    const pdf = await generateInvoicePdf(body);
    const safeName = (body.business.name || "invoice")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    const invoiceNo = (body.invoice.invoiceNo || "draft").replace(
      /[^a-z0-9-_]+/gi,
      "_",
    );

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}_${invoiceNo}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF." },
      { status: 500 },
    );
  }
}
