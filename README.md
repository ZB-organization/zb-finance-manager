# ZBFinanceManager v1.4

Private finance tracker for Sumaiya & Rakib — two co-founders.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## PDF Generation

Requires jsPDF (included in package.json):
```bash
npm install   # installs jspdf automatically
```

## Features

### Core
- Dashboard with earnings split bar, status progress, settlement alert
- Net Settlement — mark settled, history log, per-project breakdown + linked expense adjustments
- Projects — full-screen form, search/filter, expandable cards with share bars

### v1.4 — Expenses & Full Wiring
- **Expenses Tracker** — Log company expenses by category & who paid, dual CEO split bar, category progress bars, link to settlement or keep standalone, export expense report PDF
- **Settlement ↔ Expenses** — Expenses marked "Link to Settlement" now automatically adjust the net CEO settlement amount. Per-expense breakdown table shown on Settlement page.
- **Payments PDF** — Download a payment receipt PDF directly from any expanded payment entry
- **Currency dropdowns** — Invoice Gen now uses your custom currencies from Settings, not a hardcoded list

### v1.3 — Payments & Progress Bars
- **Payments** — Track payments to CEOs & employees, partial installments, proof URLs, quick status cycle
- **Invoice Gen** — Build client invoices line-by-line, multi-currency, tax, generate professional PDF
- **Progress Bars** — Animated shimmer bars throughout app

### PDF Templates
1. **Client Invoice** — `Invoice_INV-xxx_clientname.pdf`
2. **Payment Receipt** — `Receipt_name_xxx.pdf` (also downloadable per-entry from Payments page)
3. **Expense Report** — `Expense_Report_month.pdf`

### Other
- CEO Profiles (Sumaiya pink, Rakib blue) with channel breakdowns
- Activity Log — every action tracked
- Dark/Light mode
- Auto-save with indicator
- Responsive mobile/tablet/desktop
- SHA-256 login — set master password on first launch
- Firebase-ready (add `src/firebaseConfig.js` to switch from localStorage)

## Firebase

```bash
npm install firebase
# create src/firebaseConfig.js from src/firebaseConfig.example.js
```

## Settings > Company Info

Edit `src/constants.js` → `COMPANY` object to set your company name, email, address on PDFs.

```js
export const COMPANY = {
  name:    "Your Company",
  tagline: "Your Tagline",
  email:   "hello@yourcompany.com",
  website: "www.yourcompany.com",
  address: "Your Address",
};
```
