/**
 * EntityPicker.jsx — Reusable searchable dropdown picker
 *
 * Works for both Clients and Employees (or any list).
 * Mirrors the ClientPicker pattern in InvoiceGen.
 *
 * Place at: src/components/EntityPicker.jsx
 *
 * Usage — Client picker in ProjectForm:
 *   <EntityPicker
 *     label="Client"
 *     items={clients}
 *     selectedId={form.clientId}
 *     onSelect={(c) => {
 *       setForm(f => ({ ...f, clientId: c?.id || "", clientName: c?.name || "" }));
 *     }}
 *     renderItem={(c) => ({ primary: c.name, secondary: [c.email, c.city].filter(Boolean).join(" · "), badge: c.industry })}
 *   />
 *
 * Usage — Employee/recipient picker in Payments:
 *   <EntityPicker
 *     label="Employee / Recipient"
 *     items={employees}
 *     selectedId={form.recipientId}
 *     onSelect={(e) => {
 *       setForm(f => ({ ...f, recipientId: e?.id || "", recipientName: e?.name || "", recipientType: e?.role || "" }));
 *     }}
 *     renderItem={(e) => ({ primary: e.name, secondary: e.role, badge: e.status })}
 *     accentColor="#8b5cf6"
 *   />
 */
import { useState, useMemo } from "react";
import { Users, UserCheck, ChevronDown, X, Search } from "lucide-react";
import { usePalette } from "../theme";

/**
 * @param {object}   props
 * @param {array}    props.items        — array of objects with at least { id, name }
 * @param {string}   props.selectedId   — currently selected item id
 * @param {function} props.onSelect     — (item | null) => void
 * @param {function} props.renderItem   — (item) => { primary, secondary?, badge? }
 * @param {string}   [props.label]      — label shown above picker
 * @param {string}   [props.placeholder]
 * @param {string}   [props.accentColor]
 * @param {string}   [props.searchKeys] — dot-notation keys to search on, default ["name"]
 */
export default function EntityPicker({
  items = [],
  selectedId,
  onSelect,
  renderItem,
  label = "Quick-fill from saved record",
  placeholder = "— Select to auto-fill —",
  accentColor = "#06b6d4",
  searchKeys = ["name"],
}) {
  const pal = usePalette();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  /* ── helpers ── */
  const getVal = (obj, key) => key.split(".").reduce((o, k) => o?.[k], obj) || "";

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const lq = q.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => getVal(item, key).toLowerCase().includes(lq))
    );
  }, [items, q, searchKeys]);

  const selected = items.find((i) => i.id === selectedId) || null;

  /* ── shared styles ── */
  const inp = {
    width: "100%", boxSizing: "border-box",
    background: pal.inpBg, border: `1px solid ${pal.inpBorder}`,
    borderRadius: 10, padding: "7px 10px",
    color: pal.text, fontSize: 12.5, outline: "none", fontFamily: "inherit",
  };

  if (!items.length) return null; // hide if no data yet

  return (
    <div style={{ marginBottom: 14, position: "relative" }}>
      {/* Label */}
      <div style={{
        fontSize: 10, fontWeight: 800, color: accentColor,
        textTransform: "uppercase", letterSpacing: 0.8,
        marginBottom: 6, display: "flex", alignItems: "center", gap: 5,
      }}>
        <Users size={10} /> {label}
      </div>

      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 13px", borderRadius: 10, cursor: "pointer",
          border: `1px solid ${selected ? accentColor + "40" : pal.inpBorder}`,
          background: selected ? accentColor + "0d" : pal.inpBg,
          fontFamily: "inherit", textAlign: "left",
        }}
      >
        <UserCheck size={14} color={selected ? accentColor : pal.textMute} />
        <span style={{
          flex: 1, fontSize: 13.5,
          color: selected ? accentColor : pal.textMute,
          fontWeight: selected ? 700 : 400,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {selected ? selected.name : placeholder}
        </span>
        {selected && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(null); }}
            style={{ background: "transparent", border: "none", cursor: "pointer", lineHeight: 0, color: pal.textMute, padding: 0 }}
          >
            <X size={13} />
          </button>
        )}
        <ChevronDown
          size={13} color={pal.textMute}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.15s", flexShrink: 0 }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          zIndex: 300, background: pal.bgSolid,
          border: `1px solid ${pal.border}`, borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)", overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${pal.border}` }}>
            <div style={{ position: "relative" }}>
              <Search size={12} color={pal.textMute} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                style={{ ...inp, paddingLeft: 28 }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 230, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px", fontSize: 12, color: pal.textMute, textAlign: "center" }}>
                No results
              </div>
            ) : filtered.map((item) => {
              const { primary, secondary, badge } = renderItem(item);
              const isActive = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item); setOpen(false); setQ(""); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", background: isActive ? accentColor + "12" : "transparent",
                    border: "none", borderBottom: `1px solid ${pal.border}`,
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: accentColor + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 900, color: accentColor,
                  }}>
                    {(item.name || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: pal.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {primary}
                    </div>
                    {secondary && (
                      <div style={{ fontSize: 11, color: pal.textMute, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {secondary}
                      </div>
                    )}
                  </div>

                  {/* Badge */}
                  {badge && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                      background: accentColor + "18", color: accentColor, flexShrink: 0,
                    }}>
                      {badge}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}