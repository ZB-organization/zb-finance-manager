/**
 * Clients.jsx — Client Profiles page  (Step 2 + 4)
 *
 * Features:
 *   - Client list with search + industry filter
 *   - Add / Edit / Delete clients
 *   - Full invoice-detail fields (name, contact, email, phone,
 *     address, city, country, taxId, default currency, notes)
 *   - Detail panel: all info + linked projects with revenue stats
 *   - "Create Invoice" shortcut pre-fills InvoiceGen Bill-To
 *
 * Place at:  src/pages/Clients.jsx
 * Props:
 *   clients        {array}    — from App state
 *   projects       {array}    — to show linked projects
 *   currencies     {array}
 *   onSave         {fn}       — (client) => void
 *   onDelete       {fn}       — (id) => void
 *   onCreateInvoice {fn}      — (client) => void  (switches tab + pre-fills)
 */
import { useState, useMemo } from "react";
import {
  Users, Plus, Trash2, Search, X, ChevronRight,
  Mail, Phone, Globe, MapPin, FileText, Building2,
  Briefcase, Tag, Edit2, ExternalLink, CircleDollarSign,
} from "lucide-react";
import { usePalette } from "../theme";
import { Card, FormSec, FormField, FormGrid } from "../components/Shared";
import {
  CLIENT_INDUSTRIES, CLIENT_BLANK, DEF_CURRENCIES,
  GEN_ID, TS, FMT, ST_COL,
} from "../constants";
import { calcShares } from "../calc";

/* ─── helpers ─────────────────────────────────────────────── */
const ACCENT = "#06b6d4";

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
  const colors = ["#06b6d4","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444","#0d9488"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

/* ═══════════════════════════════════════════════════════════
   CLIENT FORM (Add / Edit)
═══════════════════════════════════════════════════════════ */
function ClientForm({ initial, currencies, onSave, onCancel }) {
  const pal = usePalette();
  const inp = useInp();
  const currList = currencies?.length ? currencies : DEF_CURRENCIES;
  const [form, setForm] = useState(initial ? { ...initial } : { ...CLIENT_BLANK });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { alert("Client name is required"); return; }
    onSave({
      ...form,
      id: form.id || GEN_ID(),
      createdAt: form.createdAt || TS(),
      updatedAt: TS(),
    });
  };

  return (
    <div style={{
      background: pal.surfaceElevated, border: `1px solid ${pal.borderMid}`,
      borderRadius: 18, padding: 24, marginBottom: 20,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 800, color: ACCENT,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 18,
      }}>
        {form.id ? "Edit Client" : "New Client"}
      </div>

      {/* Identity */}
      <FormSec title="Identity">
        <FormGrid cols={2}>
          <FormField label="Company / Client Name *">
            <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Acme Corp" />
          </FormField>
          <FormField label="Primary Contact Name">
            <input style={inp} value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Jane Smith" />
          </FormField>
          <FormField label="Industry">
            <select style={inp} value={form.industry} onChange={e => set("industry", e.target.value)}>
              {CLIENT_INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </FormField>
          <FormField label="Default Invoice Currency">
            <select style={inp} value={form.currency} onChange={e => set("currency", e.target.value)}>
              {currList.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
          </FormField>
        </FormGrid>
      </FormSec>

      {/* Contact info */}
      <FormSec title="Contact & Invoice Details">
        <FormGrid cols={2}>
          <FormField label="Email">
            <input style={inp} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@company.com" />
          </FormField>
          <FormField label="Phone">
            <input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
          </FormField>
          <FormField label="Website">
            <input style={inp} value={form.website||""} onChange={e => set("website", e.target.value)} placeholder="https://..." />
          </FormField>
          <FormField label="Tax ID / VAT Number">
            <input style={inp} value={form.taxId} onChange={e => set("taxId", e.target.value)} placeholder="For invoice header" />
          </FormField>
        </FormGrid>

        <FormField label="Street Address">
          <input style={inp} value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St, Suite 4" />
        </FormField>
        <FormGrid cols={2}>
          <FormField label="City">
            <input style={inp} value={form.city} onChange={e => set("city", e.target.value)} placeholder="New York" />
          </FormField>
          <FormField label="Country">
            <input style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="USA" />
          </FormField>
        </FormGrid>
      </FormSec>

      <FormSec title="Notes">
        <textarea
          style={{ ...inp, height: 72, resize: "vertical" }}
          value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Payment terms, preferences, context…"
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
          background: `linear-gradient(135deg,${ACCENT},#0891b2)`,
          color: "#fff", fontWeight: 800, fontSize: 13,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 6px 20px rgba(6,182,212,0.35)",
        }}>
          {form.id ? "Save Changes" : "Add Client"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLIENT DETAIL PANEL (Step 4 — linked projects)
═══════════════════════════════════════════════════════════ */
function ClientDetail({ client, projects, currencies, onEdit, onDelete, onCreateInvoice }) {
  const pal = usePalette();
  const color = avatarColor(client.name);

  // Linked projects: exact clientId match OR name match (legacy)
  const linked = useMemo(() => {
    const nameLower = client.name.toLowerCase();
    return (projects || []).filter(p =>
      p.clientId === client.id ||
      (p.clientName || "").toLowerCase() === nameLower
    );
  }, [projects, client]);

  // Revenue stats from linked projects
  const stats = useMemo(() => {
    let totalBDT = 0, netBDT = 0;
    linked.forEach(p => {
      const s = calcShares(p, currencies);
      totalBDT += s.totalBDT || 0;
      netBDT   += s.net      || 0;
    });
    return { totalBDT, netBDT };
  }, [linked, currencies]);

  const fullAddress = [client.address, client.city, client.country].filter(Boolean).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>

      {/* ── Header ── */}
      <div style={{
        padding: "22px 24px 18px",
        background: `linear-gradient(135deg,${color}18,${color}08)`,
        borderBottom: `1px solid ${pal.border}`,
        borderRadius: "16px 16px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: color, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff",
          }}>
            {initials(client.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: pal.text }}>{client.name}</div>
            {client.contactName && (
              <div style={{ fontSize: 12, color: pal.textMute, marginTop: 2 }}>
                Contact: <strong style={{ color: pal.text }}>{client.contactName}</strong>
              </div>
            )}
            <div style={{
              marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 8,
              background: color + "20", color, fontSize: 11, fontWeight: 700,
            }}>
              <Tag size={10} />{client.industry}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
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

        {/* Quick-action */}
        <button onClick={() => onCreateInvoice(client)} style={{
          marginTop: 14, width: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 7, padding: "10px 0",
          borderRadius: 10, border: "none",
          background: `linear-gradient(135deg,${ACCENT},#0891b2)`,
          color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 16px rgba(6,182,212,0.3)",
        }}>
          <FileText size={14} /> Create Invoice for {client.name.split(" ")[0]}
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>

        {/* Contact info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Contact</div>
          {[
            [Mail, client.email, client.email ? `mailto:${client.email}` : null],
            [Phone, client.phone, null],
            [Globe, client.website, client.website],
            [MapPin, fullAddress, null],
          ].filter(([,v]) => v).map(([Icon, value, href], i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <Icon size={13} color={ACCENT} style={{ marginTop: 2, flexShrink: 0 }} />
              {href
                ? <a href={href} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: ACCENT, textDecoration: "none" }}>{value}</a>
                : <span style={{ fontSize: 12.5, color: pal.text }}>{value}</span>
              }
            </div>
          ))}
        </div>

        {/* Invoice details */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Invoice Details</div>
          {[
            ["Default Currency", client.currency],
            ["Tax ID / VAT", client.taxId],
          ].filter(([,v]) => v).map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${pal.border}` }}>
              <span style={{ fontSize: 12, color: pal.textMute }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: pal.text }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {client.notes && (
          <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 10, background: pal.surfaceElevated, border: `1px solid ${pal.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: pal.textMute, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 12, color: pal.text, lineHeight: 1.6 }}>{client.notes}</div>
          </div>
        )}

        {/* ── Linked projects (Step 4) ── */}
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

          {linked.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                ["Total Revenue", "৳" + FMT(stats.totalBDT), ACCENT],
                ["Net Revenue",   "৳" + FMT(stats.netBDT),   "#10b981"],
              ].map(([l, v, c]) => (
                <div key={l} style={{ padding: "10px 12px", borderRadius: 10, background: c + "0e", border: `1px solid ${c}22`, textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: c, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {linked.length === 0 ? (
            <div style={{ padding: "18px 14px", textAlign: "center", color: pal.textFaint, fontSize: 12, borderRadius: 10, border: `1px dashed ${pal.border}` }}>
              No projects linked yet.<br />
              <span style={{ fontSize: 11, color: pal.textMute }}>Projects link automatically when their<br />Client Name matches this client.</span>
            </div>
          ) : (
            linked.map(p => {
              const s = calcShares(p, currencies);
              const statusColor = ST_COL[p.status] || "#64748b";
              return (
                <div key={p.id} style={{
                  marginBottom: 8, padding: "11px 14px", borderRadius: 12,
                  background: pal.surfaceElevated, border: `1px solid ${pal.border}`,
                  borderLeft: `3px solid ${statusColor}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}>
                        {p.paymentChannel || "—"} · {p.currency} {p.totalBudget?.toLocaleString() || "0"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                        background: statusColor + "22", color: statusColor,
                        marginBottom: 4,
                      }}>{p.status}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>৳{FMT(s.totalBDT)}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CLIENT CARD (list item)
═══════════════════════════════════════════════════════════ */
function ClientCard({ client, active, onClick }) {
  const pal = usePalette();
  const color = avatarColor(client.name);
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", padding: "13px 16px",
      borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${active ? ACCENT + "40" : pal.border}`,
      background: active ? ACCENT + "0c" : pal.surfaceElevated,
      display: "flex", alignItems: "center", gap: 12,
      transition: "all 0.12s",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11, flexShrink: 0,
        background: color, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff",
      }}>
        {initials(client.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? ACCENT : pal.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {client.name}
        </div>
        <div style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}>
          {client.industry}
          {client.city ? ` · ${client.city}` : ""}
        </div>
      </div>
      <ChevronRight size={14} color={active ? ACCENT : pal.textFaint} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Clients({ clients = [], projects = [], currencies = [], onSave, onDelete, onCreateInvoice }) {
  const pal = usePalette();
  const [search, setSearch]       = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [selected, setSelected]   = useState(null);  // client id
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);

  const currList = currencies?.length ? currencies : DEF_CURRENCIES;

  /* filter */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c => {
      if (industryFilter !== "All" && c.industry !== industryFilter) return false;
      if (q && !(
        c.name.toLowerCase().includes(q) ||
        (c.contactName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [clients, search, industryFilter]);

  const selectedClient = clients.find(c => c.id === selected) || null;

  const handleSave = (client) => {
    onSave(client);
    setShowForm(false);
    setEditing(null);
    setSelected(client.id);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this client? This cannot be undone.")) return;
    onDelete(id);
    if (selected === id) setSelected(null);
  };

  const usedIndustries = useMemo(() => {
    const set = new Set(clients.map(c => c.industry).filter(Boolean));
    return ["All", ...CLIENT_INDUSTRIES.filter(i => set.has(i))];
  }, [clients]);

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: pal.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={20} color={ACCENT} /> Clients
          </h2>
          <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
            {clients.length} client{clients.length !== 1 ? "s" : ""} · invoice-ready profiles · project cross-reference
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); setSelected(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
            borderRadius: 11, border: "none",
            background: `linear-gradient(135deg,${ACCENT},#0891b2)`,
            color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", boxShadow: "0 4px 16px rgba(6,182,212,0.35)",
          }}
        >
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* ── Add / Edit form ── */}
      {(showForm || editing) && (
        <ClientForm
          initial={editing}
          currencies={currList}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* ── Search + industry filter ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} color={pal.textMute} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients…"
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
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {usedIndustries.map(ind => {
            const active = industryFilter === ind;
            return (
              <button key={ind} onClick={() => setIndustryFilter(ind)} style={{
                padding: "7px 12px", borderRadius: 9, fontFamily: "inherit",
                border: `1px solid ${active ? ACCENT : "rgba(128,128,128,0.2)"}`,
                background: active ? ACCENT + "18" : "transparent",
                color: active ? ACCENT : pal.textMute,
                cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
              }}>{ind}</button>
            );
          })}
        </div>
      </div>

      {/* ── Two-pane: list + detail ── */}
      {clients.length === 0 && !showForm ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: pal.textFaint }}>
          <Users size={52} strokeWidth={1} style={{ margin: "0 auto 14px", display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No clients yet</div>
          <div style={{ fontSize: 13 }}>Click "Add Client" to create your first client profile.</div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: selectedClient ? "320px 1fr" : "1fr",
          gap: 16, alignItems: "start",
        }}>
          {/* LIST */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: pal.textMute, fontSize: 13, borderRadius: 12, border: `1px solid ${pal.border}` }}>
                No clients match your search.
              </div>
            ) : filtered.map(c => (
              <ClientCard
                key={c.id}
                client={c}
                active={selected === c.id}
                onClick={() => setSelected(selected === c.id ? null : c.id)}
              />
            ))}
          </div>

          {/* DETAIL PANEL */}
          {selectedClient && (
            <Card style={{ padding: 0, overflow: "hidden", borderRadius: 16, position: "sticky", top: 20, maxHeight: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
              <ClientDetail
                client={selectedClient}
                projects={projects}
                currencies={currList}
                onEdit={() => {
                  setEditing(selectedClient);
                  setShowForm(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={() => handleDelete(selectedClient.id)}
                onCreateInvoice={onCreateInvoice}
              />
            </Card>
          )}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && clients.length > 0 && (
        <div style={{ textAlign: "right", fontSize: 11, color: pal.textMute, marginTop: 14 }}>
          Showing {filtered.length} of {clients.length} clients
        </div>
      )}
    </div>
  );
}
