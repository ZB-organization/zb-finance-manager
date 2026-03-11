/**
 * Dashboard — Financial overview with KPIs, CEO split, settlement banner,
 * status breakdown, currency breakdown, and recent transactions table.
 */
import { useMemo } from "react";
import {
  TrendingUp, Wallet, Plus, BarChart2,
  ShieldCheck, CircleDollarSign,
} from "lucide-react";
import { usePalette } from "../theme";
import { STATUSES, ST_COL, FMT, FMT2 } from "../constants";
import { calcShares, calcDebt } from "../calc";
import { GwBadge, StatusBadge, Card, useChannels } from "../components/Shared";
import { ProgressBar, DualBar } from "../components/ProgressBar";

export default function Dashboard({
  projects,
  currencies,
  expenses,
  settledBaseline,
  onAdd,
  setTab,
}) {
  const pal         = usePalette();
  const channelDefs = useChannels();

  const stats = useMemo(() => {
    let sTotal = 0, rTotal = 0, grossBDT = 0;
    const byCurr = {},
          stCnt  = Object.fromEntries(STATUSES.map(s => [s, 0]));
    projects.forEach(p => {
      const c = calcShares(p, currencies);
      sTotal   += c.sShare;
      rTotal   += c.rShare;
      grossBDT += c.totalBDT;
      stCnt[p.status] = (stCnt[p.status] || 0) + 1;
      if (!byCurr[p.currency]) byCurr[p.currency] = { total: 0, cnt: 0 };
      byCurr[p.currency].total += parseFloat(p.totalBudget) || 0;
      byCurr[p.currency].cnt++;
    });
    return { sTotal, rTotal, grossBDT, byCurr, stCnt };
  }, [projects, currencies]);

  const debt = useMemo(
    () => calcDebt(projects, currencies, expenses, settledBaseline, channelDefs),
    [projects, currencies, expenses, settledBaseline, channelDefs],
  );

  const recent = useMemo(
    () => [...projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [projects],
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: pal.text, margin: 0, letterSpacing: -0.5 }}>
          Financial Overview
        </h2>
        <p style={{ color: pal.textMute, marginTop: 6, fontSize: 13 }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} tracked · All amounts in BDT
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Gross Revenue",   val: stats.grossBDT, color: "#0d9488", Icon: TrendingUp, sub: `${projects.length} projects` },
          { label: "Sumaiya's Share", val: stats.sTotal,   color: "#ec4899", Icon: Wallet,     sub: "Total earned" },
          { label: "Rakib's Share",   val: stats.rTotal,   color: "#3b82f6", Icon: Wallet,     sub: "Total earned" },
        ].map(({ label, val, color, Icon, sub }) => (
          <Card key={label} animated style={{ padding: 22, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: color + "0d" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: pal.textMute, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={17} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: pal.text, letterSpacing: -0.5 }}>৳{FMT(val)}</div>
            {sub && <div style={{ fontSize: 12, color: pal.textMute, marginTop: 6 }}>{sub}</div>}
            {stats.grossBDT > 0 && (
              <ProgressBar value={(val / stats.grossBDT) * 100} color={color} height={4} style={{ marginTop: 10 }} />
            )}
          </Card>
        ))}
      </div>

      {/* CEO earnings split bar */}
      {stats.sTotal + stats.rTotal > 0 && (
        <Card style={{ padding: "16px 20px", marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: pal.textMute, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
            Earnings Split
          </div>
          <DualBar aVal={stats.sTotal} bVal={stats.rTotal} height={12} />
        </Card>
      )}

      {/* Settlement banner */}
      {!debt.payer ? (
        <Card style={{ padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, borderLeft: "3px solid #10b981" }}>
          <ShieldCheck size={18} color="#10b981" />
          <span style={{ fontSize: 13, color: pal.text, fontWeight: 600 }}>All settled — no outstanding balance.</span>
        </Card>
      ) : (
        <div
          onClick={() => setTab("settlement")}
          style={{
            padding: "14px 18px", marginBottom: 20, borderRadius: 14,
            border: `1px solid ${debt.payer === "sumaiya" ? "#ec489944" : "#3b82f644"}`,
            background: debt.payer === "sumaiya" ? "rgba(236,72,153,0.06)" : "rgba(59,130,246,0.06)",
            display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
          }}
        >
          <CircleDollarSign size={18} color="#f59e0b" />
          <div style={{ flex: 1, fontSize: 13 }}>
            <span style={{ fontWeight: 800, color: debt.payer === "sumaiya" ? "#ec4899" : "#3b82f6" }}>{debt.payerLabel}</span>
            <span style={{ color: pal.textSub }}> owes </span>
            <span style={{ fontWeight: 800, color: debt.receiver === "sumaiya" ? "#ec4899" : "#3b82f6" }}>{debt.receiverLabel}</span>
            <span style={{ fontWeight: 900, color: pal.text, fontSize: 16, marginLeft: 6 }}>৳{FMT(debt.amount)}</span>
          </div>
          <span style={{ fontSize: 11, color: "#06b6d4", fontWeight: 600 }}>View Settlement →</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 18 }}>
        {/* Status breakdown */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: pal.text, marginBottom: 14 }}>Project Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {STATUSES.map(s => (
              <div key={s} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 12, background: ST_COL[s] + "10", border: `1px solid ${ST_COL[s]}28` }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: ST_COL[s] }}>{stats.stCnt[s]}</div>
                <div style={{ fontSize: 10, color: pal.textMute, marginTop: 3, fontWeight: 700 }}>{s}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Currency breakdown */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: pal.text, marginBottom: 14 }}>Revenue by Currency</div>
          {Object.keys(stats.byCurr).length === 0 ? (
            <div style={{ color: pal.textFaint, fontSize: 12, textAlign: "center", paddingTop: 20 }}>No data yet</div>
          ) : (
            Object.entries(stats.byCurr).map(([code, { total, cnt }]) => {
              const curr = currencies.find(c => c.code === code) || { symbol: "?" };
              return (
                <div key={code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${pal.border}` }}>
                  <div>
                    <span style={{ fontWeight: 800, color: "#0d9488", fontSize: 14 }}>{code}</span>
                    <span style={{ fontSize: 11, color: pal.textMute, marginLeft: 6 }}>{cnt} proj</span>
                  </div>
                  <span style={{ fontWeight: 700, color: pal.text, fontSize: 14 }}>{curr.symbol}{FMT2(total)}</span>
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Recent transactions table */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>Recent Transactions</div>
          {projects.length === 0 && (
            <button onClick={onAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(6,182,212,0.14)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 8, color: "#06b6d4", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
              <Plus size={13} /> Add First
            </button>
          )}
        </div>
        {projects.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: pal.textFaint }}>
            <BarChart2 size={44} strokeWidth={1} style={{ margin: "0 auto 12px", display: "block" }} />
            <div style={{ fontSize: 14 }}>No projects yet. Add one to get started.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Project", "Status", "Channel", "Rule", "Sumaiya", "Rakib", "Pay Day"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "7px 10px", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, color: pal.textMute, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(p => {
                  const { sShare, rShare } = calcShares(p, currencies);
                  return (
                    <tr key={p.id} style={{ borderTop: `1px solid ${pal.border}` }}>
                      <td style={{ padding: "11px 10px", color: pal.text, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                      <td style={{ padding: "11px 10px" }}><StatusBadge status={p.status} /></td>
                      <td style={{ padding: "11px 10px" }}><GwBadge ch={p.paymentChannel} /></td>
                      <td style={{ padding: "11px 10px", color: "#06b6d4", fontWeight: 700, fontSize: 12 }}>{p.rule || "DEFAULT"}</td>
                      <td style={{ padding: "11px 10px", color: "#ec4899", fontWeight: 800 }}>৳{FMT(sShare)}</td>
                      <td style={{ padding: "11px 10px", color: "#3b82f6", fontWeight: 800 }}>৳{FMT(rShare)}</td>
                      <td style={{ padding: "11px 10px", color: pal.textMute, fontSize: 11, whiteSpace: "nowrap" }}>{p.payDay || p.createdAt?.slice(0, 10) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
