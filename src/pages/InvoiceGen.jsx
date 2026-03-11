/**
 * InvoiceGen — PDF Generator page
 * 3 templates: Client Invoice · Payment Receipt · (Expense Report stub)
 */
import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  DollarSign,
  Receipt,
  Plus,
  X,
  Download,
  ChevronDown,
  Building2,
} from "lucide-react";
import { usePalette } from "../theme";
import { Card, FormSec, FormField, FormGrid } from "../components/Shared";
import { COMPANY, GEN_ID, FMT2 } from "../constants";
import {
  generateClientInvoice,
  generatePaymentReceipt,
  generateExpenseReport,
} from "../components/PDFGen";
import { loadExpenses } from "../db";

/* ────── shared input style ────── */
function useInp() {
  const pal = usePalette();
  return useMemo(
    () => ({
      width: "100%",
      boxSizing: "border-box",
      background: pal.inpBg,
      border: `1px solid ${pal.inpBorder}`,
      borderRadius: 10,
      padding: "11px 13px",
      color: pal.text,
      fontSize: 13.5,
      outline: "none",
      fontFamily: "inherit",
    }),
    [pal.inpBg, pal.inpBorder, pal.text],
  );
}

/* ────── tab pill ────── */
function TabBtn({ active, color, Icon, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "11px 20px",
        borderRadius: 12,
        border: `1px solid ${active ? color : "rgba(128,128,128,0.18)"}`,
        background: active ? color + "18" : "transparent",
        color: active ? color : "#64748b",
        fontWeight: active ? 700 : 500,
        fontSize: 13.5,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={15} />
      {label}
      {badge && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color,
            background: color + "22",
            border: `1px solid ${color}33`,
            padding: "1px 6px",
            borderRadius: 5,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ────── download button ────── */
function GenBtn({ loading, onClick, color, label }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "13px 28px",
        borderRadius: 12,
        border: "none",
        background: loading
          ? "rgba(100,148,136,0.4)"
          : `linear-gradient(135deg,${color}cc,${color})`,
        color: "#fff",
        fontWeight: 800,
        fontSize: 14,
        cursor: loading ? "not-allowed" : "pointer",
        boxShadow: loading ? "none" : `0 6px 24px ${color}44`,
        letterSpacing: 0.4,
        fontFamily: "inherit",
        transition: "all 0.2s",
      }}
    >
      <Download
        size={16}
        style={{ animation: loading ? "pulse 0.8s infinite" : "none" }}
      />
      {loading ? "Generating…" : label}
    </button>
  );
}

/* ────── company editor ────── */
function CompanyBox({ co, setCo }) {
  const pal = usePalette();
  const inp = useInp();
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ padding: 16, marginBottom: 20 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(6,182,212,0.13)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Building2 size={15} color="#06b6d4" />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>
            {co.name}
          </span>
          <span style={{ fontSize: 11, color: pal.textMute, marginLeft: 8 }}>
            {co.email} · {co.website}
          </span>
        </div>
        <ChevronDown
          size={15}
          color={pal.textMute}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "0.2s",
          }}
        />
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <FormGrid cols={2}>
            <FormField label="Company Name">
              <input
                style={inp}
                value={co.name}
                onChange={(e) => setCo((c) => ({ ...c, name: e.target.value }))}
              />
            </FormField>
            <FormField label="Tagline">
              <input
                style={inp}
                value={co.tagline}
                onChange={(e) =>
                  setCo((c) => ({ ...c, tagline: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Email">
              <input
                style={inp}
                value={co.email}
                onChange={(e) =>
                  setCo((c) => ({ ...c, email: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Website">
              <input
                style={inp}
                value={co.website}
                onChange={(e) =>
                  setCo((c) => ({ ...c, website: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Address">
              <input
                style={inp}
                value={co.address}
                onChange={(e) =>
                  setCo((c) => ({ ...c, address: e.target.value }))
                }
              />
            </FormField>
          </FormGrid>
        </div>
      )}
    </Card>
  );
}

/* ════════════════════════════════
   TAB 1 — CLIENT INVOICE
════════════════════════════════ */
function ClientInvoiceForm({ company, projects, currencies }) {
  const pal = usePalette();
  const inp = useInp();
  const [form, setForm] = useState({
    invoiceNo: "INV-" + Date.now().toString(36).toUpperCase().slice(-5),
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    clientName: "",
    clientEmail: "",
    projectRef: "",
    currency: "USD",
    notes: "",
    tax: 0,
    items: [{ id: GEN_ID(), description: "", qty: 1, rate: "" }],
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (i, k, v) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)),
    }));
  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { id: GEN_ID(), description: "", qty: 1, rate: "" }],
    }));
  const removeItem = (i) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0),
    0,
  );
  const taxAmt = subtotal * ((parseFloat(form.tax) || 0) / 100);
  const total = subtotal + taxAmt;

  const handleGenerate = async () => {
    if (!form.clientName.trim()) {
      setErr("Client name is required");
      return;
    }
    if (
      !form.items.some((it) => it.description.trim() && parseFloat(it.rate) > 0)
    ) {
      setErr("Add at least one item with a description and rate");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await generateClientInvoice({
        invoice: {
          ...form,
          tax: parseFloat(form.tax) || 0,
          items: form.items.map((it) => ({
            ...it,
            qty: parseFloat(it.qty) || 1,
            rate: parseFloat(it.rate) || 0,
          })),
          subtotal,
          taxAmt,
          total,
        },
        company,
      });
    } catch (e) {
      setErr(e.message || "PDF failed — run: npm install jspdf");
    }
    setLoading(false);
  };

  return (
    <div>
      <FormSec title="Invoice Info">
        <FormGrid cols={3}>
          <FormField label="Invoice No">
            <input
              style={inp}
              value={form.invoiceNo}
              onChange={(e) => set("invoiceNo", e.target.value)}
            />
          </FormField>
          <FormField label="Invoice Date">
            <input
              style={inp}
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </FormField>
          <FormField label="Due Date">
            <input
              style={inp}
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </FormSec>

      <FormSec title="Bill To">
        <FormGrid cols={2}>
          <FormField label="Client Name *">
            <input
              style={inp}
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              placeholder="Company or person"
            />
          </FormField>
          <FormField label="Client Email">
            <input
              style={inp}
              value={form.clientEmail}
              onChange={(e) => set("clientEmail", e.target.value)}
              placeholder="client@email.com"
            />
          </FormField>
        </FormGrid>
        <FormGrid cols={2}>
          <FormField label="Project Reference">
            {projects.length > 0 ? (
              <select
                style={inp}
                value={form.projectRef}
                onChange={(e) => set("projectRef", e.target.value)}
              >
                <option value="">— optional —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={inp}
                value={form.projectRef}
                onChange={(e) => set("projectRef", e.target.value)}
                placeholder="Project ref"
              />
            )}
          </FormField>
          <FormField label="Currency">
            <select
              style={inp}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {(currencies || []).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </FormField>
        </FormGrid>
      </FormSec>

      <FormSec title="Line Items">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 72px 100px 36px",
            gap: 8,
            marginBottom: 6,
          }}
        >
          {["Description", "Qty", "Rate", ""].map((h) => (
            <div
              key={h}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {h}
            </div>
          ))}
        </div>
        {form.items.map((it, i) => (
          <div
            key={it.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 72px 100px 36px",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              style={inp}
              value={it.description}
              onChange={(e) => setItem(i, "description", e.target.value)}
              placeholder={`Item ${i + 1}…`}
            />
            <input
              style={{ ...inp, textAlign: "center" }}
              type="number"
              min="1"
              value={it.qty}
              onChange={(e) => setItem(i, "qty", e.target.value)}
            />
            <input
              style={{ ...inp, textAlign: "right" }}
              type="number"
              min="0"
              step="0.01"
              value={it.rate}
              onChange={(e) => setItem(i, "rate", e.target.value)}
              placeholder="0.00"
            />
            <button
              onClick={() => removeItem(i)}
              disabled={form.items.length === 1}
              style={{
                borderRadius: 9,
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.08)",
                color: form.items.length === 1 ? "#333" : "#ef4444",
                cursor: form.items.length === 1 ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <button
          onClick={addItem}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 16px",
            borderRadius: 10,
            border: "1px dashed rgba(6,182,212,0.4)",
            background: "rgba(6,182,212,0.07)",
            color: "#06b6d4",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            marginTop: 2,
          }}
        >
          <Plus size={13} /> Add line item
        </button>

        {/* Totals */}
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            background: pal.surfaceElevated,
            borderRadius: 12,
            border: `1px solid ${pal.border}`,
          }}
        >
          {[
            ["Subtotal", FMT2(subtotal)],
            [`Tax (${form.tax || 0}%)`, FMT2(taxAmt)],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: 13,
                color: pal.textMute,
              }}
            >
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0 0",
              borderTop: `1px solid ${pal.border}`,
              marginTop: 6,
            }}
          >
            <span style={{ fontWeight: 800, color: pal.text, fontSize: 15 }}>
              Total
            </span>
            <span style={{ fontWeight: 900, color: "#06b6d4", fontSize: 17 }}>
              {form.currency} {FMT2(total)}
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pal.textMute,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              Tax %
            </div>
            <input
              style={{ ...inp, width: 120 }}
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.tax}
              onChange={(e) => set("tax", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </FormSec>

      <FormSec title="Notes">
        <textarea
          style={{ ...inp, height: 70, resize: "vertical" }}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Payment terms, bank details, thank-you note…"
        />
      </FormSec>

      {err && (
        <div
          style={{
            padding: "11px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <GenBtn
          loading={loading}
          onClick={handleGenerate}
          color="#06b6d4"
          label="Download Invoice PDF"
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════
   TAB 2 — PAYMENT RECEIPT
════════════════════════════════ */
function PaymentReceiptForm({ company, projects, currencies }) {
  const pal = usePalette();
  const inp = useInp();
  const [form, setForm] = useState({
    receiptNo: "RCP-" + Date.now().toString(36).toUpperCase().slice(-5),
    payDate: new Date().toISOString().slice(0, 10),
    recipientName: "",
    recipientType: "CEO",
    channel: "",
    projectRef: "",
    approvedBy: "Both CEOs",
    totalOwed: "",
    amountPaid: "",
    currency: "BDT",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const owed = parseFloat(form.totalOwed) || 0;
  const paid = parseFloat(form.amountPaid) || 0;
  const rem = Math.max(0, owed - paid);

  const handleGenerate = async () => {
    if (!form.recipientName.trim()) {
      setErr("Recipient name is required");
      return;
    }
    if (paid <= 0) {
      setErr("Amount paid must be greater than 0");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await generatePaymentReceipt({
        payment: {
          ...form,
          totalOwed: owed,
          amountGiven: paid,
          remaining: rem,
          id: GEN_ID(),
        },
        company,
      });
    } catch (e) {
      setErr(e.message || "PDF failed — run: npm install jspdf");
    }
    setLoading(false);
  };

  return (
    <div>
      <FormSec title="Receipt Info">
        <FormGrid cols={2}>
          <FormField label="Receipt No">
            <input
              style={inp}
              value={form.receiptNo}
              onChange={(e) => set("receiptNo", e.target.value)}
            />
          </FormField>
          <FormField label="Payment Date">
            <input
              style={inp}
              type="date"
              value={form.payDate}
              onChange={(e) => set("payDate", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </FormSec>

      <FormSec title="Recipient">
        <FormGrid cols={2}>
          <FormField label="Recipient Name *">
            <input
              style={inp}
              value={form.recipientName}
              onChange={(e) => set("recipientName", e.target.value)}
              placeholder="Sumaiya / Rakib / worker"
            />
          </FormField>
          <FormField label="Role / Type">
            <select
              style={inp}
              value={form.recipientType}
              onChange={(e) => set("recipientType", e.target.value)}
            >
              {[
                "CEO",
                "Co-Founder",
                "Contractor",
                "Freelancer",
                "Employee",
                "Agency",
                "Vendor",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Payment Channel">
            <input
              style={inp}
              value={form.channel}
              onChange={(e) => set("channel", e.target.value)}
              placeholder="WISE / bKash / Bank…"
            />
          </FormField>
          <FormField label="Approved By">
            <input
              style={inp}
              value={form.approvedBy}
              onChange={(e) => set("approvedBy", e.target.value)}
            />
          </FormField>
        </FormGrid>
        <FormField label="Project Reference">
          {projects.length > 0 ? (
            <select
              style={inp}
              value={form.projectRef}
              onChange={(e) => set("projectRef", e.target.value)}
            >
              <option value="">— optional —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              style={inp}
              value={form.projectRef}
              onChange={(e) => set("projectRef", e.target.value)}
              placeholder="Project ref"
            />
          )}
        </FormField>
      </FormSec>

      <FormSec title="Amount">
        <FormGrid cols={3}>
          <FormField label="Currency">
            <select
              style={inp}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
            >
              {(currencies || []).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Total Owed">
            <input
              style={inp}
              type="number"
              min="0"
              step="0.01"
              value={form.totalOwed}
              onChange={(e) => set("totalOwed", e.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Amount Paying *">
            <input
              style={inp}
              type="number"
              min="0"
              step="0.01"
              value={form.amountPaid}
              onChange={(e) => set("amountPaid", e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        </FormGrid>

        {owed > 0 && paid > 0 && (
          <div
            style={{
              padding: "12px 14px",
              background: pal.surfaceElevated,
              borderRadius: 12,
              border: `1px solid ${pal.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <span style={{ color: pal.textMute }}>Coverage</span>
              <span style={{ color: "#10b981", fontWeight: 700 }}>
                {form.currency} {FMT2(paid)} / {FMT2(owed)}
                {rem > 0 && (
                  <span style={{ color: "#f59e0b" }}>
                    {" "}
                    · {FMT2(rem)} remaining
                  </span>
                )}
              </span>
            </div>
            <div
              style={{
                height: 7,
                borderRadius: 7,
                background: "rgba(255,255,255,0.07)",
                overflow: "hidden",
              }}
            >
              <div
                className="pb-fill"
                style={{
                  height: "100%",
                  borderRadius: 7,
                  width: `${Math.min(100, (paid / owed) * 100)}%`,
                  background:
                    paid >= owed
                      ? "linear-gradient(90deg,#10b98199,#10b981)"
                      : "linear-gradient(90deg,#f59e0b99,#f59e0b)",
                  boxShadow:
                    paid >= owed ? "0 0 10px #10b98155" : "0 0 10px #f59e0b55",
                  position: "relative",
                }}
              >
                <div
                  className="pb-shimmer"
                  style={{ position: "absolute", inset: 0, borderRadius: 7 }}
                />
              </div>
            </div>
          </div>
        )}
      </FormSec>

      <FormSec title="Notes">
        <textarea
          style={{ ...inp, height: 70, resize: "vertical" }}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Additional notes…"
        />
      </FormSec>

      {err && (
        <div
          style={{
            padding: "11px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <GenBtn
          loading={loading}
          onClick={handleGenerate}
          color="#10b981"
          label="Download Receipt PDF"
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════
   TAB 3 — EXPENSE REPORT
════════════════════════════════ */
function ExpenseReportForm({ company }) {
  const pal = usePalette();
  const inp = useInp();
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    period: new Date().toLocaleDateString("en-BD", {
      month: "long",
      year: "numeric",
    }),
    preparedBy: "Both CEOs",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    loadExpenses().then((e) => {
      setExpenses(e);
      setLoaded(true);
    });
  }, []);

  const linkedExpenses = expenses.filter((e) => e.linkedToSettlement);
  const totalBDT = expenses.reduce((s, e) => s + (e.amountBDT || 0), 0);
  const linkedBDT = linkedExpenses.reduce((s, e) => s + (e.amountBDT || 0), 0);
  const sumaiyaBDT = expenses
    .filter((e) => e.paidBy === "Sumaiya")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const rakibBDT = expenses
    .filter((e) => e.paidBy === "Rakib")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);

  const handleGenerate = async () => {
    if (expenses.length === 0) {
      setErr("No expenses found — add some in the Expenses Tracker first.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await generateExpenseReport({
        report: {
          ...form,
          linkedToSettlement: linkedExpenses.length > 0,
          reportNo: "EXP-" + Date.now().toString(36).toUpperCase().slice(-6),
        },
        expenses,
        company,
      });
    } catch (e) {
      setErr(e.message || "PDF failed — run: npm install jspdf");
    }
    setLoading(false);
  };

  return (
    <div>
      <FormSec title="Report Info">
        <FormGrid cols={2}>
          <FormField label="Period / Month">
            <input
              style={inp}
              value={form.period}
              onChange={(e) => set("period", e.target.value)}
              placeholder="e.g. March 2026"
            />
          </FormField>
          <FormField label="Prepared By">
            <input
              style={inp}
              value={form.preparedBy}
              onChange={(e) => set("preparedBy", e.target.value)}
            />
          </FormField>
        </FormGrid>
        <FormField label="Notes">
          <textarea
            style={{ ...inp, height: 60, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional notes for the report…"
          />
        </FormField>
      </FormSec>

      {!loaded ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: pal.textMute,
            fontSize: 13,
          }}
        >
          Loading expenses…
        </div>
      ) : expenses.length === 0 ? (
        <div
          style={{
            padding: "20px 18px",
            borderRadius: 14,
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.25)",
            fontSize: 13,
            color: pal.textSub,
          }}
        >
          No expenses found. Go to the{" "}
          <strong style={{ color: "#f59e0b" }}>Expenses Tracker</strong> tab in
          the sidebar and add some first.
        </div>
      ) : (
        <div
          style={{
            padding: "18px 20px",
            borderRadius: 14,
            background: pal.surfaceElevated,
            border: `1px solid ${pal.border}`,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#f59e0b",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 14,
            }}
          >
            Report Preview
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            {[
              {
                l: "Total Expenses",
                v: "৳" + Math.round(totalBDT).toLocaleString(),
                c: "#f59e0b",
              },
              {
                l: "Sumaiya Paid",
                v: "৳" + Math.round(sumaiyaBDT).toLocaleString(),
                c: "#ec4899",
              },
              {
                l: "Rakib Paid",
                v: "৳" + Math.round(rakibBDT).toLocaleString(),
                c: "#3b82f6",
              },
              {
                l: "In Settlement",
                v: "৳" + Math.round(linkedBDT).toLocaleString(),
                c: "#10b981",
              },
              { l: "Total Entries", v: expenses.length, c: "#06b6d4" },
            ].map(({ l, v, c }) => (
              <div
                key={l}
                style={{
                  textAlign: "center",
                  padding: "10px 8px",
                  borderRadius: 10,
                  background: c + "10",
                  border: `1px solid ${c}22`,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: pal.textMute,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  {l}
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: c }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
          {linkedExpenses.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <span style={{ fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>
                {linkedExpenses.length} expense
                {linkedExpenses.length !== 1 ? "s" : ""} linked to CEO
                settlement — will appear in report
              </span>
            </div>
          )}
        </div>
      )}

      {err && (
        <div
          style={{
            padding: "11px 14px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          {err}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <GenBtn
          loading={loading}
          onClick={handleGenerate}
          color="#f59e0b"
          label={`Download Expense Report PDF (${expenses.length} items)`}
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════
   PAGE TABS
════════════════════════════════ */
const TABS = [
  { id: "invoice", label: "Client Invoice", Icon: FileText, color: "#06b6d4" },
  {
    id: "receipt",
    label: "Payment Receipt",
    Icon: DollarSign,
    color: "#10b981",
  },
  { id: "expense", label: "Expense Report", Icon: Receipt, color: "#f59e0b" },
];

export default function InvoiceGen({ projects, currencies }) {
  const pal = usePalette();
  const [tab, setTab] = useState("invoice");
  const [co, setCo] = useState({ ...COMPANY });

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: pal.text,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FileText size={20} color="#06b6d4" /> PDF Generator
        </h2>
        <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
          Professional PDFs — fills from your data, one-click download
        </p>
      </div>

      {/* jspdf install hint */}
      <div
        style={{
          padding: "11px 16px",
          marginBottom: 20,
          borderRadius: 12,
          background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.22)",
          fontSize: 12.5,
          color: pal.textSub,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>📦</span>
        <span>
          Requires{" "}
          <code
            style={{
              background: pal.surfaceElevated,
              padding: "1px 6px",
              borderRadius: 4,
              color: "#06b6d4",
              fontSize: 11.5,
            }}
          >
            jspdf
          </code>{" "}
          — run{" "}
          <code
            style={{
              background: pal.surfaceElevated,
              padding: "1px 6px",
              borderRadius: 4,
              color: "#10b981",
              fontSize: 11.5,
            }}
          >
            npm install jspdf
          </code>{" "}
          once if not installed.
        </span>
      </div>

      {/* Company info */}
      <CompanyBox co={co} setCo={setCo} />

      {/* Tabs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        {TABS.map((t) => (
          <TabBtn
            key={t.id}
            active={tab === t.id}
            color={t.color}
            Icon={t.Icon}
            label={t.label}
            badge={t.badge}
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>

      <Card style={{ padding: 28 }}>
        {tab === "invoice" && (
          <ClientInvoiceForm
            company={co}
            projects={projects || []}
            currencies={currencies || []}
          />
        )}
        {tab === "receipt" && (
          <PaymentReceiptForm
            company={co}
            projects={projects || []}
            currencies={currencies || []}
          />
        )}
        {tab === "expense" && <ExpenseReportForm company={co} />}
      </Card>
    </div>
  );
}
