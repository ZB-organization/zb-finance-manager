/**
 * Projects — searchable, filterable project list with expandable detail cards.
 *
 * v2.1 — minimal additions only:
 *   + clients / employees props passed through to onAdd / onEdit
 *   + clientName shown in card subtitle row
 *   + "Client" row added to expanded detail key-value list
 *   Everything else is identical to the original.
 */
import { useState, useMemo } from "react";
import { Search, Plus, FolderOpen, Link, ExternalLink, Briefcase } from "lucide-react";
import { usePalette } from "../theme";
import { STATUSES, ST_COL, FMT, FMT2 } from "../constants";
import { calcShares } from "../calc";
import { GwBadge, StatusBadge, Card } from "../components/Shared";
import { ProgressBar } from "../components/ProgressBar";

export default function Projects({ projects, currencies, clients = [], employees = [], onAdd, onEdit, onDelete }) {
  const pal = usePalette();
  const [q,      setQ]      = useState("");
  const [sf,     setSf]     = useState("All");
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() =>
    projects
      .filter(p =>
        (!q  || p.name.toLowerCase().includes(q.toLowerCase()) ||
                (p.clientName || "").toLowerCase().includes(q.toLowerCase())) &&
        (sf === "All" || p.status === sf),
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [projects, q, sf],
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: pal.text, margin: 0 }}>All Projects</h2>
          <p style={{ color: pal.textMute, marginTop: 4, fontSize: 13 }}>{filtered.length} of {projects.length}</p>
        </div>
        {/* Pass clients + employees to the form via onAdd */}
        <button onClick={() => onAdd({ clients, employees })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "linear-gradient(135deg,#0d9488,#06b6d4)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 18px rgba(6,182,212,0.35)", fontFamily: "inherit" }}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: pal.textMute }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects or clients…" style={{ width: "100%", boxSizing: "border-box", background: pal.inpBg, border: `1px solid ${pal.inpBorder}`, borderRadius: 10, padding: "9px 12px 9px 34px", color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", ...STATUSES].map(s => {
            const c = ST_COL[s] || "#06b6d4", active = sf === s;
            return (
              <button key={s} onClick={() => setSf(s)} style={{ padding: "8px 13px", borderRadius: 9, border: `1px solid ${active ? c : "rgba(128,128,128,0.2)"}`, background: active ? c + "1a" : "transparent", color: active ? c : pal.textMute, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: pal.textFaint }}>
          <FolderOpen size={48} strokeWidth={1} style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 14 }}>No projects found</div>
        </div>
      ) : (
        filtered.map(p => {
          const c      = calcShares(p, currencies), isOpen = openId === p.id;
          const curr   = currencies.find(x => x.code === p.currency) || { symbol: "?", rate: 1 };
          const wLabel = p.workerType === "ceo_sumaiya" ? "Sumaiya" : p.workerType === "ceo_rakib" ? "Rakib" : p.workerType === "external" ? (p.workerName || "External") : "No worker";
          const wColor = p.workerType === "ceo_sumaiya" ? "#ec4899" : p.workerType === "ceo_rakib" ? "#3b82f6" : p.workerType === "external" ? "#10b981" : pal.textMute;

          return (
            <Card key={p.id} style={{ marginBottom: 10, overflow: "hidden", padding: 0 }}>
              {/* Row header */}
              <div onClick={() => setOpenId(isOpen ? null : p.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", cursor: "pointer", flexWrap: "wrap" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ST_COL[p.status], flexShrink: 0, boxShadow: `0 0 8px ${ST_COL[p.status]}80` }} />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontWeight: 700, color: pal.text, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {/* ── NEW: client name ── */}
                    {p.clientName && (
                      <span style={{ color: "#06b6d4", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                        <Briefcase size={9} /> {p.clientName}
                      </span>
                    )}
                    <span style={{ color: wColor, fontWeight: 600 }}>{wLabel}</span>
                    <span style={{ color: pal.textMute }}>{p.rule || "DEFAULT"}</span>
                    {p.payDay && <span style={{ color: pal.textMute }}>Pay: {p.payDay}</span>}
                  </div>
                </div>
                <GwBadge ch={p.paymentChannel} />
                <StatusBadge status={p.status} />
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#ec4899" }}>৳{FMT(c.sShare)}</div>
                  <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700 }}>R: ৳{FMT(c.rShare)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {/* Pass clients + employees to the form via onEdit */}
                  <button onClick={e => { e.stopPropagation(); onEdit(p, { clients, employees }); }} style={{ background: pal.surfaceElevated, border: "none", borderRadius: 8, padding: "7px 10px", color: pal.textMute, cursor: "pointer", fontSize: 13 }}>✎</button>
                  <button onClick={e => { e.stopPropagation(); onDelete(p.id); }} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8, padding: 7, color: "#ef4444", cursor: "pointer" }}>✕</button>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${pal.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
                    {/* Key-value info */}
                    <div style={{ fontSize: 13 }}>
                      {[
                        ["Client",     p.clientName  || "—"],   // ← NEW row
                        ["Budget",     `${curr.symbol}${FMT2(p.totalBudget)} ${p.currency}`],
                        ["Rate",       `1 ${p.currency} = ৳${c.rate}`],
                        ["Tax/Fee",    `${p.tax || 0}%`],
                        ["Worker Pay", p.workerType === "external" ? `${curr.symbol}${FMT2(p.workerBudget)}` : "—"],
                        ["Start",      p.startDate || "—"],
                        ["End",        p.endDate   || "—"],
                        ["Pay Day",    p.payDay    || "—"],
                        ["Receiver",   p.paymentReceiver],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${pal.border}` }}>
                          <span style={{ color: pal.textMute }}>{k}</span>
                          <span style={{ color: pal.textSub, fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calculation panel */}
                    <div style={{ background: "rgba(6,182,212,0.05)", borderRadius: 12, padding: 14, border: "1px solid rgba(6,182,212,0.15)" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Calculation</div>
                      {[
                        ["Gross BDT",    `৳${FMT(c.totalBDT)}`],
                        ["Tax",          `–৳${FMT(c.taxAmt)}`],
                        ["Net",          `৳${FMT(c.net)}`],
                        ["Distributable",`৳${FMT(c.dist)}`],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${pal.border}`, fontSize: 12.5 }}>
                          <span style={{ color: pal.textMute }}>{k}</span>
                          <span style={{ color: pal.text, fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                        {[
                          { l: "Sumaiya", v: c.sShare, p: c.sP, color: "#ec4899" },
                          { l: "Rakib",   v: c.rShare, p: c.rP, color: "#3b82f6" },
                        ].map(x => (
                          <div key={x.l} style={{ background: x.color + "12", border: `1px solid ${x.color}28`, borderRadius: 8, padding: "10px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: x.color, fontWeight: 700 }}>{x.l} ({x.p}%)</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: pal.text }}>৳{FMT(x.v)}</div>
                            <ProgressBar value={x.p} color={x.color} height={3} style={{ marginTop: 6 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Invoices */}
                  {(p.invoices || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: pal.textMute, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Invoices & Proof</div>
                      {p.invoices.map((iv, i) => (
                        <a key={i} href={iv} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.18)", borderRadius: 8, marginBottom: 5, textDecoration: "none", color: "#06b6d4", fontSize: 12 }}>
                          <Link size={12} />
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iv}</span>
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {p.notes && (
                    <div style={{ marginTop: 12, padding: "10px 12px", background: pal.surfaceElevated, borderRadius: 10, fontSize: 12, color: pal.textSub, borderLeft: "3px solid rgba(6,182,212,0.35)" }}>
                      <span style={{ color: pal.textMute, fontWeight: 600 }}>Note: </span>{p.notes}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}