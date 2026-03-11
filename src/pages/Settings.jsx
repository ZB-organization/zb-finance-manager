/**
 * Settings — currency rates, payment channels, payment methods,
 * CEO photos, rule reference, Firebase migration guide, and backup/restore.
 */
import { useState, useMemo, useCallback } from "react";
import { User, Plus, Trash2, Edit2, Landmark } from "lucide-react";
import { usePalette } from "../theme";
import { DEF_CURRENCIES, DEF_CHANNELS, RULES, GEN_ID } from "../constants";
import { saveCurrencies, savePaymentMethods, saveChannels } from "../db";
import { Card } from "../components/Shared";
import BackupRestore from "../components/BackupRestore";

export default function Settings({
  currencies,
  setCurrencies,
  onLog,
  ceoImages,
  onCEOImageChange,
  paymentMethods,
  onPaymentMethodsSave,
  channels,
  onChannelsSave,
}) {
  const pal = usePalette();

  /* ── Currency state ─── */
  const [editCode, setEditCode] = useState(null);
  const [editVal,  setEditVal]  = useState("");
  const [nc,       setNc]       = useState({ code: "", symbol: "", rate: "" });

  /* ── Payment method state ─── */
  const PM_BLANK = { name: "", owner: "sumaiya", color: "#0d9488", iconBase64: "" };
  const [pmForm,    setPmForm]    = useState(PM_BLANK);
  const [pmEditing, setPmEditing] = useState(null);
  const [pmShowAdd, setPmShowAdd] = useState(false);

  /* ── Channel state ─── */
  const CH_BLANK = { name: "", owner: "sumaiya", color: "#0d9488", short: "", iconBase64: "" };
  const [chForm,    setChForm]    = useState(CH_BLANK);
  const [chEditing, setChEditing] = useState(null);
  const [chShowAdd, setChShowAdd] = useState(false);

  const inp = useMemo(() => ({
    background: pal.inpBg, border: `1px solid ${pal.inpBorder}`,
    borderRadius: 10, padding: "10px 13px",
    color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit",
  }), [pal.inpBg, pal.inpBorder, pal.text]);

  /* ── Currency helpers ─── */
  const saveCurr = useCallback((list) => {
    setCurrencies(list);
    saveCurrencies(list);
    onLog({ type: "CURRENCY_UPDATED", detail: "Currency rates updated" });
  }, [setCurrencies, onLog]);

  const finishEdit = useCallback((code) => {
    const r = parseFloat(editVal);
    if (r > 0) saveCurr(currencies.map(c => c.code === code ? { ...c, rate: r } : c));
    setEditCode(null);
  }, [editVal, currencies, saveCurr]);

  const addCurr = useCallback(() => {
    if (!nc.code.trim() || !parseFloat(nc.rate)) return;
    saveCurr([...currencies, { code: nc.code.toUpperCase(), symbol: nc.symbol || nc.code, rate: parseFloat(nc.rate) }]);
    setNc({ code: "", symbol: "", rate: "" });
  }, [nc, currencies, saveCurr]);

  /* ── Payment method helpers ─── */
  const handlePmIconUpload = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPmForm(f => ({ ...f, iconBase64: ev.target.result }));
    reader.readAsDataURL(file);
  };
  const savePm = () => {
    if (!pmForm.name.trim()) return;
    const updated = pmEditing
      ? paymentMethods.map(m => m.id === pmEditing ? { ...m, ...pmForm } : m)
      : [...paymentMethods, { ...pmForm, id: "pm_" + Date.now() }];
    onPaymentMethodsSave(updated);
    setPmForm(PM_BLANK); setPmEditing(null); setPmShowAdd(false);
  };
  const deletePm = id => onPaymentMethodsSave(paymentMethods.filter(m => m.id !== id));
  const startEditPm = m => { setPmForm({ name: m.name, owner: m.owner, color: m.color, iconBase64: m.iconBase64 || "" }); setPmEditing(m.id); setPmShowAdd(true); };

  /* ── CEO image helpers ─── */
  const handleCEOImageUpload = who => e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onCEOImageChange?.(who, ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── Channel helpers ─── */
  const handleChIconUpload = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setChForm(f => ({ ...f, iconBase64: ev.target.result }));
    reader.readAsDataURL(file);
  };
  const saveCh = () => {
    if (!chForm.name.trim()) return;
    const item    = { ...chForm, short: chForm.short.trim() || chForm.name.slice(0, 2).toUpperCase() };
    const updated = chEditing
      ? channels.map(c => c.id === chEditing ? { ...c, ...item } : c)
      : [...channels, { ...item, id: "ch_" + Date.now() }];
    onChannelsSave(updated);
    setChForm(CH_BLANK); setChEditing(null); setChShowAdd(false);
  };
  const deleteCh = id => onChannelsSave(channels.filter(c => c.id !== id));
  const startEditCh = c => { setChForm({ name: c.name, owner: c.owner, color: c.color, short: c.short || "", iconBase64: c.iconBase64 || "" }); setChEditing(c.id); setChShowAdd(true); };
  const resetChannels = () => { if (window.confirm("Reset to default channels?")) onChannelsSave(DEF_CHANNELS); };

  const OWNER_OPTS = [
    { v: "sumaiya", l: "Sumaiya", c: "#ec4899" },
    { v: "rakib",   l: "Rakib",   c: "#3b82f6" },
    { v: "company", l: "Company", c: "#0d9488" },
  ];

  return (
    <div style={{ paddingBottom: 48 }}>
      <BackupRestore onLog={onLog} />
      <h2 style={{ fontSize: 22, fontWeight: 900, color: pal.text, marginBottom: 22 }}>Settings</h2>

      {/* ── CEO Profile Photos ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: pal.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <User size={15} color="#06b6d4" /> CEO Profile Photos
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>Upload photos shown on profile pages and settlement animations.</div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[{ who: "sumaiya", name: "Sumaiya", color: "#ec4899" }, { who: "rakib", name: "Rakib", color: "#3b82f6" }].map(({ who, name, color }) => {
            const img = ceoImages?.[who];
            return (
              <div key={who} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: color + "08", border: `1px solid ${color}22`, borderRadius: 14, flex: 1, minWidth: 200 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: color + "22", border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {img ? <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={22} color={color} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color, marginBottom: 6 }}>{name}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <label style={{ padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#0d9488,#06b6d4)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {img ? "Change Photo" : "Upload Photo"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleCEOImageUpload(who)} />
                    </label>
                    {img && (
                      <button onClick={() => onCEOImageChange?.(who, null)} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Remove</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Payment Channels ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: pal.text }}>Payment Channels</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={resetChannels} style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${pal.border}`, color: pal.textMute, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Reset</button>
            <button onClick={() => { setChForm(CH_BLANK); setChEditing(null); setChShowAdd(s => !s); }} style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg,#0d9488,#06b6d4)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>Channels determine which CEO received payment. Used in settlement calculations.</div>

        {chShowAdd && (
          <div style={{ padding: 16, borderRadius: 12, background: pal.surfaceElevated, border: `1px solid ${pal.borderMid}`, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input style={inp} placeholder="Channel name (e.g. Rakib-WISE)" value={chForm.name} onChange={e => setChForm(f => ({ ...f, name: e.target.value }))} />
              <input style={inp} placeholder="Short label (e.g. W)" value={chForm.short} onChange={e => setChForm(f => ({ ...f, short: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                {OWNER_OPTS.map(o => (
                  <button key={o.v} onClick={() => setChForm(f => ({ ...f, owner: o.v }))} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `2px solid ${chForm.owner === o.v ? o.c : "rgba(128,128,128,0.2)"}`, background: chForm.owner === o.v ? o.c + "18" : "transparent", color: chForm.owner === o.v ? o.c : pal.textMute, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>{o.l}</button>
                ))}
              </div>
              <input type="color" value={chForm.color} onChange={e => setChForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: pal.textMute, cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: pal.surfaceElevated, border: `1px solid ${pal.border}` }}>
                Upload Icon <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleChIconUpload} />
              </label>
              {chForm.iconBase64 && <img src={chForm.iconBase64} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setChShowAdd(false); setChEditing(null); }} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${pal.border}`, background: "transparent", color: pal.textMute, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveCh} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0d9488,#06b6d4)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{chEditing ? "Save" : "Add Channel"}</button>
            </div>
          </div>
        )}

        {channels.map(c => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${pal.border}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
              {c.iconBase64 ? <img src={c.iconBase64} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (c.short || c.name.slice(0, 2))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: pal.text, fontSize: 13 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: pal.textMute, textTransform: "capitalize" }}>{c.owner}</div>
            </div>
            <button onClick={() => startEditCh(c)} style={{ background: "none", border: "none", color: pal.textMute, cursor: "pointer", padding: 4 }}><Edit2 size={14} /></button>
            <button onClick={() => deleteCh(c.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
          </div>
        ))}
      </Card>

      {/* ── Payment Methods ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: pal.text }}>Payment Methods</div>
          <button onClick={() => { setPmForm(PM_BLANK); setPmEditing(null); setPmShowAdd(s => !s); }} style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg,#0d9488,#06b6d4)", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={12} /> Add
          </button>
        </div>

        {pmShowAdd && (
          <div style={{ padding: 16, borderRadius: 12, background: pal.surfaceElevated, border: `1px solid ${pal.borderMid}`, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <input style={inp} placeholder="Method name" value={pmForm.name} onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))} />
              <div style={{ display: "flex", gap: 6 }}>
                {OWNER_OPTS.slice(0, 2).map(o => (
                  <button key={o.v} onClick={() => setPmForm(f => ({ ...f, owner: o.v }))} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: `2px solid ${pmForm.owner === o.v ? o.c : "rgba(128,128,128,0.2)"}`, background: pmForm.owner === o.v ? o.c + "18" : "transparent", color: pmForm.owner === o.v ? o.c : pal.textMute, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>{o.l}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <input type="color" value={pmForm.color} onChange={e => setPmForm(f => ({ ...f, color: e.target.value }))} style={{ width: 40, height: 40, borderRadius: 8, border: "none", cursor: "pointer" }} />
              <label style={{ fontSize: 11, color: pal.textMute, cursor: "pointer", padding: "6px 12px", borderRadius: 8, background: pal.surfaceElevated, border: `1px solid ${pal.border}` }}>
                Upload Icon <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePmIconUpload} />
              </label>
              {pmForm.iconBase64 && <img src={pmForm.iconBase64} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setPmShowAdd(false); setPmEditing(null); }} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${pal.border}`, background: "transparent", color: pal.textMute, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={savePm} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0d9488,#06b6d4)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{pmEditing ? "Save" : "Add Method"}</button>
            </div>
          </div>
        )}

        {paymentMethods.length === 0 && !pmShowAdd && (
          <div style={{ textAlign: "center", padding: "20px 0", color: pal.textFaint, fontSize: 13 }}>No payment methods yet.</div>
        )}
        {paymentMethods.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${pal.border}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {m.iconBase64 ? <img src={m.iconBase64} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>{m.name.slice(0, 2)}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: pal.text, fontSize: 13 }}>{m.name}</div>
              <div style={{ fontSize: 11, color: pal.textMute, textTransform: "capitalize" }}>{m.owner}</div>
            </div>
            <button onClick={() => startEditPm(m)} style={{ background: "none", border: "none", color: pal.textMute, cursor: "pointer", padding: 4 }}><Edit2 size={14} /></button>
            <button onClick={() => deletePm(m.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
          </div>
        ))}
      </Card>

      {/* ── Currency Rates ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: pal.text, marginBottom: 5 }}>Currency Exchange Rates</div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>All rates against BDT. Click a rate to edit inline.</div>
        {currencies.map(c => (
          <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${pal.border}` }}>
            <div style={{ width: 52, fontWeight: 900, color: "#0d9488", fontSize: 15 }}>{c.code}</div>
            <div style={{ color: pal.textMute, fontSize: 14, flex: 1 }}>{c.symbol}</div>
            {editCode === c.code ? (
              <input style={{ ...inp, width: 130 }} type="number" value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => finishEdit(c.code)} onKeyDown={e => e.key === "Enter" && finishEdit(c.code)} autoFocus />
            ) : (
              <span onClick={() => { setEditCode(c.code); setEditVal(String(c.rate)); }} style={{ color: pal.text, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "6px 12px", background: pal.surfaceElevated, borderRadius: 8 }}>৳{c.rate}</span>
            )}
            <button onClick={() => { setEditCode(c.code); setEditVal(String(c.rate)); }} style={{ background: "none", border: "none", color: pal.textMute, cursor: "pointer", padding: 4 }}><Edit2 size={14} /></button>
            {c.code !== "BDT" && (
              <button onClick={() => saveCurr(currencies.filter(x => x.code !== c.code))} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[{ f: "code", p: "Code" }, { f: "symbol", p: "Symbol" }, { f: "rate", p: "Rate to BDT" }].map(({ f, p }, i) => (
            <input key={f} style={{ ...inp, flex: i === 1 ? 0.6 : 1 }} value={nc[f]} onChange={e => setNc(n => ({ ...n, [f]: e.target.value }))} placeholder={p} />
          ))}
          <button onClick={addCurr} style={{ background: "linear-gradient(135deg,#0d9488,#06b6d4)", border: "none", borderRadius: 10, padding: "0 16px", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={16} />
          </button>
        </div>
      </Card>

      {/* ── Rule Reference ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: pal.text, marginBottom: 14 }}>Rule Reference</div>
        {RULES.map(r => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${pal.border}` }}>
            <span style={{ padding: "3px 10px", borderRadius: 8, background: "rgba(6,182,212,0.13)", color: "#06b6d4", fontWeight: 700, fontSize: 12, minWidth: 80, textAlign: "center" }}>{r.label}</span>
            <span style={{ fontSize: 13, color: pal.textSub }}>{r.desc}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, padding: 13, background: "rgba(6,182,212,0.05)", borderRadius: 10, fontSize: 12, color: pal.textSub, borderLeft: "3px solid rgba(6,182,212,0.3)", lineHeight: 1.8 }}>
          <strong style={{ color: "#06b6d4" }}>Note 1:</strong> Default is CEO-55 if no rule selected.<br />
          <strong style={{ color: "#06b6d4" }}>Note 2:</strong> If no CEO works, receiving CEO gets the "working" share.
        </div>
      </Card>

      {/* ── Firebase Migration ── */}
      <Card style={{ padding: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: pal.text, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Landmark size={15} color="#06b6d4" /> Firebase Migration
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, lineHeight: 1.9 }}>
          1. <code style={{ background: pal.surfaceElevated, padding: "2px 6px", borderRadius: 4, color: "#06b6d4", fontSize: 11 }}>npm install firebase</code><br />
          2. Create <code style={{ background: pal.surfaceElevated, padding: "2px 6px", borderRadius: 4, color: "#06b6d4", fontSize: 11 }}>src/firebaseConfig.js</code> with your credentials<br />
          3. Open <code style={{ background: pal.surfaceElevated, padding: "2px 6px", borderRadius: 4, color: "#06b6d4", fontSize: 11 }}>src/db.js</code> — uncomment the FIREBASE sections (~10 lines per function)
        </div>
      </Card>
    </div>
  );
}
