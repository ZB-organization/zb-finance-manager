import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  FolderOpen,
  User,
  Settings,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  Search,
  Link,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  History,
  CheckCircle,
  BarChart2,
  ExternalLink,
  ArrowLeftRight,
  BadgeCheck,
  Sun,
  Moon,
  ShieldCheck,
  Banknote,
  ChevronsRight,
  CircleDollarSign,
  AlertCircle,
  Clock3,
  Landmark,
  Activity,
  LogOut,
  Save,
  Cloud,
  Receipt,
  FileText,
  CreditCard,
} from "lucide-react";
import { ThemeProvider, useTheme, usePalette } from "./theme";
import {
  loadProjects,
  saveProject,
  deleteProject,
  loadCurrencies,
  saveCurrencies,
  loadSettlements,
  saveSettlement,
  loadSettledBaseline,
  saveSettledBaseline,
  loadExpenses,
  loadActivity,
  logActivity,
  loadCEOImages,
  saveCEOImages,
  loadPaymentMethods,
  savePaymentMethods,
  loadChannels,
  saveChannels,
  getSession,
  clearSession,
} from "./db";
import {
  DEF_CURRENCIES,
  CHANNELS,
  RULES,
  STATUSES,
  ST_COL,
  GW,
  CHANGELOG,
  GEN_ID,
  FMT,
  FMT2,
  TS,
  COMPANY,
  DEF_CHANNELS,
} from "./constants";
import { calcShares, calcDebt, chOwner } from "./calc";
import {
  GwBadge,
  StatusBadge,
  Card,
  FormSec,
  FormGrid,
  FormField,
  ChannelsProvider,
  useChannels,
  gwColor,
  gwShort,
} from "./components/Shared";
import ProjectModal from "./components/ProjectModal";
import ActivityLog from "./pages/ActivityLog";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import InvoiceGen from "./pages/InvoiceGen";
import {
  ProgressBar,
  DualBar,
  CircleProgress,
  MiniStat,
} from "./components/ProgressBar";
import AuthPage from "./auth";

/* ════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
════════════════════════════════════════════════════════════ */

const ToastCtx = createContext(null);
export function useToast() {
  return useContext(ToastCtx);
}

const TOAST_ICONS = {
  success: <CheckCircle size={15} />,
  error: <X size={15} />,
  info: <AlertCircle size={15} />,
  loading: null, // spinner below
};
const TOAST_COLORS = {
  success: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.35)",
    text: "#10b981",
    track: "#10b981",
  },
  error: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    text: "#ef4444",
    track: "#ef4444",
  },
  info: {
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.35)",
    text: "#06b6d4",
    track: "#06b6d4",
  },
  loading: {
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.35)",
    text: "#a78bfa",
    track: "#a78bfa",
  },
};

function Spinner() {
  return (
    <div
      style={{
        width: 15,
        height: 15,
        borderRadius: "50%",
        border: "2px solid rgba(167,139,250,0.25)",
        borderTopColor: "#a78bfa",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

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

  // When a loading toast gets replaced (type changes), trigger leave
  useEffect(() => {
    if (toast._replace) {
      const t = setTimeout(dismiss, toast.duration || 2800);
      return () => clearTimeout(t);
    }
  }, [toast._replace]);

  const c = TOAST_COLORS[toast.type] || TOAST_COLORS.info;
  const icon = toast.type === "loading" ? <Spinner /> : TOAST_ICONS[toast.type];

  return (
    <div
      onClick={toast.type !== "loading" ? dismiss : undefined}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        background: "rgba(8,13,28,0.92)",
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${c.border}`,
        backdropFilter: "blur(16px)",
        cursor: toast.type !== "loading" ? "pointer" : "default",
        minWidth: 260,
        maxWidth: 360,
        transform:
          visible && !leaving
            ? "translateX(0) scale(1)"
            : "translateX(40px) scale(0.96)",
        opacity: visible && !leaving ? 1 : 0,
        transition:
          "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Coloured left rule */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: c.track,
          borderRadius: "14px 0 0 14px",
        }}
      />

      {/* Icon */}
      <div style={{ color: c.text, flexShrink: 0, marginTop: 1 }}>{icon}</div>

      {/* Message */}
      <div style={{ flex: 1 }}>
        {toast.title && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: c.text,
              marginBottom: 2,
            }}
          >
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
          {toast.message}
        </div>
      </div>

      {/* Progress bar for timed toasts */}
      {toast.type !== "loading" && toast.duration && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "rgba(255,255,255,0.07)",
          }}
        >
          <div
            style={{
              height: "100%",
              background: c.track,
              borderRadius: 2,
              animation: `toastProgress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 99998,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>,
    document.body,
  );
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // notify({ type, message, title?, duration? }) → id
  // To update a loading toast: notify({ id: existingId, type: 'success', message: '...' })
  const notify = useCallback(
    ({ id, type = "info", message, title, duration }) => {
      const dur =
        duration ??
        (type === "loading" ? undefined : type === "error" ? 5000 : 3000);

      if (id) {
        // Update existing toast in-place (loading → success/error)
        setToasts((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, type, message, title, duration: dur, _replace: true }
              : t,
          ),
        );
        return id;
      }

      const newId = ++idRef.current;
      setToasts((prev) => [
        ...prev.slice(-4),
        { id: newId, type, message, title, duration: dur },
      ]);
      return newId;
    },
    [],
  );

  return (
    <ToastCtx.Provider value={{ notify, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastCtx.Provider>
  );
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════════════════ */
function Dashboard({
  projects,
  currencies,
  expenses,
  settledBaseline,
  onAdd,
  setTab,
}) {
  const pal = usePalette();
  const channelDefs = useChannels();
  const stats = useMemo(() => {
    let sTotal = 0,
      rTotal = 0,
      grossBDT = 0;
    const byCurr = {},
      stCnt = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    projects.forEach((p) => {
      const c = calcShares(p, currencies);
      sTotal += c.sShare;
      rTotal += c.rShare;
      grossBDT += c.totalBDT;
      stCnt[p.status] = (stCnt[p.status] || 0) + 1;
      if (!byCurr[p.currency]) byCurr[p.currency] = { total: 0, cnt: 0 };
      byCurr[p.currency].total += parseFloat(p.totalBudget) || 0;
      byCurr[p.currency].cnt++;
    });
    return { sTotal, rTotal, grossBDT, byCurr, stCnt };
  }, [projects, currencies]);

  const debt = useMemo(
    () =>
      calcDebt(projects, currencies, expenses, settledBaseline, channelDefs),
    [projects, currencies, expenses, settledBaseline, channelDefs],
  );
  const recent = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    [projects],
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: pal.text,
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Financial Overview
        </h2>
        <p style={{ color: pal.textMute, marginTop: 6, fontSize: 13 }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""} tracked ·
          All amounts in BDT
        </p>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          {
            label: "Gross Revenue",
            val: stats.grossBDT,
            color: "#0d9488",
            Icon: TrendingUp,
            sub: `${projects.length} projects`,
          },
          {
            label: "Sumaiya's Share",
            val: stats.sTotal,
            color: "#ec4899",
            Icon: Wallet,
            sub: "Total earned",
          },
          {
            label: "Rakib's Share",
            val: stats.rTotal,
            color: "#3b82f6",
            Icon: Wallet,
            sub: "Total earned",
          },
        ].map(({ label, val, color, Icon, sub }) => (
          <Card
            key={label}
            animated
            style={{ padding: 22, position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 110,
                height: 110,
                borderRadius: "50%",
                background: color + "0d",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: pal.textMute,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {label}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: color + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={17} color={color} />
              </div>
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: pal.text,
                letterSpacing: -0.5,
              }}
            >
              ৳{FMT(val)}
            </div>
            {sub && (
              <div style={{ fontSize: 12, color: pal.textMute, marginTop: 6 }}>
                {sub}
              </div>
            )}
            {stats.grossBDT > 0 && (
              <ProgressBar
                value={(val / stats.grossBDT) * 100}
                color={color}
                height={4}
                style={{ marginTop: 10 }}
              />
            )}
          </Card>
        ))}
      </div>

      {/* CEO earnings split bar */}
      {stats.sTotal + stats.rTotal > 0 && (
        <Card style={{ padding: "16px 20px", marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: pal.textMute,
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Earnings Split
          </div>
          <DualBar aVal={stats.sTotal} bVal={stats.rTotal} height={12} />
        </Card>
      )}

      {/* Settlement banner */}
      {!debt.payer ? (
        <Card
          style={{
            padding: "14px 18px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderLeft: "3px solid #10b981",
          }}
        >
          <ShieldCheck size={18} color="#10b981" />
          <span style={{ fontSize: 13, color: pal.text, fontWeight: 600 }}>
            All settled — no outstanding balance.
          </span>
        </Card>
      ) : (
        <div
          onClick={() => setTab("settlement")}
          style={{
            padding: "14px 18px",
            marginBottom: 20,
            borderRadius: 14,
            border: `1px solid ${
              debt.payer === "sumaiya" ? "#ec489944" : "#3b82f644"
            }`,
            background:
              debt.payer === "sumaiya"
                ? "rgba(236,72,153,0.06)"
                : "rgba(59,130,246,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
          }}
        >
          <CircleDollarSign size={18} color="#f59e0b" />
          <div style={{ flex: 1, fontSize: 13 }}>
            <span
              style={{
                fontWeight: 800,
                color: debt.payer === "sumaiya" ? "#ec4899" : "#3b82f6",
              }}
            >
              {debt.payerLabel}
            </span>
            <span style={{ color: pal.textSub }}> owes </span>
            <span
              style={{
                fontWeight: 800,
                color: debt.receiver === "sumaiya" ? "#ec4899" : "#3b82f6",
              }}
            >
              {debt.receiverLabel}
            </span>
            <span
              style={{
                fontWeight: 900,
                color: pal.text,
                fontSize: 16,
                marginLeft: 6,
              }}
            >
              ৳{FMT(debt.amount)}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#06b6d4", fontWeight: 600 }}>
            View Settlement →
          </span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <Card style={{ padding: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: pal.text,
              marginBottom: 14,
            }}
          >
            Project Status
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 10,
            }}
          >
            {STATUSES.map((s) => (
              <div
                key={s}
                style={{
                  textAlign: "center",
                  padding: "12px 8px",
                  borderRadius: 12,
                  background: ST_COL[s] + "10",
                  border: `1px solid ${ST_COL[s]}28`,
                }}
              >
                <div
                  style={{ fontSize: 28, fontWeight: 900, color: ST_COL[s] }}
                >
                  {stats.stCnt[s]}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: pal.textMute,
                    marginTop: 3,
                    fontWeight: 700,
                  }}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: pal.text,
              marginBottom: 14,
            }}
          >
            Revenue by Currency
          </div>
          {Object.keys(stats.byCurr).length === 0 ? (
            <div
              style={{
                color: pal.textFaint,
                fontSize: 12,
                textAlign: "center",
                paddingTop: 20,
              }}
            >
              No data yet
            </div>
          ) : (
            Object.entries(stats.byCurr).map(([code, { total, cnt }]) => {
              const curr = currencies.find((c) => c.code === code) || {
                symbol: "?",
              };
              return (
                <div
                  key={code}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: `1px solid ${pal.border}`,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#0d9488",
                        fontSize: 14,
                      }}
                    >
                      {code}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: pal.textMute,
                        marginLeft: 6,
                      }}
                    >
                      {cnt} proj
                    </span>
                  </div>
                  <span
                    style={{ fontWeight: 700, color: pal.text, fontSize: 14 }}
                  >
                    {curr.symbol}
                    {FMT2(total)}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>

      <Card style={{ padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>
            Recent Transactions
          </div>
          {projects.length === 0 && (
            <button
              onClick={onAdd}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "rgba(6,182,212,0.14)",
                border: "1px solid rgba(6,182,212,0.3)",
                borderRadius: 8,
                color: "#06b6d4",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
            >
              <Plus size={13} />
              Add First
            </button>
          )}
        </div>
        {projects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: pal.textFaint,
            }}
          >
            <BarChart2
              size={44}
              strokeWidth={1}
              style={{ margin: "0 auto 12px", display: "block" }}
            />
            <div style={{ fontSize: 14 }}>
              No projects yet. Add one to get started.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Project",
                    "Status",
                    "Channel",
                    "Rule",
                    "Sumaiya",
                    "Rakib",
                    "Pay Day",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "7px 10px",
                        fontWeight: 700,
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: pal.textMute,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => {
                  const { sShare, rShare } = calcShares(p, currencies);
                  return (
                    <tr
                      key={p.id}
                      style={{ borderTop: `1px solid ${pal.border}` }}
                    >
                      <td
                        style={{
                          padding: "11px 10px",
                          color: pal.text,
                          fontWeight: 600,
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </td>
                      <td style={{ padding: "11px 10px" }}>
                        <StatusBadge status={p.status} />
                      </td>
                      <td style={{ padding: "11px 10px" }}>
                        <GwBadge ch={p.paymentChannel} />
                      </td>
                      <td
                        style={{
                          padding: "11px 10px",
                          color: "#06b6d4",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {p.rule || "DEFAULT"}
                      </td>
                      <td
                        style={{
                          padding: "11px 10px",
                          color: "#ec4899",
                          fontWeight: 800,
                        }}
                      >
                        ৳{FMT(sShare)}
                      </td>
                      <td
                        style={{
                          padding: "11px 10px",
                          color: "#3b82f6",
                          fontWeight: 800,
                        }}
                      >
                        ৳{FMT(rShare)}
                      </td>
                      <td
                        style={{
                          padding: "11px 10px",
                          color: pal.textMute,
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.payDay || p.createdAt?.slice(0, 10) || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SETTLEMENT ANIMATION — createPortal + React state transitions
   (no CSS keyframe dependency — 100% reliable)
════════════════════════════════════════════════════════════ */

const COIN_DEFS = [
  { emoji: "💰", yOff: -12, delay: 0 },
  { emoji: "🪙", yOff: 4, delay: 200 },
  { emoji: "💸", yOff: -4, delay: 400 },
  { emoji: "💰", yOff: 10, delay: 600 },
  { emoji: "🪙", yOff: -8, delay: 800 },
];

const BURST_CFG = [
  { color: "#10b981", angle: 0, dist: 78 },
  { color: "#06b6d4", angle: 45, dist: 88 },
  { color: "#ec4899", angle: 90, dist: 78 },
  { color: "#f59e0b", angle: 135, dist: 88 },
  { color: "#a78bfa", angle: 180, dist: 78 },
  { color: "#34d399", angle: 225, dist: 88 },
  { color: "#fb923c", angle: 270, dist: 78 },
  { color: "#60a5fa", angle: 315, dist: 88 },
];

function SettlementAnimation({
  payerLabel,
  payerColor,
  receiverLabel,
  receiverColor,
  amount,
  onDone,
  payerImg,
  receiverImg,
}) {
  const [phase, setPhase] = useState("fly"); // "fly" | "done"
  const [coins, setCoins] = useState([]); // [{id, emoji, yOff, fired}]
  const [progress, setProgress] = useState(0);
  const [burstFired, setBurstFired] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [textIn, setTextIn] = useState(false);
  const [cardIn, setCardIn] = useState(false);
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  useEffect(() => {
    // Card entrance
    setTimeout(() => setCardIn(true), 20);
    // Progress bar
    setTimeout(() => setProgress(100), 60);

    // Staggered coin launches
    COIN_DEFS.forEach((c, i) => {
      setTimeout(() => {
        setCoins((prev) => [
          ...prev,
          { id: i, emoji: c.emoji, yOff: c.yOff, fired: false },
        ]);
        setTimeout(
          () =>
            setCoins((prev) =>
              prev.map((x) => (x.id === i ? { ...x, fired: true } : x)),
            ),
          30,
        );
      }, c.delay);
    });

    // Phase switch to success
    const t1 = setTimeout(() => {
      setPhase("done");
      setTimeout(() => {
        setBurstFired(true);
        setCheckIn(true);
      }, 30);
      setTimeout(() => setTextIn(true), 320);
    }, 1900);

    const t2 = setTimeout(() => cbRef.current(), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const content = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(4, 8, 22, 0.88)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #0c1525, #0a1020)",
          border: "1px solid rgba(6,182,212,0.3)",
          borderRadius: 28,
          padding: "36px 40px",
          width: 460,
          maxWidth: "90vw",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          position: "relative",
          // No overflow:hidden — burst dots must escape the card boundary
          transform: cardIn
            ? "scale(1) translateY(0)"
            : "scale(0.88) translateY(28px)",
          opacity: cardIn ? 1 : 0,
          transition:
            "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        }}
      >
        {phase === "fly" ? (
          /* ── Phase 1: coin transfer ── */
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#06b6d4",
                letterSpacing: 2.5,
                textTransform: "uppercase",
                textAlign: "center",
                marginBottom: 28,
              }}
            >
              💳 Processing Transfer
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              {/* Payer */}
              <div style={{ textAlign: "center", width: 88, flexShrink: 0 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    background: payerColor + "22",
                    border: `2px solid ${payerColor}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                    boxShadow: `0 0 24px ${payerColor}44`,
                    overflow: "hidden",
                  }}
                >
                  {payerImg ? (
                    <img
                      src={payerImg}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 28 }}>👤</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: payerColor,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  PAYS
                </div>
                <div
                  style={{ fontSize: 13, fontWeight: 900, color: payerColor }}
                >
                  {payerLabel}
                </div>
              </div>

              {/* Coin lane — no overflow:hidden so coins are always visible */}
              <div style={{ flex: 1, height: 72, position: "relative" }}>
                {/* Gradient track */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 4,
                    right: 4,
                    height: 1,
                    background: `linear-gradient(90deg, ${payerColor}55, ${receiverColor}55)`,
                    transform: "translateY(-50%)",
                  }}
                />

                {/* React-transition driven coins */}
                {coins.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: 0,
                      marginTop: c.yOff - 9,
                      fontSize: 18,
                      lineHeight: 1,
                      transform: c.fired
                        ? "translateX(248px) scale(0.4)"
                        : "translateX(-4px) scale(1)",
                      opacity: c.fired ? 0 : 1,
                      transition: c.fired
                        ? "transform 0.95s cubic-bezier(0.4,0,1,1), opacity 0.5s ease 0.6s"
                        : "none",
                    }}
                  >
                    {c.emoji}
                  </div>
                ))}

                {/* Amount badge — always on top */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(8,14,30,0.9)",
                      border: "1px solid rgba(6,182,212,0.4)",
                      borderRadius: 10,
                      padding: "5px 14px",
                    }}
                  >
                    <span
                      style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}
                    >
                      ৳{FMT(amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Receiver */}
              <div style={{ textAlign: "center", width: 88, flexShrink: 0 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    background: receiverColor + "22",
                    border: `2px solid ${receiverColor}66`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                    boxShadow: `0 0 24px ${receiverColor}44`,
                    overflow: "hidden",
                  }}
                >
                  {receiverImg ? (
                    <img
                      src={receiverImg}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 28 }}>👤</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: receiverColor,
                    fontWeight: 800,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  RECEIVES
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: receiverColor,
                  }}
                >
                  {receiverLabel}
                </div>
              </div>
            </div>

            {/* React-state progress bar */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(100,160,200,0.7)",
                  marginBottom: 7,
                }}
              >
                Transferring funds…
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 6,
                    background:
                      "linear-gradient(90deg,#0d9488,#06b6d4,#a78bfa)",
                    boxShadow: "0 0 14px rgba(6,182,212,0.6)",
                    width: `${progress}%`,
                    transition: "width 1.85s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── Phase 2: success ── */
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            {/* Burst ring + checkmark */}
            <div
              style={{
                position: "relative",
                width: 104,
                height: 104,
                margin: "0 auto 22px",
              }}
            >
              {/* Burst dots — react state transitions */}
              {BURST_CFG.map(({ color, angle, dist }, i) => {
                const rad = (angle * Math.PI) / 180;
                const tx = burstFired ? Math.cos(rad) * dist : 0;
                const ty = burstFired ? Math.sin(rad) * dist : 0;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                      marginTop: -5.5,
                      marginLeft: -5.5,
                      transform: `translate(${tx}px, ${ty}px) scale(${
                        burstFired ? 0 : 1.3
                      })`,
                      opacity: burstFired ? 0 : 1,
                      transition: `transform 0.7s cubic-bezier(0.2,0,0.8,1) ${
                        i * 20
                      }ms, opacity 0.5s ease ${i * 20 + 280}ms`,
                    }}
                  />
                );
              })}

              {/* Checkmark circle */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.15)",
                  border: "2px solid #10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "0 0 0 10px rgba(16,185,129,0.07), 0 0 40px rgba(16,185,129,0.35)",
                  transform: checkIn
                    ? "scale(1) rotate(0deg)"
                    : "scale(0.15) rotate(-25deg)",
                  opacity: checkIn ? 1 : 0,
                  transition:
                    "transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
                }}
              >
                <span style={{ fontSize: 46 }}>✅</span>
              </div>
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#10b981",
                marginBottom: 10,
                transform: textIn ? "translateY(0)" : "translateY(16px)",
                opacity: textIn ? 1 : 0,
                transition: "transform 0.4s ease, opacity 0.4s ease",
              }}
            >
              All Settled! 🎉
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#94a3b8",
                lineHeight: 2,
                transform: textIn ? "translateY(0)" : "translateY(16px)",
                opacity: textIn ? 1 : 0,
                transition:
                  "transform 0.4s ease 0.08s, opacity 0.4s ease 0.08s",
              }}
            >
              <span style={{ color: payerColor, fontWeight: 800 }}>
                {payerLabel}
              </span>
              <span style={{ color: "#475569" }}> → </span>
              <span style={{ color: receiverColor, fontWeight: 800 }}>
                {receiverLabel}
              </span>
              <br />
              <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
                ৳{FMT(amount)}
              </span>
              <span style={{ color: "#475569", fontSize: 12 }}>
                {" "}
                · balance now zero
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ════════════════════════════════════════════════════════════
   SETTLEMENT
════════════════════════════════════════════════════════════ */
function Settlement({
  projects,
  currencies,
  expenses,
  settledBaseline,
  onLog,
  onSettle,
  ceoImages,
}) {
  const pal = usePalette();
  const channelDefs = useChannels();
  const [settlements, setSettlements] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animSnap, setAnimSnap] = useState(null); // snapshot for animation
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    loadSettlements().then(setSettlements);
  }, []);

  const debt = useMemo(
    () =>
      calcDebt(projects, currencies, expenses, settledBaseline, channelDefs),
    [projects, currencies, expenses, settledBaseline, channelDefs],
  );
  const balanced = !debt.payer || debt.amount < 0.01;

  const handleMarkSettled = async () => {
    if (balanced) return;
    // Snapshot for animation before any state changes
    const snap = {
      payerLabel: debt.payerLabel,
      payerColor: debt.payer === "sumaiya" ? "#ec4899" : "#3b82f6",
      receiverLabel: debt.receiverLabel,
      receiverColor: debt.receiver === "sumaiya" ? "#ec4899" : "#3b82f6",
      amount: debt.amount,
    };
    setAnimSnap(snap);
    setConfirming(false);
    setAnimating(true);
    // Persist and update baseline while animation plays
    const rec = {
      id: GEN_ID(),
      payer: debt.payer,
      payerLabel: debt.payerLabel,
      receiver: debt.receiver,
      receiverLabel: debt.receiverLabel,
      amount: debt.amount,
      settledAt: TS(),
      projectCount: projects.length,
    };
    await saveSettlement(rec);
    setSettlements(await loadSettlements());
    await onSettle(debt.raw); // saves new baseline → debt recomputes to 0 in parent
    onLog({
      type: "SETTLEMENT",
      detail: `${debt.payerLabel} paid ${debt.receiverLabel} ৳${FMT(
        debt.amount,
      )}`,
    });
  };

  const handleAnimDone = useCallback(() => {
    setAnimating(false);
    setAnimSnap(null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3500);
  }, []);

  const pC = debt.payer === "sumaiya" ? "#ec4899" : "#3b82f6";
  const rC = debt.receiver === "sumaiya" ? "#ec4899" : "#3b82f6";

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Portal animation — lives at top level so balanced=true can't unmount it */}
      {animating && animSnap && (
        <SettlementAnimation
          payerLabel={animSnap.payerLabel}
          payerColor={animSnap.payerColor}
          receiverLabel={animSnap.receiverLabel}
          receiverColor={animSnap.receiverColor}
          amount={animSnap.amount}
          payer={animSnap.payer}
          receiver={animSnap.receiver}
          onDone={handleAnimDone}
          payerImg={
            animSnap.payer === "sumaiya" ? ceoImages?.sumaiya : ceoImages?.rakib
          }
          receiverImg={
            animSnap.receiver === "sumaiya"
              ? ceoImages?.sumaiya
              : ceoImages?.rakib
          }
        />
      )}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: pal.text,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ArrowLeftRight size={20} color="#06b6d4" /> Net Settlement
        </h2>
        <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
          Who owes whom based on where money was received vs who earned it
        </p>
      </div>

      <Card
        style={{
          padding: 16,
          marginBottom: 18,
          borderLeft: "3px solid rgba(6,182,212,0.5)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertCircle
            size={15}
            color="#06b6d4"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ fontSize: 12.5, color: pal.textSub, lineHeight: 1.75 }}>
            <strong style={{ color: "#06b6d4" }}>Logic:</strong> When money
            lands in Sumaiya's account, she holds Rakib's share (and vice
            versa). The net of all these cross-account obligations is the
            settlement amount.
          </div>
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {[
          {
            label: "Sumaiya's acct holds Rakib's share",
            amt: debt.raw?.sumaiyaOwesRakib || 0,
            color: "#ec4899",
          },
          {
            label: "Rakib's acct holds Sumaiya's share",
            amt: debt.raw?.rakibOwesSumaiya || 0,
            color: "#3b82f6",
          },
        ].map(({ label, amt, color }) => {
          const maxAmt =
            Math.max(
              debt.raw?.sumaiyaOwesRakib || 0,
              debt.raw?.rakibOwesSumaiya || 0,
            ) || 1;
          return (
            <Card key={label} style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: color + "1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Banknote size={15} color={color} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: pal.textMute,
                    fontWeight: 600,
                    flex: 1,
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color,
                  marginBottom: 10,
                }}
              >
                ৳{FMT(amt)}
              </div>
              <ProgressBar
                value={(amt / maxAmt) * 100}
                color={color}
                height={6}
              />
            </Card>
          );
        })}
      </div>

      {/* Net card */}
      <div
        style={{
          borderRadius: 20,
          padding: 30,
          marginBottom: 22,
          position: "relative",
          overflow: "hidden",
          background: balanced
            ? "rgba(16,185,129,0.06)"
            : `linear-gradient(135deg,${pC}07,rgba(6,182,212,0.06))`,
          border: balanced
            ? "1px solid rgba(16,185,129,0.22)"
            : "1px solid rgba(6,182,212,0.2)",
          boxShadow: balanced ? "none" : `0 8px 40px ${pC}12`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle,${
              balanced ? "#10b981" : "#06b6d4"
            }12 0%,transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        {balanced ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.12)",
                border: "2px solid #10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <ShieldCheck size={28} color="#10b981" />
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#10b981",
                marginBottom: 6,
              }}
            >
              All Settled!
            </div>
            <div style={{ fontSize: 13, color: pal.textMute }}>
              No outstanding balance.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#06b6d4",
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              Net Settlement Required
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: pC + "18",
                    border: `2px solid ${pC}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={24} color={pC} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: pal.textMute,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    Pays
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: pC }}>
                    {debt.payerLabel}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 900,
                    color: pal.text,
                    letterSpacing: -1,
                    marginBottom: 8,
                  }}
                >
                  ৳{FMT(debt.amount)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      borderRadius: 2,
                      background: `linear-gradient(90deg,${pC}55,${rC}55)`,
                    }}
                  />
                  <ChevronsRight size={18} color="#06b6d4" />
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      borderRadius: 2,
                      background: `linear-gradient(90deg,${pC}55,${rC}55)`,
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      color: pal.textMute,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      textAlign: "right",
                    }}
                  >
                    Receives
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      color: rC,
                      textAlign: "right",
                    }}
                  >
                    {debt.receiverLabel}
                  </div>
                </div>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: rC + "18",
                    border: `2px solid ${rC}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={24} color={rC} />
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 28px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 22px rgba(6,182,212,0.4)",
                    fontFamily: "inherit",
                  }}
                >
                  <BadgeCheck size={18} /> Mark Settled
                </button>
              ) : (
                <>
                  <div
                    style={{ fontSize: 13, color: pal.text, fontWeight: 600 }}
                  >
                    Confirm ৳{FMT(debt.amount)} transfer?
                  </div>
                  <button
                    onClick={handleMarkSettled}
                    style={{
                      padding: "11px 22px",
                      borderRadius: 10,
                      border: "none",
                      background: "#10b981",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle size={15} />
                    Confirm & Animate
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    style={{
                      padding: "11px 18px",
                      borderRadius: 10,
                      border: `1px solid ${pal.border}`,
                      background: "transparent",
                      color: pal.textMute,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {justSaved && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#10b981",
              fontWeight: 700,
              fontSize: 13,
              marginTop: 14,
            }}
          >
            <CheckCircle size={15} />
            Settled — balance reset!
          </div>
        )}
      </div>

      {/* Breakdown table */}
      <Card style={{ padding: 20, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <BarChart2 size={15} color="#06b6d4" />
          Per-Project Cross-Obligations
        </div>
        {projects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              color: pal.textFaint,
              fontSize: 13,
            }}
          >
            No projects yet
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Project",
                    "Channel",
                    "Sumaiya",
                    "Rakib",
                    "Cross-Obligation",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "7px 10px",
                        fontWeight: 700,
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: pal.textMute,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const { sShare, rShare } = calcShares(p, currencies);
                  const recv = chOwner(p.paymentChannel, channelDefs);
                  let cross = "—",
                    crossColor = pal.textFaint;
                  if (recv === "sumaiya" && rShare > 0.01) {
                    cross = `Sumu → Rakib ৳${FMT(rShare)}`;
                    crossColor = "#ec4899";
                  } else if (recv === "rakib" && sShare > 0.01) {
                    cross = `Rakib → Sumu ৳${FMT(sShare)}`;
                    crossColor = "#3b82f6";
                  }
                  return (
                    <tr
                      key={p.id}
                      style={{ borderTop: `1px solid ${pal.border}` }}
                    >
                      <td
                        style={{
                          padding: "10px 10px",
                          color: pal.text,
                          fontWeight: 600,
                          maxWidth: 130,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        <GwBadge ch={p.paymentChannel} />
                      </td>
                      <td
                        style={{
                          padding: "10px 10px",
                          color: "#ec4899",
                          fontWeight: 700,
                        }}
                      >
                        ৳{FMT(sShare)}
                      </td>
                      <td
                        style={{
                          padding: "10px 10px",
                          color: "#3b82f6",
                          fontWeight: 700,
                        }}
                      >
                        ৳{FMT(rShare)}
                      </td>
                      <td
                        style={{
                          padding: "10px 10px",
                          color: crossColor,
                          fontWeight: 600,
                          fontSize: 11.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cross}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Linked Expenses Breakdown */}
      {expenses.filter((e) => e.linkedToSettlement).length > 0 && (
        <Card style={{ padding: 20, marginBottom: 18 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: pal.text,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Receipt size={15} color="#f59e0b" /> Linked Expense Adjustments
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
              marginBottom: 14,
              fontSize: 12,
              color: pal.textSub,
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: "#f59e0b" }}>How this works:</strong> When
            one CEO pays a company expense, the other owes them back half. These
            adjustments are added to the net settlement above.
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Expense",
                    "Paid By",
                    "Amount",
                    "Settlement Adjustment",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "7px 10px",
                        fontWeight: 700,
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: pal.textMute,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses
                  .filter((e) => e.linkedToSettlement)
                  .map((e) => {
                    const half = (e.amountBDT || 0) / 2;
                    const adjColor =
                      e.paidBy === "Sumaiya" ? "#ec4899" : "#3b82f6";
                    const adjText =
                      e.paidBy === "Sumaiya"
                        ? `Rakib owes Sumaiya ৳${FMT(half)}`
                        : e.paidBy === "Rakib"
                        ? `Sumaiya owes Rakib ৳${FMT(half)}`
                        : "Split equally (no adjustment)";
                    return (
                      <tr
                        key={e.id}
                        style={{ borderTop: `1px solid ${pal.border}` }}
                      >
                        <td
                          style={{
                            padding: "10px 10px",
                            color: pal.text,
                            fontWeight: 600,
                          }}
                        >
                          {e.description}
                        </td>
                        <td style={{ padding: "10px 10px" }}>
                          <span
                            style={{
                              color:
                                e.paidBy === "Sumaiya"
                                  ? "#ec4899"
                                  : e.paidBy === "Rakib"
                                  ? "#3b82f6"
                                  : "#10b981",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {e.paidBy}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 10px",
                            color: "#f59e0b",
                            fontWeight: 700,
                          }}
                        >
                          ৳{FMT(e.amountBDT || 0)}
                        </td>
                        <td
                          style={{
                            padding: "10px 10px",
                            color: adjColor,
                            fontWeight: 600,
                            fontSize: 11.5,
                          }}
                        >
                          {adjText}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${pal.border}` }}>
                  <td
                    colSpan={2}
                    style={{
                      padding: "10px 10px",
                      color: pal.textMute,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Total expense adjustment to settlement
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      padding: "10px 10px",
                      fontWeight: 900,
                      fontSize: 14,
                      color: "#f59e0b",
                    }}
                  >
                    {(() => {
                      const sc = debt.raw?.expSumaiyaCredit || 0;
                      const rc = debt.raw?.expRakibCredit || 0;
                      if (sc > rc) return `+৳${FMT(sc - rc)} → favours Sumaiya`;
                      if (rc > sc) return `+৳${FMT(rc - sc)} → favours Rakib`;
                      return "Balanced";
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* History */}
      <Card style={{ padding: 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <History size={15} color="#06b6d4" />
          Settlement History ({settlements.length})
        </div>
        {settlements.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 0",
              color: pal.textFaint,
            }}
          >
            <Clock3
              size={34}
              strokeWidth={1}
              style={{ margin: "0 auto 10px", display: "block" }}
            />
            <div style={{ fontSize: 13 }}>No settlements recorded yet</div>
          </div>
        ) : (
          [...settlements].reverse().map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 12,
                background: pal.surfaceElevated,
                border: `1px solid ${pal.border}`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "rgba(16,185,129,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BadgeCheck size={18} color="#10b981" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>
                  <span
                    style={{
                      color: s.payer === "sumaiya" ? "#ec4899" : "#3b82f6",
                    }}
                  >
                    {s.payerLabel}
                  </span>
                  <span style={{ color: pal.textMute, fontWeight: 400 }}>
                    {" "}
                    paid{" "}
                  </span>
                  <span
                    style={{
                      color: s.receiver === "sumaiya" ? "#ec4899" : "#3b82f6",
                    }}
                  >
                    {s.receiverLabel}
                  </span>
                </div>
                <div
                  style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}
                >
                  {new Date(s.settledAt).toLocaleString("en-BD", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {s.projectCount} projects
                </div>
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#10b981",
                  flexShrink: 0,
                }}
              >
                ৳{FMT(s.amount)}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PROJECTS PAGE
════════════════════════════════════════════════════════════ */
function Projects({ projects, currencies, onAdd, onEdit, onDelete }) {
  const pal = usePalette();
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("All");
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            (!q || p.name.toLowerCase().includes(q.toLowerCase())) &&
            (sf === "All" || p.status === sf),
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [projects, q, sf],
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: pal.text,
              margin: 0,
            }}
          >
            All Projects
          </h2>
          <p style={{ color: pal.textMute, marginTop: 4, fontSize: 13 }}>
            {filtered.length} of {projects.length}
          </p>
        </div>
        <button
          onClick={onAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 22px",
            background: "linear-gradient(135deg,#0d9488,#06b6d4)",
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 18px rgba(6,182,212,0.35)",
            fontFamily: "inherit",
          }}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      <div
        style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: pal.textMute,
            }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: pal.inpBg,
              border: `1px solid ${pal.inpBorder}`,
              borderRadius: 10,
              padding: "9px 12px 9px 34px",
              color: pal.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", ...STATUSES].map((s) => {
            const c = ST_COL[s] || "#06b6d4",
              active = sf === s;
            return (
              <button
                key={s}
                onClick={() => setSf(s)}
                style={{
                  padding: "8px 13px",
                  borderRadius: 9,
                  border: `1px solid ${active ? c : "rgba(128,128,128,0.2)"}`,
                  background: active ? c + "1a" : "transparent",
                  color: active ? c : pal.textMute,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: pal.textFaint,
          }}
        >
          <FolderOpen
            size={48}
            strokeWidth={1}
            style={{ margin: "0 auto 12px", display: "block" }}
          />
          <div style={{ fontSize: 14 }}>No projects found</div>
        </div>
      ) : (
        filtered.map((p) => {
          const c = calcShares(p, currencies),
            isOpen = openId === p.id;
          const curr = currencies.find((x) => x.code === p.currency) || {
            symbol: "?",
            rate: 1,
          };
          const wLabel =
            p.workerType === "ceo_sumaiya"
              ? "Sumaiya"
              : p.workerType === "ceo_rakib"
              ? "Rakib"
              : p.workerType === "external"
              ? p.workerName || "External"
              : "No worker";
          const wColor =
            p.workerType === "ceo_sumaiya"
              ? "#ec4899"
              : p.workerType === "ceo_rakib"
              ? "#3b82f6"
              : p.workerType === "external"
              ? "#10b981"
              : pal.textMute;
          return (
            <Card
              key={p.id}
              style={{ marginBottom: 10, overflow: "hidden", padding: 0 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "15px 18px",
                  cursor: "pointer",
                  flexWrap: "wrap",
                }}
                onClick={() => setOpenId(isOpen ? null : p.id)}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: ST_COL[p.status],
                    flexShrink: 0,
                    boxShadow: `0 0 8px ${ST_COL[p.status]}80`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      color: pal.text,
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 2,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: wColor, fontWeight: 600 }}>
                      {wLabel}
                    </span>
                    <span style={{ color: pal.textMute }}>
                      {p.rule || "DEFAULT"}
                    </span>
                    {p.payDay && (
                      <span style={{ color: pal.textMute }}>
                        Pay: {p.payDay}
                      </span>
                    )}
                  </div>
                </div>
                <GwBadge ch={p.paymentChannel} />
                <StatusBadge status={p.status} />
                <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#ec4899",
                        fontWeight: 700,
                      }}
                    >
                      Sumaiya
                    </div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#ec4899",
                        fontSize: 15,
                      }}
                    >
                      ৳{FMT(c.sShare)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#3b82f6",
                        fontWeight: 700,
                      }}
                    >
                      Rakib
                    </div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#3b82f6",
                        fontSize: 15,
                      }}
                    >
                      ৳{FMT(c.rShare)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p);
                    }}
                    style={{
                      background: pal.surfaceElevated,
                      border: "none",
                      borderRadius: 8,
                      padding: 7,
                      color: pal.textSub,
                      cursor: "pointer",
                      lineHeight: 0,
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${p.name}"?`)) onDelete(p.id);
                    }}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "none",
                      borderRadius: 8,
                      padding: 7,
                      color: "#ef4444",
                      cursor: "pointer",
                      lineHeight: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <ChevronDown
                  size={16}
                  color={pal.textMute}
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "0.2s",
                    flexShrink: 0,
                  }}
                />
              </div>
              {isOpen && (
                <div
                  style={{
                    padding: "4px 18px 20px",
                    borderTop: `1px solid ${pal.border}`,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                      gap: 16,
                      marginTop: 14,
                    }}
                  >
                    <div style={{ fontSize: 13 }}>
                      {[
                        [
                          "Budget",
                          `${curr.symbol}${FMT2(p.totalBudget)} ${p.currency}`,
                        ],
                        ["Rate", `1 ${p.currency} = ৳${c.rate}`],
                        ["Tax/Fee", `${p.tax || 0}%`],
                        [
                          "Worker Pay",
                          p.workerType === "external"
                            ? `${curr.symbol}${FMT2(p.workerBudget)}`
                            : "—",
                        ],
                        ["Start", p.startDate || "—"],
                        ["End", p.endDate || "—"],
                        ["Pay Day", p.payDay || "—"],
                        ["Receiver", p.paymentReceiver],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "5px 0",
                            borderBottom: `1px solid ${pal.border}`,
                          }}
                        >
                          <span style={{ color: pal.textMute }}>{k}</span>
                          <span style={{ color: pal.textSub, fontWeight: 600 }}>
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        background: "rgba(6,182,212,0.05)",
                        borderRadius: 12,
                        padding: 14,
                        border: "1px solid rgba(6,182,212,0.15)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#06b6d4",
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          marginBottom: 10,
                        }}
                      >
                        Calculation
                      </div>
                      {[
                        ["Gross BDT", `৳${FMT(c.totalBDT)}`],
                        ["Tax", `–৳${FMT(c.taxAmt)}`],
                        ["Net", `৳${FMT(c.net)}`],
                        ["Distributable", `৳${FMT(c.dist)}`],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
                            borderBottom: `1px solid ${pal.border}`,
                            fontSize: 12.5,
                          }}
                        >
                          <span style={{ color: pal.textMute }}>{k}</span>
                          <span style={{ color: pal.text, fontWeight: 600 }}>
                            {v}
                          </span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          marginTop: 12,
                        }}
                      >
                        {[
                          {
                            l: "Sumaiya",
                            v: c.sShare,
                            p: c.sP,
                            color: "#ec4899",
                          },
                          {
                            l: "Rakib",
                            v: c.rShare,
                            p: c.rP,
                            color: "#3b82f6",
                          },
                        ].map((x) => (
                          <div
                            key={x.l}
                            style={{
                              background: x.color + "12",
                              border: `1px solid ${x.color}28`,
                              borderRadius: 8,
                              padding: "10px 10px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                color: x.color,
                                fontWeight: 700,
                              }}
                            >
                              {x.l} ({x.p}%)
                            </div>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 900,
                                color: pal.text,
                              }}
                            >
                              ৳{FMT(x.v)}
                            </div>
                            <ProgressBar
                              value={x.p}
                              color={x.color}
                              height={3}
                              style={{ marginTop: 6 }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {(p.invoices || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: pal.textMute,
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        Invoices & Proof
                      </div>
                      {p.invoices.map((iv, i) => (
                        <a
                          key={i}
                          href={iv}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            background: "rgba(6,182,212,0.07)",
                            border: "1px solid rgba(6,182,212,0.18)",
                            borderRadius: 8,
                            marginBottom: 5,
                            textDecoration: "none",
                            color: "#06b6d4",
                            fontSize: 12,
                          }}
                        >
                          <Link size={12} />
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {iv}
                          </span>
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  )}
                  {p.notes && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 12px",
                        background: pal.surfaceElevated,
                        borderRadius: 10,
                        fontSize: 12,
                        color: pal.textSub,
                        borderLeft: "3px solid rgba(6,182,212,0.35)",
                      }}
                    >
                      <span style={{ color: pal.textMute, fontWeight: 600 }}>
                        Note:{" "}
                      </span>
                      {p.notes}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CEO PROFILE
════════════════════════════════════════════════════════════ */
function CEOProfile({
  who,
  projects,
  currencies,
  ceoImages,
  onCEOImageChange,
}) {
  const pal = usePalette();
  const allChannels = useChannels();
  const isSumu = who === "sumaiya",
    name = isSumu ? "Sumaiya" : "Rakib";
  const color = isSumu ? "#ec4899" : "#3b82f6";
  const channels = allChannels
    .filter((c) => c.owner === who)
    .map((c) => c.name);
  const myImage = ceoImages?.[who];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onCEOImageChange?.(who, ev.target.result);
    reader.readAsDataURL(file);
  };

  const stats = useMemo(() => {
    let earned = 0,
      grossIn = 0;
    const byCh = Object.fromEntries(
      channels.map((ch) => [ch, { recv: 0, earned: 0, cnt: 0 }]),
    );
    projects.forEach((p) => {
      const c = calcShares(p, currencies),
        myShare = isSumu ? c.sShare : c.rShare;
      earned += myShare;
      if (channels.includes(p.paymentChannel)) {
        grossIn += c.totalBDT;
        byCh[p.paymentChannel].recv += c.totalBDT;
        byCh[p.paymentChannel].earned += myShare;
        byCh[p.paymentChannel].cnt++;
      }
    });
    return {
      earned,
      grossIn,
      byCh,
      workedOn: projects.filter(
        (p) => p.workerType === (isSumu ? "ceo_sumaiya" : "ceo_rakib"),
      ).length,
    };
  }, [projects, currencies, who]);

  const txns = useMemo(
    () =>
      projects
        .filter((p) => {
          const c = calcShares(p, currencies);
          return (isSumu ? c.sShare : c.rShare) > 0;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [projects, currencies, who],
  );

  return (
    <div style={{ paddingBottom: 48 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
          padding: 24,
          background: `linear-gradient(135deg,${color}0d,${color}04)`,
          borderRadius: 20,
          border: `1px solid ${color}1e`,
          flexWrap: "wrap",
        }}
      >
        {/* Avatar with upload overlay */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: myImage
                ? "transparent"
                : `linear-gradient(135deg,${color}cc,${color}77)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 28px ${color}44`,
              overflow: "hidden",
            }}
          >
            {myImage ? (
              <img
                src={myImage}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <User size={28} color="#fff" />
            )}
          </div>
          <label
            title="Upload photo"
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#0d9488",
              border: "2px solid " + pal.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            📷
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </label>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: pal.text }}>
            {name}
          </div>
          <div style={{ fontSize: 13, color: pal.textMute, marginTop: 3 }}>
            Co-Founder & CEO · {channels.length} payment channels
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color,
              animation: "pulse 2.5s ease-in-out infinite",
            }}
          >
            ৳{FMT(stats.earned)}
          </div>
          <div style={{ fontSize: 12, color: pal.textMute }}>Total Earned</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        {[
          {
            l: "Total Earned",
            v: stats.earned,
            c: color,
            pct: stats.grossIn > 0 ? (stats.earned / stats.grossIn) * 100 : 0,
          },
          { l: "Gross Received", v: stats.grossIn, c: "#0d9488", pct: 100 },
          {
            l: "Projects Worked",
            v: stats.workedOn,
            c: "#f59e0b",
            cnt: true,
            pct:
              projects.length > 0
                ? (stats.workedOn / projects.length) * 100
                : 0,
          },
        ].map(({ l, v, c, cnt, pct }) => (
          <Card key={l} style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 11,
                color: pal.textMute,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                fontWeight: 700,
              }}
            >
              {l}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c }}>
              {cnt ? v : "৳" + FMT(v)}
            </div>
            <ProgressBar
              value={pct}
              color={c}
              height={4}
              style={{ marginTop: 8 }}
            />
          </Card>
        ))}
      </div>

      <Card style={{ padding: 20, marginBottom: 22 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 14,
          }}
        >
          Payment Channels
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))",
            gap: 12,
          }}
        >
          {channels.map((chName) => {
            const chDef = allChannels.find((c) => c.name === chName);
            const d = stats.byCh[chName] || { recv: 0, earned: 0, cnt: 0 };
            const gc = chDef?.color || gwColor(chName);
            const gs = chDef?.short || gwShort(chName);
            return (
              <div
                key={chName}
                style={{
                  padding: 14,
                  background: gc + "0c",
                  border: `1px solid ${gc}2e`,
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: gc,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 900,
                      color: "#fff",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {chDef?.iconBase64 ? (
                      <img
                        src={chDef.iconBase64}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      gs
                    )}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: gc }}>
                    {chName}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: pal.textMute }}>
                  Received
                </div>
                <div
                  style={{
                    fontWeight: 900,
                    color: pal.text,
                    fontSize: 17,
                    margin: "2px 0",
                  }}
                >
                  ৳{FMT(d.recv)}
                </div>
                <div style={{ fontSize: 11, color: pal.textMute }}>
                  My share: ৳{FMT(d.earned)} · {d.cnt} txn
                  {d.cnt !== 1 ? "s" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 14,
          }}
        >
          All Transactions ({txns.length})
        </div>
        {txns.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 0",
              color: pal.textFaint,
              fontSize: 13,
            }}
          >
            No transactions yet
          </div>
        ) : (
          txns.map((p) => {
            const c = calcShares(p, currencies),
              myAmt = isSumu ? c.sShare : c.rShare,
              myPct = isSumu ? c.sP : c.rP;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 0",
                  borderBottom: `1px solid ${pal.border}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: color + "18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ArrowUpRight size={16} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: pal.text,
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}
                  >
                    {p.payDay || p.createdAt?.slice(0, 10)} · {myPct}% ·{" "}
                    {p.paymentChannel}
                  </div>
                </div>
                <StatusBadge status={p.status} />
                <div
                  style={{
                    fontWeight: 900,
                    color,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  ৳{FMT(myAmt)}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════════════════ */
function SettingsPage({
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
  const [editCode, setEditCode] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [nc, setNc] = useState({ code: "", symbol: "", rate: "" });

  // Payment method form state
  const PM_BLANK = {
    name: "",
    owner: "sumaiya",
    color: "#0d9488",
    iconBase64: "",
  };
  const [pmForm, setPmForm] = useState(PM_BLANK);
  const [pmEditing, setPmEditing] = useState(null);
  const [pmShowAdd, setPmShowAdd] = useState(false);

  // Channel CRUD state
  const CH_BLANK = {
    name: "",
    owner: "sumaiya",
    color: "#0d9488",
    short: "",
    iconBase64: "",
  };
  const [chForm, setChForm] = useState(CH_BLANK);
  const [chEditing, setChEditing] = useState(null);
  const [chShowAdd, setChShowAdd] = useState(false);

  const inp = useMemo(
    () => ({
      background: pal.inpBg,
      border: `1px solid ${pal.inpBorder}`,
      borderRadius: 10,
      padding: "10px 13px",
      color: pal.text,
      fontSize: 13,
      outline: "none",
      fontFamily: "inherit",
    }),
    [pal.inpBg, pal.inpBorder, pal.text],
  );

  const save = useCallback(
    (list) => {
      setCurrencies(list);
      saveCurrencies(list);
      onLog({ type: "CURRENCY_UPDATED", detail: "Currency rates updated" });
    },
    [setCurrencies, onLog],
  );

  const finishEdit = useCallback(
    (code) => {
      const r = parseFloat(editVal);
      if (r > 0)
        save(currencies.map((c) => (c.code === code ? { ...c, rate: r } : c)));
      setEditCode(null);
    },
    [editVal, currencies, save],
  );

  const addCurr = useCallback(() => {
    if (!nc.code.trim() || !parseFloat(nc.rate)) return;
    save([
      ...currencies,
      {
        code: nc.code.toUpperCase(),
        symbol: nc.symbol || nc.code,
        rate: parseFloat(nc.rate),
      },
    ]);
    setNc({ code: "", symbol: "", rate: "" });
  }, [nc, currencies, save]);

  // Payment methods handlers
  const handlePmIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setPmForm((f) => ({ ...f, iconBase64: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const savePm = () => {
    if (!pmForm.name.trim()) return;
    let updated;
    if (pmEditing) {
      updated = paymentMethods.map((m) =>
        m.id === pmEditing ? { ...m, ...pmForm } : m,
      );
    } else {
      updated = [...paymentMethods, { ...pmForm, id: "pm_" + Date.now() }];
    }
    onPaymentMethodsSave(updated);
    setPmForm(PM_BLANK);
    setPmEditing(null);
    setPmShowAdd(false);
  };

  const deletePm = (id) =>
    onPaymentMethodsSave(paymentMethods.filter((m) => m.id !== id));

  const startEditPm = (m) => {
    setPmForm({
      name: m.name,
      owner: m.owner,
      color: m.color,
      iconBase64: m.iconBase64 || "",
    });
    setPmEditing(m.id);
    setPmShowAdd(true);
  };

  const handleCEOImageUpload = (who) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onCEOImageChange?.(who, ev.target.result);
    reader.readAsDataURL(file);
  };

  // Channel CRUD handlers
  const handleChIconUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) =>
      setChForm((f) => ({ ...f, iconBase64: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const saveCh = () => {
    if (!chForm.name.trim()) return;
    const item = {
      ...chForm,
      short: chForm.short.trim() || chForm.name.slice(0, 2).toUpperCase(),
    };
    let updated;
    if (chEditing) {
      updated = channels.map((c) =>
        c.id === chEditing ? { ...c, ...item } : c,
      );
    } else {
      updated = [...channels, { ...item, id: "ch_" + Date.now() }];
    }
    onChannelsSave(updated);
    setChForm(CH_BLANK);
    setChEditing(null);
    setChShowAdd(false);
  };

  const deleteCh = (id) => onChannelsSave(channels.filter((c) => c.id !== id));

  const startEditCh = (c) => {
    setChForm({
      name: c.name,
      owner: c.owner,
      color: c.color,
      short: c.short || "",
      iconBase64: c.iconBase64 || "",
    });
    setChEditing(c.id);
    setChShowAdd(true);
  };

  const resetChannels = () => {
    if (window.confirm("Reset to default channels?"))
      onChannelsSave(DEF_CHANNELS);
  };

  const OWNER_OPTS = [
    { v: "sumaiya", l: "Sumaiya", c: "#ec4899" },
    { v: "rakib", l: "Rakib", c: "#3b82f6" },
    { v: "company", l: "Company", c: "#0d9488" },
  ];

  return (
    <div style={{ paddingBottom: 48 }}>
      <h2
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: pal.text,
          marginBottom: 22,
        }}
      >
        Settings
      </h2>

      {/* ── CEO Profile Photos ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <User size={15} color="#06b6d4" /> CEO Profile Photos
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>
          Upload photos shown on profile pages and settlement animations.
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[
            { who: "sumaiya", name: "Sumaiya", color: "#ec4899" },
            { who: "rakib", name: "Rakib", color: "#3b82f6" },
          ].map(({ who, name, color }) => {
            const img = ceoImages?.[who];
            return (
              <div
                key={who}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 18px",
                  background: color + "08",
                  border: `1px solid ${color}22`,
                  borderRadius: 14,
                  flex: 1,
                  minWidth: 200,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: color + "22",
                    border: `2px solid ${color}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <User size={22} color={color} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color,
                      marginBottom: 6,
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <label
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        border: "none",
                      }}
                    >
                      {img ? "Change Photo" : "Upload Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleCEOImageUpload(who)}
                      />
                    </label>
                    {img && (
                      <button
                        onClick={() => onCEOImageChange?.(who, null)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#ef4444",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Remove
                      </button>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: pal.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ArrowLeftRight size={15} color="#06b6d4" /> Payment Channels
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={resetChannels}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                background: "rgba(100,116,139,0.1)",
                border: "1px solid rgba(100,116,139,0.25)",
                color: pal.textMute,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Reset
            </button>
            <button
              onClick={() => {
                setChForm(CH_BLANK);
                setChEditing(null);
                setChShowAdd((s) => !s);
              }}
              style={{
                padding: "5px 14px",
                borderRadius: 8,
                background: chShowAdd
                  ? "rgba(239,68,68,0.1)"
                  : "linear-gradient(135deg,#0d9488,#06b6d4)",
                border: chShowAdd ? "1px solid rgba(239,68,68,0.3)" : "none",
                color: chShowAdd ? "#ef4444" : "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {chShowAdd ? (
                <>
                  <X size={12} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus size={12} />
                  Add Channel
                </>
              )}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>
          Channels drive the settlement logic — which CEO received the money.
          Each channel must have an owner (Sumaiya or Rakib).
        </div>

        {/* Add / Edit form */}
        {chShowAdd && (
          <div
            style={{
              padding: 18,
              background: pal.surfaceElevated,
              borderRadius: 14,
              border: `1px solid ${pal.border}`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#06b6d4",
                marginBottom: 14,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {chEditing ? "Edit Channel" : "New Channel"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 80px",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <input
                style={inp}
                placeholder="Channel name (e.g. Rakib-bKash)"
                value={chForm.name}
                onChange={(e) =>
                  setChForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <select
                style={{ ...inp }}
                value={chForm.owner}
                onChange={(e) =>
                  setChForm((f) => ({ ...f, owner: e.target.value }))
                }
              >
                <option value="sumaiya">Sumaiya</option>
                <option value="rakib">Rakib</option>
              </select>
              <input
                style={inp}
                placeholder="Short (e.g. bK)"
                maxLength={4}
                value={chForm.short}
                onChange={(e) =>
                  setChForm((f) => ({
                    ...f,
                    short: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: pal.textMute }}>
                  Color:
                </span>
                <input
                  type="color"
                  value={chForm.color}
                  onChange={(e) =>
                    setChForm((f) => ({ ...f, color: e.target.value }))
                  }
                  style={{
                    width: 40,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${pal.border}`,
                    cursor: "pointer",
                    padding: 2,
                  }}
                />
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: chForm.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#fff",
                  }}
                >
                  {chForm.short || "??"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: pal.textMute }}>
                  Icon (optional):
                </span>
                {chForm.iconBase64 && (
                  <img
                    src={chForm.iconBase64}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      objectFit: "cover",
                      border: `1px solid ${pal.border}`,
                    }}
                  />
                )}
                <label
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "rgba(6,182,212,0.1)",
                    border: "1px solid rgba(6,182,212,0.25)",
                    color: "#06b6d4",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {chForm.iconBase64 ? "Change" : "Upload Icon"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleChIconUpload}
                  />
                </label>
                {chForm.iconBase64 && (
                  <button
                    onClick={() => setChForm((f) => ({ ...f, iconBase64: "" }))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "inherit",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={saveCh}
              style={{
                padding: "9px 24px",
                borderRadius: 10,
                background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                border: "none",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {chEditing ? "Save Changes" : "Add Channel"}
            </button>
          </div>
        )}

        {/* Channel list — grouped by owner */}
        {["sumaiya", "rakib"].map((owner) => {
          const ownerChs = channels.filter((c) => c.owner === owner);
          if (!ownerChs.length) return null;
          const ownerColor = owner === "sumaiya" ? "#ec4899" : "#3b82f6";
          return (
            <div key={owner} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: ownerColor,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 8,
                  marginTop: 4,
                }}
              >
                {owner === "sumaiya" ? "Sumaiya" : "Rakib"}
              </div>
              {ownerChs.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 0",
                    borderBottom: `1px solid ${pal.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: c.color + "22",
                      border: `2px solid ${c.color}55`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      overflow: "hidden",
                    }}
                  >
                    {c.iconBase64 ? (
                      <img
                        src={c.iconBase64}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: c.color,
                        }}
                      >
                        {c.short || c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: pal.text }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: c.color,
                        fontWeight: 600,
                        marginTop: 1,
                      }}
                    >
                      {owner === "sumaiya" ? "Sumaiya" : "Rakib"}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: c.color,
                      flexShrink: 0,
                    }}
                  />
                  <button
                    onClick={() => startEditCh(c)}
                    style={{
                      background: "none",
                      border: "none",
                      color: pal.textMute,
                      cursor: "pointer",
                      padding: 5,
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteCh(c.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 5,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {channels.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              color: pal.textFaint,
              fontSize: 12,
            }}
          >
            No channels. Add one or click Reset.
          </div>
        )}
      </Card>

      {/* ── Payment Methods ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: pal.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CreditCard size={15} color="#06b6d4" /> Payment Methods
          </div>
          <button
            onClick={() => {
              setPmForm(PM_BLANK);
              setPmEditing(null);
              setPmShowAdd((s) => !s);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: pmShowAdd
                ? "rgba(239,68,68,0.1)"
                : "linear-gradient(135deg,#0d9488,#06b6d4)",
              border: pmShowAdd ? "1px solid rgba(239,68,68,0.3)" : "none",
              color: pmShowAdd ? "#ef4444" : "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {pmShowAdd ? (
              <>
                <X size={12} /> Cancel
              </>
            ) : (
              <>
                <Plus size={12} /> Add Method
              </>
            )}
          </button>
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>
          Manage payment gateways and accounts with their logos.
        </div>

        {/* Add / Edit form */}
        {pmShowAdd && (
          <div
            style={{
              padding: 18,
              background: pal.surfaceElevated,
              borderRadius: 14,
              border: `1px solid ${pal.border}`,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#06b6d4",
                marginBottom: 14,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {pmEditing ? "Edit Method" : "New Method"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <input
                style={inp}
                placeholder="Name (e.g. bKash - Sumaiya)"
                value={pmForm.name}
                onChange={(e) =>
                  setPmForm((f) => ({ ...f, name: e.target.value }))
                }
              />
              <select
                style={{ ...inp }}
                value={pmForm.owner}
                onChange={(e) =>
                  setPmForm((f) => ({ ...f, owner: e.target.value }))
                }
              >
                {OWNER_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: pal.textMute }}>
                  Color:
                </span>
                <input
                  type="color"
                  value={pmForm.color}
                  onChange={(e) =>
                    setPmForm((f) => ({ ...f, color: e.target.value }))
                  }
                  style={{
                    width: 40,
                    height: 36,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    background: "none",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <span style={{ fontSize: 12, color: pal.textMute }}>Icon:</span>
                {pmForm.iconBase64 && (
                  <img
                    src={pmForm.iconBase64}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      objectFit: "cover",
                      border: `1px solid ${pal.border}`,
                    }}
                  />
                )}
                <label
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    background: "rgba(6,182,212,0.12)",
                    border: "1px solid rgba(6,182,212,0.3)",
                    color: "#06b6d4",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {pmForm.iconBase64 ? "Change Icon" : "Upload Icon"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePmIconUpload}
                  />
                </label>
                {pmForm.iconBase64 && (
                  <button
                    onClick={() => setPmForm((f) => ({ ...f, iconBase64: "" }))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={savePm}
              style={{
                padding: "9px 24px",
                borderRadius: 10,
                background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                border: "none",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {pmEditing ? "Save Changes" : "Add Method"}
            </button>
          </div>
        )}

        {/* Methods list */}
        {paymentMethods.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: pal.textFaint,
              fontSize: 12,
            }}
          >
            No payment methods yet. Add one above.
          </div>
        ) : (
          paymentMethods.map((m) => {
            const ownerOpt = OWNER_OPTS.find((o) => o.v === m.owner);
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "11px 0",
                  borderBottom: `1px solid ${pal.border}`,
                }}
              >
                {/* Icon / color swatch */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: m.color + "22",
                    border: `2px solid ${m.color}55`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {m.iconBase64 ? (
                    <img
                      src={m.iconBase64}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{ fontSize: 16, fontWeight: 900, color: m.color }}
                    >
                      {m.name?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: pal.text }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: ownerOpt?.c || pal.textMute,
                      fontWeight: 600,
                      marginTop: 2,
                    }}
                  >
                    {ownerOpt?.l || m.owner}
                  </div>
                </div>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: m.color,
                    flexShrink: 0,
                  }}
                />
                <button
                  onClick={() => startEditPm(m)}
                  style={{
                    background: "none",
                    border: "none",
                    color: pal.textMute,
                    cursor: "pointer",
                    padding: 5,
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deletePm(m.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: 5,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </Card>

      {/* ── Currency Rates ── */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 5,
          }}
        >
          Currency Exchange Rates
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, marginBottom: 16 }}>
          All rates against BDT. Click a rate to edit inline.
        </div>
        {currencies.map((c) => (
          <div
            key={c.code}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 0",
              borderBottom: `1px solid ${pal.border}`,
            }}
          >
            <div
              style={{
                width: 52,
                fontWeight: 900,
                color: "#0d9488",
                fontSize: 15,
              }}
            >
              {c.code}
            </div>
            <div style={{ color: pal.textMute, fontSize: 14, flex: 1 }}>
              {c.symbol}
            </div>
            {editCode === c.code ? (
              <input
                style={{ ...inp, width: 130 }}
                type="number"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => finishEdit(c.code)}
                onKeyDown={(e) => e.key === "Enter" && finishEdit(c.code)}
                autoFocus
              />
            ) : (
              <span
                onClick={() => {
                  setEditCode(c.code);
                  setEditVal(String(c.rate));
                }}
                style={{
                  color: pal.text,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                  padding: "6px 12px",
                  background: pal.surfaceElevated,
                  borderRadius: 8,
                }}
              >
                ৳{c.rate}
              </span>
            )}
            <button
              onClick={() => {
                setEditCode(c.code);
                setEditVal(String(c.rate));
              }}
              style={{
                background: "none",
                border: "none",
                color: pal.textMute,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Edit2 size={14} />
            </button>
            {c.code !== "BDT" && (
              <button
                onClick={() =>
                  save(currencies.filter((x) => x.code !== c.code))
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[
            { f: "code", p: "Code" },
            { f: "symbol", p: "Symbol" },
            { f: "rate", p: "Rate to BDT" },
          ].map(({ f, p }, i) => (
            <input
              key={f}
              style={{ ...inp, flex: i === 1 ? 0.6 : 1 }}
              value={nc[f]}
              onChange={(e) => setNc((n) => ({ ...n, [f]: e.target.value }))}
              placeholder={p}
            />
          ))}
          <button
            onClick={addCurr}
            style={{
              background: "linear-gradient(135deg,#0d9488,#06b6d4)",
              border: "none",
              borderRadius: 10,
              padding: "0 16px",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </Card>

      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 14,
          }}
        >
          Rule Reference
        </div>
        {RULES.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: `1px solid ${pal.border}`,
            }}
          >
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 8,
                background: "rgba(6,182,212,0.13)",
                color: "#06b6d4",
                fontWeight: 700,
                fontSize: 12,
                minWidth: 80,
                textAlign: "center",
              }}
            >
              {r.label}
            </span>
            <span style={{ fontSize: 13, color: pal.textSub }}>{r.desc}</span>
          </div>
        ))}
        <div
          style={{
            marginTop: 12,
            padding: 13,
            background: "rgba(6,182,212,0.05)",
            borderRadius: 10,
            fontSize: 12,
            color: pal.textSub,
            borderLeft: "3px solid rgba(6,182,212,0.3)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "#06b6d4" }}>Note 1:</strong> Default is
          CEO-55 if no rule selected.
          <br />
          <strong style={{ color: "#06b6d4" }}>Note 2:</strong> If no CEO works,
          receiving CEO gets the "working" share.
        </div>
      </Card>

      <Card style={{ padding: 22 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Landmark size={15} color="#06b6d4" /> Firebase Migration
        </div>
        <div style={{ fontSize: 12, color: pal.textMute, lineHeight: 1.9 }}>
          1.{" "}
          <code
            style={{
              background: pal.surfaceElevated,
              padding: "2px 6px",
              borderRadius: 4,
              color: "#06b6d4",
              fontSize: 11,
            }}
          >
            npm install firebase
          </code>
          <br />
          2. Create{" "}
          <code
            style={{
              background: pal.surfaceElevated,
              padding: "2px 6px",
              borderRadius: 4,
              color: "#06b6d4",
              fontSize: 11,
            }}
          >
            src/firebaseConfig.js
          </code>{" "}
          with your credentials
          <br />
          3. Open{" "}
          <code
            style={{
              background: pal.surfaceElevated,
              padding: "2px 6px",
              borderRadius: 4,
              color: "#06b6d4",
              fontSize: 11,
            }}
          >
            src/db.js
          </code>{" "}
          — uncomment the FIREBASE sections (~10 lines per function)
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CHANGELOG MODAL
════════════════════════════════════════════════════════════ */
function ChangelogModal({ onClose }) {
  const pal = usePalette();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: pal.overlay,
        backdropFilter: "blur(12px)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          background: pal.drawer,
          borderRadius: 20,
          border: `1px solid ${pal.borderMid}`,
          padding: 28,
          boxShadow: pal.shadowLg,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 900, color: pal.text }}>
            Changelog
          </div>
          <button
            onClick={onClose}
            style={{
              background: pal.surfaceElevated,
              border: "none",
              borderRadius: 8,
              padding: 8,
              color: pal.textMute,
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>
        {CHANGELOG.map((e) => (
          <div key={e.v} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#06b6d4",
                  background: "rgba(6,182,212,0.13)",
                  padding: "4px 12px",
                  borderRadius: 8,
                }}
              >
                v{e.v}
              </span>
              <span style={{ fontSize: 12, color: pal.textMute }}>
                {e.date}
              </span>
            </div>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {e.changes.map((ch, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 9,
                    padding: "5px 0",
                    fontSize: 13,
                    color: pal.textSub,
                    alignItems: "flex-start",
                  }}
                >
                  <CheckCircle
                    size={13}
                    color="#06b6d4"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
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

/* ════════════════════════════════════════════════════════════
   MAIN APP (inner, after auth)
════════════════════════════════════════════════════════════ */
function AppInner({ onLogout }) {
  const pal = usePalette();
  const { dark, toggle } = useTheme();
  const { notify } = useToast();
  const [tab, setTab] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [currencies, setCurrencies] = useState(DEF_CURRENCIES);
  const [expenses, setExpenses] = useState([]);
  const [settledBaseline, setSettledBaseline] = useState(null);
  const [ceoImages, setCeoImages] = useState({ sumaiya: null, rakib: null });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [channels, setChannels] = useState(DEF_CHANNELS);
  const [modal, setModal] = useState(null);
  const [showCL, setShowCL] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const saveTimer = useRef(null);

  const flashSave = useCallback(() => {
    setSaving(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaving(false), 1400);
  }, []);

  useEffect(() => {
    const tid = notify({ type: "loading", message: "Loading your data…" });
    Promise.all([
      loadProjects(),
      loadCurrencies(DEF_CURRENCIES),
      loadExpenses(),
      loadSettledBaseline(),
      loadCEOImages(),
      loadPaymentMethods(),
      loadChannels(),
    ])
      .then(([p, c, e, sb, ci, pm, ch]) => {
        setProjects(p);
        setCurrencies(c);
        setExpenses(e);
        setSettledBaseline(sb);
        setCeoImages(ci || { sumaiya: null, rakib: null });
        setPaymentMethods(pm || []);
        setChannels(ch || DEF_CHANNELS);
        setLoading(false);
        notify({
          id: tid,
          type: "success",
          message: `Loaded ${p.length} project${p.length !== 1 ? "s" : ""}`,
        });
      })
      .catch(() => {
        setLoading(false);
        notify({
          id: tid,
          type: "error",
          message: "Failed to load data — check storage",
        });
      });
    logActivity({
      id: GEN_ID(),
      type: "LOGIN",
      detail: "Session started",
      timestamp: TS(),
    });
  }, []);

  const addLog = useCallback(async (entry) => {
    await logActivity({ id: GEN_ID(), timestamp: TS(), ...entry });
  }, []);

  const handleSave = useCallback(
    async (p) => {
      const isNew = !p.updatedAt || p.createdAt === p.updatedAt;
      const tid = notify({
        type: "loading",
        message: isNew ? `Creating "${p.name}"…` : `Saving "${p.name}"…`,
      });
      try {
        await saveProject(p);
        const updated = await loadProjects();
        setProjects(updated);
        setModal(null);
        flashSave();
        notify({
          id: tid,
          type: "success",
          title: isNew ? "Project Created" : "Project Saved",
          message: `"${p.name}" saved successfully`,
        });
        await addLog({
          type: isNew ? "PROJECT_CREATED" : "PROJECT_UPDATED",
          detail: `Project "${p.name}" ${isNew ? "created" : "updated"}`,
        });
      } catch {
        notify({
          id: tid,
          type: "error",
          title: "Save Failed",
          message: "Could not save project",
        });
      }
    },
    [addLog, notify],
  );

  const handleDelete = useCallback(
    async (id) => {
      const p = projects.find((x) => x.id === id);
      const tid = notify({
        type: "loading",
        message: `Deleting "${p?.name}"…`,
      });
      try {
        await deleteProject(id);
        setProjects(await loadProjects());
        flashSave();
        notify({ id: tid, type: "success", message: `"${p?.name}" deleted` });
        await addLog({
          type: "PROJECT_DELETED",
          detail: `Project "${p?.name || id}" deleted`,
        });
      } catch {
        notify({ id: tid, type: "error", message: "Delete failed" });
      }
    },
    [projects, addLog, notify],
  );

  const handleProjectUpdate = useCallback(
    async (updated) => {
      const tid = notify({ type: "loading", message: "Updating payment…" });
      try {
        await saveProject(updated);
        setProjects(await loadProjects());
        flashSave();
        notify({ id: tid, type: "success", message: "Payment updated" });
        await addLog({
          type: "PAYMENT_UPDATED",
          detail: `Payment entry updated on "${updated.name}"`,
        });
      } catch {
        notify({ id: tid, type: "error", message: "Payment update failed" });
      }
    },
    [addLog, notify],
  );

  const handleSettle = useCallback(
    async (rawAtSettlement) => {
      const tid = notify({ type: "loading", message: "Recording settlement…" });
      try {
        await saveSettledBaseline(rawAtSettlement);
        setSettledBaseline(rawAtSettlement);
        flashSave();
        notify({
          id: tid,
          type: "success",
          title: "Settlement Recorded",
          message: "Balance has been reset",
        });
      } catch {
        notify({
          id: tid,
          type: "error",
          message: "Failed to record settlement",
        });
      }
    },
    [notify],
  );

  const handleCEOImageChange = useCallback(
    async (who, base64) => {
      const next = { ...ceoImages, [who]: base64 };
      setCeoImages(next);
      const tid = notify({
        type: "loading",
        message: `Saving ${who === "sumaiya" ? "Sumaiya" : "Rakib"}'s photo…`,
      });
      try {
        await saveCEOImages(next);
        flashSave();
        notify({
          id: tid,
          type: "success",
          message: base64 ? "Photo saved" : "Photo removed",
        });
      } catch {
        notify({ id: tid, type: "error", message: "Photo save failed" });
      }
    },
    [ceoImages, notify],
  );

  const handlePaymentMethodsSave = useCallback(
    async (list) => {
      setPaymentMethods(list);
      const tid = notify({
        type: "loading",
        message: "Saving payment methods…",
      });
      try {
        await savePaymentMethods(list);
        flashSave();
        notify({ id: tid, type: "success", message: "Payment methods saved" });
      } catch {
        notify({
          id: tid,
          type: "error",
          message: "Failed to save payment methods",
        });
      }
    },
    [notify],
  );

  const handleChannelsSave = useCallback(
    async (list) => {
      setChannels(list);
      const tid = notify({ type: "loading", message: "Saving channels…" });
      try {
        await saveChannels(list);
        flashSave();
        notify({
          id: tid,
          type: "success",
          message: `${list.length} channel${
            list.length !== 1 ? "s" : ""
          } saved`,
        });
      } catch {
        notify({ id: tid, type: "error", message: "Failed to save channels" });
      }
    },
    [notify],
  );

  // debt used for sidebar badge — reflects settled baseline and dynamic channels
  const appDebt = useMemo(
    () => calcDebt(projects, currencies, expenses, settledBaseline, channels),
    [projects, currencies, expenses, settledBaseline, channels],
  );

  const NAV = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    {
      id: "settlement",
      label: "Settlement",
      Icon: ArrowLeftRight,
      accent: "#10b981",
      needsSettle: appDebt.amount > 0.01,
    },
    { id: "projects", label: "Projects", Icon: FolderOpen },
    {
      id: "sumaiya",
      label: "Sumaiya",
      Icon: User,
      color: "#ec4899",
      tag: "CEO1",
    },
    { id: "rakib", label: "Rakib", Icon: User, color: "#3b82f6", tag: "CEO2" },
    { id: "divider1", label: "─────────────", Icon: null, divider: true },
    { id: "payments", label: "Payments", Icon: CreditCard, accent: "#8b5cf6" },
    { id: "expenses", label: "Expenses", Icon: Receipt, accent: "#f59e0b" },
    { id: "invoice", label: "Invoice Gen", Icon: FileText, accent: "#06b6d4" },
    { id: "divider2", label: "─────────────", Icon: null, divider: true },
    { id: "activity", label: "Activity", Icon: Activity },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: dark ? "#080d1a" : "#f0f2f7",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans',system-ui",
          color: "#06b6d4",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: "linear-gradient(135deg,#0d9488,#06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(6,182,212,0.4)",
          }}
        >
          <Wallet size={26} color="#fff" />
        </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>ZBFinanceManager</div>
        <div style={{ fontSize: 13, color: "#64748b" }}>Loading your data…</div>
      </div>
    );

  return (
    <ChannelsProvider value={channels}>
      <div
        style={{
          minHeight: "100vh",
          background: pal.bg,
          fontFamily: "'DM Sans',system-ui,sans-serif",
          color: pal.text,
          display: "flex",
        }}
      >
        {/* Soft gradient blobs — no canvas */}
        <div
          style={{
            position: "fixed",
            top: "10%",
            left: "5%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(6,182,212,0.04) 0%,transparent 65%)",
            pointerEvents: "none",
            zIndex: 0,
            animation: "blobFloat 12s ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "fixed",
            bottom: "10%",
            right: "5%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle,rgba(236,72,153,0.04) 0%,transparent 65%)",
            pointerEvents: "none",
            zIndex: 0,
            animation: "blobFloat 15s ease-in-out infinite reverse",
          }}
        />

        {/* Mobile nav toggle */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setSidebarOpen((o) => !o)}
        >
          {sidebarOpen ? (
            <X size={20} />
          ) : (
            <span style={{ fontSize: 20, lineHeight: 1 }}>☰</span>
          )}
        </button>
        {sidebarOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={"sidebar" + (sidebarOpen ? " open" : "")}
          style={{
            width: 228,
            flexShrink: 0,
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            background: pal.sidebar,
            backdropFilter: "blur(24px)",
            borderRight: `1px solid ${pal.sidebarBorder}`,
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
          }}
        >
          {/* Logo */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: `1px solid ${pal.sidebarBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 0 20px rgba(6,182,212,0.35)",
                  animation: "glow 3s ease-in-out infinite",
                }}
              >
                <Wallet size={19} color="#fff" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: -0.4,
                  }}
                >
                  ZBFinance
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: pal.textFaint,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                  }}
                >
                  Manager v1.4
                </div>
              </div>
            </div>
          </div>

          <nav
            style={{
              flex: 1,
              padding: "12px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {NAV.map(
              ({
                id,
                label,
                Icon,
                color,
                accent,
                tag,
                divider,
                needsSettle,
              }) => {
                if (divider)
                  return (
                    <div
                      key={id}
                      style={{
                        height: 1,
                        background: pal.sidebarBorder,
                        margin: "4px 8px",
                      }}
                    />
                  );
                const active = tab === id,
                  ac = color || accent || "#06b6d4";
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setTab(id);
                      setSidebarOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${active ? ac + "28" : "transparent"}`,
                      background: active ? ac + "13" : "transparent",
                      cursor: "pointer",
                      color: active ? ac : pal.textMute,
                      fontWeight: active ? 700 : 500,
                      fontSize: 13.5,
                      transition: "all 0.15s",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    {Icon && <Icon size={16} />}
                    <span style={{ flex: 1 }}>{label}</span>
                    {tag && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: ac,
                          background: ac + "1e",
                          padding: "2px 6px",
                          borderRadius: 5,
                          letterSpacing: 0.5,
                        }}
                      >
                        {tag}
                      </span>
                    )}
                    {needsSettle && (
                      <span
                        className="settle-badge"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              },
            )}
          </nav>

          <div
            style={{
              padding: "0 10px 18px",
              borderTop: `1px solid ${pal.sidebarBorder}`,
              paddingTop: 12,
            }}
          >
            {/* Cloud save indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 10,
                fontSize: 11,
                color: saving ? "#06b6d4" : pal.textFaint,
                transition: "color 0.4s",
              }}
            >
              {saving ? (
                <>
                  <Save
                    size={11}
                    style={{ animation: "pulse 0.8s ease-in-out infinite" }}
                  />
                  <span style={{ fontWeight: 600 }}>Saving…</span>
                </>
              ) : (
                <>
                  <Cloud size={11} />
                  <span>All changes saved</span>
                </>
              )}
            </div>
            <button
              onClick={() => setModal({})}
              style={{
                width: "100%",
                padding: "11px 0",
                background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                border: "none",
                borderRadius: 12,
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                boxShadow: "0 4px 16px rgba(6,182,212,0.32)",
                letterSpacing: 0.3,
                fontFamily: "inherit",
                marginBottom: 8,
              }}
            >
              <Plus size={15} /> New Project
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={toggle}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  background: pal.surfaceElevated,
                  border: `1px solid ${pal.border}`,
                  borderRadius: 10,
                  color: pal.textMute,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                {dark ? (
                  <>
                    <Sun size={13} />
                    Light
                  </>
                ) : (
                  <>
                    <Moon size={13} />
                    Dark
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  clearSession();
                  onLogout();
                }}
                style={{
                  padding: "9px 12px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10,
                  color: "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                <LogOut size={13} />
              </button>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                padding: "0 2px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 2,
                  background: "linear-gradient(90deg,#ec489922,#ec4899)",
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 2,
                  background: "linear-gradient(90deg,#3b82f6,#3b82f622)",
                }}
              />
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main
          className="main-content"
          style={{
            marginLeft: 228,
            flex: 1,
            padding: "30px 32px",
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            maxWidth: "calc(100vw - 228px)",
          }}
        >
          {tab === "dashboard" && (
            <Dashboard
              projects={projects}
              currencies={currencies}
              expenses={expenses}
              settledBaseline={settledBaseline}
              onAdd={() => setModal({})}
              setTab={setTab}
            />
          )}
          {tab === "settlement" && (
            <Settlement
              projects={projects}
              currencies={currencies}
              expenses={expenses}
              settledBaseline={settledBaseline}
              onLog={addLog}
              onSettle={handleSettle}
              ceoImages={ceoImages}
            />
          )}
          {tab === "projects" && (
            <Projects
              projects={projects}
              currencies={currencies}
              onAdd={() => setModal({})}
              onEdit={(p) => setModal({ project: p })}
              onDelete={handleDelete}
            />
          )}
          {tab === "sumaiya" && (
            <CEOProfile
              who="sumaiya"
              projects={projects}
              currencies={currencies}
              ceoImages={ceoImages}
              onCEOImageChange={handleCEOImageChange}
            />
          )}
          {tab === "rakib" && (
            <CEOProfile
              who="rakib"
              projects={projects}
              currencies={currencies}
              ceoImages={ceoImages}
              onCEOImageChange={handleCEOImageChange}
            />
          )}
          {tab === "payments" && (
            <Payments
              projects={projects}
              currencies={currencies}
              onProjectUpdate={handleProjectUpdate}
            />
          )}
          {tab === "expenses" && (
            <Expenses
              currencies={currencies}
              onLog={async (e) => {
                await addLog(e);
                setExpenses(await loadExpenses());
              }}
            />
          )}
          {tab === "invoice" && (
            <InvoiceGen
              currencies={currencies}
              projects={projects}
              onLog={addLog}
            />
          )}
          {tab === "activity" && <ActivityLog />}
          {tab === "settings" && (
            <SettingsPage
              currencies={currencies}
              setCurrencies={setCurrencies}
              onLog={addLog}
              ceoImages={ceoImages}
              onCEOImageChange={handleCEOImageChange}
              paymentMethods={paymentMethods}
              onPaymentMethodsSave={handlePaymentMethodsSave}
              channels={channels}
              onChannelsSave={handleChannelsSave}
            />
          )}
        </main>

        {/* Changelog FAB */}
        <button
          onClick={() => setShowCL(true)}
          title="Changelog"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 46,
            height: 46,
            borderRadius: 23,
            background: "linear-gradient(135deg,#0d9488,#06b6d4)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 22px rgba(6,182,212,0.45)",
            zIndex: 200,
            animation: "float 4s ease-in-out infinite",
          }}
        >
          <History size={19} />
        </button>

        {showCL && <ChangelogModal onClose={() => setShowCL(false)} />}
        {modal !== null && (
          <ProjectModal
            project={modal.project}
            currencies={currencies}
            onSave={handleSave}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </ChannelsProvider>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT WITH AUTH
════════════════════════════════════════════════════════════ */
function AppRoot() {
  const [authed, setAuthed] = useState(() => !!getSession());
  return authed ? (
    <AppInner onLogout={() => setAuthed(false)} />
  ) : (
    <AuthPage onAuth={() => setAuthed(true)} />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
        `}</style>
        <AppRoot />
      </ToastProvider>
    </ThemeProvider>
  );
}
