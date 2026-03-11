import { useState, useMemo, useCallback } from "react";
import { X, Plus, Link, ExternalLink, ChevronDown, DollarSign } from "lucide-react";
import { CHANNELS, RULES, STATUSES, PAY_ST, PAY_ST_COL, PERSON_TYPES, GEN_ID, TS } from "../constants";
import { usePalette } from "../theme";
import { calcShares } from "../calc";
import { FMT, FMT2 } from "../constants";
import { FormSec, FormGrid, FormField } from "./Shared";

/* ── CalcBreakdown (defined OUTSIDE modal — never recreated) ── */
function CalcBreakdown({ project, currencies }) {
  const pal = usePalette();
  const c = calcShares(project, currencies);
  const curr = currencies.find(x => x.code === project.currency) || { symbol: "?" };
  if (!project.totalBudget || parseFloat(project.totalBudget) <= 0) return null;
  return (
    <div style={{ background: "rgba(6,182,212,0.05)", borderRadius: 14, padding: 16, border: "1px solid rgba(6,182,212,0.18)" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Live Calculation Preview</div>
      {[
        [`${curr.symbol}${FMT2(project.totalBudget)} × ৳${c.rate} rate`, FMT(c.totalBDT), "#94a3b8"],
        [`Tax / Fee (${project.tax || 0}%)`, `–৳${FMT(c.taxAmt)}`, "#ef4444"],
        ["Net Amount", `৳${FMT(c.net)}`, "#10b981"],
        ...(c.wBDT > 0 ? [["Worker Payment", `–৳${FMT(c.wBDT)}`, "#f59e0b"]] : []),
        ["Distributable", `৳${FMT(c.dist)}`, "#06b6d4"],
      ].map(([l, v, color]) => (
        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${pal.border}`, fontSize: 12.5 }}>
          <span style={{ color: pal.textMute }}>{l}</span>
          <span style={{ fontWeight: 700, color }}>{v}</span>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
        {[{ l:"Sumaiya", pct:c.sP, amt:c.sShare, color:"#ec4899" }, { l:"Rakib", pct:c.rP, amt:c.rShare, color:"#3b82f6" }].map(ceo => (
          <div key={ceo.l} style={{ background: ceo.color+"12", border:`1px solid ${ceo.color}30`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:ceo.color, fontWeight:700, marginBottom:4 }}>{ceo.l} ({ceo.pct}%)</div>
            <div style={{ fontSize:20, fontWeight:900, color:pal.text }}>৳{FMT(ceo.amt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── PaymentEntry row (defined OUTSIDE modal) ── */
function PaymentRow({ entry, idx, currencies, onUpdate, onRemove, inp, pal }) {
  const [proofInput, setProofInput] = useState("");
  const set = useCallback((k, v) => onUpdate(idx, { ...entry, [k]: v }), [onUpdate, idx, entry]);
  const addProof = useCallback(() => {
    if (!proofInput.trim()) return;
    set("proofs", [...(entry.proofs||[]), proofInput.trim()]);
    setProofInput("");
  }, [proofInput, entry.proofs, set]);
  const curr = currencies.find(c => c.code === (entry.currency||"BDT")) || { symbol:"৳" };
  const stColor = PAY_ST_COL[entry.status] || "#64748b";

  return (
    <div style={{ background:`${stColor}08`, border:`1px solid ${stColor}22`, borderRadius:14, padding:16, marginBottom:12, position:"relative" }}>
      {/* Status strip */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, borderRadius:"14px 0 0 14px", background:stColor }} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <FormField label="Recipient Name">
          <input style={inp} value={entry.name} onChange={e=>set("name",e.target.value)} placeholder="Name…"/>
        </FormField>
        <FormField label="Type">
          <select style={inp} value={entry.type} onChange={e=>set("type",e.target.value)}>
            {PERSON_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Status">
          <select style={{ ...inp, color: stColor, fontWeight: 700 }} value={entry.status} onChange={e=>set("status",e.target.value)}>
            {PAY_ST.map(s=><option key={s}>{s}</option>)}
          </select>
        </FormField>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <FormField label="Total Owed">
          <input style={inp} type="number" min="0" step="0.01" value={entry.totalOwed} onChange={e=>set("totalOwed",e.target.value)} placeholder="0.00"/>
        </FormField>
        <FormField label="Amount Given">
          <input style={inp} type="number" min="0" step="0.01" value={entry.amountGiven} onChange={e=>set("amountGiven",e.target.value)} placeholder="0.00"/>
        </FormField>
        <FormField label="Currency">
          <select style={inp} value={entry.currency} onChange={e=>set("currency",e.target.value)}>
            {currencies.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </FormField>
        <FormField label="Channel">
          <input style={inp} value={entry.channel} onChange={e=>set("channel",e.target.value)} placeholder="WISE / bKash…"/>
        </FormField>
      </div>

      {/* Mini progress bar */}
      {parseFloat(entry.totalOwed) > 0 && (
        <div style={{ marginBottom:10 }}>
          {(() => {
            const owed = parseFloat(entry.totalOwed)||0;
            const given = parseFloat(entry.amountGiven)||0;
            const pct = owed > 0 ? Math.min(100,(given/owed)*100) : 0;
            return (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:pal.textMute, marginBottom:4 }}>
                  <span>Payment Progress</span>
                  <span style={{ color:stColor, fontWeight:700 }}>{Math.round(pct)}% · {curr.symbol}{FMT2(given)} of {curr.symbol}{FMT2(owed)}</span>
                </div>
                <div style={{ height:5, borderRadius:5, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
                  <div className="pb-fill" style={{ height:"100%", borderRadius:5, width:`${pct}%`, background:`linear-gradient(90deg,${stColor}99,${stColor})`, position:"relative" }}>
                    <div className="pb-shimmer" style={{ position:"absolute", inset:0, borderRadius:5 }} />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <FormField label="Notes">
        <input style={inp} value={entry.notes} onChange={e=>set("notes",e.target.value)} placeholder="Optional context…"/>
      </FormField>

      {/* Proof links */}
      <div style={{ marginTop:10 }}>
        <div style={{ display:"flex", gap:8, marginBottom:6 }}>
          <input style={{...inp, flex:1}} value={proofInput} onChange={e=>setProofInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addProof()} placeholder="Add proof link (screenshot, invoice URL)…"/>
          <button onClick={addProof} style={{ background:"rgba(6,182,212,0.15)", border:"1px solid rgba(6,182,212,0.3)", borderRadius:9, padding:"0 14px", color:"#06b6d4", cursor:"pointer", fontFamily:"inherit" }}>+</button>
        </div>
        {(entry.proofs||[]).map((pf,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 10px", background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.15)", borderRadius:8, marginBottom:5 }}>
            <Link size={11} color="#06b6d4"/>
            <span style={{ flex:1, fontSize:11, color:"#06b6d4", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pf}</span>
            <a href={pf} target="_blank" rel="noreferrer" style={{ lineHeight:0, color:"#06b6d4" }}><ExternalLink size={11}/></a>
            <button onClick={()=>set("proofs",(entry.proofs||[]).filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", padding:2, lineHeight:0 }}><X size={11}/></button>
          </div>
        ))}
      </div>

      {/* Remove entry */}
      <button onClick={()=>onRemove(idx)} style={{ position:"absolute", top:12, right:12, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"4px 8px", color:"#ef4444", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit" }}>Remove</button>
    </div>
  );
}

/* ── Blank template ─────────────────────────────────────── */
const BLANK = {
  name:"", url:"", docUrl:"",
  workerType:"ceo_rakib", workerName:"",
  startDate:"", endDate:"", payDay:"",
  paymentChannel:CHANNELS.sumaiya[0],
  paymentReceiver:"sumaiya",
  rule:"DEFAULT", tax:0,
  currency:"USD", useManual:false, manualRate:"",
  totalBudget:"", workerBudget:"",
  status:"Not Started", invoices:[], notes:"",
  paymentEntries: [],
};

/* ── Static worker options - defined OUTSIDE so they never get recreated ── */
const WORKER_OPTS = [
  { v:"ceo_sumaiya", l:"Sumaiya", color:"#ec4899" },
  { v:"ceo_rakib",   l:"Rakib",   color:"#3b82f6" },
  { v:"external",    l:"External",color:"#10b981" },
  { v:"none",        l:"None",    color:"#64748b" },
];

const RECEIVER_OPTS = [
  { v:"sumaiya", color:"#ec4899" },
  { v:"rakib",   color:"#3b82f6" },
];

const RATE_OPTS = [
  { v:false, l:"Auto" },
  { v:true,  l:"Manual" },
];

/* ── Modal ──────────────────────────────────────────────── */
export default function ProjectModal({ project, currencies, onSave, onClose }) {
  const pal    = usePalette();
  const isEdit = !!project?.id;
  const [form, setForm] = useState(() => project ? { ...BLANK, ...project } : { ...BLANK });
  const [inv,  setInv]  = useState("");
  const [showPaySec, setShowPaySec] = useState(
    () => !!(project?.paymentEntries?.length)
  );

  // Memoize inp so it only changes when palette changes, not on every keystroke
  const inp = useMemo(() => ({
    width:"100%", boxSizing:"border-box",
    background:pal.inpBg, border:`1px solid ${pal.inpBorder}`,
    borderRadius:10, padding:"11px 13px",
    color:pal.text, fontSize:13.5, outline:"none",
    fontFamily:"inherit",
  }), [pal.inpBg, pal.inpBorder, pal.text]);

  const set    = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);
  const addInv = useCallback(() => {
    setInv(cur => {
      if (!cur.trim()) return cur;
      setForm(f => ({ ...f, invoices: [...(f.invoices||[]), cur.trim()] }));
      return "";
    });
  }, []);
  const remInv = useCallback(i => setForm(f => ({ ...f, invoices: f.invoices.filter((_,idx)=>idx!==i) })), []);

  const addPayEntry = useCallback(() => setForm(f => ({
    ...f,
    paymentEntries: [...(f.paymentEntries||[]), {
      id:GEN_ID(), name:"", type:"CEO", status:"Pending",
      totalOwed:"", amountGiven:"", currency:"BDT", channel:"", notes:"", proofs:[],
      createdAt:TS(),
    }],
  })), []);

  const updatePayEntry = useCallback((i, updated) => setForm(f => ({
    ...f,
    paymentEntries: f.paymentEntries.map((e,idx) => idx===i ? updated : e),
  })), []);

  const removePayEntry = useCallback(i => setForm(f => ({
    ...f,
    paymentEntries: f.paymentEntries.filter((_,idx) => idx!==i),
  })), []);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) { alert("Project name required"); return; }
    if (!parseFloat(form.totalBudget)) { alert("Total budget must be > 0"); return; }
    onSave({
      ...form,
      id:           form.id || GEN_ID(),
      totalBudget:  parseFloat(form.totalBudget)  || 0,
      workerBudget: parseFloat(form.workerBudget) || 0,
      tax:          parseFloat(form.tax)          || 0,
      manualRate:   parseFloat(form.manualRate)   || 0,
      invoices:     form.invoices     || [],
      paymentEntries: form.paymentEntries || [],
      createdAt:    form.createdAt || TS(),
      updatedAt:    TS(),
    });
  }, [form, onSave]);

  const pendingCount = useMemo(() =>
    (form.paymentEntries||[]).filter(e=>e.status==="Pending"||e.status==="Partial").length,
    [form.paymentEntries]
  );

  return (
    <div style={{ position:"fixed", inset:0, background:pal.overlay, zIndex:1000, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", overflowY:"auto" }}>
      <div className="modal-enter" style={{ width:"100%", maxWidth:900, background:pal.drawer, borderRadius:24, border:`1px solid ${pal.borderMid}`, boxShadow:pal.shadowLg, marginBottom:24 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"24px 32px", borderBottom:`1px solid ${pal.border}` }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:pal.text }}>{isEdit?"Edit Project":"New Project"}</div>
            <div style={{ fontSize:13, color:pal.textMute, marginTop:3 }}>Fill in project details · Payment tracking is optional</div>
          </div>
          <button onClick={onClose} style={{ width:38, height:38, background:pal.surfaceHigh, border:`1px solid ${pal.border}`, borderRadius:10, color:pal.textMute, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={18}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:"28px 32px" }}>
          <div className="modal-grid">
            {/* LEFT */}
            <div>
              <FormSec title="Project Info">
                <FormField label="Project Name *">
                  <input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Enter project name…"/>
                </FormField>
                <FormGrid cols={2}>
                  <FormField label="Project URL">
                    <input style={inp} value={form.url} onChange={e=>set("url",e.target.value)} placeholder="https://…"/>
                  </FormField>
                  <FormField label="Documentation URL">
                    <input style={inp} value={form.docUrl} onChange={e=>set("docUrl",e.target.value)} placeholder="https://docs…"/>
                  </FormField>
                </FormGrid>
                <FormField label="Status">
                  <select style={inp} value={form.status} onChange={e=>set("status",e.target.value)}>
                    {STATUSES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </FormField>
              </FormSec>

              <FormSec title="Project Worker">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
                  {WORKER_OPTS.map(o=>(
                    <button key={o.v} onClick={()=>set("workerType",o.v)} style={{ padding:"10px 4px", borderRadius:10, border:`2px solid ${form.workerType===o.v?o.color:"rgba(128,128,128,0.2)"}`, background:form.workerType===o.v?o.color+"18":"transparent", color:form.workerType===o.v?o.color:pal.textMute, cursor:"pointer", fontSize:12, fontWeight:700, transition:"all 0.15s" }}>{o.l}</button>
                  ))}
                </div>
                {form.workerType==="external" && (
                  <FormField label="Worker Name">
                    <input style={inp} value={form.workerName} onChange={e=>set("workerName",e.target.value)} placeholder="Freelancer / worker name"/>
                  </FormField>
                )}
              </FormSec>

              <FormSec title="Timeline">
                <FormGrid cols={3}>
                  <FormField label="Start Date"><input style={inp} type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)}/></FormField>
                  <FormField label="Est. End"><input style={inp} type="date" value={form.endDate} onChange={e=>set("endDate",e.target.value)}/></FormField>
                  <FormField label="Pay Day"><input style={inp} type="date" value={form.payDay} onChange={e=>set("payDay",e.target.value)}/></FormField>
                </FormGrid>
              </FormSec>

              <FormSec title="Notes">
                <textarea style={{...inp, height:80, resize:"vertical"}} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Additional notes or context…"/>
              </FormSec>
            </div>

            {/* RIGHT */}
            <div>
              <FormSec title="Payment Details">
                <FormField label="Payment Channel">
                  <select style={inp} value={form.paymentChannel} onChange={e=>set("paymentChannel",e.target.value)}>
                    <optgroup label="── Sumaiya">{CHANNELS.sumaiya.map(c=><option key={c}>{c}</option>)}</optgroup>
                    <optgroup label="── Rakib">{CHANNELS.rakib.map(c=><option key={c}>{c}</option>)}</optgroup>
                  </select>
                </FormField>
                <FormField label="Payment Receiver">
                  <div style={{ display:"flex", gap:8 }}>
                    {RECEIVER_OPTS.map(r=>(
                      <button key={r.v} onClick={()=>set("paymentReceiver",r.v)} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`2px solid ${form.paymentReceiver===r.v?r.color:"rgba(128,128,128,0.2)"}`, background:form.paymentReceiver===r.v?r.color+"18":"transparent", color:form.paymentReceiver===r.v?r.color:pal.textMute, cursor:"pointer", fontSize:13, fontWeight:700, textTransform:"capitalize" }}>{r.v}</button>
                    ))}
                  </div>
                </FormField>
                <FormGrid cols={2}>
                  <FormField label="Rule">
                    <select style={inp} value={form.rule} onChange={e=>set("rule",e.target.value)}>
                      {RULES.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <div style={{ fontSize:11, color:"#06b6d4", marginTop:5 }}>{RULES.find(r=>r.id===form.rule)?.desc}</div>
                  </FormField>
                  <FormField label="Tax / Fee (%)">
                    <input style={inp} type="number" min="0" max="100" step="0.1" value={form.tax} onChange={e=>set("tax",e.target.value)} placeholder="0"/>
                  </FormField>
                </FormGrid>
              </FormSec>

              <FormSec title="Currency & Budget">
                <FormGrid cols={2}>
                  <FormField label="Currency">
                    <select style={inp} value={form.currency} onChange={e=>set("currency",e.target.value)}>
                      {currencies.map(c=><option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                    </select>
                  </FormField>
                  <FormField label="Rate Mode">
                    <div style={{ display:"flex", gap:8 }}>
                      {RATE_OPTS.map(o=>(
                        <button key={o.l} onClick={()=>set("useManual",o.v)} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`1px solid ${form.useManual===o.v?"#06b6d4":"rgba(128,128,128,0.2)"}`, background:form.useManual===o.v?"rgba(6,182,212,0.15)":"transparent", color:form.useManual===o.v?"#06b6d4":pal.textMute, cursor:"pointer", fontSize:12, fontWeight:600 }}>{o.l}</button>
                      ))}
                    </div>
                  </FormField>
                </FormGrid>
                {form.useManual && (
                  <FormField label={`1 ${form.currency} = ? BDT`}>
                    <input style={inp} type="number" value={form.manualRate} onChange={e=>set("manualRate",e.target.value)} placeholder="Enter rate"/>
                  </FormField>
                )}
                <FormGrid cols={2}>
                  <FormField label={`Total Budget (${form.currency}) *`}>
                    <input style={inp} type="number" min="0" step="0.01" value={form.totalBudget} onChange={e=>set("totalBudget",e.target.value)} placeholder="0.00"/>
                  </FormField>
                  {form.workerType!=="none" && (
                    <FormField label={`Worker Budget (${form.currency})`}>
                      <input style={inp} type="number" min="0" step="0.01" value={form.workerBudget} onChange={e=>set("workerBudget",e.target.value)} placeholder="0.00"/>
                    </FormField>
                  )}
                </FormGrid>
                {parseFloat(form.totalBudget)>0 && <CalcBreakdown project={form} currencies={currencies}/>}
              </FormSec>

              <FormSec title="Invoices & Proof">
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <input style={{...inp, flex:1}} value={inv} onChange={e=>setInv(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addInv()} placeholder="Invoice URL / PDF / image link…"/>
                  <button onClick={addInv} style={{ background:"rgba(6,182,212,0.2)", border:"1px solid rgba(6,182,212,0.4)", borderRadius:10, padding:"0 16px", color:"#06b6d4", cursor:"pointer" }}><Plus size={16}/></button>
                </div>
                {(form.invoices||[]).map((iv,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"rgba(6,182,212,0.06)", border:"1px solid rgba(6,182,212,0.15)", borderRadius:9, marginBottom:6 }}>
                    <Link size={12} color="#06b6d4"/>
                    <span style={{ flex:1, fontSize:12, color:pal.textSub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{iv}</span>
                    <a href={iv} target="_blank" rel="noreferrer" style={{ color:"#06b6d4", lineHeight:0 }}><ExternalLink size={12}/></a>
                    <button onClick={()=>remInv(i)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", padding:2, lineHeight:0 }}><X size={12}/></button>
                  </div>
                ))}
              </FormSec>
            </div>
          </div>

          {/* ── OPTIONAL: Payment Tracking Section ── */}
          <div style={{ marginTop:8, borderTop:`1px solid ${pal.border}`, paddingTop:20 }}>
            <button
              onClick={()=>setShowPaySec(s=>!s)}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", background:"transparent", border:"none", cursor:"pointer", padding:0, textAlign:"left" }}
            >
              <div style={{ width:32, height:32, borderRadius:10, background:"rgba(16,185,129,0.13)", border:"1px solid rgba(16,185,129,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <DollarSign size={15} color="#10b981"/>
              </div>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:13, fontWeight:800, color:pal.text }}>Payment Tracker</span>
                <span style={{ fontSize:11, color:pal.textMute, marginLeft:8 }}>
                  {form.paymentEntries?.length
                    ? `${form.paymentEntries.length} entr${form.paymentEntries.length===1?"y":"ies"}${pendingCount?` · ${pendingCount} pending`:""}`
                    : "optional · track who got paid"}
                </span>
              </div>
              {pendingCount>0 && (
                <span style={{ fontSize:10, fontWeight:800, color:"#f59e0b", background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", padding:"2px 8px", borderRadius:6 }}>
                  {pendingCount} PENDING
                </span>
              )}
              <ChevronDown size={16} color={pal.textMute} style={{ transform:showPaySec?"rotate(180deg)":"none", transition:"0.2s" }}/>
            </button>

            {showPaySec && (
              <div style={{ marginTop:18 }}>
                {(form.paymentEntries||[]).map((entry,i)=>(
                  <PaymentRow
                    key={entry.id}
                    entry={entry} idx={i}
                    currencies={currencies}
                    onUpdate={updatePayEntry}
                    onRemove={removePayEntry}
                    inp={inp} pal={pal}
                  />
                ))}
                <button
                  onClick={addPayEntry}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 18px", background:"rgba(16,185,129,0.1)", border:"1px dashed rgba(16,185,129,0.35)", borderRadius:12, color:"#10b981", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit", width:"100%", justifyContent:"center" }}
                >
                  <Plus size={15}/> Add Payment Entry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", gap:12, padding:"20px 32px", borderTop:`1px solid ${pal.border}`, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"12px 24px", borderRadius:12, border:`1px solid ${pal.border}`, background:"transparent", color:pal.textMute, fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding:"12px 32px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#0d9488,#06b6d4)", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 6px 24px rgba(6,182,212,0.35)", letterSpacing:0.4, fontFamily:"inherit" }}>
            {isEdit?"Save Changes":"Add Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
