/**
 * Reports.jsx — Monthly & Yearly Calculations Table
 *
 * Features:
 *   - Toggle: Monthly | Yearly view
 *   - Month/Year picker with prev/next navigation
 *   - Projects table: name, budget, CEO shares, rule, channel, status
 *   - Expenses table: date, description, category, paidBy, currency, amount, BDT
 *   - Per-section summary KPI cards (totals, CEO split)
 *   - Search (filters both tables simultaneously)
 *   - Filter by: paidBy, category, status
 *   - Export to CSV (projects + expenses as separate sheets in one download)
 *
 * Place at: src/pages/Reports.jsx
 * Props:    projects={projects} currencies={currencies}
 */
import { useState, useEffect, useMemo } from "react";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { usePalette } from "../theme";
import { Card, FormField } from "../components/Shared";
import { EXPENSE_CATS, EXPENSE_PAID_BY, STATUSES, ST_COL } from "../constants";
import { calcShares } from "../calc";
import { loadExpenses } from "../db";

/* ─── number helpers ────────────────────────────────────── */
const fmtN = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtBDT = (n) => "৳" + fmtN(n);
const fmt2 = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ─── Date utilities ────────────────────────────────────── */
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthLabel(y, m) {
  return `${MONTH_NAMES[m]} ${y}`;
}
function yearLabel(y) {
  return String(y);
}

/** date string YYYY-MM-DD belongs to year y, month m (0-indexed) */
function inMonth(dateStr, y, m) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === y && d.getMonth() === m;
}
function inYear(dateStr, y) {
  if (!dateStr) return false;
  return new Date(dateStr).getFullYear() === y;
}

/** Choose the best "date" for a project: payDay → startDate → createdAt */
function projectDate(p) {
  return p.payDay || p.startDate || p.createdAt || "";
}

/* ─── CSV export ────────────────────────────────────────── */
function toCSVRow(cells) {
  return cells
    .map((c) => {
      const s = String(c ?? "").replace(/"/g, '""');
      return s.includes(",") || s.includes("\n") || s.includes('"')
        ? `"${s}"`
        : s;
    })
    .join(",");
}

function downloadCSV(filename, sections) {
  // sections: [{ title, headers, rows }]
  const lines = [];
  sections.forEach((sec) => {
    lines.push(toCSVRow([sec.title]));
    lines.push(toCSVRow(sec.headers));
    sec.rows.forEach((r) => lines.push(toCSVRow(r)));
    lines.push(""); // blank line between sections
  });
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Shared input style ────────────────────────────────── */
function useInp() {
  const pal = usePalette();
  return useMemo(
    () => ({
      boxSizing: "border-box",
      background: pal.inpBg,
      border: `1px solid ${pal.inpBorder}`,
      borderRadius: 9,
      padding: "9px 12px",
      color: pal.text,
      fontSize: 13,
      outline: "none",
      fontFamily: "inherit",
    }),
    [pal.inpBg, pal.inpBorder, pal.text],
  );
}

/* ─── KPI card ──────────────────────────────────────────── */
function KpiCard({ label, value, sub, color }) {
  const pal = usePalette();
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 13,
        background: color + "0e",
        border: `1px solid ${color}25`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: pal.textMute, marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── Section header ────────────────────────────────────── */
function SectionHeader({ title, count, color, action }) {
  const pal = usePalette();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        marginTop: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{ width: 4, height: 20, borderRadius: 2, background: color }}
        />
        <span style={{ fontSize: 14, fontWeight: 800, color: pal.text }}>
          {title}
        </span>
        {count != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: 6,
              background: color + "18",
              color,
            }}
          >
            {count} {count === 1 ? "row" : "rows"}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/* ─── Table ─────────────────────────────────────────────── */
function DataTable({ cols, rows, emptyMsg }) {
  const pal = usePalette();
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "22px 16px",
          textAlign: "center",
          color: pal.textMute,
          fontSize: 13,
          borderRadius: 12,
          border: `1px solid ${pal.border}`,
          background: pal.surfaceElevated,
        }}
      >
        {emptyMsg || "No data for this period."}
      </div>
    );
  }
  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 12,
        border: `1px solid ${pal.border}`,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12.5,
          minWidth: 600,
        }}
      >
        <thead>
          <tr
            style={{
              background: pal.surfaceElevated,
              borderBottom: `2px solid ${pal.border}`,
            }}
          >
            {cols.map((c, i) => (
              <th
                key={i}
                style={{
                  padding: "10px 13px",
                  textAlign: c.right ? "right" : "left",
                  fontSize: 10,
                  fontWeight: 800,
                  color: pal.textMute,
                  textTransform: "uppercase",
                  letterSpacing: 0.9,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{
                borderBottom: `1px solid ${pal.border}`,
                background:
                  ri % 2 === 1 ? pal.surfaceElevated + "66" : "transparent",
              }}
            >
              {cols.map((c, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "9px 13px",
                    textAlign: c.right ? "right" : "left",
                    color: c.color ? c.color(row) : pal.text,
                    fontWeight: c.bold ? 700 : 400,
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                  }}
                >
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Summary totals row ────────────────────────────────── */
function TotalsRow({ cells }) {
  const pal = usePalette();
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderRadius: "0 0 12px 12px",
        background: pal.surfaceElevated,
        border: `1px solid ${pal.border}`,
        borderTop: "none",
        overflowX: "auto",
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            flex: c.flex ?? 1,
            padding: "9px 13px",
            textAlign: c.right ? "right" : "left",
            borderRight:
              i < cells.length - 1 ? `1px solid ${pal.border}` : "none",
            fontSize: 12,
            fontWeight: 800,
            color: c.color || pal.text,
            whiteSpace: "nowrap",
            minWidth: c.minWidth,
          }}
        >
          {c.value ?? ""}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Reports({ projects = [], currencies = [] }) {
  const pal = usePalette();
  const inp = useInp();

  /* ── state ── */
  const [view, setView] = useState("monthly"); // "monthly" | "yearly"
  const today = new Date();
  const [selYear, setSelYear] = useState(today.getFullYear());
  const [selMonth, setSelMonth] = useState(today.getMonth()); // 0-indexed

  const [expenses, setExpenses] = useState([]);
  const [expLoaded, setExpLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [filterPaidBy, setFilterPaidBy] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  /* ── load expenses ── */
  useEffect(() => {
    loadExpenses().then((e) => {
      setExpenses(e);
      setExpLoaded(true);
    });
  }, []);

  /* ── period navigation ── */
  function prevPeriod() {
    if (view === "monthly") {
      if (selMonth === 0) {
        setSelMonth(11);
        setSelYear((y) => y - 1);
      } else setSelMonth((m) => m - 1);
    } else setSelYear((y) => y - 1);
  }
  function nextPeriod() {
    if (view === "monthly") {
      if (selMonth === 11) {
        setSelMonth(0);
        setSelYear((y) => y + 1);
      } else setSelMonth((m) => m + 1);
    } else setSelYear((y) => y + 1);
  }

  const periodLabel =
    view === "monthly" ? monthLabel(selYear, selMonth) : yearLabel(selYear);

  /* ── filter helpers ── */
  const q = search.toLowerCase().trim();

  const matchesSearch = (obj, fields) =>
    !q ||
    fields.some((f) =>
      String(obj[f] ?? "")
        .toLowerCase()
        .includes(q),
    );

  /* ── FILTERED PROJECTS ── */
  const filteredProjects = useMemo(() => {
    return (projects || []).filter((p) => {
      const dateStr = projectDate(p);
      const inPeriod =
        view === "monthly"
          ? inMonth(dateStr, selYear, selMonth)
          : inYear(dateStr, selYear);
      if (!inPeriod) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      if (
        !matchesSearch(p, [
          "name",
          "paymentChannel",
          "rule",
          "status",
          "currency",
          "workerType",
        ])
      )
        return false;
      return true;
    });
  }, [projects, view, selYear, selMonth, filterStatus, search]);

  /* ── FILTERED EXPENSES ── */
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const dateStr = e.date || e.createdAt || "";
      const inPeriod =
        view === "monthly"
          ? inMonth(dateStr, selYear, selMonth)
          : inYear(dateStr, selYear);
      if (!inPeriod) return false;
      if (filterPaidBy !== "All" && e.paidBy !== filterPaidBy) return false;
      if (filterCat !== "All" && e.category !== filterCat) return false;
      if (
        !matchesSearch(e, [
          "description",
          "category",
          "paidBy",
          "currency",
          "notes",
        ])
      )
        return false;
      return true;
    });
  }, [expenses, view, selYear, selMonth, filterPaidBy, filterCat, search]);

  /* ── PROJECT calcs ── */
  const projectRows = useMemo(() => {
    return filteredProjects.map((p) => {
      const s = calcShares(p, currencies);
      return {
        ...p,
        _totalBDT: s.totalBDT,
        _taxAmt: s.taxAmt,
        _net: s.net,
        _wBDT: s.wBDT,
        _sShare: s.sShare,
        _rShare: s.rShare,
        _sP: s.sP,
        _rP: s.rP,
        _date: projectDate(p),
      };
    });
  }, [filteredProjects, currencies]);

  /* ── EXPENSE calcs ── */
  const expenseRows = useMemo(
    () =>
      filteredExpenses.map((e) => ({
        ...e,
        _date: (e.date || e.createdAt || "").slice(0, 10),
      })),
    [filteredExpenses],
  );

  /* ── KPIs ── */
  const projTotalBDT = projectRows.reduce((s, p) => s + p._totalBDT, 0);
  const projNetBDT = projectRows.reduce((s, p) => s + p._net, 0);
  const projSumaiya = projectRows.reduce((s, p) => s + p._sShare, 0);
  const projRakib = projectRows.reduce((s, p) => s + p._rShare, 0);

  const expTotalBDT = expenseRows.reduce((s, e) => s + (e.amountBDT || 0), 0);
  const expSumaiya = expenseRows
    .filter((e) => e.paidBy === "Sumaiya")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const expRakib = expenseRows
    .filter((e) => e.paidBy === "Rakib")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const expLinked = expenseRows
    .filter((e) => e.linkedToSettlement)
    .reduce((s, e) => s + (e.amountBDT || 0), 0);

  /* ── CSV EXPORT ── */
  function handleExport() {
    const projectHeaders = [
      "Date",
      "Project Name",
      "Currency",
      "Budget",
      "Budget (BDT)",
      "Tax BDT",
      "Net BDT",
      "Worker BDT",
      "Sumaiya %",
      "Sumaiya (BDT)",
      "Rakib %",
      "Rakib (BDT)",
      "Channel",
      "Rule",
      "Status",
    ];
    const projectCSVRows = projectRows.map((p) => [
      p._date,
      p.name,
      p.currency,
      p.totalBudget,
      Math.round(p._totalBDT),
      Math.round(p._taxAmt),
      Math.round(p._net),
      Math.round(p._wBDT),
      p._sP,
      Math.round(p._sShare),
      p._rP,
      Math.round(p._rShare),
      p.paymentChannel,
      p.rule || "DEFAULT",
      p.status,
    ]);

    const expenseHeaders = [
      "Date",
      "Description",
      "Category",
      "Paid By",
      "Currency",
      "Amount",
      "Amount (BDT)",
      "Linked to Settlement",
      "Notes",
    ];
    const expenseCSVRows = expenseRows.map((e) => [
      e._date,
      e.description,
      e.category,
      e.paidBy,
      e.currency,
      e.amount,
      Math.round(e.amountBDT || 0),
      e.linkedToSettlement ? "Yes" : "No",
      e.notes || "",
    ]);

    downloadCSV(`ZBCompany_Report_${periodLabel.replace(/\s/g, "_")}.csv`, [
      {
        title: `PROJECTS — ${periodLabel}`,
        headers: projectHeaders,
        rows: projectCSVRows,
      },
      {
        title: `EXPENSES — ${periodLabel}`,
        headers: expenseHeaders,
        rows: expenseCSVRows,
      },
    ]);
  }

  /* ── Project table columns ── */
  const projCols = [
    { key: "_date", label: "Date", render: (r) => r._date || "—" },
    { key: "name", label: "Project", bold: true, wrap: true },
    { key: "currency", label: "Currency" },
    {
      key: "totalBudget",
      label: "Budget",
      right: true,
      render: (r) =>
        `${
          (currencies.find((c) => c.code === r.currency) || {}).symbol || ""
        }${fmt2(r.totalBudget)}`,
    },
    {
      key: "_totalBDT",
      label: "Total BDT",
      right: true,
      bold: true,
      render: (r) => fmtBDT(r._totalBDT),
    },
    {
      key: "_taxAmt",
      label: "Tax BDT",
      right: true,
      render: (r) => (r._taxAmt > 0 ? fmtBDT(r._taxAmt) : "—"),
    },
    {
      key: "_net",
      label: "Net BDT",
      right: true,
      render: (r) => fmtBDT(r._net),
    },
    {
      key: "_sShare",
      label: "Sumaiya BDT",
      right: true,
      color: () => "#ec4899",
      bold: true,
      render: (r) => `${fmtBDT(r._sShare)} (${r._sP}%)`,
    },
    {
      key: "_rShare",
      label: "Rakib BDT",
      right: true,
      color: () => "#3b82f6",
      bold: true,
      render: (r) => `${fmtBDT(r._rShare)} (${r._rP}%)`,
    },
    {
      key: "paymentChannel",
      label: "Channel",
      render: (r) => (
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(6,182,212,0.12)",
            color: "#06b6d4",
            fontWeight: 700,
          }}
        >
          {r.paymentChannel || "—"}
        </span>
      ),
    },
    {
      key: "rule",
      label: "Rule",
      render: (r) => (
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(139,92,246,0.1)",
            color: "#8b5cf6",
            fontWeight: 700,
          }}
        >
          {r.rule || "DEFAULT"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
            background: (ST_COL[r.status] || "#64748b") + "22",
            color: ST_COL[r.status] || "#64748b",
            fontWeight: 700,
          }}
        >
          {r.status || "—"}
        </span>
      ),
    },
  ];

  // projCols order: _date, name, currency, totalBudget, _totalBDT, _taxAmt, _net, _sShare, _rShare, paymentChannel, rule, status (12 cols)
  const projTotals = [
    { value: "TOTALS", flex: 1, minWidth: 90 }, // _date
    { value: "", flex: 1, minWidth: 100 }, // name
    { value: "", flex: 1, minWidth: 70 }, // currency
    { value: "", flex: 1, minWidth: 90 }, // totalBudget (raw, skip total)
    {
      value: fmtBDT(projTotalBDT),
      right: true,
      color: "#06b6d4",
      flex: 1,
      minWidth: 100,
    }, // _totalBDT
    { value: "", flex: 1, minWidth: 80 }, // _taxAmt
    { value: fmtBDT(projNetBDT), right: true, flex: 1, minWidth: 90 }, // _net
    {
      value: fmtBDT(projSumaiya),
      right: true,
      color: "#ec4899",
      flex: 1,
      minWidth: 110,
    }, // _sShare
    {
      value: fmtBDT(projRakib),
      right: true,
      color: "#3b82f6",
      flex: 1,
      minWidth: 110,
    }, // _rShare
    { value: "", flex: 1, minWidth: 80 }, // paymentChannel
    { value: "", flex: 1, minWidth: 70 }, // rule
    { value: "", flex: 1, minWidth: 70 }, // status
  ];

  /* ── Expense table columns ── */
  const expCols = [
    { key: "_date", label: "Date" },
    { key: "description", label: "Description", bold: true, wrap: true },
    {
      key: "category",
      label: "Category",
      render: (r) => (
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 6,
            background: "rgba(245,158,11,0.1)",
            color: "#f59e0b",
            fontWeight: 700,
          }}
        >
          {r.category || "—"}
        </span>
      ),
    },
    {
      key: "paidBy",
      label: "Paid By",
      color: (r) =>
        r.paidBy === "Sumaiya"
          ? "#ec4899"
          : r.paidBy === "Rakib"
          ? "#3b82f6"
          : "#10b981",
      bold: true,
    },
    { key: "currency", label: "Currency" },
    {
      key: "amount",
      label: "Amount",
      right: true,
      render: (r) =>
        `${
          (currencies.find((c) => c.code === r.currency) || {}).symbol || ""
        }${fmt2(r.amount)}`,
    },
    {
      key: "amountBDT",
      label: "Amount (BDT)",
      right: true,
      bold: true,
      render: (r) => fmtBDT(r.amountBDT || 0),
      color: () => "#06b6d4",
    },
    {
      key: "linkedToSettlement",
      label: "Settlement",
      render: (r) =>
        r.linkedToSettlement ? (
          <span style={{ color: "#10b981", fontSize: 13, fontWeight: 800 }}>
            ✓
          </span>
        ) : (
          <span style={{ color: "#64748b", fontSize: 11 }}>—</span>
        ),
    },
    {
      key: "notes",
      label: "Notes",
      wrap: true,
      render: (r) => (
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{r.notes || "—"}</span>
      ),
    },
  ];

  // expCols order: _date, description, category, paidBy, currency, amount, amountBDT, linkedToSettlement, notes (9 cols)
  const expTotals = [
    { value: "TOTALS", flex: 1, minWidth: 90 }, // _date
    { value: "", flex: 1, minWidth: 140 }, // description
    { value: "", flex: 1, minWidth: 100 }, // category
    { value: "", flex: 1, minWidth: 80 }, // paidBy
    { value: "", flex: 1, minWidth: 70 }, // currency
    { value: "", flex: 1, minWidth: 90 }, // amount (mixed currencies, skip)
    {
      value: fmtBDT(expTotalBDT),
      right: true,
      color: "#06b6d4",
      flex: 1,
      minWidth: 110,
    }, // amountBDT
    {
      value: `${
        expenseRows.filter((e) => e.linkedToSettlement).length
      } linked → ${fmtBDT(expLinked)}`,
      flex: 1,
      minWidth: 110,
      color: "#10b981",
    }, // linkedToSettlement
    { value: "", flex: 1, minWidth: 80 }, // notes
  ];

  /* ── render ── */
  return (
    <div style={{ paddingBottom: 56 }}>
      {/* ── PAGE TITLE ── */}
      <div style={{ marginBottom: 22 }}>
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
          <BarChart2 size={20} color="#06b6d4" /> Reports
        </h2>
        <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
          Monthly &amp; yearly calculations — all projects, expenses, CEO splits
          · searchable · CSV export
        </p>
      </div>

      {/* ── CONTROLS BAR ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {/* View toggle */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderRadius: 10,
            border: `1px solid ${pal.border}`,
            overflow: "hidden",
          }}
        >
          {[
            ["monthly", "Monthly"],
            ["yearly", "Yearly"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "9px 18px",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 700,
                fontSize: 13,
                background: view === v ? "#06b6d4" : "transparent",
                color: view === v ? "#fff" : pal.textMute,
                transition: "all 0.15s",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Period nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            borderRadius: 10,
            border: `1px solid ${pal.border}`,
            overflow: "hidden",
          }}
        >
          <button
            onClick={prevPeriod}
            style={{
              padding: "9px 12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: pal.textMute,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <div
            style={{
              padding: "9px 16px",
              fontWeight: 800,
              fontSize: 13.5,
              color: pal.text,
              minWidth: 160,
              textAlign: "center",
              background: pal.surfaceElevated,
            }}
          >
            {periodLabel}
          </div>
          <button
            onClick={nextPeriod}
            style={{
              padding: "9px 12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: pal.textMute,
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Year quick-select when monthly */}
        {view === "monthly" && (
          <select
            value={selYear}
            onChange={(e) => setSelYear(Number(e.target.value))}
            style={{ ...inp, width: 94 }}
          >
            {Array.from(
              { length: 6 },
              (_, i) => today.getFullYear() - 2 + i,
            ).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        {/* Month quick-select */}
        {view === "monthly" && (
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(Number(e.target.value))}
            style={{ ...inp, width: 130 }}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
        )}

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <Search
            size={13}
            color={pal.textMute}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            style={{
              ...inp,
              width: "100%",
              paddingLeft: 32,
              paddingRight: search ? 30 : 12,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, expenses…"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: pal.textMute,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((f) => !f)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 14px",
            borderRadius: 10,
            border: `1px solid ${showFilters ? "#06b6d4" : pal.border}`,
            background: showFilters ? "rgba(6,182,212,0.1)" : "transparent",
            color: showFilters ? "#06b6d4" : pal.textMute,
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          <SlidersHorizontal size={13} /> Filters
          {(filterPaidBy !== "All" ||
            filterCat !== "All" ||
            filterStatus !== "All") && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#06b6d4",
                marginLeft: 2,
              }}
            />
          )}
        </button>

        {/* Export CSV */}
        <button
          onClick={handleExport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 16px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#0d9488,#10b981)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* ── FILTER PANEL ── */}
      {showFilters && (
        <Card
          style={{
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginRight: 4,
            }}
          >
            <Filter size={13} color={pal.textMute} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Filters
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 5,
              }}
            >
              Paid By (Expenses)
            </div>
            <select
              style={{ ...inp, width: 160 }}
              value={filterPaidBy}
              onChange={(e) => setFilterPaidBy(e.target.value)}
            >
              <option value="All">All</option>
              {EXPENSE_PAID_BY.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 5,
              }}
            >
              Category (Expenses)
            </div>
            <select
              style={{ ...inp, width: 180 }}
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 5,
              }}
            >
              Status (Projects)
            </div>
            <select
              style={{ ...inp, width: 150 }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {STATUSES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {(filterPaidBy !== "All" ||
            filterCat !== "All" ||
            filterStatus !== "All") && (
            <button
              onClick={() => {
                setFilterPaidBy("All");
                setFilterCat("All");
                setFilterStatus("All");
              }}
              style={{
                padding: "9px 14px",
                borderRadius: 9,
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Clear All
            </button>
          )}
        </Card>
      )}

      {/* ── OVERVIEW KPIs ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="Project Revenue"
          value={fmtBDT(projTotalBDT)}
          sub={`${projectRows.length} project${
            projectRows.length !== 1 ? "s" : ""
          }`}
          color="#06b6d4"
        />
        <KpiCard
          label="Net (after tax)"
          value={fmtBDT(projNetBDT)}
          sub={`After tax & worker`}
          color="#8b5cf6"
        />
        <KpiCard
          label="Sumaiya Earned"
          value={fmtBDT(projSumaiya)}
          sub="from projects"
          color="#ec4899"
        />
        <KpiCard
          label="Rakib Earned"
          value={fmtBDT(projRakib)}
          sub="from projects"
          color="#3b82f6"
        />
        <KpiCard
          label="Total Expenses"
          value={fmtBDT(expTotalBDT)}
          sub={`${expenseRows.length} entr${
            expenseRows.length !== 1 ? "ies" : "y"
          }`}
          color="#f59e0b"
        />
        <KpiCard
          label="Net P&L"
          value={fmtBDT(projNetBDT - expTotalBDT)}
          sub="revenue − expenses"
          color={projNetBDT - expTotalBDT >= 0 ? "#10b981" : "#ef4444"}
        />
      </div>

      {/* ── PROJECTS TABLE ── */}
      <SectionHeader
        title="Projects"
        count={projectRows.length}
        color="#06b6d4"
        action={
          <span style={{ fontSize: 11, color: pal.textMute }}>
            Date column uses: Pay Day → Start Date → Created At
          </span>
        }
      />
      <DataTable
        cols={projCols}
        rows={projectRows}
        emptyMsg={`No projects with a date in ${periodLabel}.`}
      />
      {projectRows.length > 0 && <TotalsRow cells={projTotals} />}

      {/* ── EXPENSES TABLE ── */}
      <SectionHeader
        title="Expenses"
        count={expenseRows.length}
        color="#f59e0b"
        action={
          !expLoaded ? (
            <span style={{ fontSize: 11, color: pal.textMute }}>Loading…</span>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 16,
                fontSize: 11,
                color: pal.textMute,
              }}
            >
              <span>
                <span style={{ color: "#ec4899", fontWeight: 700 }}>
                  Sumaiya: {fmtBDT(expSumaiya)}
                </span>
              </span>
              <span>
                <span style={{ color: "#3b82f6", fontWeight: 700 }}>
                  Rakib: {fmtBDT(expRakib)}
                </span>
              </span>
            </div>
          )
        }
      />
      <DataTable
        cols={expCols}
        rows={expenseRows}
        emptyMsg={
          !expLoaded
            ? "Loading expenses…"
            : `No expenses logged in ${periodLabel}.`
        }
      />
      {expenseRows.length > 0 && <TotalsRow cells={expTotals} />}
    </div>
  );
}
