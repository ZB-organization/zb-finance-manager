/**
 * InvoiceGen — Branded PDF Generator with Live Preview
 *
 * v1.9 additions:
 *   ✓ Client picker dropdown — select a saved client to auto-fill Bill To
 *   ✓ preselectedClient prop — Clients page "Create Invoice" button lands here pre-filled
 *
 * Existing features:
 *   ✓ Logo upload · brand accent color · premium A4 layout
 *   ✓ Bengali / all Unicode · live split-pane preview
 *   ✓ Paid/Unpaid watermark · tax itemised correctly
 */
import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  DollarSign,
  Receipt,
  Plus,
  X,
  Printer,
  Building2,
  ChevronDown,
  Eye,
  CheckCircle2,
  Upload,
  Palette,
  Users,
  UserCheck,
} from "lucide-react";
import { usePalette } from "../theme";
import { Card, FormSec, FormField, FormGrid } from "../components/Shared";
import { COMPANY, GEN_ID } from "../constants";
import { loadExpenses } from "../db";

/* ─── Helpers ───────────────────────────────────────────── */
const fmt2 = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtBDT = (n) => "৳" + Math.round(n || 0).toLocaleString("en-BD");

function hexToRgb(hex = "") {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "6,182,212";
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(
    h.slice(2, 4),
    16,
  )},${parseInt(h.slice(4, 6), 16)}`;
}

/* ─── Shared input style hook ───────────────────────────── */
function useInp() {
  const pal = usePalette();
  return useMemo(
    () => ({
      width: "100%",
      boxSizing: "border-box",
      background: pal.inpBg,
      border: `1px solid ${pal.inpBorder}`,
      borderRadius: 10,
      padding: "10px 13px",
      color: pal.text,
      fontSize: 13.5,
      outline: "none",
      fontFamily: "inherit",
    }),
    [pal.inpBg, pal.inpBorder, pal.text],
  );
}

/* ─── Status badge toggle ───────────────────────────────── */
function StatusToggle({ value, onChange }) {
  const pal = usePalette();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {["paid", "unpaid"].map((s) => {
        const active = value === s;
        const color = s === "paid" ? "#10b981" : "#ef4444";
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "inherit",
              textTransform: "uppercase",
              letterSpacing: 1,
              border: `2px solid ${active ? color : "rgba(128,128,128,0.18)"}`,
              background: active ? color + "18" : "transparent",
              color: active ? color : pal.textMute,
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Tab pill ──────────────────────────────────────────── */
function TabBtn({ active, color, Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 18px",
        borderRadius: 12,
        border: `1px solid ${active ? color : "rgba(128,128,128,0.18)"}`,
        background: active ? color + "18" : "transparent",
        color: active ? color : "#64748b",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

/* ─── Client picker ─────────────────────────────────────── */
/**
 * Renders a searchable dropdown of saved clients.
 * When a client is selected it calls onSelect(client) so the
 * parent form can auto-fill the Bill To fields.
 */
function ClientPicker({ clients = [], selectedId, onSelect, currencies }) {
  const pal = usePalette();
  const inp = useInp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return clients;
    const lq = q.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(lq) ||
        (c.contactName || "").toLowerCase().includes(lq) ||
        (c.email || "").toLowerCase().includes(lq),
    );
  }, [clients, q]);

  const selected = clients.find((c) => c.id === selectedId);

  if (!clients.length) return null; // hide if no clients saved yet

  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#06b6d4",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Users size={10} /> Quick-fill from saved client
      </div>

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 13px",
          borderRadius: 10,
          cursor: "pointer",
          border: `1px solid ${selected ? "#06b6d430" : pal.inpBorder}`,
          background: selected ? "rgba(6,182,212,0.07)" : pal.inpBg,
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <UserCheck size={14} color={selected ? "#06b6d4" : pal.textMute} />
        <span
          style={{
            flex: 1,
            fontSize: 13.5,
            color: selected ? "#06b6d4" : pal.textMute,
            fontWeight: selected ? 700 : 400,
          }}
        >
          {selected ? selected.name : "— Select a client to auto-fill —"}
        </span>
        {selected && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              lineHeight: 0,
              color: pal.textMute,
              padding: 0,
            }}
          >
            <X size={13} />
          </button>
        )}
        <ChevronDown
          size={13}
          color={pal.textMute}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 200,
            background: pal.bgSolid,
            border: `1px solid ${pal.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
            marginTop: 4,
            overflow: "hidden",
          }}
        >
          {/* Search inside dropdown */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: `1px solid ${pal.border}`,
            }}
          >
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search clients…"
              style={{ ...inp, fontSize: 12.5, padding: "7px 10px" }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "14px 14px",
                  fontSize: 12,
                  color: pal.textMute,
                  textAlign: "center",
                }}
              >
                No clients match
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                    setQ("");
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `1px solid ${pal.border}`,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.1s",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      flexShrink: 0,
                      background: "#06b6d420",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#06b6d4",
                    }}
                  >
                    {c.name.trim().slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: pal.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: pal.textMute }}>
                      {[c.email, c.city, c.country].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: pal.textMute,
                      flexShrink: 0,
                    }}
                  >
                    {c.currency}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Brand / Company editor ────────────────────────────── */
const PRESET_COLORS = [
  "#06b6d4",
  "#0d9488",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#1e293b",
];

function BrandBox({ co, setCo }) {
  const pal = usePalette();
  const inp = useInp();
  const [open, setOpen] = useState(false);

  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCo((c) => ({ ...c, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <Card style={{ padding: 14, marginBottom: 16 }}>
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
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            overflow: "hidden",
            flexShrink: 0,
            background: (co.accent || "#06b6d4") + "20",
            border: `1px solid ${co.accent || "#06b6d4"}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {co.logo ? (
            <img
              src={co.logo}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              alt="logo"
            />
          ) : (
            <Building2 size={16} color={co.accent || "#06b6d4"} />
          )}
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>
            {co.name}
          </span>
          <span style={{ fontSize: 11, color: pal.textMute, marginLeft: 8 }}>
            Brand:{" "}
          </span>
          <span
            style={{
              display: "inline-block",
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: co.accent || "#06b6d4",
              marginLeft: 3,
              verticalAlign: "middle",
            }}
          />
          <span style={{ fontSize: 11, color: pal.textMute, marginLeft: 6 }}>
            {open ? "▲ collapse" : "▼ edit brand & company"}
          </span>
        </div>
        <ChevronDown
          size={14}
          color={pal.textMute}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "0.2s",
          }}
        />
      </button>

      {open && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              gap: 20,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            {/* Logo upload */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: pal.textMute,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Upload size={10} /> Company Logo
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: pal.surfaceElevated,
                    border: `2px dashed ${pal.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {co.logo ? (
                    <img
                      src={co.logo}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                      alt="preview"
                    />
                  ) : (
                    <Building2 size={24} color={pal.textFaint} />
                  )}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 9,
                      background: `linear-gradient(135deg,${
                        co.accent || "#06b6d4"
                      },${co.accent || "#0891b2"})`,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Upload size={11} /> Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleLogo}
                    />
                  </label>
                  {co.logo && (
                    <button
                      onClick={() => setCo((c) => ({ ...c, logo: "" }))}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 9,
                        fontFamily: "inherit",
                        border: "1px solid rgba(239,68,68,0.3)",
                        background: "rgba(239,68,68,0.08)",
                        color: "#ef4444",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Brand color */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: pal.textMute,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Palette size={10} /> Brand Accent Color
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  marginBottom: 10,
                }}
              >
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCo((co) => ({ ...co, accent: c }))}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: c,
                      border:
                        co.accent === c
                          ? "3px solid white"
                          : "2px solid transparent",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: co.accent === c ? `0 0 0 2.5px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="color"
                  value={co.accent || "#06b6d4"}
                  onChange={(e) =>
                    setCo((c) => ({ ...c, accent: e.target.value }))
                  }
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
                <input
                  style={{ ...inp, width: 110 }}
                  value={co.accent || "#06b6d4"}
                  onChange={(e) =>
                    setCo((c) => ({ ...c, accent: e.target.value }))
                  }
                  placeholder="#06b6d4"
                />
              </div>
            </div>
          </div>

          <FormGrid cols={2}>
            {[
              ["Company Name", "name"],
              ["Tagline / Slogan", "tagline"],
              ["Email", "email"],
              ["Website", "website"],
              ["Address", "address"],
              ["Phone", "phone"],
              ["Tax ID / BIN", "taxId"],
              ["Bank Account", "bank"],
            ].map(([label, key]) => (
              <FormField key={key} label={label}>
                <input
                  style={inp}
                  value={co[key] || ""}
                  onChange={(e) =>
                    setCo((c) => ({ ...c, [key]: e.target.value }))
                  }
                />
              </FormField>
            ))}
          </FormGrid>
        </div>
      )}
    </Card>
  );
}

/* ─── Live preview pane ─────────────────────────────────── */
function PreviewPane({ html }) {
  const pal = usePalette();
  return (
    <div
      style={{
        position: "sticky",
        top: 20,
        height: "calc(100vh - 110px)",
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${pal.border}`,
        boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 14px",
          background: pal.surfaceElevated,
          borderBottom: `1px solid ${pal.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <div
              key={c}
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Eye size={12} color="#06b6d4" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: pal.textMute,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Live Preview
          </span>
        </div>
        <span style={{ fontSize: 10, color: pal.textFaint }}>
          Updates as you type
        </span>
      </div>
      <iframe
        srcDoc={html}
        style={{
          flex: 1,
          border: "none",
          width: "100%",
          background: "#c8cdd4",
        }}
        title="Document Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HTML DOCUMENT BUILDERS  (unchanged from v1.8)
═══════════════════════════════════════════════════════════ */

const FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
`;

const BASE_CSS = `
@page { size: A4; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: 'Plus Jakarta Sans', 'Noto Sans Bengali', 'Arial Unicode MS', Arial, sans-serif;
  font-size: 11.5px; color: #1e293b; background: #c8cdd4;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page {
  width: 210mm; min-height: 297mm; margin: 0 auto;
  background: white; position: relative; overflow: hidden;
  box-shadow: 0 0 60px rgba(0,0,0,0.2);
}
.watermark {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-42deg);
  font-size: 96px; font-weight: 900; letter-spacing: 16px;
  text-transform: uppercase; pointer-events: none; user-select: none;
  white-space: nowrap; z-index: 0; font-family: 'Plus Jakarta Sans', sans-serif;
}
.content { position: relative; z-index: 2; }
.mono { font-family: 'JetBrains Mono', monospace; }
table { width: 100%; border-collapse: collapse; }
@media print {
  html, body { background: white; }
  .page { box-shadow: none; width: 100%; }
  @page { size: A4; margin: 0; }
}
`;

function buildInvoiceHTML({ form, co, currencies }) {
  const accent = co.accent || "#06b6d4";
  const rgb = hexToRgb(accent);
  const items = (form.items || []).filter((it) => it.description?.trim());
  const taxPct = parseFloat(form.tax) || 0;
  const sub = items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 1) * (parseFloat(it.rate) || 0),
    0,
  );
  const taxAmt = (sub * taxPct) / 100;
  const total = sub + taxAmt;
  const curr = (currencies || []).find((c) => c.code === form.currency) || {};
  const sym = curr.symbol || "";
  const isPaid = form.status === "paid";
  const wm = isPaid ? "rgba(16,185,129,0.065)" : "rgba(239,68,68,0.055)";
  const wmLabel = isPaid ? "PAID" : "UNPAID";
  const statusBg = isPaid ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.16)";
  const statusBord = isPaid ? "rgba(16,185,129,0.55)" : "rgba(239,68,68,0.5)";
  const statusColor = isPaid ? "#d1fae5" : "#fee2e2";

  const logoBlock = co.logo
    ? `<img src="${co.logo}" style="height:52px;max-width:150px;object-fit:contain;display:block;" alt="logo">`
    : `<div style="font-size:26px;font-weight:900;color:white;letter-spacing:-0.5px;line-height:1;">${
        co.name || "Company"
      }</div>`;

  // Build full address line for Bill To
  const clientAddr = [form.clientAddress, form.clientCity, form.clientCountry]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">${FONTS}
<style>${BASE_CSS}
.item-row:nth-child(even) { background: #f9fafb; }
</style></head><body>
<div class="page">
  <div class="watermark" style="color:${wm}">${wmLabel}</div>

  <div style="background:linear-gradient(140deg,${accent} 0%,rgba(${rgb},0.72) 60%,rgba(${rgb},0.45) 100%);
       padding:30px 34px 24px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-50px;right:-50px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
    <div style="position:absolute;bottom:-70px;left:40px;width:230px;height:230px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
    <div style="position:absolute;top:20px;right:140px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(55deg,transparent 45%,rgba(255,255,255,0.04) 55%,transparent 65%);"></div>

    <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="flex:1">
        ${logoBlock}
        <div style="margin-top:${co.logo ? 10 : 8}px">
          ${
            co.logo
              ? `<div style="font-size:17px;font-weight:800;color:white;margin-bottom:2px;">${
                  co.name || ""
                }</div>`
              : ""
          }
          ${
            co.tagline
              ? `<div style="font-size:10px;color:rgba(255,255,255,0.72);letter-spacing:0.8px;margin-bottom:6px;">${co.tagline}</div>`
              : ""
          }
          <div style="font-size:10px;color:rgba(255,255,255,0.68);line-height:1.95;">
            ${[co.address, co.email, co.website, co.phone]
              .filter(Boolean)
              .map((v) => `<span style="display:block">${v}</span>`)
              .join("")}
            ${
              co.taxId
                ? `<span style="display:block">Tax ID: ${co.taxId}</span>`
                : ""
            }
          </div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:42px;font-weight:900;color:rgba(255,255,255,0.93);letter-spacing:3px;line-height:1;text-transform:uppercase;
             text-shadow:0 3px 14px rgba(0,0,0,0.18);">INVOICE</div>
        <div style="margin-top:10px;line-height:2;">
          <div class="mono" style="font-size:13.5px;color:white;font-weight:600;letter-spacing:0.5px;">#${
            form.invoiceNo || ""
          }</div>
          <div style="font-size:10.5px;color:rgba(255,255,255,0.78);">Issue Date: <strong style="color:white;">${
            form.date || ""
          }</strong></div>
          ${
            form.dueDate
              ? `<div style="font-size:10.5px;color:rgba(255,255,255,0.78);">Due Date: <strong style="color:rgba(255,235,130,0.95);">${form.dueDate}</strong></div>`
              : ""
          }
        </div>
        <div style="margin-top:12px;display:inline-block;padding:5px 18px;border-radius:22px;
             background:${statusBg};border:1.5px solid ${statusBord};
             color:${statusColor};font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
          ${isPaid ? "✓&nbsp;PAID" : "✗&nbsp;UNPAID"}
        </div>
      </div>
    </div>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${accent},rgba(${rgb},0.25),transparent);"></div>

  <div style="padding:26px 34px;" class="content">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;">
      <div style="padding:15px 17px;background:#f8fafc;border-radius:12px;border-left:3.5px solid ${accent};">
        <div style="font-size:8.5px;font-weight:800;color:rgba(${rgb},0.75);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Billed To</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${
          form.clientName || "—"
        }</div>
        ${
          form.clientContactName
            ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">Attn: ${form.clientContactName}</div>`
            : ""
        }
        ${
          form.clientEmail
            ? `<div style="font-size:10.5px;color:#64748b;margin-top:3px;">${form.clientEmail}</div>`
            : ""
        }
        ${
          form.clientPhone
            ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">${form.clientPhone}</div>`
            : ""
        }
        ${
          clientAddr
            ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">${clientAddr}</div>`
            : ""
        }
        ${
          form.clientTaxId
            ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px;">Tax ID: ${form.clientTaxId}</div>`
            : ""
        }
        ${
          form.projectRef
            ? `<div style="margin-top:8px;display:inline-block;padding:3px 10px;border-radius:6px;background:rgba(${rgb},0.1);font-size:9.5px;font-weight:700;color:${accent};">Ref: ${form.projectRef}</div>`
            : ""
        }
      </div>
      <div style="padding:15px 17px;background:#f8fafc;border-radius:12px;border-left:3.5px solid rgba(${rgb},0.3);">
        <div style="font-size:8.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Payment Info</div>
        <div style="font-size:11px;color:#475569;line-height:2.1;">
          <div>Currency: <strong style="color:#0f172a;">${
            form.currency || ""
          } ${sym}</strong></div>
          ${
            curr.rate
              ? `<div>Rate: <strong style="color:#0f172a;">1 ${form.currency} = ৳${curr.rate}</strong></div>`
              : ""
          }
          ${
            co.bank
              ? `<div style="font-size:10px;margin-top:3px;color:#64748b;">${co.bank}</div>`
              : ""
          }
        </div>
      </div>
    </div>

    <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:0;">
      <table>
        <thead>
          <tr style="background:${accent};">
            <th style="padding:11px 14px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;">Description</th>
            <th style="padding:11px 10px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;text-align:center;width:52px;">Qty</th>
            <th style="padding:11px 14px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;text-align:right;width:106px;">Unit Rate</th>
            <th style="padding:11px 14px;font-size:9.5px;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:1px;text-align:right;width:106px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((it) => {
              const lineTotal =
                (parseFloat(it.qty) || 1) * (parseFloat(it.rate) || 0);
              return `<tr class="item-row" style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:11px 14px;color:#1e293b;font-size:11.5px;">${
                it.description
              }</td>
              <td style="padding:11px 10px;text-align:center;color:#64748b;font-size:11px;" class="mono">${
                parseFloat(it.qty) || 1
              }</td>
              <td style="padding:11px 14px;text-align:right;color:#64748b;font-size:11px;" class="mono">${sym}${fmt2(
                it.rate,
              )}</td>
              <td style="padding:11px 14px;text-align:right;font-weight:700;color:#0f172a;font-size:11.5px;" class="mono">${sym}${fmt2(
                lineTotal,
              )}</td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:22px;">
      <div style="width:268px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;overflow:hidden;">
        <div style="padding:12px 16px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;padding:3.5px 0;font-size:11.5px;color:#64748b;">
            <span>Subtotal</span><span class="mono">${sym}${fmt2(sub)}</span>
          </div>
          ${
            taxPct > 0
              ? `
          <div style="display:flex;justify-content:space-between;padding:3.5px 0;font-size:11.5px;color:#64748b;">
            <span>Tax @ ${fmt2(taxPct)}%</span>
            <span class="mono" style="color:#f59e0b;">+${sym}${fmt2(
                  taxAmt,
                )}</span>
          </div>`
              : ""
          }
        </div>
        <div style="padding:13px 16px;background:${accent};display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:800;color:rgba(255,255,255,0.88);text-transform:uppercase;letter-spacing:1.5px;">Total Due</span>
          <span class="mono" style="font-size:21px;font-weight:900;color:white;">${sym}${fmt2(
    total,
  )}</span>
        </div>
      </div>
    </div>

    ${
      form.notes
        ? `
    <div style="margin-bottom:22px;padding:13px 16px;border-radius:10px;background:#f8fafc;border-left:3.5px solid ${accent};">
      <div style="font-size:8.5px;font-weight:800;color:rgba(${rgb},0.75);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Notes &amp; Terms</div>
      <div style="font-size:11.5px;color:#475569;white-space:pre-wrap;line-height:1.75;">${form.notes}</div>
    </div>`
        : ""
    }
  </div>

  <div style="position:absolute;bottom:0;left:0;right:0;">
    <div style="height:2px;background:linear-gradient(90deg,transparent,${accent},transparent);"></div>
    <div style="padding:11px 34px;background:linear-gradient(135deg,rgba(${rgb},0.06),rgba(${rgb},0.02));display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:9px;color:#94a3b8;">${co.name || ""} · ${
    co.email || ""
  } · ${co.website || ""}</div>
      <div class="mono" style="font-size:9px;color:#94a3b8;">${
        form.invoiceNo || ""
      }</div>
    </div>
  </div>
</div>
</body></html>`;
}

function buildReceiptHTML({ form, co, currencies }) {
  const accent = co.accent || "#10b981";
  const rgb = hexToRgb(accent);
  const owed = parseFloat(form.totalOwed) || 0;
  const paid = parseFloat(form.amountPaid) || 0;
  const rem = Math.max(0, owed - paid);
  const curr = (currencies || []).find((c) => c.code === form.currency) || {};
  const sym = curr.symbol || "";
  const full = owed > 0 && paid >= owed;
  const pct = owed > 0 ? Math.min(100, (paid / owed) * 100) : 100;
  const logoBlock = co.logo
    ? `<img src="${co.logo}" style="height:48px;max-width:140px;object-fit:contain;display:block;" alt="logo">`
    : `<div style="font-size:24px;font-weight:900;color:white;">${
        co.name || ""
      }</div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">${FONTS}
<style>${BASE_CSS}</style></head><body>
<div class="page">
  <div class="watermark" style="color:${
    full ? "rgba(16,185,129,0.065)" : "rgba(245,158,11,0.06)"
  }">${full ? "PAID" : "PARTIAL"}</div>
  <div style="background:linear-gradient(140deg,${accent} 0%,rgba(${rgb},0.7) 60%,rgba(${rgb},0.42) 100%);padding:28px 34px 22px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
    <div style="position:absolute;bottom:-60px;left:60px;width:210px;height:210px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(55deg,transparent 45%,rgba(255,255,255,0.04) 55%,transparent 65%);"></div>
    <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="flex:1">
        ${logoBlock}
        <div style="margin-top:${co.logo ? 8 : 6}px">
          ${
            co.logo
              ? `<div style="font-size:16px;font-weight:800;color:white;margin-bottom:2px;">${
                  co.name || ""
                }</div>`
              : ""
          }
          ${
            co.tagline
              ? `<div style="font-size:10px;color:rgba(255,255,255,0.7);letter-spacing:0.8px;margin-bottom:5px;">${co.tagline}</div>`
              : ""
          }
          <div style="font-size:10px;color:rgba(255,255,255,0.68);line-height:1.95;">
            ${[co.address, co.email, co.website, co.phone]
              .filter(Boolean)
              .map((v) => `<span style="display:block">${v}</span>`)
              .join("")}
          </div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:38px;font-weight:900;color:rgba(255,255,255,0.93);letter-spacing:3px;text-transform:uppercase;text-shadow:0 3px 14px rgba(0,0,0,0.18);">RECEIPT</div>
        <div class="mono" style="font-size:13px;color:white;font-weight:600;margin-top:8px;">#${
          form.receiptNo || ""
        }</div>
        <div style="font-size:10.5px;color:rgba(255,255,255,0.78);margin-top:4px;">Date: <strong style="color:white;">${
          form.payDate || ""
        }</strong></div>
        <div style="margin-top:12px;display:inline-block;padding:5px 18px;border-radius:22px;
             background:${
               full ? "rgba(255,255,255,0.22)" : "rgba(245,158,11,0.28)"
             };
             border:1.5px solid ${
               full ? "rgba(255,255,255,0.55)" : "rgba(245,158,11,0.65)"
             };
             color:white;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
          ${full ? "✓&nbsp;FULLY PAID" : "◑&nbsp;PARTIAL"}
        </div>
      </div>
    </div>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${accent},rgba(${rgb},0.25),transparent);"></div>
  <div style="padding:24px 34px;" class="content">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:22px;">
      <div style="padding:15px 17px;background:#f8fafc;border-radius:12px;border-left:3.5px solid ${accent};">
        <div style="font-size:8.5px;font-weight:800;color:rgba(${rgb},0.75);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Paid To</div>
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${
          form.recipientName || "—"
        }</div>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">${
          form.recipientType || ""
        }</div>
        ${
          form.channel
            ? `<div style="margin-top:7px;display:inline-block;padding:3px 10px;border-radius:6px;background:rgba(${rgb},0.1);font-size:9.5px;font-weight:700;color:${accent};">via ${form.channel}</div>`
            : ""
        }
      </div>
      <div style="padding:15px 17px;background:#f8fafc;border-radius:12px;border-left:3.5px solid rgba(${rgb},0.3);">
        <div style="font-size:8.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Details</div>
        <div style="font-size:11px;color:#475569;line-height:2.1;">
          ${
            form.projectRef
              ? `<div>Project: <strong style="color:#0f172a;">${form.projectRef}</strong></div>`
              : ""
          }
          <div>Approved by: <strong style="color:#0f172a;">${
            form.approvedBy || "—"
          }</strong></div>
          <div>Currency: <strong style="color:#0f172a;">${
            form.currency || ""
          } ${sym}</strong></div>
        </div>
      </div>
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:22px;">
      <div style="padding:11px 16px;background:${accent};"><span style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:2px;">Payment Summary</span></div>
      ${
        owed > 0
          ? `<div style="display:flex;justify-content:space-between;padding:11px 16px;border-bottom:1px solid #f1f5f9;font-size:11.5px;"><span style="color:#64748b;">Total Owed</span><span class="mono" style="font-weight:700;color:#0f172a;">${sym}${fmt2(
              owed,
            )}</span></div>`
          : ""
      }
      <div style="display:flex;justify-content:space-between;padding:11px 16px;${
        owed > 0 && rem > 0 ? "border-bottom:1px solid #f1f5f9;" : ""
      }font-size:11.5px;">
        <span style="color:#64748b;">Amount Paid Now</span><span class="mono" style="font-weight:700;color:${accent};">${sym}${fmt2(
    paid,
  )}</span>
      </div>
      ${
        owed > 0 && rem > 0
          ? `<div style="display:flex;justify-content:space-between;padding:11px 16px;font-size:11.5px;"><span style="color:#64748b;">Remaining Balance</span><span class="mono" style="font-weight:700;color:#ef4444;">${sym}${fmt2(
              rem,
            )}</span></div>`
          : ""
      }
      ${
        owed > 0
          ? `<div style="padding:10px 16px;background:#f8fafc;border-top:1px solid #f1f5f9;">
        <div style="display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8;margin-bottom:5px;"><span>Payment progress</span><span>${Math.round(
          pct,
        )}%</span></div>
        <div style="height:6px;border-radius:6px;background:#e2e8f0;overflow:hidden;"><div style="height:100%;width:${pct}%;border-radius:6px;background:linear-gradient(90deg,rgba(${rgb},0.6),${accent});"></div></div>
      </div>`
          : ""
      }
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:linear-gradient(135deg,rgba(${rgb},0.08),rgba(${rgb},0.03));">
        <span style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">Amount Received</span>
        <span class="mono" style="font-size:22px;font-weight:900;color:${accent};">${sym}${fmt2(
    paid,
  )}</span>
      </div>
    </div>
    ${
      form.notes
        ? `<div style="padding:13px 16px;background:#f8fafc;border-left:3.5px solid ${accent};border-radius:0 10px 10px 0;margin-bottom:22px;"><div style="font-size:8.5px;font-weight:800;color:rgba(${rgb},0.75);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Notes</div><div style="font-size:11.5px;color:#475569;white-space:pre-wrap;">${form.notes}</div></div>`
        : ""
    }
    <div style="margin-top:44px;padding-top:14px;border-top:1px dashed #e2e8f0;display:flex;justify-content:flex-end;">
      <div style="text-align:center;width:180px;">
        <div style="border-top:1.5px solid #475569;padding-top:7px;font-size:10px;color:#64748b;">Authorised Signature</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:3px;">${
          co.name || ""
        }</div>
      </div>
    </div>
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;">
    <div style="height:2px;background:linear-gradient(90deg,transparent,${accent},transparent);"></div>
    <div style="padding:11px 34px;background:linear-gradient(135deg,rgba(${rgb},0.05),transparent);display:flex;justify-content:space-between;">
      <div style="font-size:9px;color:#94a3b8;">${co.name || ""} · ${
    co.email || ""
  }</div>
      <div class="mono" style="font-size:9px;color:#94a3b8;">${
        form.receiptNo || ""
      }</div>
    </div>
  </div>
</div>
</body></html>`;
}

function buildExpenseHTML({ form, co, expenses }) {
  const accent = co.accent || "#f59e0b";
  const rgb = hexToRgb(accent);
  const totalBDT = expenses.reduce((s, e) => s + (e.amountBDT || 0), 0);
  const sumaiyaBDT = expenses
    .filter((e) => e.paidBy === "Sumaiya")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const rakibBDT = expenses
    .filter((e) => e.paidBy === "Rakib")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const linkedBDT = expenses
    .filter((e) => e.linkedToSettlement)
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const logoBlock = co.logo
    ? `<img src="${co.logo}" style="height:48px;max-width:140px;object-fit:contain;display:block;" alt="logo">`
    : `<div style="font-size:24px;font-weight:900;color:white;">${
        co.name || ""
      }</div>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">${FONTS}
<style>${BASE_CSS}
.exp-row:nth-child(even) { background: #f9fafb; }
</style></head><body>
<div class="page">
  <div class="watermark" style="color:rgba(${rgb},0.06)">EXPENSES</div>
  <div style="background:linear-gradient(140deg,${accent} 0%,rgba(${rgb},0.7) 60%,rgba(${rgb},0.42) 100%);padding:28px 34px 22px;position:relative;overflow:hidden;">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(55deg,transparent 45%,rgba(255,255,255,0.04) 55%,transparent 65%);"></div>
    <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="flex:1">
        ${logoBlock}
        <div style="margin-top:${co.logo ? 8 : 6}px">
          ${
            co.logo
              ? `<div style="font-size:16px;font-weight:800;color:white;margin-bottom:2px;">${
                  co.name || ""
                }</div>`
              : ""
          }
          ${
            co.tagline
              ? `<div style="font-size:10px;color:rgba(255,255,255,0.7);margin-bottom:5px;">${co.tagline}</div>`
              : ""
          }
          <div style="font-size:10px;color:rgba(255,255,255,0.68);line-height:1.95;">
            ${[co.address, co.email, co.website]
              .filter(Boolean)
              .map((v) => `<span style="display:block">${v}</span>`)
              .join("")}
          </div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:34px;font-weight:900;color:rgba(255,255,255,0.93);letter-spacing:2px;text-transform:uppercase;line-height:1.1;">EXPENSE<br>REPORT</div>
        <div style="margin-top:10px;font-size:10.5px;color:rgba(255,255,255,0.78);line-height:2;">
          <div>Period: <strong style="color:white;">${
            form.period || ""
          }</strong></div>
          <div class="mono" style="font-size:12px;color:white;">${
            form.reportNo || ""
          }</div>
          <div>Prepared by: <strong style="color:white;">${
            form.preparedBy || ""
          }</strong></div>
        </div>
      </div>
    </div>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,${accent},rgba(${rgb},0.25),transparent);"></div>
  <div style="padding:22px 34px;" class="content">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
      ${[
        ["Total", fmtBDT(totalBDT), accent],
        ["Sumaiya", fmtBDT(sumaiyaBDT), "#ec4899"],
        ["Rakib", fmtBDT(rakibBDT), "#3b82f6"],
        ["Settlement", fmtBDT(linkedBDT), "#10b981"],
      ]
        .map(
          ([l, v, c]) => `
      <div style="padding:11px;border-radius:11px;background:rgba(${hexToRgb(
        c,
      )},0.08);border:1px solid rgba(${hexToRgb(c)},0.2);text-align:center;">
        <div style="font-size:8.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">${l}</div>
        <div style="font-size:15px;font-weight:900;color:${c};">${v}</div>
      </div>`,
        )
        .join("")}
    </div>
    <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:20px;">
      <table>
        <thead><tr style="background:${accent};">
          ${[
            "Date",
            "Description",
            "Category",
            "Paid By",
            "Curr",
            "Amount",
            "BDT",
            "✓",
          ]
            .map(
              (h, i) =>
                `<th style="padding:9px ${
                  i === 1 ? "14px" : "10px"
                };font-size:9px;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;letter-spacing:0.8px;${
                  ["Amount", "BDT"].includes(h)
                    ? "text-align:right;"
                    : h === "✓"
                    ? "text-align:center;"
                    : ""
                }">${h}</th>`,
            )
            .join("")}
        </tr></thead>
        <tbody>${expenses
          .map(
            (e) => `
          <tr class="exp-row" style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 10px;font-size:10px;color:#64748b;white-space:nowrap;">${(
              e.date || ""
            ).slice(0, 10)}</td>
            <td style="padding:8px 14px;font-size:11px;color:#0f172a;font-weight:500;max-width:130px;word-break:break-word;">${
              e.description || ""
            }</td>
            <td style="padding:8px 10px;font-size:10px;color:#64748b;">${
              e.category || ""
            }</td>
            <td style="padding:8px 10px;font-size:10px;font-weight:800;color:${
              e.paidBy === "Sumaiya"
                ? "#ec4899"
                : e.paidBy === "Rakib"
                ? "#3b82f6"
                : "#10b981"
            };">${e.paidBy || "—"}</td>
            <td style="padding:8px 10px;font-size:10px;color:#64748b;">${
              e.currency || "BDT"
            }</td>
            <td style="padding:8px 10px;text-align:right;font-size:10.5px;color:#0f172a;" class="mono">${fmt2(
              e.amount || 0,
            )}</td>
            <td style="padding:8px 10px;text-align:right;font-weight:700;font-size:11px;color:#0f172a;" class="mono">${fmtBDT(
              e.amountBDT || 0,
            )}</td>
            <td style="padding:8px 10px;text-align:center;color:#10b981;font-size:13px;">${
              e.linkedToSettlement ? "✓" : ""
            }</td>
          </tr>`,
          )
          .join("")}
        </tbody>
        <tfoot><tr style="background:${accent};">
          <td colspan="6" style="padding:10px 14px;font-weight:800;font-size:10.5px;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;">Grand Total</td>
          <td style="padding:10px 14px;text-align:right;font-weight:900;font-size:14px;color:white;" class="mono">${fmtBDT(
            totalBDT,
          )}</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
    ${
      form.notes
        ? `<div style="padding:13px 16px;background:#f8fafc;border-left:3.5px solid ${accent};border-radius:0 10px 10px 0;margin-bottom:20px;"><div style="font-size:8.5px;font-weight:800;color:rgba(${rgb},0.75);text-transform:uppercase;letter-spacing:2px;margin-bottom:5px;">Notes</div><div style="font-size:11.5px;color:#475569;white-space:pre-wrap;">${form.notes}</div></div>`
        : ""
    }
  </div>
  <div style="position:absolute;bottom:0;left:0;right:0;">
    <div style="height:2px;background:linear-gradient(90deg,transparent,${accent},transparent);"></div>
    <div style="padding:11px 34px;background:linear-gradient(135deg,rgba(${rgb},0.05),transparent);display:flex;justify-content:space-between;">
      <div style="font-size:9px;color:#94a3b8;">${co.name || ""} · ${
    co.email || ""
  }</div>
      <div style="font-size:9px;color:#94a3b8;">Total entries: ${
        expenses.length
      }</div>
    </div>
  </div>
</div>
</body></html>`;
}

function printDoc(html) {
  const win = window.open("", "_blank", "width=960,height=740");
  if (!win) {
    alert("Please allow popups to generate PDF");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 1000);
}

/* ═══════════════════════════════════════════════════════════
   TAB 1 — CLIENT INVOICE  (now with client picker)
═══════════════════════════════════════════════════════════ */
function ClientInvoiceTab({
  co,
  projects,
  currencies,
  clients,
  preselectedClient,
}) {
  const pal = usePalette();
  const inp = useInp();

  // Build initial form — either from preselectedClient or blank
  const buildInitialForm = (client) => ({
    invoiceNo: "INV-" + Date.now().toString(36).toUpperCase().slice(-5),
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    clientId: client?.id || "",
    clientName: client?.name || "",
    clientContactName: client?.contactName || "",
    clientEmail: client?.email || "",
    clientPhone: client?.phone || "",
    clientAddress: client?.address || "",
    clientCity: client?.city || "",
    clientCountry: client?.country || "",
    clientTaxId: client?.taxId || "",
    projectRef: "",
    currency: client?.currency || currencies?.[0]?.code || "USD",
    notes: "",
    tax: "",
    status: "unpaid",
    items: [{ id: GEN_ID(), description: "", qty: 1, rate: "" }],
  });

  const [form, setForm] = useState(() => buildInitialForm(preselectedClient));
  const [err, setErr] = useState("");

  // If App passes a new preselectedClient (from Clients page "Create Invoice"), re-fill
  useEffect(() => {
    if (preselectedClient) setForm(buildInitialForm(preselectedClient));
  }, [preselectedClient?.id]);

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

  // When user picks a client from the dropdown, auto-fill Bill To fields
  const handleClientSelect = (client) => {
    if (!client) {
      // Clear client fields but keep invoice meta
      setForm((f) => ({
        ...f,
        clientId: "",
        clientName: "",
        clientContactName: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: "",
        clientCity: "",
        clientCountry: "",
        clientTaxId: "",
      }));
      return;
    }
    setForm((f) => ({
      ...f,
      clientId: client.id,
      clientName: client.name,
      clientContactName: client.contactName || "",
      clientEmail: client.email || "",
      clientPhone: client.phone || "",
      clientAddress: client.address || "",
      clientCity: client.city || "",
      clientCountry: client.country || "",
      clientTaxId: client.taxId || "",
      currency: client.currency || f.currency,
    }));
  };

  const taxPct = parseFloat(form.tax) || 0;
  const sub = form.items.reduce(
    (s, it) => s + (parseFloat(it.qty) || 1) * (parseFloat(it.rate) || 0),
    0,
  );
  const taxAmt = (sub * taxPct) / 100;
  const total = sub + taxAmt;
  const sym =
    (currencies || []).find((c) => c.code === form.currency)?.symbol || "";
  const accentColor = co.accent || "#06b6d4";

  const html = useMemo(
    () => buildInvoiceHTML({ form, co, currencies }),
    [form, co, currencies],
  );

  const handlePrint = () => {
    if (!form.clientName.trim()) {
      setErr("Client name is required");
      return;
    }
    if (
      !form.items.some(
        (it) => it.description?.trim() && parseFloat(it.rate) > 0,
      )
    ) {
      setErr("Add at least one item with description and rate");
      return;
    }
    setErr("");
    printDoc(html);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "42% 58%",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div>
        <FormSec title="Invoice Info">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{ fontSize: 12, color: pal.textMute, fontWeight: 600 }}
            >
              Status
            </span>
            <StatusToggle
              value={form.status}
              onChange={(v) => set("status", v)}
            />
          </div>
          <FormGrid cols={2}>
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
            <FormField label="Currency">
              <select
                style={inp}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {(currencies || []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </FormField>
          </FormGrid>
        </FormSec>

        <FormSec title="Bill To">
          {/* ── Client picker (Step 3) ── */}
          <ClientPicker
            clients={clients}
            selectedId={form.clientId}
            onSelect={handleClientSelect}
            currencies={currencies}
          />

          {/* Manual fields — still editable after auto-fill */}
          <FormGrid cols={2}>
            <FormField label="Client / Company Name *">
              <input
                style={inp}
                value={form.clientName}
                onChange={(e) => set("clientName", e.target.value)}
                placeholder="Company or person"
              />
            </FormField>
            <FormField label="Contact Name">
              <input
                style={inp}
                value={form.clientContactName}
                onChange={(e) => set("clientContactName", e.target.value)}
                placeholder="Attn: Jane Smith"
              />
            </FormField>
            <FormField label="Email">
              <input
                style={inp}
                value={form.clientEmail}
                onChange={(e) => set("clientEmail", e.target.value)}
                placeholder="client@email.com"
              />
            </FormField>
            <FormField label="Phone">
              <input
                style={inp}
                value={form.clientPhone}
                onChange={(e) => set("clientPhone", e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </FormField>
          </FormGrid>
          <FormField label="Street Address">
            <input
              style={inp}
              value={form.clientAddress}
              onChange={(e) => set("clientAddress", e.target.value)}
              placeholder="123 Main St"
            />
          </FormField>
          <FormGrid cols={2}>
            <FormField label="City">
              <input
                style={inp}
                value={form.clientCity}
                onChange={(e) => set("clientCity", e.target.value)}
                placeholder="New York"
              />
            </FormField>
            <FormField label="Country">
              <input
                style={inp}
                value={form.clientCountry}
                onChange={(e) => set("clientCountry", e.target.value)}
                placeholder="USA"
              />
            </FormField>
          </FormGrid>
          <FormField label="Client Tax ID / VAT">
            <input
              style={inp}
              value={form.clientTaxId}
              onChange={(e) => set("clientTaxId", e.target.value)}
              placeholder="For invoice header"
            />
          </FormField>
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

        <FormSec title="Line Items">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 54px 86px 32px",
              gap: 6,
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
                gridTemplateColumns: "1fr 54px 86px 32px",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <input
                style={inp}
                value={it.description}
                onChange={(e) => setItem(i, "description", e.target.value)}
                placeholder={`Item ${i + 1}…`}
              />
              <input
                style={{ ...inp, textAlign: "center", padding: "10px 4px" }}
                type="number"
                min="1"
                value={it.qty}
                onChange={(e) => setItem(i, "qty", e.target.value)}
              />
              <input
                style={{ ...inp, textAlign: "right", padding: "10px 8px" }}
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
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.25)",
                  background: "rgba(239,68,68,0.08)",
                  color: form.items.length === 1 ? "#555" : "#ef4444",
                  cursor: form.items.length === 1 ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 9,
              border: `1px dashed ${accentColor}66`,
              background: accentColor + "0d",
              color: accentColor,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              marginTop: 4,
            }}
          >
            <Plus size={12} /> Add line item
          </button>
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              background: pal.surfaceElevated,
              borderRadius: 12,
              border: `1px solid ${pal.border}`,
            }}
          >
            {[
              ["Subtotal", `${sym}${fmt2(sub)}`],
              [`Tax (${taxPct}%)`, `${sym}${fmt2(taxAmt)}`],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "3px 0",
                  fontSize: 12,
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
              <span style={{ fontWeight: 800, color: pal.text, fontSize: 14 }}>
                Total
              </span>
              <span
                style={{ fontWeight: 900, color: accentColor, fontSize: 16 }}
              >
                {form.currency} {fmt2(total)}
              </span>
            </div>
            <div style={{ marginTop: 10 }}>
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
                Tax %
              </div>
              <input
                style={{ ...inp, width: 100 }}
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
              padding: "10px 14px",
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

        <button
          onClick={handlePrint}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 26px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg,${accentColor},rgba(${hexToRgb(
              accentColor,
            )},0.72))`,
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: `0 6px 24px rgba(${hexToRgb(accentColor)},0.4)`,
          }}
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>
      <PreviewPane html={html} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 2 — PAYMENT RECEIPT
═══════════════════════════════════════════════════════════ */
function PaymentReceiptTab({ co, projects, currencies }) {
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
    currency: currencies?.find((c) => c.code === "BDT")
      ? "BDT"
      : currencies?.[0]?.code || "BDT",
    notes: "",
  });
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const owed = parseFloat(form.totalOwed) || 0;
  const paid = parseFloat(form.amountPaid) || 0;
  const rem = Math.max(0, owed - paid);
  const sym =
    (currencies || []).find((c) => c.code === form.currency)?.symbol || "";
  const html = useMemo(
    () => buildReceiptHTML({ form, co, currencies }),
    [form, co, currencies],
  );
  const handlePrint = () => {
    if (!form.recipientName.trim()) {
      setErr("Recipient name is required");
      return;
    }
    if (paid <= 0) {
      setErr("Amount paid must be greater than 0");
      return;
    }
    setErr("");
    printDoc(html);
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "42% 58%",
        gap: 20,
        alignItems: "start",
      }}
    >
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
                placeholder="Name"
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
                    {c.symbol} {c.code}
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
                padding: "10px 13px",
                background: pal.surfaceElevated,
                borderRadius: 10,
                border: `1px solid ${pal.border}`,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: pal.textMute }}>Coverage</span>
                <span
                  style={{
                    color: paid >= owed ? "#10b981" : "#f59e0b",
                    fontWeight: 700,
                  }}
                >
                  {sym}
                  {fmt2(paid)} / {sym}
                  {fmt2(owed)}
                  {rem > 0 ? ` · ${sym}${fmt2(rem)} remaining` : ""}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 6,
                    width: `${Math.min(100, (paid / owed) * 100)}%`,
                    background:
                      paid >= owed
                        ? "linear-gradient(90deg,#10b98199,#10b981)"
                        : "linear-gradient(90deg,#f59e0b99,#f59e0b)",
                  }}
                />
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
              padding: "10px 14px",
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
        <button
          onClick={handlePrint}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 26px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#059669,#10b981)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(16,185,129,0.4)",
            fontFamily: "inherit",
          }}
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>
      <PreviewPane html={html} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB 3 — EXPENSE REPORT
═══════════════════════════════════════════════════════════ */
function ExpenseReportTab({ co }) {
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
    reportNo: "EXP-" + Date.now().toString(36).toUpperCase().slice(-6),
  });
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => {
    loadExpenses().then((e) => {
      setExpenses(e);
      setLoaded(true);
    });
  }, []);
  const totalBDT = expenses.reduce((s, e) => s + (e.amountBDT || 0), 0);
  const sumaiyaBDT = expenses
    .filter((e) => e.paidBy === "Sumaiya")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const rakibBDT = expenses
    .filter((e) => e.paidBy === "Rakib")
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const linkedBDT = expenses
    .filter((e) => e.linkedToSettlement)
    .reduce((s, e) => s + (e.amountBDT || 0), 0);
  const html = useMemo(
    () => buildExpenseHTML({ form, co, expenses }),
    [form, co, expenses],
  );
  const handlePrint = () => {
    if (expenses.length === 0) {
      setErr("No expenses found — add some in Expenses Tracker first.");
      return;
    }
    setErr("");
    printDoc(html);
  };
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "42% 58%",
        gap: 20,
        alignItems: "start",
      }}
    >
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
            <FormField label="Report No">
              <input
                style={inp}
                value={form.reportNo}
                onChange={(e) => set("reportNo", e.target.value)}
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
              placeholder="Optional notes…"
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
              padding: 16,
              borderRadius: 12,
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.25)",
              fontSize: 13,
              color: pal.textSub,
            }}
          >
            No expenses found. Go to{" "}
            <strong style={{ color: "#f59e0b" }}>Expenses Tracker</strong> and
            add some first.
          </div>
        ) : (
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: pal.surfaceElevated,
              border: `1px solid ${pal.border}`,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#f59e0b",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Summary
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                ["Total", fmtBDT(totalBDT), "#f59e0b"],
                ["Sumaiya", fmtBDT(sumaiyaBDT), "#ec4899"],
                ["Rakib", fmtBDT(rakibBDT), "#3b82f6"],
                ["Settlement", fmtBDT(linkedBDT), "#10b981"],
              ].map(([l, v, c]) => (
                <div
                  key={l}
                  style={{
                    textAlign: "center",
                    padding: "9px 8px",
                    borderRadius: 9,
                    background: c + "10",
                    border: `1px solid ${c}22`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      color: pal.textMute,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 3,
                    }}
                  >
                    {l}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: c }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 9,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: pal.textMute,
              }}
            >
              <CheckCircle2 size={12} color="#10b981" />
              {expenses.filter((e) => e.linkedToSettlement).length} linked to
              settlement · {expenses.length} total entries
            </div>
          </div>
        )}
        {err && (
          <div
            style={{
              padding: "10px 14px",
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
        <button
          onClick={handlePrint}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 26px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg,#d97706,#f59e0b)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(245,158,11,0.4)",
            fontFamily: "inherit",
          }}
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>
      <PreviewPane html={html} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
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

const DEFAULT_CO = {
  ...COMPANY,
  accent: "#06b6d4",
  logo: "",
  phone: "",
  taxId: "",
  bank: "",
};

/**
 * Props:
 *   projects          {array}
 *   currencies        {array}
 *   clients           {array}   ← NEW: saved client profiles
 *   preselectedClient {object}  ← NEW: from Clients page "Create Invoice" button
 */
export default function InvoiceGen({
  projects,
  currencies,
  clients = [],
  preselectedClient = null,
}) {
  const pal = usePalette();
  const [tab, setTab] = useState("invoice");
  const [co, setCo] = useState({ ...DEFAULT_CO });

  // Jump straight to invoice tab when Clients page triggers "Create Invoice"
  useEffect(() => {
    if (preselectedClient) setTab("invoice");
  }, [preselectedClient?.id]);

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 20 }}>
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
          Branded documents · live preview · print to PDF · Bengali &amp; all
          languages supported
        </p>
      </div>

      <div
        style={{
          padding: "10px 14px",
          marginBottom: 16,
          borderRadius: 12,
          background: "rgba(6,182,212,0.07)",
          border: "1px solid rgba(6,182,212,0.22)",
          fontSize: 12.5,
          color: pal.textSub,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 15 }}>🎨</span>
        <span>
          Expand the company panel to upload your <strong>logo</strong> and set
          your <strong>brand color</strong>.
          {clients.length > 0 && (
            <>
              {" "}
              ·{" "}
              <strong>
                {clients.length} saved client{clients.length !== 1 ? "s" : ""}
              </strong>{" "}
              — pick one in "Bill To" to auto-fill all fields.
            </>
          )}
        </span>
      </div>

      <BrandBox co={co} setCo={setCo} />

      <div
        style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}
      >
        {TABS.map((t) => (
          <TabBtn
            key={t.id}
            active={tab === t.id}
            color={t.color}
            Icon={t.Icon}
            label={t.label}
            onClick={() => setTab(t.id)}
          />
        ))}
      </div>

      <Card style={{ padding: 24 }}>
        {tab === "invoice" && (
          <ClientInvoiceTab
            co={co}
            projects={projects || []}
            currencies={currencies || []}
            clients={clients}
            preselectedClient={preselectedClient}
          />
        )}
        {tab === "receipt" && (
          <PaymentReceiptTab
            co={co}
            projects={projects || []}
            currencies={currencies || []}
          />
        )}
        {tab === "expense" && <ExpenseReportTab co={co} />}
      </Card>
    </div>
  );
}
