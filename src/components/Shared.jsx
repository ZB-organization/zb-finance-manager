import { createContext, useContext } from "react";
import { GW, ST_COL } from "../constants";
import { usePalette } from "../theme";

/* ════════════════════════════════════════════════════════════
   CHANNELS CONTEXT
   Provides dynamic channel definitions everywhere in the app.
   Wrap <AppInner> with <ChannelsProvider value={channels}>.
════════════════════════════════════════════════════════════ */
export const ChannelsCtx = createContext([]);
export const ChannelsProvider = ChannelsCtx.Provider;
export function useChannels() {
  return useContext(ChannelsCtx);
}

/* ── Gateway colour / short-name helpers ─────────────────── */
// Looks up by channel name in context first, then falls back to GW keyword map
export function useChColor(chName) {
  const channels = useChannels();
  const found = channels.find((c) => c.name === chName);
  if (found) return found.color;
  for (const [k, v] of Object.entries(GW)) if (chName?.includes(k)) return v.bg;
  return "#0d9488";
}
export function useChShort(chName) {
  const channels = useChannels();
  const found = channels.find((c) => c.name === chName);
  if (found) return found.short;
  for (const [k, v] of Object.entries(GW))
    if (chName?.includes(k)) return v.short;
  return chName?.slice(0, 2).toUpperCase() || "?";
}

// Non-hook versions for use outside components (e.g. calc helpers)
export function gwColor(ch, channelDefs = []) {
  const found = channelDefs.find((c) => c.name === ch);
  if (found) return found.color;
  for (const [k, v] of Object.entries(GW)) if (ch?.includes(k)) return v.bg;
  return "#0d9488";
}
export function gwShort(ch, channelDefs = []) {
  const found = channelDefs.find((c) => c.name === ch);
  if (found) return found.short;
  for (const [k, v] of Object.entries(GW)) if (ch?.includes(k)) return v.short;
  return ch?.slice(0, 2).toUpperCase() || "?";
}

/* ── GwBadge ─────────────────────────────────────────────── */
export function GwBadge({ ch }) {
  const channels = useChannels();
  const found = channels.find((c) => c.name === ch);
  const bg = found
    ? found.color
    : (() => {
        for (const [k, v] of Object.entries(GW))
          if (ch?.includes(k)) return v.bg;
        return "#0d9488";
      })();
  const short = found
    ? found.short
    : (() => {
        for (const [k, v] of Object.entries(GW))
          if (ch?.includes(k)) return v.short;
        return ch?.slice(0, 2).toUpperCase() || "?";
      })();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: bg + "22",
        color: bg,
        border: `1px solid ${bg}44`,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
      }}
    >
      {found?.iconBase64 ? (
        <img
          src={found.iconBase64}
          style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: bg,
            color: "#fff",
            fontSize: 9,
            fontWeight: 900,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {short}
        </span>
      )}
      {ch}
    </span>
  );
}

export function StatusBadge({ status }) {
  const c = ST_COL[status] || "#64748b";
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: c + "22",
        color: c,
        border: `1px solid ${c}44`,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export function Card({ children, style, animated = false }) {
  const pal = usePalette();
  const hasSideBorder =
    style &&
    (style.borderLeft ||
      style.borderRight ||
      style.borderTop ||
      style.borderBottom);
  return (
    <div
      className={animated ? "card-animated" : ""}
      style={{
        background: pal.surface,
        ...(hasSideBorder
          ? {
              borderTop: `1px solid ${pal.border}`,
              borderRight: `1px solid ${pal.border}`,
              borderBottom: `1px solid ${pal.border}`,
            }
          : { border: `1px solid ${pal.border}` }),
        borderRadius: 16,
        backdropFilter: "blur(12px)",
        boxShadow: pal.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Divider() {
  const pal = usePalette();
  return <div style={{ height: 1, background: pal.border, margin: "8px 0" }} />;
}

export function FormSec({ title, children }) {
  const pal = usePalette();
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#06b6d4",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 12,
          paddingBottom: 7,
          borderBottom: "1px solid rgba(6,182,212,0.18)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

export function FormGrid({ cols = 2, children, gap = 12 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols},1fr)`,
        gap,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

export function FormField({ label, children }) {
  const pal = usePalette();
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: pal.textMute,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 5,
          display: "block",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
