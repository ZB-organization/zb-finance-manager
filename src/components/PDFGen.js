/**
 * PDFGen v2 - Professional PDF Templates
 *
 * Key constraints:
 *  - jsPDF built-in fonts (Helvetica/Times) are Latin-1 only.
 *    Every non-ASCII glyph (Bengali taka "৳", tick marks, checkboxes,
 *    arrows, etc.) MUST be replaced with ASCII-safe equivalents.
 *  - We use "Tk" for Taka, "(v)" for checkmarks, "->" for arrows.
 *  - Palette: off-white page, teal headers, amber/gold accents.
 */

// ── Colour palette (RGB arrays for jsPDF) ──────────────────────────
const C = {
  teal: [11, 128, 118],
  tealDk: [7, 90, 82],
  tealLt: [228, 246, 244],
  tealMd: [175, 224, 220],
  amber: [180, 110, 8],
  amberLt: [253, 244, 220],
  amberMd: [235, 195, 110],
  page: [250, 250, 248], // warm off-white
  white: [255, 255, 255],
  ink: [24, 38, 56], // near-black body text
  sub: [72, 92, 118], // secondary text
  muted: [138, 158, 182], // captions / labels
  border: [210, 224, 232],
  green: [14, 148, 102],
  greenLt: [220, 246, 236],
  blue: [48, 108, 210],
  pink: [195, 52, 118],
  red: [200, 50, 50],
  orange: [200, 115, 20],
};

// ── Currency / number helpers ───────────────────────────────────────
// All money formatted as "Tk 1,23,456" — ASCII-safe
function tk(n) {
  return (
    "Tk " +
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.round(n || 0),
    )
  );
}
function tk2(n) {
  return (
    "Tk " +
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0)
  );
}
function num2(n) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

// Replace any Bengali taka sign or other non-ASCII with safe equivalents
function safe(str) {
  return String(str ?? "")
    .replace(/৳\s*/g, "Tk ")
    .replace(/[^\x00-\x7E]/g, "?"); // strip remaining non-Latin chars
}

// ── jsPDF loader ────────────────────────────────────────────────────
async function loadJsPDF() {
  try {
    const m = await import("jspdf");
    return m.jsPDF || m.default;
  } catch {
    throw new Error("jsPDF not found. Run: npm install jspdf");
  }
}

// ── Low-level drawing helpers ────────────────────────────────────────
function fill(doc, rgb) {
  doc.setFillColor(...rgb);
}
function stroke(doc, rgb) {
  doc.setDrawColor(...rgb);
}
function color(doc, rgb) {
  doc.setTextColor(...rgb);
}

function rect(doc, x, y, w, h, r = 0) {
  r > 0 ? doc.roundedRect(x, y, w, h, r, r, "F") : doc.rect(x, y, w, h, "F");
}
function rectS(doc, x, y, w, h, r = 0) {
  r > 0 ? doc.roundedRect(x, y, w, h, r, r, "FD") : doc.rect(x, y, w, h, "FD");
}

function txt(doc, text, x, y, opts = {}) {
  doc.text(safe(text), x, y, opts);
}

// ── Page background ──────────────────────────────────────────────────
function initPage(doc) {
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  fill(doc, C.page);
  rect(doc, 0, 0, W, H);
  return W;
}

// ── Header ───────────────────────────────────────────────────────────
//  [  Teal band with company left, document type right  ]
//  [  Amber rule                                        ]
//  [  Meta row: invoice no, date, subtitle              ]

function drawHeader(doc, { title, subtitle, refNo, date, company }) {
  const W = initPage(doc);

  // Teal header bar
  fill(doc, C.teal);
  rect(doc, 0, 0, W, 38);
  // Amber accent line
  fill(doc, C.amber);
  rect(doc, 0, 38, W, 2.2);

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14.5);
  color(doc, C.white);
  txt(doc, company?.name || "ZB Company", 14, 13);

  // Tagline + contact — lighter teal tint
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 238, 234);
  txt(doc, company?.tagline || "Digital Solutions", 14, 20);
  const contact = [company?.email, company?.address]
    .filter(Boolean)
    .join("  |  ");
  txt(doc, contact, 14, 27);

  // Document title — right side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  color(doc, C.white);
  txt(doc, title, W - 14, 16, { align: "right" });

  // Subtitle + ref  — amber-tinted
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 215, 128);
  const meta = [subtitle, refNo ? "#" + refNo : null]
    .filter(Boolean)
    .join("  |  ");
  txt(doc, meta, W - 14, 24, { align: "right" });
  if (date) txt(doc, date, W - 14, 31, { align: "right" });

  return 48; // y after header + rule + small gap
}

// ── Two-column info grid ─────────────────────────────────────────────

function drawInfoGrid(doc, y, leftItems, rightItems) {
  const W = doc.internal.pageSize.width;
  const gap = 4;
  const col = (W - 28 - gap) / 2;
  const rows = Math.max(leftItems.length, rightItems.length);
  const h = rows * 10 + 10;

  // Left cell — teal tint
  fill(doc, C.tealLt);
  stroke(doc, C.tealMd);
  doc.setLineWidth(0.35);
  rectS(doc, 14, y, col, h, 2.5);

  // Right cell — amber tint
  fill(doc, C.amberLt);
  stroke(doc, C.amberMd);
  rectS(doc, 14 + col + gap, y, col, h, 2.5);

  const drawCol = (items, xBase) => {
    let cy = y + 8;
    items.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      color(doc, C.muted);
      txt(doc, String(label).toUpperCase(), xBase + 6, cy);
      cy += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      color(doc, C.ink);
      txt(doc, safe(String(value || "-")), xBase + 6, cy);
      cy += 7;
    });
  };

  drawCol(leftItems, 14);
  drawCol(rightItems, 14 + col + gap);
  return y + h + 6;
}

// ── Section heading ──────────────────────────────────────────────────

function heading(doc, y, label) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  color(doc, C.teal);
  txt(doc, label.toUpperCase(), 14, y);
  fill(doc, C.tealMd);
  rect(doc, 14, y + 2, 182, 0.6);
  return y + 9;
}

// ── Table ────────────────────────────────────────────────────────────
// headers: [{ label, w, align }]

function drawTable(doc, y, headers, rows, total = null) {
  const W = doc.internal.pageSize.width;
  const left = 14;
  const tW = W - 28;
  const rH = 7.8;

  // Header bar — teal
  fill(doc, C.teal);
  rect(doc, left, y, tW, rH + 1.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  color(doc, C.white);

  let x = left + 3;
  headers.forEach((h) => {
    const xPos = h.align === "right" ? x + h.w - 5 : x;
    txt(doc, h.label.toUpperCase(), xPos, y + rH - 1.2, {
      align: h.align || "left",
    });
    x += h.w;
  });
  y += rH + 1.5;

  // Data rows
  rows.forEach((row, ri) => {
    if (ri % 2 === 0) {
      fill(doc, C.tealLt);
      rect(doc, left, y, tW, rH);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    color(doc, C.ink);

    x = left + 3;
    row.forEach((cell, ci) => {
      const h = headers[ci];
      const txt_ = safe(String(cell ?? "-"));
      const xPos = h.align === "right" ? x + h.w - 5 : x;
      doc.text(txt_, xPos, y + 5.5, { align: h.align || "left" });
      x += h.w;
    });

    // Fine row line
    stroke(doc, C.border);
    doc.setLineWidth(0.18);
    doc.line(left, y + rH, left + tW, y + rH);
    y += rH;
  });

  // Totals row — amber
  if (total) {
    y += 1.5;
    fill(doc, C.amber);
    rect(doc, left, y, tW, rH + 2.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    color(doc, C.white);
    txt(doc, total.label, left + 4, y + 7);
    txt(doc, safe(total.value), left + tW - 4, y + 7, { align: "right" });
    y += rH + 2.5;
  }

  return y + 4;
}

// ── Amount highlight box ─────────────────────────────────────────────

function amtBox(doc, x, y, w, h, label, value, palette) {
  fill(doc, palette.bg);
  stroke(doc, palette.border);
  doc.setLineWidth(0.5);
  rectS(doc, x, y, w, h, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  color(doc, palette.label);
  txt(doc, label.toUpperCase(), x + 6, y + 8);
  doc.setFontSize(16);
  color(doc, palette.value);
  txt(doc, safe(value), x + 6, y + 19);
}

// ── Status pill ──────────────────────────────────────────────────────

function statusPill(doc, x, y, status) {
  const map = {
    Given: C.green,
    Paid: C.green,
    Partial: C.teal,
    Pending: C.orange,
    Unpaid: C.orange,
    Cancelled: C.red,
  };
  const col = map[status] || C.muted;
  fill(doc, [...col, 0.1]);
  stroke(doc, col);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y - 4.5, 26, 7, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  color(doc, col);
  txt(doc, status, x + 13, y + 0.8, { align: "center" });
}

// ── Note / callout box ───────────────────────────────────────────────

function callout(doc, y, text, palette) {
  const W = doc.internal.pageSize.width;
  fill(doc, palette.bg);
  stroke(doc, palette.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, W - 28, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  color(doc, palette.text);
  txt(doc, safe(text), 20, y + 9.5);
  return y + 18;
}

// ── Footer ───────────────────────────────────────────────────────────

function drawFooter(doc, note) {
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;

  stroke(doc, C.border);
  doc.setLineWidth(0.35);
  doc.line(14, H - 18, W - 14, H - 18);

  // Small amber diamond accent in center
  fill(doc, C.amber);
  doc.rect(W / 2 - 1.5, H - 18.7, 3, 3, "F");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  color(doc, C.muted);
  if (note) txt(doc, note, W / 2, H - 13, { align: "center" });
  const genLine =
    "Generated by ZBFinanceManager  |  " +
    new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  txt(doc, genLine, W / 2, H - 8, { align: "center" });
}

// ════════════════════════════════════════════════════════════════════
// 1.  CLIENT INVOICE
// ════════════════════════════════════════════════════════════════════

export async function generateClientInvoice({ invoice, company }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ format: "a4", unit: "mm" });
  const W = doc.internal.pageSize.width;

  let y = drawHeader(doc, {
    title: "INVOICE",
    subtitle: "Tax Invoice",
    refNo: invoice.invoiceNo || "INV-001",
    date: invoice.date,
    company,
  });

  y = drawInfoGrid(
    doc,
    y,
    [
      ["Bill To", invoice.clientName || "-"],
      ["Email", invoice.clientEmail || "-"],
    ],
    [
      ["Invoice Date", invoice.date || "-"],
      ["Due Date", invoice.dueDate || "-"],
      ["Project Ref", invoice.projectRef || "-"],
    ],
  );

  y = heading(doc, y, "Line Items");

  y = drawTable(
    doc,
    y,
    [
      { label: "#", w: 10 },
      { label: "Description", w: 94 },
      { label: "Qty", w: 16, align: "right" },
      { label: "Rate", w: 30, align: "right" },
      { label: "Amount", w: 33, align: "right" },
    ],
    (invoice.items || []).map((item, i) => [
      i + 1,
      item.description,
      item.qty || 1,
      (item.currency || "Tk") + " " + num2(item.rate),
      tk(item.amountBDT),
    ]),
  );

  // Subtotals block (right-aligned)
  const sub = invoice.subtotal || 0;
  const tax = invoice.taxAmount || 0;
  const disc = invoice.discount || 0;
  const tot = sub - disc + tax;

  [
    ["Subtotal", tk(sub)],
    disc > 0 ? ["Discount", "-" + tk(disc)] : null,
    ["Tax (" + (invoice.taxPct || 0) + "%)", tk(tax)],
  ]
    .filter(Boolean)
    .forEach(([l, v]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      color(doc, C.sub);
      txt(doc, l, W - 58, y + 5.5);
      color(doc, C.ink);
      txt(doc, v, W - 14, y + 5.5, { align: "right" });
      y += 7.5;
    });

  // Grand total — amber box
  y += 2;
  fill(doc, C.amber);
  doc.roundedRect(W - 68, y, 54, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  color(doc, C.white);
  txt(doc, "TOTAL", W - 65, y + 8);
  txt(doc, tk(tot), W - 14, y + 8, { align: "right" });
  y += 18;

  // Payment info box
  if (invoice.paymentInfo) {
    fill(doc, C.tealLt);
    stroke(doc, C.tealMd);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y, W - 28, 22, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    color(doc, C.teal);
    txt(doc, "PAYMENT INFORMATION", 20, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    color(doc, C.ink);
    txt(doc, invoice.paymentInfo, 20, y + 16);
    y += 28;
  }

  if (invoice.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    color(doc, C.muted);
    txt(doc, "Note: " + invoice.notes, 14, y + 6);
  }

  drawFooter(doc, invoice.footerNote || "Thank you for your business!");
  doc.save(
    "Invoice_" +
      (invoice.invoiceNo || "draft") +
      "_" +
      safe(invoice.clientName || "client") +
      ".pdf",
  );
}

// ════════════════════════════════════════════════════════════════════
// 2.  PAYMENT RECEIPT
// ════════════════════════════════════════════════════════════════════

export async function generatePaymentReceipt({ payment, company }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ format: "a4", unit: "mm" });
  const W = doc.internal.pageSize.width;

  let y = drawHeader(doc, {
    title: "RECEIPT",
    subtitle: (payment.recipientType || "Employee") + " Payment",
    refNo: payment.receiptNo || (payment.id || "").slice(0, 8).toUpperCase(),
    date: payment.payDate || new Date().toLocaleDateString("en-GB"),
    company,
  });

  y = drawInfoGrid(
    doc,
    y,
    [
      ["Paid To", payment.recipientName || "-"],
      ["Role", payment.recipientType || "-"],
      ["Channel", payment.channel || "-"],
    ],
    [
      ["Payment Date", payment.payDate || "-"],
      ["Project Ref", payment.projectRef || "-"],
      ["Approved By", payment.approvedBy || "Both CEOs"],
    ],
  );
  y += 3;

  // Two amount boxes
  const bW = (W - 32) / 2;
  amtBox(doc, 14, y, bW, 26, "Total Owed", tk(payment.totalOwed), {
    bg: C.tealLt,
    border: C.teal,
    label: C.tealDk,
    value: C.teal,
  });
  amtBox(
    doc,
    18 + bW,
    y,
    bW,
    26,
    "Amount Given",
    tk(payment.amountGiven || payment.totalOwed),
    { bg: C.amberLt, border: C.amber, label: C.amber, value: C.amber },
  );
  statusPill(doc, W - 32, y + 3, payment.status || "Given");
  y += 34;

  if ((payment.breakdowns || []).length > 0) {
    y = heading(doc, y, "Payment Breakdown");
    y = drawTable(
      doc,
      y,
      [
        { label: "Date", w: 28 },
        { label: "Amount", w: 34, align: "right" },
        { label: "Method", w: 40 },
        { label: "Note", w: 81 },
      ],
      payment.breakdowns.map((b) => [
        b.date || "-",
        tk(b.amount),
        b.method || "-",
        b.note || "-",
      ]),
      { label: "Total Given", value: tk(payment.amountGiven || 0) },
    );
  }

  if ((payment.proofUrls || []).length > 0) {
    y = heading(doc, y, "Attachments");
    payment.proofUrls.forEach((url, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      color(doc, C.blue);
      doc.textWithLink(i + 1 + ". " + url, 14, y, { url });
      y += 7;
    });
  }

  if (payment.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    color(doc, C.muted);
    txt(doc, "Notes: " + payment.notes, 14, y + 8);
  }

  drawFooter(
    doc,
    "This receipt confirms payment between ZB Company and the payee.",
  );
  const fname = safe(payment.recipientName || "payment").replace(/\s+/g, "_");
  doc.save(
    "Receipt_" +
      fname +
      "_" +
      (payment.receiptNo || (payment.id || "").slice(0, 6)) +
      ".pdf",
  );
}

// ════════════════════════════════════════════════════════════════════
// 3.  EXPENSE REPORT
// ════════════════════════════════════════════════════════════════════

export async function generateExpenseReport({ report, expenses, company }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ format: "a4", unit: "mm" });
  const W = doc.internal.pageSize.width;

  const total = expenses.reduce((s, e) => s + (e.amountBDT || 0), 0);
  const suAmt = expenses
    .filter((e) => e.paidBy === "Sumaiya")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const rkAmt = expenses
    .filter((e) => e.paidBy === "Rakib")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const jAmt = expenses
    .filter((e) => e.paidBy === "Company (Joint)")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);

  let y = drawHeader(doc, {
    title: "EXPENSES",
    subtitle:
      report.period ||
      new Date().toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    refNo:
      report.reportNo ||
      "EXP-" + Date.now().toString(36).slice(-6).toUpperCase(),
    date: new Date().toLocaleDateString("en-GB"),
    company,
  });

  y = drawInfoGrid(
    doc,
    y,
    [
      ["Period", report.period || "-"],
      ["Prepared By", report.preparedBy || "Both CEOs"],
    ],
    [
      [
        "Linked to Settlement",
        report.linkedToSettlement ? "YES - included" : "No",
      ],
      ["Total Expenses", tk(total)],
    ],
  );
  y += 2;

  // Summary tiles (3 columns)
  const tW = (W - 32) / 3;
  [
    {
      label: "Sumaiya Paid",
      val: suAmt,
      bg: [248, 228, 238],
      border: C.pink,
      text: C.pink,
    },
    {
      label: "Rakib Paid",
      val: rkAmt,
      bg: [224, 234, 252],
      border: C.blue,
      text: C.blue,
    },
    {
      label: "Company / Joint",
      val: jAmt,
      bg: C.tealLt,
      border: C.teal,
      text: C.tealDk,
    },
  ].forEach((s, i) => {
    const bx = 14 + i * (tW + 2);
    fill(doc, s.bg);
    stroke(doc, s.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(bx, y, tW, 20, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    color(doc, s.text);
    txt(doc, s.label.toUpperCase(), bx + 5, y + 8);
    doc.setFontSize(13);
    txt(doc, tk(s.val), bx + 5, y + 17);
  });
  y += 26;

  y = heading(doc, y, "Expense Detail");
  y = drawTable(
    doc,
    y,
    [
      { label: "Date", w: 22 },
      { label: "Category", w: 38 },
      { label: "Description", w: 62 },
      { label: "Paid By", w: 28 },
      { label: "Amount", w: 33, align: "right" },
    ],
    expenses.map((e) => [
      e.date || "-",
      e.category || "Other",
      safe(e.description || "").slice(0, 38),
      e.paidBy || "-",
      tk(e.amountBDT),
    ]),
    { label: "TOTAL EXPENSES", value: tk(total) },
  );
  y += 2;

  if (report.linkedToSettlement) {
    y = callout(
      doc,
      y,
      "(v)  These expenses are included in the net CEO settlement calculation.",
      { bg: C.tealLt, border: C.teal, text: C.tealDk },
    );
  }

  if (report.notes) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    color(doc, C.muted);
    txt(doc, "Notes: " + report.notes, 14, y + 6);
  }

  drawFooter(doc, "Internal document - ZB Company Expense Report");
  const pname = safe(report.period || "report").replace(/\s+/g, "_");
  doc.save("Expense_Report_" + pname + ".pdf");
}
