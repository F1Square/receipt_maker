# Receipt Maker

Next.js + Node tax invoice generator that matches the demo PDF layout.

## Stack

- Frontend: React / Next.js (App Router)
- Backend: Node.js API route (`/api/generate-pdf`)
- Storage: browser `localStorage` (draft auto-save)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), fill the steps, then download the PDF.

## Invoice flow

**Each invoice (main steps):**
1. Invoice To — customer name, address, GSTIN/PAN, contact  
2. Invoice details — dates, numbers, state  
3. Invoice information — goods lines (qty × rate → amount)  
4. Review + download — totals auto-calculated  

**Saved once (Update profile):** business name/address/contact/GSTIN and bank details.  
Terms & conditions stay fixed from the demo.
