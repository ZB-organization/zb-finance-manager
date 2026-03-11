/**
 * Expenses Tracker — v1.4.0
 * Log company expenses, split by payer, link to settlement, export PDF.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Trash2,
  Search,
  Download,
  ExternalLink,
  CheckCircle,
  Receipt,
  Tag,
} from "lucide-react";
import { usePalette } from "../theme";
import { Card, FormSec, FormField, FormGrid } from "../components/Shared";
import { ProgressBar, DualBar } from "../components/ProgressBar";
import {
  EXPENSE_CATS,
  EXPENSE_PAID_BY,
  COMPANY,
  GEN_ID,
  FMT,
  FMT2,
  TS,
} from "../constants";
import { loadExpenses, saveExpense, deleteExpense } from "../db";
import { generateExpenseReport } from "../components/PDFGen";

const PAYER_COLOR = {
  Sumaiya: "#ec4899",
  Rakib: "#3b82f6",
  "Company (Joint)": "#10b981",
};

const BLANK = {
  date: new Date().toISOString().slice(0, 10),
  category: EXPENSE_CATS[0],
  description: "",
  amount: "",
  currency: "BDT",
  paidBy: "Sumaiya",
  amountSumaiya: "",
  amountRakib: "",
  proofUrl: "",
  notes: "",
  linkedToSettlement: false,
};

/* ══════════════════════════
   ADD / EDIT FORM
══════════════════════════ */
function ExpenseForm({ initial, currencies, onSave, onCancel }) {
  const pal = usePalette();
  const [form, setForm] = useState(initial ? { ...initial } : { ...BLANK });
  const set = useCallback((k, v) => setForm((f) => ({ ...f, [k]: v })), []);

  const inp = useMemo(
    () => ({
      width: "100%",
      boxSizing: "border-box",
      background: pal.inpBg,
      border: `1px solid ${pal.inpBorder}`,
      borderRadius: 10,
      padding: "10px 13px",
      color: pal.text,
      fontSize: 13,
      outline: "none",
      fontFamily: "inherit",
    }),
    [pal.inpBg, pal.inpBorder, pal.text],
  );

  const handleSave = () => {
    if (!form.description.trim()) {
      alert("Description required");
      return;
    }

    let totalAmount = parseFloat(form.amount) || 0;

    // For Joint: if individual amounts filled, sum them as the total
    if (form.paidBy === "Company (Joint)") {
      const sAmt = parseFloat(form.amountSumaiya) || 0;
      const rAmt = parseFloat(form.amountRakib) || 0;
      if (sAmt > 0 || rAmt > 0) totalAmount = sAmt + rAmt;
    }

    if (!totalAmount) {
      alert("Amount must be > 0");
      return;
    }
    const curr = (currencies || []).find((c) => c.code === form.currency) || {
      rate: 1,
    };
    onSave({
      ...form,
      id: form.id || GEN_ID(),
      amount: totalAmount,
      amountBDT: totalAmount * curr.rate,
      amountSumaiya:
        form.paidBy === "Company (Joint)"
          ? parseFloat(form.amountSumaiya) || 0
          : 0,
      amountRakib:
        form.paidBy === "Company (Joint)"
          ? parseFloat(form.amountRakib) || 0
          : 0,
      createdAt: form.createdAt || TS(),
      updatedAt: TS(),
    });
  };

  return (
    <div
      style={{
        background: pal.surfaceElevated,
        border: `1px solid ${pal.borderMid}`,
        borderRadius: 18,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: "#f59e0b",
          marginBottom: 18,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {form.id ? "Edit Expense" : "Add Expense"}
      </div>

      <FormGrid cols={3}>
        <FormField label="Date">
          <input
            style={inp}
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </FormField>
        <FormField label="Category">
          <select
            style={inp}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {EXPENSE_CATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Paid By">
          <div style={{ display: "flex", gap: 5 }}>
            {EXPENSE_PAID_BY.map((pb) => {
              const c = PAYER_COLOR[pb],
                active = form.paidBy === pb;
              return (
                <button
                  key={pb}
                  onClick={() => set("paidBy", pb)}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    borderRadius: 9,
                    border: `2px solid ${active ? c : "rgba(128,128,128,0.2)"}`,
                    background: active ? c + "18" : "transparent",
                    color: active ? c : pal.textMute,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {pb === "Company (Joint)" ? "Joint" : pb}
                </button>
              );
            })}
          </div>
        </FormField>
      </FormGrid>

      <FormField label="Description *">
        <input
          style={inp}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What was this expense for?"
        />
      </FormField>

      <FormGrid cols={3}>
        <FormField label="Amount *">
          <input
            style={inp}
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder={
              form.paidBy === "Company (Joint)"
                ? "Total (or leave blank)"
                : "0.00"
            }
          />
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
        <FormField label="Proof / Invoice URL">
          <input
            style={inp}
            value={form.proofUrl}
            onChange={(e) => set("proofUrl", e.target.value)}
            placeholder="https://…"
          />
        </FormField>
      </FormGrid>

      {/* Joint split fields — only shown when "Company (Joint)" selected */}
      {form.paidBy === "Company (Joint)" && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.2)",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#10b981",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 12,
            }}
          >
            Split Amounts — who paid how much?
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <FormField label="Sumaiya Paid (optional)">
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#ec4899",
                    pointerEvents: "none",
                  }}
                >
                  S
                </div>
                <input
                  style={{ ...inp, paddingLeft: 26 }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountSumaiya}
                  onChange={(e) => set("amountSumaiya", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </FormField>
            <FormField label="Rakib Paid (optional)">
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#3b82f6",
                    pointerEvents: "none",
                  }}
                >
                  R
                </div>
                <input
                  style={{ ...inp, paddingLeft: 26 }}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amountRakib}
                  onChange={(e) => set("amountRakib", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </FormField>
          </div>
          {(parseFloat(form.amountSumaiya) > 0 ||
            parseFloat(form.amountRakib) > 0) && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#10b981",
                fontWeight: 600,
              }}
            >
              Total ={" "}
              {(currencies || []).find((c) => c.code === form.currency)
                ?.symbol || "৳"}
              {FMT2(
                (parseFloat(form.amountSumaiya) || 0) +
                  (parseFloat(form.amountRakib) || 0),
              )}{" "}
              — auto-fills the Amount field above
            </div>
          )}
        </div>
      )}

      <FormField label="Notes">
        <input
          style={inp}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional context…"
        />
      </FormField>

      {/* Settlement link toggle */}
      <div
        onClick={() => set("linkedToSettlement", !form.linkedToSettlement)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 12,
          borderTop: `1px solid ${
            form.linkedToSettlement ? "rgba(16,185,129,0.4)" : pal.border
          }`,
          borderRight: `1px solid ${
            form.linkedToSettlement ? "rgba(16,185,129,0.4)" : pal.border
          }`,
          borderBottom: `1px solid ${
            form.linkedToSettlement ? "rgba(16,185,129,0.4)" : pal.border
          }`,
          borderLeft: `1px solid ${
            form.linkedToSettlement ? "rgba(16,185,129,0.4)" : pal.border
          }`,
          background: form.linkedToSettlement
            ? "rgba(16,185,129,0.07)"
            : "transparent",
          cursor: "pointer",
          marginBottom: 18,
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            flexShrink: 0,
            transition: "all 0.15s",
            background: form.linkedToSettlement ? "#10b981" : "transparent",
            border: `2px solid ${
              form.linkedToSettlement ? "#10b981" : "rgba(128,128,128,0.3)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {form.linkedToSettlement && <CheckCircle size={14} color="#fff" />}
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: form.linkedToSettlement ? "#10b981" : pal.text,
            }}
          >
            Link to CEO Settlement
          </div>
          <div style={{ fontSize: 11, color: pal.textMute }}>
            Include this expense in the net settlement calculation between CEOs
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 22px",
            borderRadius: 11,
            border: `1px solid ${pal.border}`,
            background: "transparent",
            color: pal.textMute,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 26px",
            borderRadius: 11,
            border: "none",
            background: "linear-gradient(135deg,#f59e0b,#f97316)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
          }}
        >
          {form.id ? "Save Changes" : "Add Expense"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════
   MAIN PAGE
══════════════════════════ */
export default function Expenses({ currencies, onLog, onSaved }) {
  const pal = usePalette();
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [payerFilter, setPayerFilter] = useState("All");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfErr, setPdfErr] = useState("");

  useEffect(() => {
    loadExpenses().then(setExpenses);
  }, []);

  /* ── stats ── */
  const stats = useMemo(() => {
    let total = 0,
      sumaiya = 0,
      rakib = 0,
      joint = 0;
    const byCat = {};
    expenses.forEach((e) => {
      total += e.amountBDT || 0;
      if (e.paidBy === "Sumaiya") sumaiya += e.amountBDT || 0;
      else if (e.paidBy === "Rakib") rakib += e.amountBDT || 0;
      else joint += e.amountBDT || 0;
      byCat[e.category] = (byCat[e.category] || 0) + (e.amountBDT || 0);
    });
    const linked = expenses
      .filter((e) => e.linkedToSettlement)
      .reduce((s, e) => s + (e.amountBDT || 0), 0);
    return { total, sumaiya, rakib, joint, byCat, linked };
  }, [expenses]);

  /* ── filtered ── */
  const filtered = useMemo(
    () =>
      expenses
        .filter(
          (e) =>
            (catFilter === "All" || e.category === catFilter) &&
            (payerFilter === "All" || e.paidBy === payerFilter) &&
            (!q ||
              (e.description || "").toLowerCase().includes(q.toLowerCase()) ||
              (e.category || "").toLowerCase().includes(q.toLowerCase())),
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [expenses, catFilter, payerFilter, q],
  );

  const handleSave = async (exp) => {
    await saveExpense(exp);
    setExpenses(await loadExpenses());
    setShowForm(false);
    setEditing(null);
    onSaved && onSaved(); // ← tells App.jsx to reload expenses → recalculates appDebt → red dot updates
    onLog &&
      onLog({
        type: "EXPENSE_SAVED",
        detail: `Expense "${exp.description}" saved`,
      });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await deleteExpense(id);
    setExpenses(await loadExpenses());
    onSaved && onSaved(); // ← same: sync App state on delete
    onLog && onLog({ type: "EXPENSE_DELETED", detail: "Expense deleted" });
  };

  const handleExportPDF = async () => {
    if (expenses.length === 0) {
      setPdfErr("No expenses to export");
      return;
    }
    setPdfErr("");
    setPdfLoading(true);
    try {
      const month = new Date().toLocaleDateString("en-BD", {
        month: "long",
        year: "numeric",
      });
      await generateExpenseReport({
        report: {
          period: month,
          preparedBy: "Both CEOs",
          linkedToSettlement: expenses.some((e) => e.linkedToSettlement),
          reportNo: "EXP-" + Date.now().toString(36).toUpperCase().slice(-6),
        },
        expenses: filtered.length > 0 ? filtered : expenses,
        company: COMPANY,
      });
    } catch (e) {
      setPdfErr(e.message || "PDF failed — run: npm install jspdf");
    }
    setPdfLoading(false);
  };

  const topCats = Object.entries(stats.byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const CAT_COLORS = [
    "#06b6d4",
    "#8b5cf6",
    "#f59e0b",
    "#10b981",
    "#ec4899",
    "#3b82f6",
  ];

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
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
            <Receipt size={20} color="#f59e0b" /> Expenses Tracker
          </h2>
          <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""} · ৳
            {FMT(stats.total)} total
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExportPDF}
            disabled={pdfLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 18px",
              borderRadius: 11,
              border: "1px solid rgba(245,158,11,0.35)",
              background: "rgba(245,158,11,0.1)",
              color: "#f59e0b",
              cursor: pdfLoading ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            <Download
              size={14}
              style={{ animation: pdfLoading ? "pulse 0.8s infinite" : "none" }}
            />
            {pdfLoading ? "Generating…" : "Export PDF"}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 18px",
              borderRadius: 11,
              border: "none",
              background: "linear-gradient(135deg,#f59e0b,#f97316)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
            }}
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {pdfErr && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 14,
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444",
            fontSize: 13,
          }}
        >
          {pdfErr}
        </div>
      )}

      {/* ── Add/Edit form ── */}
      {(showForm || editing) && (
        <ExpenseForm
          initial={editing}
          currencies={currencies}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {/* ── KPIs ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          { l: "Total", v: "৳" + FMT(stats.total), color: "#f59e0b", pct: 100 },
          {
            l: "Sumaiya Paid",
            v: "৳" + FMT(stats.sumaiya),
            color: "#ec4899",
            pct: stats.total ? (stats.sumaiya / stats.total) * 100 : 0,
          },
          {
            l: "Rakib Paid",
            v: "৳" + FMT(stats.rakib),
            color: "#3b82f6",
            pct: stats.total ? (stats.rakib / stats.total) * 100 : 0,
          },
          {
            l: "Joint",
            v: "৳" + FMT(stats.joint),
            color: "#10b981",
            pct: stats.total ? (stats.joint / stats.total) * 100 : 0,
          },
          {
            l: "In Settlement",
            v: "৳" + FMT(stats.linked),
            color: "#06b6d4",
            pct: stats.total ? (stats.linked / stats.total) * 100 : 0,
          },
        ].map(({ l, v, color, pct }) => (
          <Card key={l} animated style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}
            >
              {l}
            </div>
            <div
              style={{ fontSize: 20, fontWeight: 900, color, marginBottom: 10 }}
            >
              {v}
            </div>
            <ProgressBar value={pct} color={color} height={4} />
          </Card>
        ))}
      </div>

      {/* ── CEO Split Bar ── */}
      {stats.sumaiya + stats.rakib > 0 && (
        <Card style={{ padding: "16px 20px", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: pal.textMute,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            CEO Spending Split
          </div>
          <DualBar
            aVal={stats.sumaiya}
            bVal={stats.rakib}
            height={12}
            aLabel="Sumaiya"
            bLabel="Rakib"
          />
        </Card>
      )}

      {/* ── Category bars ── */}
      {topCats.length > 0 && (
        <Card style={{ padding: 20, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: pal.text,
              marginBottom: 16,
            }}
          >
            Spending by Category
          </div>
          {topCats.map(([cat, amt], i) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <ProgressBar
                value={stats.total ? (amt / stats.total) * 100 : 0}
                color={CAT_COLORS[i % CAT_COLORS.length]}
                height={7}
                label={cat}
                labelRight={"৳" + FMT(amt)}
              />
            </div>
          ))}
        </Card>
      )}

      {/* ── Settlement notice ── */}
      {stats.linked > 0 && (
        <Card
          style={{
            padding: "13px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderLeft: "3px solid #10b981",
          }}
        >
          <CheckCircle size={16} color="#10b981" />
          <span style={{ fontSize: 13, color: pal.text }}>
            <strong style={{ color: "#10b981" }}>৳{FMT(stats.linked)}</strong>
            <span style={{ color: pal.textMute }}>
              {" "}
              linked to CEO settlement calculation.
            </span>
          </span>
        </Card>
      )}

      {/* ── Filters ── */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: pal.textMute,
            }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search expenses…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: pal.inpBg,
              border: `1px solid ${pal.inpBorder}`,
              borderRadius: 10,
              padding: "9px 12px 9px 34px",
              color: pal.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...EXPENSE_PAID_BY].map((p) => {
            const c = PAYER_COLOR[p] || "#06b6d4",
              active = payerFilter === p;
            return (
              <button
                key={p}
                onClick={() => setPayerFilter(p)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: `1px solid ${active ? c : "rgba(128,128,128,0.2)"}`,
                  background: active ? c + "1a" : "transparent",
                  color: active ? c : pal.textMute,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                {p === "Company (Joint)" ? "Joint" : p}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...EXPENSE_CATS.slice(0, 5)].map((c) => {
            const active = catFilter === c;
            return (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 9,
                  border: `1px solid ${
                    active ? "#f59e0b" : "rgba(128,128,128,0.2)"
                  }`,
                  background: active ? "rgba(245,158,11,0.13)" : "transparent",
                  color: active ? "#f59e0b" : pal.textMute,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Expense rows ── */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: pal.textFaint,
          }}
        >
          <Receipt
            size={48}
            strokeWidth={1}
            style={{ margin: "0 auto 12px", display: "block" }}
          />
          <div style={{ fontSize: 14 }}>
            No expenses yet. Click "Add Expense" to start tracking.
          </div>
        </div>
      ) : (
        filtered.map((e) => {
          const pColor = PAYER_COLOR[e.paidBy] || "#64748b";
          const currSym =
            (currencies || []).find((c) => c.code === e.currency)?.symbol ||
            "৳";
          return (
            <Card
              key={e.id}
              style={{
                marginBottom: 8,
                padding: 0,
                overflow: "hidden",
                borderLeft: `3px solid ${pColor}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: pColor + "18",
                    border: `1px solid ${pColor}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Tag size={17} color={pColor} />
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div
                    style={{ fontWeight: 700, color: pal.text, fontSize: 14 }}
                  >
                    {e.description}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: pal.textMute,
                      marginTop: 3,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: pColor, fontWeight: 600 }}>
                      {e.paidBy}
                    </span>
                    <span
                      style={{
                        background: "rgba(245,158,11,0.12)",
                        color: "#f59e0b",
                        padding: "1px 7px",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: 10,
                      }}
                    >
                      {e.category}
                    </span>
                    <span>{e.date}</span>
                    {e.paidBy === "Company (Joint)" &&
                      (e.amountSumaiya > 0 || e.amountRakib > 0) && (
                        <span style={{ color: pal.textMute }}>
                          <span style={{ color: "#ec4899", fontWeight: 600 }}>
                            S:{currSym}
                            {FMT2(e.amountSumaiya || 0)}
                          </span>
                          {" + "}
                          <span style={{ color: "#3b82f6", fontWeight: 600 }}>
                            R:{currSym}
                            {FMT2(e.amountRakib || 0)}
                          </span>
                        </span>
                      )}
                    {e.linkedToSettlement && (
                      <span
                        style={{
                          background: "rgba(16,185,129,0.12)",
                          color: "#10b981",
                          padding: "1px 7px",
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        +Settlement
                      </span>
                    )}
                  </div>
                  {e.notes && (
                    <div
                      style={{
                        fontSize: 11,
                        color: pal.textMute,
                        marginTop: 3,
                        fontStyle: "italic",
                      }}
                    >
                      {e.notes}
                    </div>
                  )}
                </div>

                {e.proofUrl && (
                  <a
                    href={e.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#06b6d4", lineHeight: 0, flexShrink: 0 }}
                    title="View proof"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: pColor }}>
                    {currSym}
                    {FMT2(e.amount)}
                  </div>
                  {e.currency !== "BDT" && (
                    <div style={{ fontSize: 11, color: pal.textMute }}>
                      ≈ ৳{FMT(e.amountBDT)}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setEditing(e);
                      setShowForm(false);
                    }}
                    style={{
                      background: pal.surfaceElevated,
                      border: "none",
                      borderRadius: 8,
                      padding: "7px 10px",
                      color: pal.textMute,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "none",
                      borderRadius: 8,
                      padding: 7,
                      color: "#ef4444",
                      cursor: "pointer",
                      lineHeight: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })
      )}

      {filtered.length > 0 && (
        <div
          style={{
            textAlign: "right",
            fontSize: 12,
            color: pal.textMute,
            marginTop: 10,
          }}
        >
          {filtered.length} of {expenses.length} · Total shown:{" "}
          <strong style={{ color: "#f59e0b" }}>
            ৳{FMT(filtered.reduce((s, e) => s + (e.amountBDT || 0), 0))}
          </strong>
        </div>
      )}
    </div>
  );
}
