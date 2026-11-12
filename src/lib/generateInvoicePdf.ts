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
import { formatIndianPhoneDisplay } from "./validation";

/**
 * Layout measured from the demo Excel tax invoice (letter page).
 * The invoice is a compact bordered form — not a full-page box.
 */
const LAYOUT = {
  left: 18.2,
  right: 591.1,
  top: 54.2,
  bottom: 498.2,
  // Vertical splits
  metaMid: 408.5,
  cols: {
    sr: 18.2,
    desc: 115.0,
    hsn: 302.2,
    qty: 408.5,
    rate: 464.6,
    amount: 520.8,
  },
  // Horizontal bands
  headerBottom: 107.8,
  metaTitleBottom: 120.2,
  metaBottom: 180.7,
  infoTitleBottom: 193.2,
  tableHeaderBottom: 205.7,
  goodsBottom: 362.2,
  bankBottom: 424.6,
  termsTitleBottom: 437.8,
  // Totals row pitch on the right
  totalsRow: 12.45,
} as const;

const FONT_REGULAR = "InvoiceArial";
const FONT_BOLD = "InvoiceArial-Bold";
const FONT_RUPEE = "InvoiceRupee";

function hLine(doc: PDFKit.PDFDocument, x1: number, x2: number, y: number) {
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
}

function vLine(doc: PDFKit.PDFDocument, x: number, y1: number, y2: number) {
  doc.moveTo(x, y1).lineTo(x, y2).stroke();
}

function money(value: number): string {
  return formatInr(value, "rupee");
}

function text(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  options: PDFKit.Mixins.TextOptions = {},
) {
  doc.text(value || "", x, y, {
    width,
    lineGap: 1,
    ...options,
  });
}

export async function generateInvoicePdf(data: ReceiptData): Promise<Buffer> {
  const totals = computeTotals(data.goods);
  const L = LAYOUT;
  const width = L.right - L.left;

  const doc = new PDFDocument({
    size: "LETTER",
    margin: 0,
    info: {
      Title: `Tax Invoice ${data.invoice.invoiceNo || ""}`.trim(),
      Author: data.business.name || "Receipt Maker",
    },
  });

  const fontDir = path.join(process.cwd(), "public", "fonts");
  doc.registerFont(FONT_REGULAR, path.join(fontDir, "Arial.ttf"));
  doc.registerFont(FONT_BOLD, path.join(fontDir, "Arial_Bold.ttf"));
  // DejaVu keeps the ₹ glyph reliable in PDF output.
  doc.registerFont(FONT_RUPEE, path.join(fontDir, "DejaVuSans.ttf"));

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Match Excel medium grid: thin black strokes, not heavy UI borders.
  doc.lineWidth(0.75);
  doc.strokeColor("#000000");
  doc.fillColor("#000000");

  // Outer compact invoice box (same footprint as demo).
  doc.rect(L.left, L.top, width, L.bottom - L.top).stroke();

  // --- Header ---
  doc.font(FONT_BOLD).fontSize(10);
  text(doc, "TAX INVOICE", L.left + 6, L.top + 4, 140);

  doc.font(FONT_REGULAR).fontSize(8);
  text(doc, "Original for Recipient", L.right - 130, L.top + 5, 124, {
    align: "right",
  });

  // Fixed header rhythm (matches demo): name → address → contact/GST-PAN, all above the rule.
  const headerInnerLeft = L.left + 16;
  const headerInnerWidth = width - 32;

  doc.font(FONT_BOLD).fontSize(13);
  text(
    doc,
    (data.business.name || "BUSINESS NAME").toUpperCase(),
    L.left + 8,
    L.top + 16,
    width - 16,
    { align: "center", height: 14, ellipsis: true },
  );

  doc.font(FONT_REGULAR).fontSize(8);
  text(
    doc,
    (data.business.address || "").trim(),
    headerInnerLeft,
    L.top + 32,
    headerInnerWidth,
    { align: "center", height: 10, ellipsis: true },
  );

  const contact = formatIndianPhoneDisplay(data.business.contactNo || "");
  const gstPan = (data.business.gstin || "").trim().toUpperCase();
  const contactGstLine = `Contact No. : ${contact}    GST / PAN : ${gstPan}`;
  text(doc, contactGstLine, headerInnerLeft, L.top + 44, headerInnerWidth, {
    align: "center",
    height: 10,
    ellipsis: true,
  });

  hLine(doc, L.left, L.right, L.headerBottom);

  // --- Invoice To / Invoice Details ---
  vLine(doc, L.metaMid, L.headerBottom, L.metaBottom);
  hLine(doc, L.left, L.right, L.metaTitleBottom);
  hLine(doc, L.left, L.right, L.metaBottom);

  doc.font(FONT_BOLD).fontSize(9);
  text(doc, "INVOICE TO DETAILS :-", L.left + 6, L.headerBottom + 3, 200);
  text(doc, "Invoice Details :-", L.metaMid + 6, L.headerBottom + 3, 160);

  const leftFields: Array<[string, string, number]> = [
    ["Name :", data.invoiceTo.name, L.metaTitleBottom + 4],
    ["Address :", data.invoiceTo.address, L.metaTitleBottom + 16],
    ["GSTIN / PAN :", data.invoiceTo.gstinPan, L.metaTitleBottom + 40],
    ["Contact No. :", data.invoiceTo.contactNo, L.metaTitleBottom + 52],
  ];

  doc.font(FONT_REGULAR).fontSize(8);
  leftFields.forEach(([label, value, y]) => {
    doc.font(FONT_BOLD).fontSize(8);
    text(doc, label, L.left + 6, y, 78);
    doc.font(FONT_REGULAR).fontSize(8);
    text(doc, value, L.left + 84, y, L.metaMid - L.left - 90, {
      height: label.startsWith("Address") ? 22 : 11,
    });
  });

  const rightFields: Array<[string, string]> = [
    ["Invoice Date :", formatInvoiceDate(data.invoice.invoiceDate, "")],
    ["Invoice No. :", data.invoice.invoiceNo],
    ["Challan Date :", formatInvoiceDate(data.invoice.challanDate, "")],
    ["Challan No. :", data.invoice.challanNo],
    ["State :", data.invoice.state],
  ];

  rightFields.forEach(([label, value], index) => {
    const y = L.metaTitleBottom + 4 + index * 11.5;
    doc.font(FONT_REGULAR).fontSize(8);
    text(doc, label, L.metaMid + 6, y, 78);
    text(doc, value, L.metaMid + 84, y, L.right - L.metaMid - 90, {
      align: "right",
    });
  });

  // --- Invoice information title + column headers ---
  hLine(doc, L.left, L.right, L.infoTitleBottom);
  doc.font(FONT_BOLD).fontSize(9);
  text(doc, "INVOICE INFORMATION", L.left, L.metaBottom + 3.5, width, {
    align: "center",
  });

  hLine(doc, L.left, L.right, L.tableHeaderBottom);

  const colXs = [
    L.cols.desc,
    L.cols.hsn,
    L.cols.qty,
    L.cols.rate,
    L.cols.amount,
  ];
  colXs.forEach((x) => vLine(doc, x, L.infoTitleBottom, L.goodsBottom));

  doc.font(FONT_BOLD).fontSize(8);
  text(doc, "SR. No.", L.cols.sr + 2, L.infoTitleBottom + 3.5, 90, {
    align: "center",
  });
  text(
    doc,
    "Description of Goods",
    L.cols.desc + 2,
    L.infoTitleBottom + 3.5,
    L.cols.hsn - L.cols.desc - 4,
    { align: "center" },
  );
  text(
    doc,
    "HSN/SAC",
    L.cols.hsn + 2,
    L.infoTitleBottom + 3.5,
    L.cols.qty - L.cols.hsn - 4,
    { align: "center" },
  );
  text(
    doc,
    "Qty",
    L.cols.qty + 2,
    L.infoTitleBottom + 3.5,
    L.cols.rate - L.cols.qty - 4,
    { align: "center" },
  );
  text(
    doc,
    "Rate",
    L.cols.rate + 2,
    L.infoTitleBottom + 3.5,
    L.cols.amount - L.cols.rate - 4,
    { align: "center" },
  );
  text(
    doc,
    "Amount",
    L.cols.amount + 2,
    L.infoTitleBottom + 3.5,
    L.right - L.cols.amount - 4,
    { align: "center" },
  );

  // Goods body (fixed empty area like demo)
  hLine(doc, L.left, L.right, L.goodsBottom);
  colXs.forEach((x) => vLine(doc, x, L.tableHeaderBottom, L.goodsBottom));

  doc.font(FONT_REGULAR).fontSize(8);
  let printed = 0;
  data.goods.forEach((item, index) => {
    if (!item.description.trim() && !Number(item.qty) && !Number(item.rate)) {
      return;
    }
    const y = L.tableHeaderBottom + 5 + printed * 14;
    printed += 1;
    if (y > L.goodsBottom - 12) return;
    const amount = totals.lineAmounts[index] ?? 0;
    text(doc, String(printed), L.cols.sr + 2, y, 90, { align: "center" });
    text(doc, item.description, L.cols.desc + 6, y, L.cols.hsn - L.cols.desc - 10);
    text(doc, item.hsnSac, L.cols.hsn + 2, y, L.cols.qty - L.cols.hsn - 4, {
      align: "center",
    });
    text(doc, formatQty(item.qty), L.cols.qty + 2, y, L.cols.rate - L.cols.qty - 6, {
      align: "right",
    });
    text(
      doc,
      formatRate(item.rate),
      L.cols.rate + 2,
      y,
      L.cols.amount - L.cols.rate - 6,
      { align: "right" },
    );
    text(
      doc,
      amount ? formatAmount(amount) : "",
      L.cols.amount + 2,
      y,
      L.right - L.cols.amount - 6,
      { align: "right" },
    );
  });

  // --- Bottom: bank/terms | totals/signature ---
  vLine(doc, L.cols.qty, L.goodsBottom, L.bottom);
  hLine(doc, L.left, L.cols.qty, L.bankBottom);
  hLine(doc, L.left, L.cols.qty, L.termsTitleBottom);

  // Totals rows (aligned under Qty/Rate/Amount)
  const totalsRows: Array<[string, string]> = [
    ["Sub Total", money(totals.subTotal)],
    ["SGST 2.50%", money(totals.sgst)],
    ["CGST 2.50%", money(totals.cgst)],
    ["Taxable Amount", money(totals.taxableAmount)],
    ["Rounding Off", money(totals.roundingOff)],
    ["Final Amount", money(totals.finalAmount)],
  ];

  totalsRows.forEach(([label, value], index) => {
    const y = L.goodsBottom + index * L.totalsRow;
    const isFinal = index === totalsRows.length - 1;
    if (index > 0) hLine(doc, L.cols.qty, L.right, y);
    doc.font(isFinal ? FONT_BOLD : FONT_REGULAR).fontSize(8);
    text(doc, label, L.cols.qty + 5, y + 3, 95);
    doc.font(FONT_RUPEE).fontSize(isFinal ? 9 : 8);
    text(doc, value, L.cols.qty + 100, y + 3, L.right - L.cols.qty - 106, {
      align: "right",
    });
  });
  hLine(doc, L.cols.qty, L.right, L.termsTitleBottom);

  // Signature block under totals
  const signTop = L.termsTitleBottom;
  doc.font(FONT_REGULAR).fontSize(8);
  text(
    doc,
    `For, ${(data.business.name || "BUSINESS NAME").toUpperCase()}`,
    L.cols.qty + 6,
    signTop + 10,
    L.right - L.cols.qty - 12,
    { align: "right" },
  );
  text(doc, "Proprietor", L.cols.qty + 6, L.bottom - 16, L.right - L.cols.qty - 12, {
    align: "right",
  });

  // Bank details
  doc.font(FONT_BOLD).fontSize(9);
  text(
    doc,
    "**Bank Details :-",
    L.left + 6,
    L.goodsBottom + 4,
    L.cols.qty - L.left - 12,
    { align: "center" },
  );

  const bankRows = [
    ["Bank Name :", data.bank.bankName],
    ["Account Holder Name :", data.bank.accountHolderName],
    ["Account No. :", data.bank.accountNo],
    ["IFSC Code :", data.bank.ifscCode],
  ] as const;

  bankRows.forEach(([label, value], index) => {
    const y = L.goodsBottom + 18 + index * 11;
    doc.font(FONT_REGULAR).fontSize(8);
    text(doc, label, L.left + 8, y, 118);
    text(doc, value, L.left + 126, y, L.cols.qty - L.left - 134);
  });

  // Terms
  doc.font(FONT_BOLD).fontSize(9);
  text(
    doc,
    "**Terms & Conditions :-",
    L.left + 6,
    L.bankBottom + 3.5,
    L.cols.qty - L.left - 12,
    { align: "center" },
  );

  doc.font(FONT_REGULAR).fontSize(7.5);
  TERMS_AND_CONDITIONS.forEach((term, index) => {
    text(
      doc,
      `${index + 1}. ${term}`,
      L.left + 10,
      L.termsTitleBottom + 5 + index * 10,
      L.cols.qty - L.left - 18,
    );
  });

  doc.font(FONT_BOLD).fontSize(8);
  text(
    doc,
    JURISDICTION_LINE,
    L.left + 6,
    L.bottom - 14,
    L.cols.qty - L.left - 12,
    { align: "center" },
  );

  doc.end();
  return done;
}
