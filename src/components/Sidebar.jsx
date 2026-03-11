/**
 * Sidebar — fixed left navigation rail with logo, nav items,
 * save indicator, new-project CTA, theme toggle, and logout.
 */
import {
  LayoutDashboard,
  FolderOpen,
  User,
  Settings,
  Plus,
  ArrowLeftRight,
  Activity,
  Receipt,
  FileText,
  CreditCard,
  Sun,
  Moon,
  Wallet,
  LogOut,
  Save,
  Cloud,
  X,
  BarChart2,
  Users,
  Briefcase,
} from "lucide-react";
import { usePalette, useTheme } from "../theme";
import { clearSession } from "../db";

/* NAV is exported so AppInner can derive appDebt badge from it */
export function buildNav(appDebt) {
  return [
    { id: "dashboard",  label: "Dashboard",   Icon: LayoutDashboard },
    {
      id: "settlement",
      label: "Settlement",
      Icon: ArrowLeftRight,
      accent: "#10b981",
      needsSettle: appDebt > 0.01,
    },
    { id: "projects",   label: "Projects",    Icon: FolderOpen },
    {
      id: "sumaiya",
      label: "Sumaiya",
      Icon: User,
      color: "#ec4899",
      tag: "CEO1",
    },
    { id: "rakib",      label: "Rakib",       Icon: User, color: "#3b82f6", tag: "CEO2" },
    { id: "divider1",   label: "─────────────", Icon: null, divider: true },
    { id: "payments",   label: "Payments",    Icon: CreditCard, accent: "#8b5cf6" },
    { id: "expenses",   label: "Expenses",    Icon: Receipt,    accent: "#f59e0b" },
    { id: "invoice",    label: "Invoice Gen", Icon: FileText,   accent: "#06b6d4" },
    { id: "clients",    label: "Clients",     Icon: Users,      accent: "#a855f7" },
    { id: "employees",  label: "Employees",   Icon: Briefcase,  accent: "#f97316" },
    { id: "divider2",   label: "─────────────", Icon: null, divider: true },
    { id: "reports",    label: "Reports",     Icon: BarChart2 },
    { id: "activity",   label: "Activity",    Icon: Activity },
    { id: "settings",   label: "Settings",    Icon: Settings },
  ];
}

export default function Sidebar({
  tab,
  setTab,
  saving,
  sidebarOpen,
  setSidebarOpen,
  onNewProject,
  onLogout,
  appDebt,
}) {
  const pal = usePalette();
  const { dark, toggle } = useTheme();
  const nav = buildNav(appDebt);

  return (
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
        className="sidebar-logo"
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
              Manager v2.0
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {nav.map(
          ({ id, label, Icon, color, accent, tag, divider, needsSettle }) => {
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
                  fontFamily: "inherit",
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

      {/* Bottom actions */}
      <div
        style={{
          padding: "0 10px 18px",
          borderTop: `1px solid ${pal.sidebarBorder}`,
          paddingTop: 12,
        }}
      >
        {/* Save indicator */}
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

        {/* New Project */}
        <button
          onClick={onNewProject}
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

        {/* Theme + Logout */}
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
                <Sun size={13} /> Light
              </>
            ) : (
              <>
                <Moon size={13} /> Dark
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

        {/* CEO colour bar */}
        <div
          style={{ marginTop: 12, display: "flex", gap: 8, padding: "0 2px" }}
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
  );
}