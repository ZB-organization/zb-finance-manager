/**
 * ToastContext — global notification system.
 * Provides useToast() hook with notify(opts) and dismiss(id) everywhere.
 */
import { useState, useEffect, useCallback, useContext, createContext } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, X, AlertCircle } from "lucide-react";

/* ─── Context ─────────────────────────────────────────────── */
const ToastCtx = createContext(null);
export function useToast() {
  return useContext(ToastCtx);
}

/* ─── Constants ───────────────────────────────────────────── */
const TOAST_ICONS = {
  success: <CheckCircle size={15} />,
  error:   <X size={15} />,
  info:    <AlertCircle size={15} />,
  loading: null,
};
const TOAST_COLORS = {
  success: { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)",  text: "#10b981", track: "#10b981" },
  error:   { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)",   text: "#ef4444", track: "#ef4444" },
  info:    { bg: "rgba(6,182,212,0.12)",   border: "rgba(6,182,212,0.35)",   text: "#06b6d4", track: "#06b6d4" },
  loading: { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)",  text: "#a78bfa", track: "#a78bfa" },
};

/* ─── Spinner ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{
      width: 15, height: 15, borderRadius: "50%",
      border: "2px solid rgba(167,139,250,0.25)",
      borderTopColor: "#a78bfa",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

/* ─── Single toast ────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 280);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    if (toast.type === "loading" || !toast.duration) return;
    const t = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(t);
  }, [toast.type, toast.duration, dismiss]);

  useEffect(() => {
    if (toast._replace) {
      const t = setTimeout(dismiss, toast.duration || 2800);
      return () => clearTimeout(t);
    }
  }, [toast._replace]);

  const c    = TOAST_COLORS[toast.type] || TOAST_COLORS.info;
  const icon = toast.type === "loading" ? <Spinner /> : TOAST_ICONS[toast.type];

  return (
    <div
      onClick={toast.type !== "loading" ? dismiss : undefined}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 14px",
        background: "rgba(8,13,28,0.92)",
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${c.border}`,
        backdropFilter: "blur(16px)",
        cursor: toast.type !== "loading" ? "pointer" : "default",
        minWidth: 260, maxWidth: 360,
        transform: visible && !leaving ? "translateX(0) scale(1)" : "translateX(40px) scale(0.96)",
        opacity: visible && !leaving ? 1 : 0,
        transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Left colour rule */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: c.track, borderRadius: "14px 0 0 14px",
      }} />

      <div style={{ color: c.text, flexShrink: 0, marginTop: 1 }}>{icon}</div>

      <div style={{ flex: 1 }}>
        {toast.title && (
          <div style={{ fontSize: 12, fontWeight: 800, color: c.text, marginBottom: 2 }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
          {toast.message}
        </div>
      </div>

      {toast.type !== "loading" && toast.duration && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 2, background: "rgba(255,255,255,0.07)",
        }}>
          <div style={{
            height: "100%", background: c.track, borderRadius: 2,
            animation: `toastProgress ${toast.duration}ms linear forwards`,
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── Container (portal) ──────────────────────────────────── */
function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return createPortal(
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end",
    }}>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

/* ─── Provider ────────────────────────────────────────────── */
let _nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  /**
   * notify(opts) → id
   * opts: { id?, type, message, title?, duration? }
   * - If opts.id matches an existing toast, replaces it (useful for loading → success).
   * - type "loading" persists until replaced.
   * - Default duration: 3000ms for success/info, 4500ms for error.
   */
  const notify = useCallback((opts) => {
    const DEFAULT_DUR = { success: 3000, error: 4500, info: 3000, loading: 0 };
    const id  = opts.id || String(_nextId++);
    const dur = opts.duration ?? DEFAULT_DUR[opts.type] ?? 3000;

    setToasts(ts => {
      const existing = ts.findIndex(t => t.id === id);
      const entry = { ...opts, id, duration: dur };
      if (existing >= 0) {
        const updated = [...ts];
        updated[existing] = { ...entry, _replace: true };
        return updated;
      }
      return [...ts, entry];
    });
    return id;
  }, []);

  return (
    <ToastCtx.Provider value={{ notify, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}
