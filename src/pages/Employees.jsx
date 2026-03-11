/**
 * Employees.jsx — Employee Profiles page  (Steps 2 + 3 + 4)
 *
 * Features:
 *   - Employee list with search + role + status filters
 *   - Add / Edit / Delete employees
 *   - Photo upload (base64 portrait)
 *   - All detail fields: role, status, email, phone, address,
 *     start/end date, hired-by, default rate & currency, notes
 *   - Payment channels editor (add label + details per channel)
 *   - Detail panel:
 *       → Contact & work info
 *       → Payment channels list
 *       → Linked projects (matched via workerName or employeeId)
 *       → Earnings stats from linked projects
 *
 * Place at:  src/pages/Employees.jsx
 *
 * Props:
 *   employees    {array}   — from App state
 *   projects     {array}   — to cross-reference
 *   currencies   {array}
 *   onSave       {fn}      — (employee) => void
 *   onDelete     {fn}      — (id) => void
 */
import { useState, useMemo } from "react";
import {
  Users, Plus, Trash2, Search, X, ChevronRight,
  Mail, Phone, MapPin, Edit2, Upload, Briefcase,
  Calendar, DollarSign, CreditCard, Tag, Star,
  CheckCircle, Clock, UserX, GraduationCap, Layers,
} from "lucide-react";
import { usePalette } from "../theme";
import { Card, FormSec, FormField, FormGrid } from "../components/Shared";
import {
  EMPLOYEE_ROLES, EMPLOYEE_STATUSES, EMPLOYEE_STATUS_COL,
  EMPLOYEE_BLANK, DEF_CURRENCIES, GEN_ID, TS, FMT, ST_COL,
} from "../constants";
import { calcShares } from "../calc";

/* ─── constants ─────────────────────────────────────────── */
const ACCENT = "#a855f7";   // purple — matches sidebar

const HIRED_BY_OPTS = ["Both", "Sumaiya", "Rakib"];

const STATUS_ICONS = {
  Active:     CheckCircle,
  "On Leave": Clock,
  Inactive:   UserX,
  Alumni:     GraduationCap,
};

/* ─── helpers ─────────────────────────────────────────────── */
function useInp() {
  const pal = usePalette();
  return useMemo(() => ({
    width: "100%", boxSizing: "border-box",
    background: pal.inpBg, border: `1px solid ${pal.inpBorder}`,
    borderRadius: 10, padding: "10px 13px",
    color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit",
  }), [pal.inpBg, pal.inpBorder, pal.text]);
}

function initials(name = "") {
  return name.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function avatarColor(name = "") {
  const colors = [ACCENT, "#06b6d4", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#ef4444", "#0d9488"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function StatusPill({ status }) {
  const color = EMPLOYEE_STATUS_COL[status] || "#64748b";
  const Icon  = STATUS_ICONS[status] || Tag;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20,
      background: color + "18", color, fontSize: 11, fontWeight: 700,
    }}>
      <Icon size={10} />{status}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAYMENT CHANNELS EDITOR
═══════════════════════════════════════════════════════════ */
function ChannelsEditor({ channels, onChange }) {
  const pal = usePalette();
  const inp = useInp();
  const [label,   setLabel]   = useState("");
  const [details, setDetails] = useState("");

  const add = () => {
    if (!label.trim()) return;
    onChange([...channels, { id: GEN_ID(), label: label.trim(), details: details.trim() }]);
    setLabel(""); setDetails("");
  };

  const remove = (id) => onChange(channels.filter(c => c.id !== id));

  return (
    <div>
      {/* Existing channels */}
      {channels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {channels.map(ch => (
            <div key={ch.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 13px", borderRadius: 10,
              background: ACCENT + "0c", border: `1px solid ${ACCENT}22`,
            }}>
              <CreditCard size={13} color={ACCENT} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: pal.text }}>{ch.label}</div>
                {ch.details && <div style={{ fontSize: 11, color: pal.textMute, marginTop: 1 }}>{ch.details}</div>}
              </div>
              <button onClick={() => remove(ch.id)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "#ef4444", lineHeight: 0, padding: 4,
              }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <FormField label="Channel Label">
          <input
            style={inp} value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. WISE, bKash…"
            onKeyDown={e => e.key === "Enter" && add()}
          />
        </FormField>
        <FormField label="Account / Details">
          <input
            style={inp} value={details} onChange={e => setDetails(e.target.value)}
            placeholder="e.g. email or number"
            onKeyDown={e => e.key === "Enter" && add()}
          />
        </FormField>
        <button onClick={add} style={{
          padding: "10px 14px", borderRadius: 10, border: "none",
          background: ACCENT, color: "#fff", cursor: "pointer",
          fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center",
          gap: 5, marginBottom: 1, fontFamily: "inherit",
        }}>
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE FORM  (Add / Edit)
═══════════════════════════════════════════════════════════ */
function EmployeeForm({ initial, currencies, onSave, onCancel }) {
  const pal = usePalette();
  const inp = useInp();
  const currList = currencies?.length ? currencies : DEF_CURRENCIES;
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPLOYEE_BLANK });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set("photo", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name.trim()) { alert("Name is required"); return; }
    onSave({
      ...form,
      id:        form.id || GEN_ID(),
      createdAt: form.createdAt || TS(),
      updatedAt: TS(),
    });
  };

  const color = avatarColor(form.name);

  return (
    <div style={{
      background: pal.surfaceElevated, border: `1px solid ${pal.borderMid}`,
      borderRadius: 18, padding: 24, marginBottom: 20,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 800, color: ACCENT,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 18,
      }}>
        {form.id ? "Edit Employee" : "New Employee"}
      </div>

      {/* ── Photo + Identity row ── */}
      <FormSec title="Identity">
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
          {/* Photo upload */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20, overflow: "hidden",
              background: form.photo ? "transparent" : color + "22",
              border: `2px dashed ${form.photo ? "transparent" : pal.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {form.photo
                ? <img src={form.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="photo" />
                : <span style={{ fontSize: 26, fontWeight: 900, color }}>{initials(form.name) || "?"}</span>
              }
            </div>
            <label style={{
              display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
              borderRadius: 8, background: ACCENT + "18", color: ACCENT,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
              <Upload size={10} /> {form.photo ? "Change" : "Upload"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
            </label>
            {form.photo && (
              <button onClick={() => set("photo", "")} style={{
                fontSize: 10, color: "#ef4444", background: "transparent",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}>Remove</button>
            )}
          </div>

          {/* Name + role + status */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <FormGrid cols={2}>
              <FormField label="Full Name *">
                <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Smith" />
              </FormField>
              <FormField label="Role">
                <select style={inp} value={form.role} onChange={e => set("role", e.target.value)}>
                  {EMPLOYEE_ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select style={inp} value={form.status} onChange={e => set("status", e.target.value)}>
                  {EMPLOYEE_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Hired By">
                <select style={inp} value={form.hiredBy} onChange={e => set("hiredBy", e.target.value)}>
                  {HIRED_BY_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </FormField>
            </FormGrid>
          </div>
        </div>
      </FormSec>

      {/* ── Contact ── */}
      <FormSec title="Contact">
        <FormGrid cols={2}>
          <FormField label="Email">
            <input style={inp} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@email.com" />
          </FormField>
          <FormField label="Phone">
            <input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+880 …" />
          </FormField>
          <FormField label="City">
            <input style={inp} value={form.city} onChange={e => set("city", e.target.value)} placeholder="Dhaka" />
          </FormField>
          <FormField label="Country">
            <input style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="Bangladesh" />
          </FormField>
        </FormGrid>
        <FormField label="Address">
          <input style={inp} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street address" />
        </FormField>
      </FormSec>

      {/* ── Work details ── */}
      <FormSec title="Work Details">
        <FormGrid cols={2}>
          <FormField label="Start Date">
            <input style={inp} type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
          </FormField>
          <FormField label="End Date">
            <input style={inp} type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} />
          </FormField>
          <FormField label="Default Rate">
            <input style={inp} type="number" min="0" value={form.defaultRate} onChange={e => set("defaultRate", e.target.value)} placeholder="0.00" />
          </FormField>
          <FormField label="Rate Currency">
            <select style={inp} value={form.defaultCurrency} onChange={e => set("defaultCurrency", e.target.value)}>
              {currList.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
          </FormField>
        </FormGrid>
      </FormSec>

      {/* ── Payment channels ── */}
      <FormSec title="Payment Channels">
        <ChannelsEditor
          channels={form.paymentChannels || []}
          onChange={v => set("paymentChannels", v)}
        />
      </FormSec>

      {/* ── Notes ── */}
      <FormSec title="Notes">
        <textarea
          style={{ ...inp, height: 72, resize: "vertical" }}
          value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Skills, contract terms, any relevant context…"
        />
      </FormSec>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          padding: "10px 22px", borderRadius: 11, border: `1px solid ${pal.border}`,
          background: "transparent", color: pal.textMute,
          fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
        }}>Cancel</button>
        <button onClick={handleSave} style={{
          padding: "10px 26px", borderRadius: 11, border: "none",
          background: `linear-gradient(135deg,${ACCENT},#9333ea)`,
          color: "#fff", fontWeight: 800, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: `0 6px 20px ${ACCENT}40`,
        }}>
          {form.id ? "Save Changes" : "Add Employee"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE DETAIL PANEL  (Steps 3 + 4)
═══════════════════════════════════════════════════════════ */
function EmployeeDetail({ employee, projects, currencies, onEdit, onDelete }) {
  const pal   = usePalette();
  const color = avatarColor(employee.name);
  const currList = currencies?.length ? currencies : DEF_CURRENCIES;

  // Cross-reference: match by workerName (case-insensitive) OR employeeId
  const linked = useMemo(() => {
    const nameLower = employee.name.toLowerCase();
    return (projects || []).filter(p =>
      p.employeeId === employee.id ||
      (p.workerType === "external" && (p.workerName || "").toLowerCase() === nameLower)
    );
  }, [projects, employee]);

  // Earnings from linked projects
  const earnings = useMemo(() => {
    let totalPaidBDT = 0, projectCount = linked.length;
    linked.forEach(p => {
      const rate = currList.find(c => c.code === p.currency)?.rate || 1;
      totalPaidBDT += (parseFloat(p.workerBudget) || 0) * rate;
    });
    return { totalPaidBDT, projectCount };
  }, [linked, currList]);

  const statusColor = EMPLOYEE_STATUS_COL[employee.status] || "#64748b";
  const fullAddress = [employee.address, employee.city, employee.country].filter(Boolean).join(", ");

  // Default rate formatted
  const rateCurr  = currList.find(c => c.code === employee.defaultCurrency) || {};
  const rateLabel = employee.defaultRate
    ? `${rateCurr.symbol || ""}${Number(employee.defaultRate).toLocaleString()} ${employee.defaultCurrency || ""} / project`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "22px 24px 16px",
        background: `linear-gradient(135deg,${ACCENT}18,${ACCENT}06)`,
        borderBottom: `1px solid ${pal.border}`,
        borderRadius: "16px 16px 0 0",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Avatar / photo */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            overflow: "hidden",
            background: employee.photo ? "transparent" : color + "22",
            border: `2px solid ${employee.photo ? color + "50" : pal.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {employee.photo
              ? <img src={employee.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={employee.name} />
              : <span style={{ fontSize: 20, fontWeight: 900, color }}>{initials(employee.name)}</span>
            }
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: pal.text }}>{employee.name}</div>
            <div style={{ fontSize: 12, color: pal.textMute, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                padding: "2px 8px", borderRadius: 7,
                background: ACCENT + "18", color: ACCENT, fontSize: 11, fontWeight: 700,
              }}>{employee.role}</span>
              <StatusPill status={employee.status} />
            </div>
            {employee.hiredBy && employee.hiredBy !== "Both" && (
              <div style={{ fontSize: 11, color: pal.textMute, marginTop: 4 }}>
                Hired by <strong style={{ color: employee.hiredBy === "Sumaiya" ? "#ec4899" : "#3b82f6" }}>{employee.hiredBy}</strong>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onEdit} title="Edit" style={{
              padding: "7px 10px", borderRadius: 8, border: `1px solid ${pal.border}`,
              background: pal.surfaceElevated, color: pal.textMute, cursor: "pointer", lineHeight: 0,
            }}><Edit2 size={13} /></button>
            <button onClick={onDelete} title="Delete" style={{
              padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", lineHeight: 0,
            }}><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>

        {/* Earnings summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            ["Projects", earnings.projectCount, ACCENT, Layers],
            ["Paid (BDT)", "৳" + FMT(earnings.totalPaidBDT), "#10b981", DollarSign],
          ].map(([l, v, c, Icon]) => (
            <div key={l} style={{
              padding: "11px 14px", borderRadius: 12,
              background: c + "0e", border: `1px solid ${c}22`, textAlign: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 4 }}>
                <Icon size={11} color={c} />
                <div style={{ fontSize: 9, fontWeight: 800, color: c, textTransform: "uppercase", letterSpacing: 0.8 }}>{l}</div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Contact</div>
          {[
            [Mail,    employee.email,   employee.email ? `mailto:${employee.email}` : null],
            [Phone,   employee.phone,   null],
            [MapPin,  fullAddress,      null],
          ].filter(([, v]) => v).map(([Icon, value, href], i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 7 }}>
              <Icon size={13} color={ACCENT} style={{ marginTop: 1, flexShrink: 0 }} />
              {href
                ? <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: ACCENT, textDecoration: "none" }}>{value}</a>
                : <span style={{ fontSize: 12.5, color: pal.text }}>{value}</span>}
            </div>
          ))}
        </div>

        {/* Work details */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Work Details</div>
          {[
            ["Start Date",    employee.startDate],
            ["End Date",      employee.endDate || (employee.status === "Active" ? "Present" : "—")],
            ["Default Rate",  rateLabel],
            ["Hired By",      employee.hiredBy],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${pal.border}` }}>
              <span style={{ fontSize: 12, color: pal.textMute }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pal.text }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Payment channels */}
        {(employee.paymentChannels || []).length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Payment Channels</div>
            {employee.paymentChannels.map(ch => (
              <div key={ch.id} style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 12px", borderRadius: 10, marginBottom: 6,
                background: ACCENT + "0c", border: `1px solid ${ACCENT}20`,
              }}>
                <CreditCard size={12} color={ACCENT} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: pal.text }}>{ch.label}</div>
                  {ch.details && <div style={{ fontSize: 11, color: pal.textMute }}>{ch.details}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {employee.notes && (
          <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 10, background: pal.surfaceElevated, border: `1px solid ${pal.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 12, color: pal.text, lineHeight: 1.65 }}>{employee.notes}</div>
          </div>
        )}

        {/* ── Linked projects (Step 3) ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1 }}>
              Linked Projects
            </div>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
              background: ACCENT + "18", color: ACCENT,
            }}>{linked.length}</span>
          </div>

          {linked.length === 0 ? (
            <div style={{
              padding: "18px 14px", textAlign: "center",
              color: pal.textFaint, fontSize: 12,
              borderRadius: 10, border: `1px dashed ${pal.border}`,
            }}>
              No projects linked yet.<br />
              <span style={{ fontSize: 11, color: pal.textMute }}>
                Projects link automatically when their<br />
                <strong>Worker Name</strong> matches this employee.
              </span>
            </div>
          ) : (
            linked.map(p => {
              const rateCurr = currList.find(c => c.code === p.currency) || {};
              const workerPay = parseFloat(p.workerBudget) || 0;
              const workerBDT = workerPay * (rateCurr.rate || 1);
              const statusColor = ST_COL[p.status] || "#64748b";
              return (
                <div key={p.id} style={{
                  marginBottom: 8, padding: "11px 14px",
                  borderRadius: 12, background: pal.surfaceElevated,
                  border: `1px solid ${pal.border}`,
                  borderLeft: `3px solid ${statusColor}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pal.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}>
                        {p.paymentChannel || "—"} · {p.payDay || p.createdAt?.slice(0, 10) || "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                        background: statusColor + "22", color: statusColor, marginBottom: 4,
                      }}>{p.status}</div>
                      {workerPay > 0 && (
                        <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>
                          {rateCurr.symbol || ""}{workerPay.toLocaleString()}
                          {workerBDT > 0 && workerBDT !== workerPay && (
                            <div style={{ fontSize: 10, color: pal.textMute, fontWeight: 500 }}>৳{FMT(workerBDT)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>{/* end scrollable body */}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE CARD  (list item)
═══════════════════════════════════════════════════════════ */
function EmployeeCard({ employee, active, onClick }) {
  const pal   = usePalette();
  const color = avatarColor(employee.name);
  const statusColor = EMPLOYEE_STATUS_COL[employee.status] || "#64748b";

  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "12px 16px",
      borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${active ? ACCENT + "40" : pal.border}`,
      background: active ? ACCENT + "0c" : pal.surfaceElevated,
      display: "flex", alignItems: "center", gap: 12,
      transition: "all 0.12s",
    }}>
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        overflow: "hidden",
        background: employee.photo ? "transparent" : color + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: employee.photo ? `2px solid ${color}40` : "none",
      }}>
        {employee.photo
          ? <img src={employee.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt={employee.name} />
          : <span style={{ fontSize: 14, fontWeight: 900, color }}>{initials(employee.name)}</span>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700,
          color: active ? ACCENT : pal.text,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {employee.name}
        </div>
        <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
          <span>{employee.role}</span>
          <span style={{
            display: "inline-block", width: 5, height: 5,
            borderRadius: "50%", background: statusColor, flexShrink: 0,
          }} />
          <span style={{ color: statusColor }}>{employee.status}</span>
        </div>
      </div>

      <ChevronRight size={14} color={active ? ACCENT : pal.textFaint} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Employees({ employees = [], projects = [], currencies = [], onSave, onDelete }) {
  const pal = usePalette();
  const [search,        setSearch]        = useState("");
  const [roleFilter,    setRoleFilter]    = useState("All");
  const [statusFilter,  setStatusFilter]  = useState("All");
  const [selected,      setSelected]      = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [editing,       setEditing]       = useState(null);

  const currList = currencies?.length ? currencies : DEF_CURRENCIES;

  /* ── filter ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => {
      if (roleFilter   !== "All" && e.role   !== roleFilter)   return false;
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      if (q && !(
        e.name.toLowerCase().includes(q) ||
        (e.email  || "").toLowerCase().includes(q) ||
        (e.city   || "").toLowerCase().includes(q) ||
        (e.role   || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [employees, search, roleFilter, statusFilter]);

  const selectedEmployee = employees.find(e => e.id === selected) || null;

  /* ── unique roles that are actually used ── */
  const usedRoles = useMemo(() => {
    const set = new Set(employees.map(e => e.role).filter(Boolean));
    return ["All", ...EMPLOYEE_ROLES.filter(r => set.has(r))];
  }, [employees]);

  const handleSave = (emp) => {
    onSave(emp);
    setShowForm(false);
    setEditing(null);
    setSelected(emp.id);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this employee profile? This cannot be undone.")) return;
    onDelete(id);
    if (selected === id) setSelected(null);
  };

  // Stat counters for the header
  const activeCount = employees.filter(e => e.status === "Active").length;

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: pal.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={20} color={ACCENT} /> Employees
          </h2>
          <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
            {employees.length} profile{employees.length !== 1 ? "s" : ""}
            {activeCount > 0 && ` · ${activeCount} active`}
            {" · "}photo, contact, channels &amp; linked projects
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); setSelected(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
            borderRadius: 11, border: "none",
            background: `linear-gradient(135deg,${ACCENT},#9333ea)`,
            color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", boxShadow: `0 4px 16px ${ACCENT}40`,
          }}
        >
          <Plus size={15} /> Add Employee
        </button>
      </div>

      {/* ── Add / Edit form ── */}
      {(showForm || editing) && (
        <EmployeeForm
          initial={editing}
          currencies={currList}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* ── Search + filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} color={pal.textMute} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…"
            style={{
              width: "100%", boxSizing: "border-box",
              background: pal.inpBg, border: `1px solid ${pal.inpBorder}`,
              borderRadius: 10, padding: "9px 32px 9px 33px",
              color: pal.text, fontSize: 13, outline: "none", fontFamily: "inherit",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", lineHeight: 0, color: pal.textMute }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 5 }}>
          {["All", ...EMPLOYEE_STATUSES].map(s => {
            const active = statusFilter === s;
            const c = s === "All" ? ACCENT : (EMPLOYEE_STATUS_COL[s] || "#64748b");
            return (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: "7px 12px", borderRadius: 9, fontFamily: "inherit",
                border: `1px solid ${active ? c : "rgba(128,128,128,0.2)"}`,
                background: active ? c + "18" : "transparent",
                color: active ? c : pal.textMute,
                cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
              }}>{s}</button>
            );
          })}
        </div>

        {/* Role filter */}
        {usedRoles.length > 2 && (
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            style={{
              background: pal.inpBg, border: `1px solid ${pal.inpBorder}`,
              borderRadius: 9, padding: "7px 12px",
              color: pal.text, fontSize: 11, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            {usedRoles.map(r => <option key={r}>{r}</option>)}
          </select>
        )}
      </div>

      {/* ── Empty state ── */}
      {employees.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: pal.textFaint }}>
          <Users size={52} strokeWidth={1} style={{ margin: "0 auto 14px", display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No employees yet</div>
          <div style={{ fontSize: 13 }}>Click "Add Employee" to create your first profile.</div>
        </div>
      ) : (
        /* ── Two-pane: list + detail ── */
        <div style={{
          display: "grid",
          gridTemplateColumns: selectedEmployee ? "300px 1fr" : "1fr",
          gap: 16, alignItems: "start",
        }}>
          {/* LIST */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: pal.textMute, fontSize: 13, borderRadius: 12, border: `1px solid ${pal.border}` }}>
                No employees match your filters.
              </div>
            ) : filtered.map(e => (
              <EmployeeCard
                key={e.id}
                employee={e}
                active={selected === e.id}
                onClick={() => setSelected(selected === e.id ? null : e.id)}
              />
            ))}
          </div>

          {/* DETAIL PANEL */}
          {selectedEmployee && (
            <Card style={{
              padding: 0, overflow: "hidden", borderRadius: 16,
              position: "sticky", top: 20,
              maxHeight: "calc(100vh - 120px)",
              display: "flex", flexDirection: "column",
            }}>
              <EmployeeDetail
                employee={selectedEmployee}
                projects={projects}
                currencies={currList}
                onEdit={() => {
                  setEditing(selectedEmployee);
                  setShowForm(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={() => handleDelete(selectedEmployee.id)}
              />
            </Card>
          )}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && employees.length > 0 && (
        <div style={{ textAlign: "right", fontSize: 11, color: pal.textMute, marginTop: 14 }}>
          Showing {filtered.length} of {employees.length} employees
        </div>
      )}
    </div>
  );
}