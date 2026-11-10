import path from "path";
import PDFDocument from "pdfkit";
import { JURISDICTION_LINE, TERMS_AND_CONDITIONS } from "./constants";
import {
  formatAmount,
  formatInr,
  formatInvoiceDate,
  formatQty,
  formatRate,
  computeTotals,
} from "./calculations";
import type { ReceiptData } from "./types";

const FONT_REGULAR = "InvoiceSans";
const FONT_BOLD = "InvoiceSans-Bold";

function drawRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  doc.rect(x, y, w, h).stroke();
}

function hLine(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number) {
  doc
    .moveTo(x1, y)
    .lineTo(x2, y)
    .stroke();
}

function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc
    .moveTo(x, y1)
    .lineTo(x, y2)
    .stroke();
}

function fitText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  width: number,
  options: PDFKit.Mixins.TextOptions = {},
) {
  doc.text(text || "", x, y, { width, ...options });
}

function money(value: number): string {
  return formatInr(value, "rupee");
}

export async function generateInvoicePdf(data: ReceiptData): Promise<Buffer> {
  const totals = computeTotals(data.goods);
  const margin = 28;
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - margin * 2;
  const left = margin;
  const right = pageWidth - margin;

  const doc = new PDFDocument({
    size: "LETTER",
    margin: 0,
    info: {
      Title: `Tax Invoice ${data.invoice.invoiceNo || ""}`.trim(),
      Author: data.business.name || "Receipt Maker",
    },
  });

  const fontDir = path.join(process.cwd(), "public", "fonts");
  doc.registerFont(FONT_REGULAR, path.join(fontDir, "DejaVuSans.ttf"));
  doc.registerFont(FONT_BOLD, path.join(fontDir, "DejaVuSans-Bold.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.lineWidth(1);
  doc.strokeColor("#111111");
  doc.fillColor("#111111");

  // Outer border
  const outerTop = 24;
  const outerBottom = pageHeight - 24;
  drawRect(doc, left, outerTop, contentWidth, outerBottom - outerTop);

  // Header band
  const headerTop = outerTop;
  const headerBottom = 118;
  hLine(doc, left, right, headerBottom);

  doc.font(FONT_BOLD).fontSize(11);
  doc.text("TAX INVOICE", left + 8, headerTop + 8, { width: 160 });
  doc.font(FONT_REGULAR).fontSize(9);
  doc.text("Original for Recipient", right - 140, headerTop + 10, {
    width: 132,
    align: "right",
  });

  doc.font(FONT_BOLD).fontSize(16);
  doc.text(data.business.name.toUpperCase() || "BUSINESS NAME", left + 8, 48, {
    width: contentWidth - 16,
    align: "center",
  });

  doc.font(FONT_REGULAR).fontSize(9);
  doc.text(data.business.address || "", left + 20, 72, {
    width: contentWidth - 40,
    align: "center",
  });
  doc.text(
    `Contact No. : ${data.business.contactNo || ""}   GSTIN : ${data.business.gstin || ""}`,
    left + 20,
    96,
    { width: contentWidth - 40, align: "center" },
  );

  // Invoice To / Invoice Details
  const metaTop = headerBottom;
  const metaBottom = 236;
  const midX = left + contentWidth / 2;
  hLine(doc, left, right, metaBottom);
  vLine(doc, midX, metaTop, metaBottom);

  doc.font(FONT_BOLD).fontSize(10);
  doc.text("INVOICE TO DETAILS :-", left + 8, metaTop + 8);
  doc.text("Invoice Details :-", midX + 8, metaTop + 8);

  const leftLabels = [
    ["Name :", data.invoiceTo.name],
    ["Address :", data.invoiceTo.address],
    ["GSTIN / PAN :", data.invoiceTo.gstinPan],
    ["Contact No. :", data.invoiceTo.contactNo],
  ] as const;

  const rightLabels = [
    ["Invoice Date :", formatInvoiceDate(data.invoice.invoiceDate, "")],
    ["Invoice No. :", data.invoice.invoiceNo],
    ["Challan Date :", formatInvoiceDate(data.invoice.challanDate, "")],
    ["Challan No. :", data.invoice.challanNo],
    ["State :", data.invoice.state],
  ] as const;

  doc.font(FONT_REGULAR).fontSize(9);
  // Keep invoice-to rows spaced so Address can wrap onto two lines.
  const leftRowY = [metaTop + 28, metaTop + 50, metaTop + 86, metaTop + 108];
  leftLabels.forEach(([label, value], index) => {
    const y = leftRowY[index];
    doc.font(FONT_REGULAR).text(label, left + 8, y, { width: 78 });
    fitText(doc, value, left + 90, y, midX - left - 98, {
      height: index === 1 ? 32 : 16,
    });
  });

  rightLabels.forEach(([label, value], index) => {
    const y = metaTop + 28 + index * 18;
    doc.font(FONT_REGULAR).text(label, midX + 8, y, { width: 90 });
    doc.text(value || "", midX + 100, y, {
      width: right - midX - 108,
      align: "right",
    });
  });

  // Invoice information title
  const tableTitleTop = metaBottom;
  const tableTitleBottom = metaBottom + 22;
  hLine(doc, left, right, tableTitleBottom);
  doc.font(FONT_BOLD).fontSize(10);
  doc.text("INVOICE INFORMATION", left, tableTitleTop + 6, {
    width: contentWidth,
    align: "center",
  });

  // Table header
  const col = {
    sr: left,
    desc: left + 48,
    hsn: left + 250,
    qty: left + 318,
    rate: left + 382,
    amount: left + 456,
  };
  const tableHeaderBottom = tableTitleBottom + 22;
  hLine(doc, left, right, tableHeaderBottom);
  vLine(doc, col.desc, tableTitleBottom, tableHeaderBottom);
  vLine(doc, col.hsn, tableTitleBottom, tableHeaderBottom);
  vLine(doc, col.qty, tableTitleBottom, tableHeaderBottom);
  vLine(doc, col.rate, tableTitleBottom, tableHeaderBottom);
  vLine(doc, col.amount, tableTitleBottom, tableHeaderBottom);

  doc.font(FONT_BOLD).fontSize(8);
  doc.text("SR. No.", col.sr + 4, tableTitleBottom + 7, { width: 40, align: "center" });
  doc.text("Description of Goods", col.desc + 4, tableTitleBottom + 7, {
    width: col.hsn - col.desc - 8,
    align: "center",
  });
  doc.text("HSN/SAC", col.hsn + 2, tableTitleBottom + 7, {
    width: col.qty - col.hsn - 4,
    align: "center",
  });
  doc.text("Qty", col.qty + 2, tableTitleBottom + 7, {
    width: col.rate - col.qty - 4,
    align: "center",
  });
  doc.text("Rate", col.rate + 2, tableTitleBottom + 7, {
    width: col.amount - col.rate - 4,
    align: "center",
  });
  doc.text("Amount", col.amount + 2, tableTitleBottom + 7, {
    width: right - col.amount - 4,
    align: "center",
  });

  // Goods rows area (fixed height like demo)
  const goodsTop = tableHeaderBottom;
  const goodsBottom = 470;
  const rowCount = Math.max(data.goods.length, 8);
  const rowHeight = (goodsBottom - goodsTop) / rowCount;

  vLine(doc, col.desc, goodsTop, goodsBottom);
  vLine(doc, col.hsn, goodsTop, goodsBottom);
  vLine(doc, col.qty, goodsTop, goodsBottom);
  vLine(doc, col.rate, goodsTop, goodsBottom);
  vLine(doc, col.amount, goodsTop, goodsBottom);
  hLine(doc, left, right, goodsBottom);

  doc.font(FONT_REGULAR).fontSize(9);
  data.goods.forEach((item, index) => {
    const y = goodsTop + 8 + index * Math.min(rowHeight, 22);
    const amount = totals.lineAmounts[index] ?? 0;
    doc.text(String(index + 1), col.sr + 4, y, { width: 40, align: "center" });
    fitText(doc, item.description, col.desc + 6, y, col.hsn - col.desc - 12);
    fitText(doc, item.hsnSac, col.hsn + 2, y, col.qty - col.hsn - 4, {
      align: "center",
    });
    doc.text(formatQty(item.qty), col.qty + 2, y, {
      width: col.rate - col.qty - 4,
      align: "right",
    });
    doc.text(formatRate(item.rate), col.rate + 2, y, {
      width: col.amount - col.rate - 4,
      align: "right",
    });
    doc.text(amount ? formatAmount(amount) : "", col.amount + 2, y, {
      width: right - col.amount - 6,
      align: "right",
    });
  });

  // Bottom section: bank + terms | totals + signature
  const bottomTop = goodsBottom;
  const totalsWidth = 220;
  const totalsLeft = right - totalsWidth;
  vLine(doc, totalsLeft, bottomTop, outerBottom);

  const totalsRows: Array<[string, string, boolean?]> = [
    ["Sub Total", money(totals.subTotal)],
    ["SGST 2.50%", money(totals.sgst)],
    ["CGST 2.50%", money(totals.cgst)],
    ["Taxable Amount", money(totals.taxableAmount)],
    ["Rounding Off", money(totals.roundingOff)],
    ["Final Amount", money(totals.finalAmount), true],
  ];

  const totalsBlockHeight = 132;
  totalsRows.forEach(([label, value, bold], index) => {
    const y = bottomTop + index * 22;
    if (index > 0) hLine(doc, totalsLeft, right, y);
    doc.font(bold ? FONT_BOLD : FONT_REGULAR).fontSize(9);
    doc.text(label, totalsLeft + 6, y + 6, { width: 108 });
    doc.text(value, totalsLeft + 110, y + 6, {
      width: totalsWidth - 118,
      align: "right",
    });
  });
  hLine(doc, totalsLeft, right, bottomTop + totalsBlockHeight);

  // Signature area
  const signTop = bottomTop + totalsBlockHeight;
  doc.font(FONT_REGULAR).fontSize(9);
  doc.text(
    `For, ${(data.business.name || "BUSINESS NAME").toUpperCase()}`,
    totalsLeft + 8,
    signTop + 18,
    { width: totalsWidth - 16, align: "right" },
  );
  doc.text("Proprietor", totalsLeft + 8, outerBottom - 28, {
    width: totalsWidth - 16,
    align: "right",
  });

  // Bank details
  doc.font(FONT_BOLD).fontSize(10);
  doc.text("**Bank Details :-", left + 8, bottomTop + 10, {
    width: totalsLeft - left - 16,
    align: "center",
  });

  const bankRows = [
    ["Bank Name :", data.bank.bankName],
    ["Account Holder Name :", data.bank.accountHolderName],
    ["Account No. :", data.bank.accountNo],
    ["IFSC Code :", data.bank.ifscCode],
  ] as const;

  doc.font(FONT_REGULAR).fontSize(9);
  bankRows.forEach(([label, value], index) => {
    const y = bottomTop + 34 + index * 16;
    doc.text(label, left + 10, y, { width: 130 });
    fitText(doc, value, left + 140, y, totalsLeft - left - 150);
  });

  const termsTop = bottomTop + 110;
  hLine(doc, left, totalsLeft, termsTop);
  doc.font(FONT_BOLD).fontSize(10);
  doc.text("**Terms & Conditions :-", left + 8, termsTop + 8, {
    width: totalsLeft - left - 16,
    align: "center",
  });

  doc.font(FONT_REGULAR).fontSize(8.5);
  TERMS_AND_CONDITIONS.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, left + 12, termsTop + 28 + index * 14, {
      width: totalsLeft - left - 24,
    });
  });

  doc.font(FONT_BOLD).fontSize(9);
  doc.text(JURISDICTION_LINE, left + 8, outerBottom - 28, {
    width: totalsLeft - left - 16,
    align: "center",
  });

  doc.end();
  return done;
}
