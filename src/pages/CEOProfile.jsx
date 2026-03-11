/**
 * CEOProfile — per-CEO earnings breakdown, channel stats, and transaction history.
 */
import { useMemo } from "react";
import { User, ArrowUpRight } from "lucide-react";
import { usePalette } from "../theme";
import { FMT } from "../constants";
import { calcShares } from "../calc";
import { StatusBadge, Card, useChannels, gwColor, gwShort } from "../components/Shared";
import { ProgressBar } from "../components/ProgressBar";

export default function CEOProfile({ who, projects, currencies, ceoImages, onCEOImageChange }) {
  const pal        = usePalette();
  const allChannels = useChannels();
  const isSumu = who === "sumaiya", name = isSumu ? "Sumaiya" : "Rakib";
  const color  = isSumu ? "#ec4899" : "#3b82f6";
  const channels = allChannels.filter(c => c.owner === who).map(c => c.name);
  const myImage  = ceoImages?.[who];

  const handleImageUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCEOImageChange?.(who, ev.target.result);
    reader.readAsDataURL(file);
  };

  const stats = useMemo(() => {
    let earned = 0, grossIn = 0;
    const byCh = Object.fromEntries(channels.map(ch => [ch, { recv: 0, earned: 0, cnt: 0 }]));
    projects.forEach(p => {
      const c = calcShares(p, currencies), myShare = isSumu ? c.sShare : c.rShare;
      earned += myShare;
      if (channels.includes(p.paymentChannel)) {
        grossIn += c.totalBDT;
        byCh[p.paymentChannel].recv   += c.totalBDT;
        byCh[p.paymentChannel].earned += myShare;
        byCh[p.paymentChannel].cnt++;
      }
    });
    return { earned, grossIn, byCh, workedOn: projects.filter(p => p.workerType === (isSumu ? "ceo_sumaiya" : "ceo_rakib")).length };
  }, [projects, currencies, who]);

  const txns = useMemo(() =>
    projects
      .filter(p => { const c = calcShares(p, currencies); return (isSumu ? c.sShare : c.rShare) > 0; })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [projects, currencies, who],
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Hero banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: 24, background: `linear-gradient(135deg,${color}0d,${color}04)`, borderRadius: 20, border: `1px solid ${color}1e`, flexWrap: "wrap" }}>
        {/* Avatar with upload */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 68, height: 68, borderRadius: 20, background: myImage ? "transparent" : `linear-gradient(135deg,${color}cc,${color}77)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 28px ${color}44`, overflow: "hidden" }}>
            {myImage ? <img src={myImage} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={28} color="#fff" />}
          </div>
          <label title="Upload photo" style={{ position: "absolute", bottom: -4, right: -4, width: 24, height: 24, borderRadius: "50%", background: "#0d9488", border: "2px solid " + pal.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
            📷<input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
          </label>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: pal.text }}>{name}</div>
          <div style={{ fontSize: 13, color: pal.textMute, marginTop: 3 }}>Co-Founder & CEO · {channels.length} payment channels</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 900, color, animation: "pulse 2.5s ease-in-out infinite" }}>৳{FMT(stats.earned)}</div>
          <div style={{ fontSize: 12, color: pal.textMute }}>Total Earned</div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { l: "Total Earned",    v: stats.earned,   c: color,     pct: stats.grossIn > 0 ? (stats.earned / stats.grossIn) * 100 : 0 },
          { l: "Gross Received",  v: stats.grossIn,  c: "#0d9488", pct: 100 },
          { l: "Projects Worked", v: stats.workedOn, c: "#f59e0b", cnt: true, pct: projects.length > 0 ? (stats.workedOn / projects.length) * 100 : 0 },
        ].map(({ l, v, c, cnt, pct }) => (
          <Card key={l} style={{ padding: 18 }}>
            <div style={{ fontSize: 11, color: pal.textMute, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{cnt ? v : "৳" + FMT(v)}</div>
            <ProgressBar value={pct} color={c} height={4} style={{ marginTop: 8 }} />
          </Card>
        ))}
      </div>

      {/* Payment channels breakdown */}
      <Card style={{ padding: 20, marginBottom: 22 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: pal.text, marginBottom: 14 }}>Payment Channels</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 12 }}>
          {channels.map(chName => {
            const chDef = allChannels.find(c => c.name === chName);
            const d  = stats.byCh[chName] || { recv: 0, earned: 0, cnt: 0 };
            const gc = chDef?.color || gwColor(chName);
            const gs = chDef?.short || gwShort(chName);
            return (
              <div key={chName} style={{ padding: 14, background: gc + "0c", border: `1px solid ${gc}2e`, borderRadius: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: gc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff", overflow: "hidden", flexShrink: 0 }}>
                    {chDef?.iconBase64 ? <img src={chDef.iconBase64} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : gs}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: gc }}>{chName}</span>
                </div>
                <div style={{ fontSize: 11, color: pal.textMute }}>Received</div>
                <div style={{ fontWeight: 900, color: pal.text, fontSize: 17, margin: "2px 0" }}>৳{FMT(d.recv)}</div>
                <div style={{ fontSize: 11, color: pal.textMute }}>My share: ৳{FMT(d.earned)} · {d.cnt} txn{d.cnt !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* All transactions */}
      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: pal.text, marginBottom: 14 }}>All Transactions ({txns.length})</div>
        {txns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: pal.textFaint, fontSize: 13 }}>No transactions yet</div>
        ) : (
          txns.map(p => {
            const c = calcShares(p, currencies), myAmt = isSumu ? c.sShare : c.rShare, myPct = isSumu ? c.sP : c.rP;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${pal.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ArrowUpRight size={16} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: pal.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}>{p.payDay || p.createdAt?.slice(0, 10)} · {myPct}% · {p.paymentChannel}</div>
                </div>
                <StatusBadge status={p.status} />
                <div style={{ fontWeight: 900, color, fontSize: 16, flexShrink: 0 }}>৳{FMT(myAmt)}</div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
