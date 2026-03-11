export const GEN_ID = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);
export const FMT = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(n || 0),
  );
export const FMT2 = (n) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n || 0);
export const TS = () => new Date().toISOString();

export const DEF_CURRENCIES = [
  { code: "BDT", symbol: "৳", rate: 1 },
  { code: "USD", symbol: "$", rate: 110 },
  { code: "GBP", symbol: "£", rate: 139 },
  { code: "EUR", symbol: "€", rate: 119 },
  { code: "AUD", symbol: "A$", rate: 72 },
  { code: "CAD", symbol: "C$", rate: 81 },
  { code: "SGD", symbol: "S$", rate: 82 },
];

export const CHANNELS = {
  sumaiya: ["SUMU-WISE", "SUMU-PayPal", "SUMU-Bank", "SUMU-bKash"],
  rakib: [
    "Rakib-WISE",
    "Rakib-DBBL(A)",
    "Rakib-Bank",
    "Rakib-bKash",
    "Rakib-Payoneer",
  ],
};

// Structured channel definitions — used as the default when no customisations saved yet
export const DEF_CHANNELS = [
  {
    id: "ch01",
    name: "SUMU-WISE",
    owner: "sumaiya",
    color: "#9fcd2b",
    short: "W",
    iconBase64: "",
  },
  {
    id: "ch02",
    name: "SUMU-PayPal",
    owner: "sumaiya",
    color: "#003087",
    short: "PP",
    iconBase64: "",
  },
  {
    id: "ch03",
    name: "SUMU-Bank",
    owner: "sumaiya",
    color: "#1e40af",
    short: "Bk",
    iconBase64: "",
  },
  {
    id: "ch04",
    name: "SUMU-bKash",
    owner: "sumaiya",
    color: "#e2136e",
    short: "bK",
    iconBase64: "",
  },
  {
    id: "ch05",
    name: "Rakib-WISE",
    owner: "rakib",
    color: "#9fcd2b",
    short: "W",
    iconBase64: "",
  },
  {
    id: "ch06",
    name: "Rakib-DBBL(A)",
    owner: "rakib",
    color: "#cc0000",
    short: "DB",
    iconBase64: "",
  },
  {
    id: "ch07",
    name: "Rakib-PayPal",
    owner: "rakib",
    color: "#003087",
    short: "PP",
    iconBase64: "",
  },
  {
    id: "ch08",
    name: "Rakib-Bank",
    owner: "rakib",
    color: "#1e40af",
    short: "Bk",
    iconBase64: "",
  },
  {
    id: "ch09",
    name: "Rakib-bKash",
    owner: "rakib",
    color: "#e2136e",
    short: "bK",
    iconBase64: "",
  },
  {
    id: "ch10",
    name: "Rakib-Payoneer",
    owner: "rakib",
    color: "#ff4800",
    short: "Py",
    iconBase64: "",
  },
];

export const RULES = [
  {
    id: "DEFAULT",
    label: "Default CEO-55",
    w: 55,
    o: 45,
    desc: "Working CEO 55% · Other CEO 45%",
  },
  {
    id: "RULE91",
    label: "RULE91",
    w: 90,
    o: 10,
    desc: "Working CEO 90% · Other CEO 10%",
  },
  {
    id: "RULE73",
    label: "RULE73",
    w: 70,
    o: 10,
    desc: "Working CEO 70% · Other CEO 10%",
  },
  {
    id: "RULE55",
    label: "RULE55",
    w: 50,
    o: 50,
    desc: "Working CEO 50% · Other CEO 50%",
  },
  {
    id: "HIRE55",
    label: "HIRE55",
    w: 50,
    o: 50,
    desc: "50/50 each after worker payment",
  },
];

export const STATUSES = [
  "Not Started",
  "In Progress",
  "Completed",
  "In Review",
];
export const ST_COL = {
  "Not Started": "#64748b",
  "In Progress": "#06b6d4",
  Completed: "#10b981",
  "In Review": "#f59e0b",
};

export const GW = {
  WISE: { bg: "#9fcd2b", fg: "#fff", short: "W" },
  PayPal: { bg: "#003087", fg: "#fff", short: "PP" },
  bKash: { bg: "#e2136e", fg: "#fff", short: "bK" },
  Payoneer: { bg: "#ff4800", fg: "#fff", short: "Py" },
  DBBL: { bg: "#cc0000", fg: "#fff", short: "DB" },
  Bank: { bg: "#1e40af", fg: "#fff", short: "Bk" },
};

/* ── Payment Tracking ──────────────────────────────────────── */
export const PAY_ST = ["Pending", "Partial", "Paid", "Cancelled"];
export const PAY_ST_COL = {
  Pending: "#f59e0b",
  Partial: "#06b6d4",
  Paid: "#10b981",
  Cancelled: "#ef4444",
};
export const PERSON_TYPES = [
  "CEO",
  "Contractor",
  "Freelancer",
  "Employee",
  "Agency",
  "Vendor",
];

/* ── Employees ─────────────────────────────────────────────── */
export const EMPLOYEE_ROLES = [
  "Developer",
  "Designer",
  "Project Manager",
  "Content Writer",
  "SEO Specialist",
  "Marketing",
  "Video Editor",
  "Motion Designer",
  "UI/UX Designer",
  "QA Tester",
  "DevOps",
  "Data Analyst",
  "Virtual Assistant",
  "Contractor",
  "Freelancer",
  "Intern",
  "Other",
];

export const EMPLOYEE_STATUSES = ["Active", "On Leave", "Inactive", "Alumni"];
export const EMPLOYEE_STATUS_COL = {
  Active:   "#10b981",
  "On Leave": "#f59e0b",
  Inactive: "#64748b",
  Alumni:   "#8b5cf6",
};

/** Payment channels available to an employee (freeform, stored per-employee) */
export const EMPLOYEE_BLANK = {
  // Identity
  name:          "",
  role:          EMPLOYEE_ROLES[0],
  status:        "Active",
  photo:         "",          // base64 portrait
  // Contact
  email:         "",
  phone:         "",
  address:       "",
  city:          "",
  country:       "",
  // Work
  startDate:     "",
  endDate:       "",          // blank = still active
  hiredBy:       "Both",     // "Sumaiya" | "Rakib" | "Both"
  defaultRate:   "",          // numeric, in defaultCurrency
  defaultCurrency: "USD",
  // Payment channels (array of { id, label, details } objects)
  paymentChannels: [],
  notes:         "",
  // Meta
  id:            "",
  createdAt:     "",
  updatedAt:     "",
};

/* ── Expenses ──────────────────────────────────────────────── */
export const EXPENSE_CATS = [
  "Software / SaaS",
  "Hardware",
  "Marketing",
  "Design",
  "Freelancer",
  "Office Supplies",
  "Travel",
  "Legal / Admin",
  "Domain / Hosting",
  "Banking Fees",
  "Other",
];
export const EXPENSE_PAID_BY = ["Sumaiya", "Rakib", "Company (Joint)"];

/* ── Company Info (used in PDFs) ───────────────────────────── */
export const COMPANY = {
  name: "ZB Company",
  tagline: "Digital Solutions",
  email: "hello@zbcompany.com",
  website: "www.zbcompany.com",
  address: "Dhaka, Bangladesh",
};
/* ===========================================
CLIENT
===========================================*/
export const CLIENT_INDUSTRIES = [
  "Technology", "Design", "Marketing", "Finance", "Legal",
  "Healthcare", "Education", "E-commerce", "Media", "Consulting", "Other",
];

export const CLIENT_BLANK = {
  id: "",
  name: "",
  contactName: "",
  industry: "Other",
  currency: "USD",
  email: "",
  phone: "",
  website: "",
  taxId: "",
  address: "",
  city: "",
  country: "",
  notes: "",
  createdAt: "",
  updatedAt: "",
};

/* ── Changelog ─────────────────────────────────────────────── */
export const CHANGELOG = [
  {
    v: "2.0.0",
    date: "2026-03-12",
    changes: [
      "Employee Profiles — data layer: EMPLOYEE_BLANK shape, EMPLOYEE_ROLES, EMPLOYEE_STATUSES added to constants",
      "db.js: loadEmployees(), saveEmployee(), deleteEmployee() functions (see db.employees.patch.js)",
      "Employee fields: name, role, status, photo (base64), email, phone, address, start/end date, hired by, default rate/currency, payment channels, notes",
      "Foundation for Step 2 (Employees page), Step 3 (linked projects), Step 4 (earnings stats)",
    ],
  },
  {
    v: "1.9.0",
    date: "2026-03-12",
    changes: [
      "Client Profiles page — full list with search, industry filter, add/edit/delete",
      "Client detail panel — contact info, invoice fields, linked projects with revenue stats",
      "Client → Invoice shortcut — 'Create Invoice' button pre-fills Bill To instantly",
      "Invoice Gen: client picker dropdown in Bill To — auto-fills all fields from saved client",
      "Invoice Gen: expanded Bill To — contact name, phone, city, country, client Tax ID",
      "Sidebar: Clients nav item (purple) between Invoice Gen and dividers",
    ],
  },
  {
    v: "1.5.0",
    date: "2026-03-10",
    changes: [
      "Settlement ↔ Expenses fully wired — linked expenses now adjust net CEO settlement in real time",
      "calcDebt() updated to factor in linked expenses: payer CEO gets credit for half of each expense",
      "Settlement page: new 'Linked Expense Adjustments' breakdown table shows exactly how each expense shifts the net amount",
      "Dashboard settlement banner now reflects expense-adjusted amount",
      "Payments page: Download Receipt PDF button on every expanded payment entry",
      "Invoice Gen: currency dropdowns now use your custom currencies from Settings (not hardcoded)",
      "AppInner: expenses loaded on startup and kept in sync when Expenses tab saves",
      "Sidebar version badge updated to v1.4",
    ],
  },
  {
    v: "1.4.0",
    date: "2026-03-10",
    changes: [
      "Expenses Tracker — log company expenses with date, category, amount, currency, paid-by, proof URL, notes",
      "CEO spending split bar (Sumaiya pink · Rakib blue) with animated progress bars",
      "Category breakdown — top-6 category spending bars with live filtering",
      "Settlement link toggle per expense — flag expenses that factor into CEO net settlement",
      "Expense Report PDF — auto-fills from all tracked expenses, one-click download",
      "PDF Generator Expense Report tab now live (was stub) — shows preview stats before generating",
      "Expense filters: by payer (Sumaiya / Rakib / Joint) and by category",
      "Edit and delete individual expenses inline",
    ],
  },
  {
    v: "1.3.1",
    date: "2026-03-10",
    changes: [
      "Payment Tracker — mark CEO/employee/contractor payments as Pending / Partial / Paid",
      "Per-person payment log with partial amounts, proof attachments and notes",
      "Payments overview page — sortable, filterable, quick-mark buttons",
      "Animated progress bars — budget utilization, CEO earnings, settlement progress",
      "Progress bars on Dashboard KPIs, project cards, CEO profiles, settlement",
      "Payment section added to project form as optional collapsible group",
      "PDF Generator page — Client Invoice (with line items, tax, totals) and Payment Receipt",
      "Company info editor in PDF Generator — editable name, email, address, website",
      "Auto-fill project reference from project list in both PDF forms",
      "jsPDF integration — one-click download, no backend required",
    ],
  },
  {
    v: "1.2.0",
    date: "2026-03-10",
    changes: [
      "Full-screen form, typing lag fixed, auto-save, activity log, login, responsive",
      "Firebase auto-detect DB adapter — just drop firebaseConfig.js to switch",
    ],
  },
  {
    v: "1.1.0",
    date: "2026-03-10",
    changes: ["Settlement tab, dark/light mode, Firebase-ready DB"],
  },
  { v: "1.0.0", date: "2026-03-10", changes: ["Initial release"] },
];
