/**
 * ChangelogModal — floating modal listing all app version history.
 */
import { X, CheckCircle } from "lucide-react";
import { usePalette } from "../theme";
import { CHANGELOG } from "../constants";

export default function ChangelogModal({ onClose }) {
  const pal = usePalette();
  return (
    <div style={{ position: "fixed", inset: 0, background: pal.overlay, backdropFilter: "blur(12px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 520, maxWidth: "100%", maxHeight: "80vh", overflow: "auto", background: pal.drawer, borderRadius: 20, border: `1px solid ${pal.borderMid}`, padding: 28, boxShadow: pal.shadowLg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: pal.text }}>Changelog</div>
          <button onClick={onClose} style={{ background: pal.surfaceElevated, border: "none", borderRadius: 8, padding: 8, color: pal.textMute, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        {CHANGELOG.map(e => (
          <div key={e.v} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#06b6d4", background: "rgba(6,182,212,0.13)", padding: "4px 12px", borderRadius: 8 }}>v{e.v}</span>
              <span style={{ fontSize: 12, color: pal.textMute }}>{e.date}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {e.changes.map((ch, i) => (
                <li key={i} style={{ display: "flex", gap: 9, padding: "5px 0", fontSize: 13, color: pal.textSub, alignItems: "flex-start" }}>
                  <CheckCircle size={13} color="#06b6d4" style={{ flexShrink: 0, marginTop: 2 }} />
                  {ch}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
