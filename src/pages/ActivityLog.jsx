import { useState, useEffect } from "react";
import { Activity, Search, Trash2, Filter } from "lucide-react";
import { loadActivity } from "../db";
import { usePalette } from "../theme";
import { Card } from "../components/Shared";

const ICON_MAP = {
  PROJECT_CREATED:  { icon: "＋", color: "#10b981" },
  PROJECT_UPDATED:  { icon: "✎",  color: "#06b6d4" },
  PROJECT_DELETED:  { icon: "✕",  color: "#ef4444" },
  SETTLEMENT:       { icon: "✓",  color: "#10b981" },
  CURRENCY_UPDATED: { icon: "₵",  color: "#f59e0b" },
  LOGIN:            { icon: "🔓",  color: "#8b5cf6" },
  LOGOUT:           { icon: "🔒",  color: "#64748b" },
  STATUS_CHANGED:   { icon: "◈",  color: "#f59e0b" },
  SETTINGS:         { icon: "⚙",  color: "#94a3b8" },
  DEFAULT:          { icon: "·",  color: "#64748b" },
};

export default function ActivityLog() {
  const pal = usePalette();
  const [log, setLog]   = useState([]);
  const [q,   setQ]     = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => { loadActivity().then(setLog); }, []);

  const types = ["All", ...Array.from(new Set(log.map(e => e.type)))];

  const filtered = log.filter(e =>
    (filter === "All" || e.type === filter) &&
    (!q || (e.detail || "").toLowerCase().includes(q.toLowerCase()) || (e.type || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: pal.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Activity size={20} color="#06b6d4" /> Activity Log
        </h2>
        <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>Every action inside the app — last 500 entries</p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: pal.textMute }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search activity…" style={{ width: "100%", boxSizing: "border-box", background: pal.inpBg, border: `1px solid ${pal.inpBorder}`, borderRadius: 10, padding: "9px 12px 9px 34px", color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {types.slice(0, 6).map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "8px 12px", borderRadius: 9, border: `1px solid ${filter===t?"#06b6d4":"rgba(128,128,128,0.2)"}`, background: filter===t?"rgba(6,182,212,0.15)":"transparent", color: filter===t?"#06b6d4":pal.textMute, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>{t}</button>
          ))}
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: pal.textFaint }}>
            <Activity size={40} strokeWidth={1} style={{ margin: "0 auto 12px", display: "block" }} />
            <div style={{ fontSize: 13 }}>No activity yet</div>
          </div>
        ) : filtered.map((e, i) => {
          const cfg = ICON_MAP[e.type] || ICON_MAP.DEFAULT;
          return (
            <div key={e.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${pal.border}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: cfg.color + "18", border: `1px solid ${cfg.color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, color: cfg.color, fontWeight: 800 }}>
                {cfg.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: pal.text }}>{e.detail || e.type}</div>
                <div style={{ fontSize: 11, color: pal.textMute, marginTop: 3 }}>
                  <span style={{ background: cfg.color + "18", color: cfg.color, padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700, marginRight: 8 }}>{e.type}</span>
                  {new Date(e.timestamp).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
