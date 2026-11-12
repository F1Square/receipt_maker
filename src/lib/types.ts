export type GoodsLine = {
  id: string;
  description: string;
  hsnSac: string;
  /** Stored as string so decimal typing (e.g. 12.) works in inputs. */
  qty: string;
  rate: string;
};

export type BusinessDetails = {
  name: string;
  address: string;
  contactNo: string;
  gstin: string;
};

export type BankDetails = {
  bankName: string;
  accountHolderName: string;
  accountNo: string;
  ifscCode: string;
};

/** Rarely changing details — saved separately and reused. */
export type AppSettings = {
  business: BusinessDetails;
  bank: BankDetails;
};

/** Per-invoice fields filled each time. */
export type InvoiceDraft = {
  invoiceTo: {
    name: string;
    address: string;
    gstinPan: string;
    contactNo: string;
  };
  invoice: {
    invoiceDate: string;
    invoiceNo: string;
    challanDate: string;
    challanNo: string;
    state: string;
  };
  goods: GoodsLine[];
};

export type ReceiptData = AppSettings & InvoiceDraft;

export type InvoiceTotals = {
  subTotal: number;
  sgst: number;
  cgst: number;
  taxableAmount: number;
  roundingOff: number;
  finalAmount: number;
  lineAmounts: number[];
};

let lineCounter = 0;

function createLineId(): string {
  lineCounter += 1;
  return `line-${lineCounter}`;
}

export function emptyBusiness(): BusinessDetails {
  return {
    name: "",
    address: "",
    contactNo: "",
    gstin: "",
  };
}

export function emptyBank(): BankDetails {
  return {
    bankName: "",
    accountHolderName: "",
    accountNo: "",
    ifscCode: "",
  };
}

export function emptySettings(): AppSettings {
  return {
    business: emptyBusiness(),
    bank: emptyBank(),
  };
}

export function emptyDraft(): InvoiceDraft {
  return {
    invoiceTo: {
      name: "",
      address: "",
      gstinPan: "",
      contactNo: "",
    },
    invoice: {
      invoiceDate: "",
      invoiceNo: "",
      challanDate: "",
      challanNo: "",
      state: "Gujarat",
    },
    goods: [
      {
        id: createLineId(),
        description: "",
        hsnSac: "",
        qty: "",
        rate: "",
      },
    ],
  };
}

export function emptyReceipt(): ReceiptData {
  return {
    ...emptySettings(),
    ...emptyDraft(),
  };
}

