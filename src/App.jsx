/**
 * App — root component tree.
 *
 * AppInner  : loads all data, manages global state, wires handlers, renders
 *             the sidebar + main-content tab router.
 * AppRoot   : auth gate.
 * App       : theme + toast providers + global CSS keyframes.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Wallet, History, X } from "lucide-react";
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
import { DEF_CURRENCIES, DEF_CHANNELS, GEN_ID, FMT, TS } from "./constants";
import { calcDebt } from "./calc";
import { ChannelsProvider } from "./components/Shared";
import { ToastProvider, useToast } from "./context/ToastContext";
import ProjectModal from "./components/ProjectModal";
import BackupRestore from "./components/BackupRestore";
import Sidebar from "./components/Sidebar";
import ChangelogModal from "./components/ChangelogModal";
import AuthPage from "./auth";

/* ── Page imports ─────────────────────────────────────────── */
import Dashboard from "./pages/Dashboard";
import Settlement from "./pages/Settlement";
import Projects from "./pages/Projects";
import CEOProfile from "./pages/CEOProfile";
import Settings from "./pages/Settings";
import ActivityLog from "./pages/ActivityLog";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import InvoiceGen from "./pages/InvoiceGen";
import Reports from "./pages/Reports";

/* ════════════════════════════════════════════════════════════
   APP INNER — data layer + routing shell
════════════════════════════════════════════════════════════ */
function AppInner({ onLogout }) {
  const pal = usePalette();
  const { dark } = useTheme();
  const { notify } = useToast();

  /* ── State ── */
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

  /* ── Bootstrap load ── */
  useEffect(() => {
    const tid = notify({ type: "loading", message: "Loading your data…" });
    Promise.all([
      loadProjects(),
      loadCurrencies(DEF_CURRENCIES),
      loadExpenses(),
      loadSettledBaseline(),
      loadCEOImages(),
      loadPaymentMethods(),
      loadSettlements(),
      loadChannels(),
    ])
      .then(([p, c, e, sb, ci, pm, _settlements, ch]) => {
        setProjects(p);
        // Guard: if DB returns nothing (first launch), keep DEF_CURRENCIES
        setCurrencies(c && c.length > 0 ? c : DEF_CURRENCIES);
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

  /* ── Activity log helper ── */
  const addLog = useCallback(async (entry) => {
    await logActivity({ id: GEN_ID(), timestamp: TS(), ...entry });
  }, []);

  /* ── Project handlers ── */
  const handleSave = useCallback(
    async (p) => {
      const isNew = !p.updatedAt || p.createdAt === p.updatedAt;
      const tid = notify({
        type: "loading",
        message: isNew ? `Creating "${p.name}"…` : `Saving "${p.name}"…`,
      });
      try {
        await saveProject(p);
        setProjects(await loadProjects());
        setModal(null);
        flashSave();
        notify({
          id: tid,
          type: "success",
          message: isNew ? `"${p.name}" created` : `"${p.name}" saved`,
        });
        addLog({
          type: isNew ? "PROJECT_CREATED" : "PROJECT_UPDATED",
          detail: `Project "${p.name}"`,
        });
      } catch {
        notify({ id: tid, type: "error", message: "Save failed" });
      }
    },
    [notify, flashSave, addLog],
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this project?")) return;
      const tid = notify({ type: "loading", message: "Deleting…" });
      try {
        await deleteProject(id);
        setProjects(await loadProjects());
        flashSave();
        notify({ id: tid, type: "success", message: "Project deleted" });
        addLog({ type: "PROJECT_DELETED", detail: "Project deleted" });
      } catch {
        notify({ id: tid, type: "error", message: "Delete failed" });
      }
    },
    [notify, flashSave, addLog],
  );

  const handleProjectUpdate = useCallback(
    async (p) => {
      await saveProject(p);
      setProjects(await loadProjects());
      flashSave();
    },
    [flashSave],
  );

  /* ── Settlement handler ── */
  const handleSettle = useCallback(
    async (raw) => {
      await saveSettledBaseline(raw);
      setSettledBaseline(raw);
      flashSave();
    },
    [flashSave],
  );

  /* ── CEO image handler ── */
  const handleCEOImageChange = useCallback(
    async (who, base64) => {
      const next = { ...ceoImages, [who]: base64 };
      setCeoImages(next);
      const tid = notify({
        type: "loading",
        message: `Saving ${who === "sumaiya" ? "Sumaiya" : "Rakib"}'s photo…`,
      });
      try {
        const compressed = await saveCEOImages(next);
        setCeoImages(compressed);
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
    [ceoImages, notify, flashSave],
  );

  /* ── Payment methods handler ── */
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
    [notify, flashSave],
  );

  /* ── Channels handler ── */
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
    [notify, flashSave],
  );

  /* ── Expenses refresh (called by Expenses page on save) ── */
  const handleExpensesChange = useCallback(async () => {
    setExpenses(await loadExpenses());
  }, []);

  /* ── Sidebar debt badge ── */
  const appDebt = useMemo(
    () =>
      calcDebt(projects, currencies, expenses, settledBaseline, channels)
        .amount,
    [projects, currencies, expenses, settledBaseline, channels],
  );

  /* ── Loading screen ── */
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
        {/* Decorative blobs */}
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

        {/* Mobile header */}
        <header
          className="mobile-header"
          style={{ background: pal.sidebar, backdropFilter: "blur(20px)" }}
        >
          <button
            className="mobile-nav-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: sidebarOpen
                ? "rgba(239,68,68,0.12)"
                : "rgba(6,182,212,0.1)",
              color: sidebarOpen ? "#ef4444" : "#06b6d4",
            }}
          >
            {sidebarOpen ? (
              <X size={20} />
            ) : (
              <span style={{ fontSize: 20, lineHeight: 1 }}>☰</span>
            )}
          </button>
        </header>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          tab={tab}
          setTab={setTab}
          saving={saving}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onNewProject={() => setModal({})}
          onLogout={onLogout}
          appDebt={appDebt}
        />

        {/* Main content */}
        <main
          className="main-content"
          style={{
            flex: 1,
            padding: "30px 32px",
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            boxSizing: "border-box",
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
              onLog={addLog}
              onSaved={handleExpensesChange}
            />
          )}
          {tab === "invoice" && (
            <InvoiceGen
              currencies={currencies}
              projects={projects}
              onLog={addLog}
            />
          )}
          {tab === "reports" && (
            <Reports projects={projects} currencies={currencies} />
          )}
          {tab === "activity" && <ActivityLog />}
          {tab === "settings" && (
            <Settings
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
   AUTH GATE
════════════════════════════════════════════════════════════ */
function AppRoot() {
  const [authed, setAuthed] = useState(() => !!getSession());
  return authed ? (
    <AppInner onLogout={() => setAuthed(false)} />
  ) : (
    <AuthPage onAuth={() => setAuthed(true)} />
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT — providers + global CSS
════════════════════════════════════════════════════════════ */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <style>{`
          @keyframes pb-shimmer {
            0%   { background-position: -100% 0; }
            100% { background-position: 200% 0; }
          }
          .pb-shimmer { animation: pb-shimmer 1.6s ease-in-out infinite; }
          @keyframes pb-fill-in { from { width: 0%; } }
          .pb-fill    { animation: pb-fill-in 0.9s cubic-bezier(0.34,1.56,0.64,1) both; }
          .pb-striped {
            background-size: 24px 24px !important;
            animation: pb-fill-in 0.9s cubic-bezier(0.34,1.56,0.64,1) both, pb-stripe 0.6s linear infinite;
          }
          @keyframes pb-stripe { from { background-position: 0 0; } to { background-position: 24px 0; } }
          @keyframes card-float-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
          .card-animated { animation: card-float-in 0.35s ease both; }
          @keyframes blobFloat {
            0%,100% { transform: translate(0,0) scale(1); }
            33%     { transform: translate(40px,-30px) scale(1.06); }
            66%     { transform: translate(-25px,20px) scale(0.95); }
          }
          @keyframes float  { 0%,100% { transform: translateY(0); }  50% { transform: translateY(-10px); } }
          @keyframes glow   { 0%,100% { opacity:1; filter:drop-shadow(0 0 6px currentColor);  } 50% { opacity:0.7; filter:drop-shadow(0 0 18px currentColor); } }
          @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.65; } }
          @keyframes spin   { to { transform: rotate(360deg); } }
          @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }

          ::-webkit-scrollbar       { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }

          .mobile-header      { display: none; }
          .mobile-nav-toggle  { display: none; }
          .mobile-overlay     { display: none; }
          .sidebar            { transform: translateX(0); transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
          .main-content       { margin-left: 228px; max-width: calc(100vw - 228px); }

          @media (max-width: 600px) { input, select, textarea { font-size: 16px !important; } }

          @media (max-width: 900px) {
            .sidebar           { transform: translateX(-100%); z-index: 300 !important; top: 52px !important; box-shadow: 4px 0 32px rgba(0,0,0,0.45); }
            .sidebar.open      { transform: translateX(0); }
            .sidebar-logo      { display: none; }
            .mobile-overlay    { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 299; backdrop-filter: blur(2px); }
            .main-content      { margin-left: 0 !important; max-width: 100vw !important; padding-top: 60px !important; }
            .mobile-header     { display: flex; align-items: center; justify-content: flex-start; position: fixed; top: 0; left: 0; right: 0; height: 52px; padding: 0 12px; z-index: 200; border-bottom: 1px solid rgba(255,255,255,0.06); }
            .mobile-nav-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border: none; border-radius: 11px; cursor: pointer; flex-shrink: 0; transition: background 0.15s; }
          }
          @media (max-width: 600px) {
            .main-content { padding: 68px 12px 80px !important; }
            .mobile-grid-1 { grid-template-columns: 1fr !important; }
            .mobile-card-tight { padding: 14px !important; }
            .mobile-value-lg { font-size: 18px !important; }
          }
          @media (max-width: 380px) { .main-content { padding: 64px 10px 80px !important; } }
        `}</style>
        <AppRoot />
      </ToastProvider>
    </ThemeProvider>
  );
}
