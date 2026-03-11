import { useState, useMemo } from "react";
import { CheckCircle, Clock, DollarSign, Search,
         ChevronDown, ExternalLink, XCircle, Download } from "lucide-react";
import { PAY_ST, PAY_ST_COL, FMT, FMT2, GEN_ID, COMPANY } from "../constants";
import { calcShares } from "../calc";
import { usePalette } from "../theme";
import { Card } from "../components/Shared";
import { ProgressBar, RingProgress } from "../components/ProgressBar";
import { generatePaymentReceipt } from "../components/PDFGen";

function PayStatusIcon({ status }) {
  const icons = {
    Pending:   <Clock size={14} color="#f59e0b"/>,
    Partial:   <DollarSign size={14} color="#06b6d4"/>,
    Paid:      <CheckCircle size={14} color="#10b981"/>,
    Cancelled: <XCircle size={14} color="#ef4444"/>,
  };
  return icons[status] || icons.Pending;
}

export default function Payments({ projects, currencies, onProjectUpdate }) {
  const pal = usePalette();
  const [q, setQ]         = useState("");
  const [stFilter, setSt] = useState("All");
  const [expanded, setExp] = useState(null);

  // Flatten all payment entries from all projects
  const allEntries = useMemo(() => {
    const out = [];
    projects.forEach(p => {
      (p.paymentEntries || []).forEach(e => {
        const curr = currencies.find(c => c.code === (e.currency || "BDT")) || { symbol: "৳", rate: 1 };
        out.push({
          ...e,
          projectId:   p.id,
          projectName: p.name,
          projectStatus: p.status,
          curr,
        });
      });
    });
    return out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [projects]);

  // Summary stats
  const summary = useMemo(() => {
    let totalOwed = 0, totalGiven = 0, pending = 0, partial = 0, paid = 0;
    allEntries.forEach(e => {
      const rate = e.curr?.rate || 1;
      totalOwed  += (parseFloat(e.totalOwed)    || 0) * rate;
      totalGiven += (parseFloat(e.amountGiven)  || 0) * rate;
      if (e.status === "Pending")   pending++;
      if (e.status === "Partial")   partial++;
      if (e.status === "Paid")      paid++;
    });
    return { totalOwed, totalGiven, pending, partial, paid, total: allEntries.length };
  }, [allEntries]);

  const filtered = useMemo(() =>
    allEntries.filter(e =>
      (stFilter === "All" || e.status === stFilter) &&
      (!q || (e.name||"").toLowerCase().includes(q.toLowerCase()) ||
             (e.projectName||"").toLowerCase().includes(q.toLowerCase()))
    ), [allEntries, stFilter, q]);

  const markStatus = (projectId, entryId, newStatus, amountGiven) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const updated = {
      ...project,
      paymentEntries: project.paymentEntries.map(e =>
        e.id === entryId
          ? { ...e, status: newStatus, ...(amountGiven !== undefined ? { amountGiven } : {}), updatedAt: new Date().toISOString() }
          : e
      ),
    };
    onProjectUpdate(updated);
  };

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: pal.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <DollarSign size={20} color="#10b981"/> Payment Tracker
        </h2>
        <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>All CEO & employee payments across every project</p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 22 }}>
        {[
          { l: "Total Owed",  v: "৳"+FMT(summary.totalOwed),  color: "#f59e0b", sub: `${summary.total} entries` },
          { l: "Total Given", v: "৳"+FMT(summary.totalGiven),  color: "#10b981", sub: `${Math.round(summary.totalOwed?summary.totalGiven/summary.totalOwed*100:0)}% of owed` },
          { l: "Pending",     v: summary.pending,              color: "#f59e0b", sub: "awaiting payment" },
          { l: "Partial",     v: summary.partial,              color: "#06b6d4", sub: "partially paid" },
          { l: "Paid",        v: summary.paid,                 color: "#10b981", sub: "fully settled" },
        ].map(({ l, v, color, sub }) => (
          <Card key={l} animated style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: pal.textMute, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 4 }}>{v}</div>
            <div style={{ fontSize: 11, color: pal.textMute }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* Overall progress */}
      {summary.totalOwed > 0 && (
        <Card style={{ padding: 18, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <RingProgress
              value={summary.totalOwed ? (summary.totalGiven / summary.totalOwed) * 100 : 0}
              size={56} color="#10b981" strokeWidth={5}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>
                {Math.round(summary.totalGiven / summary.totalOwed * 100)}%
              </span>
            </RingProgress>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>Overall Payment Progress</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>৳{FMT(summary.totalGiven)} / ৳{FMT(summary.totalOwed)}</span>
              </div>
              <ProgressBar value={summary.totalOwed ? (summary.totalGiven / summary.totalOwed) * 100 : 0} color="#10b981" height={8} glow />
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: pal.textMute }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or project…"
            style={{ width: "100%", boxSizing: "border-box", background: pal.inpBg, border: `1px solid ${pal.inpBorder}`, borderRadius: 10, padding: "9px 12px 9px 34px", color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", ...PAY_ST].map(s => {
            const c = PAY_ST_COL[s] || "#06b6d4", active = stFilter === s;
            return (
              <button key={s} onClick={() => setSt(s)} style={{ padding: "8px 13px", borderRadius: 9, border: `1px solid ${active ? c : "rgba(128,128,128,0.2)"}`, background: active ? c + "1a" : "transparent", color: active ? c : pal.textMute, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: pal.textFaint }}>
          <DollarSign size={48} strokeWidth={1} style={{ margin: "0 auto 12px", display: "block" }} />
          <div style={{ fontSize: 14 }}>No payment entries yet. Add them inside any project's form.</div>
        </div>
      ) : filtered.map(entry => {
        const stColor  = PAY_ST_COL[entry.status] || "#64748b";
        const owed     = parseFloat(entry.totalOwed)   || 0;
        const given    = parseFloat(entry.amountGiven) || 0;
        const pct      = owed > 0 ? Math.min(100, (given / owed) * 100) : 0;
        const isExpanded = expanded === entry.id;

        return (
          <Card key={entry.id} style={{ marginBottom: 10, overflow: "hidden", padding: 0, borderLeft: `3px solid ${stColor}` }}>
            {/* Row header */}
            <div onClick={() => setExp(isExpanded ? null : entry.id)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: stColor + "1a", border: `1px solid ${stColor}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PayStatusIcon status={entry.status} />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontWeight: 700, color: pal.text, fontSize: 14 }}>{entry.name || "Unnamed"}</div>
                <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2, display: "flex", gap: 10 }}>
                  <span style={{ color: "#06b6d4" }}>{entry.projectName}</span>
                  <span>{entry.type}</span>
                  {entry.channel && <span>{entry.channel}</span>}
                </div>
              </div>

              {/* Inline progress bar */}
              {owed > 0 && (
                <div style={{ width: 120, flexShrink: 0 }}>
                  <ProgressBar value={pct} color={stColor} height={5} glow />
                  <div style={{ textAlign: "right", fontSize: 10, color: stColor, marginTop: 3, fontWeight: 700 }}>{Math.round(pct)}%</div>
                </div>
              )}

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: stColor }}>
                  {entry.curr.symbol}{FMT2(given)}
                </div>
                {owed > 0 && <div style={{ fontSize: 11, color: pal.textMute }}>of {entry.curr.symbol}{FMT2(owed)}</div>}
              </div>

              {/* Quick action buttons */}
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {entry.status !== "Paid" && (
                  <button onClick={() => markStatus(entry.projectId, entry.id, "Paid", entry.totalOwed)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.1)", color: "#10b981", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
                    ✓ Paid
                  </button>
                )}
                {entry.status !== "Cancelled" && entry.status !== "Paid" && (
                  <button onClick={() => markStatus(entry.projectId, entry.id, "Cancelled")}
                    style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)", color: "#ef4444", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
                    ✕
                  </button>
                )}
              </div>

              <ChevronDown size={15} color={pal.textMute} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "0.2s" }} />
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{ padding: "4px 18px 18px", borderTop: `1px solid ${pal.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginTop: 14, marginBottom: 14 }}>
                  {[
                    ["Status", <span style={{ color: stColor, fontWeight: 700 }}>{entry.status}</span>],
                    ["Total Owed", `${entry.curr.symbol}${FMT2(owed)}`],
                    ["Amount Given", `${entry.curr.symbol}${FMT2(given)}`],
                    ["Remaining", `${entry.curr.symbol}${FMT2(Math.max(0, owed - given))}`],
                    ["Currency", entry.currency || "BDT"],
                    ["Channel", entry.channel || "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: "10px 12px", background: pal.surfaceElevated, borderRadius: 10, border: `1px solid ${pal.border}` }}>
                      <div style={{ fontSize: 10, color: pal.textMute, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: pal.text }}>{v}</div>
                    </div>
                  ))}
                </div>

                {entry.notes && (
                  <div style={{ padding: "10px 12px", background: pal.surfaceElevated, borderRadius: 10, fontSize: 12, color: pal.textSub, marginBottom: 12, borderLeft: "3px solid rgba(6,182,212,0.35)" }}>
                    <span style={{ color: pal.textMute, fontWeight: 600 }}>Note: </span>{entry.notes}
                  </div>
                )}

                {(entry.proofs || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pal.textMute, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Proof / Attachments</div>
                    {entry.proofs.map((pf, i) => (
                      <a key={i} href={pf} target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(6,182,212,0.07)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 9, marginBottom: 5, textDecoration: "none", color: "#06b6d4", fontSize: 12 }}>
                        <ExternalLink size={12} />
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pf}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Quick partial payment form */}
                {entry.status !== "Paid" && entry.status !== "Cancelled" && (
                  <PartialPayForm entry={entry} onUpdate={(given) => markStatus(entry.projectId, entry.id, "Partial", given)} pal={pal} />
                )}

                {/* PDF Receipt download */}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${pal.border}`, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={async () => {
                      try {
                        await generatePaymentReceipt({
                          payment: {
                            receiptNo: "RCP-" + entry.id.slice(-5).toUpperCase(),
                            payDate: entry.updatedAt?.slice(0,10) || new Date().toISOString().slice(0,10),
                            recipientName: entry.name || "Unknown",
                            recipientType: entry.type || "CEO",
                            channel: entry.channel || "",
                            projectRef: entry.projectName || "",
                            approvedBy: "Both CEOs",
                            totalOwed: parseFloat(entry.totalOwed) || 0,
                            amountGiven: parseFloat(entry.amountGiven) || 0,
                            remaining: Math.max(0, (parseFloat(entry.totalOwed)||0) - (parseFloat(entry.amountGiven)||0)),
                            currency: entry.currency || "BDT",
                            notes: entry.notes || "",
                            id: entry.id,
                          },
                          company: COMPANY,
                        });
                      } catch (e) { alert("PDF failed: " + e.message); }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
                  >
                    <Download size={13} /> Download Receipt PDF
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* PartialPayForm — defined OUTSIDE Payments to avoid remount bug */
function PartialPayForm({ entry, onUpdate, pal }) {
  const [val, setVal] = useState(entry.amountGiven || "");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: pal.textMute, fontWeight: 600 }}>Update amount given:</span>
      <input
        type="number" min="0" step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        style={{ width: 130, background: pal.inpBg, border: `1px solid ${pal.inpBorder}`, borderRadius: 9, padding: "8px 11px", color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
        placeholder={entry.curr?.symbol + "0.00"}
      />
      <button onClick={() => onUpdate(val)}
        style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0d9488,#06b6d4)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
        Save Partial
      </button>
    </div>
  );
}
