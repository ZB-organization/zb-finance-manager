import { useState, useEffect } from "react";
import { Shield, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { hashPassword, getStoredHash, setStoredHash, setSession } from "./db";
import { useTheme } from "./theme";

export default function AuthPage({ onAuth }) {
  const { dark } = useTheme();

  const [hasHash, setHasHash] = useState(null); // null = still loading
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Async check — looks in localStorage first, Firestore fallback (new device)
  useEffect(() => {
    getStoredHash().then((h) => setHasHash(!!h));
  }, []);

  const pal = {
    bg: dark ? "#080d1a" : "#f0f2f7",
    card: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.88)",
    border: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    text: dark ? "#f0f4ff" : "#0d1b2e",
    mute: dark ? "#4a6280" : "#5a7592",
    inp: dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.95)",
    inpB: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
  };

  const inpStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: pal.inp,
    border: `1px solid ${pal.inpB}`,
    borderRadius: 10,
    padding: "13px 44px 13px 14px",
    color: pal.text,
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
  };

  const handleSubmit = async () => {
    if (!pw.trim()) {
      setErr("Enter your password");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const existingHash = await getStoredHash();

      if (!existingHash) {
        // ── First-time setup ──────────────────────────────────────────
        if (pw.length < 6) {
          setErr("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        if (pw !== pw2) {
          setErr("Passwords do not match");
          setLoading(false);
          return;
        }
        const h = await hashPassword(pw);
        await setStoredHash(h); // saves to localStorage + Firestore (central)
        setHasHash(true);
        setSession();
        onAuth();
      } else {
        // ── Returning user ────────────────────────────────────────────
        const h = await hashPassword(pw);
        if (h === existingHash) {
          setSession();
          onAuth();
        } else {
          setErr("Incorrect password. Try again.");
        }
      }
    } catch (e) {
      setErr("An error occurred. Please try again.");
    }
    setLoading(false);
  };

  // ── Loading state (while checking localStorage / Firestore) ──────────
  if (hasHash === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: dark ? "#080d1a" : "#f0f2f7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "linear-gradient(135deg,#0d9488,#06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(6,182,212,0.4)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <Shield size={22} color="#fff" />
          </div>
          <div style={{ fontSize: 13, color: dark ? "#4a6280" : "#5a7592" }}>
            Checking credentials…
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    );
  }

  // ── Main auth form ────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: pal.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: 20,
      }}
    >
      {/* Animated background blobs */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "20%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(6,182,212,0.08) 0%,transparent 70%)",
          pointerEvents: "none",
          animation: "blobFloat 8s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "20%",
          right: "20%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(236,72,153,0.07) 0%,transparent 70%)",
          pointerEvents: "none",
          animation: "blobFloat 10s ease-in-out infinite reverse",
        }}
      />

      <div
        style={{
          width: 400,
          maxWidth: "100%",
          background: pal.card,
          border: `1px solid ${pal.border}`,
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: dark
            ? "0 24px 80px rgba(0,0,0,0.6)"
            : "0 24px 60px rgba(0,0,0,0.12)",
          backdropFilter: "blur(20px)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: "linear-gradient(135deg,#0d9488,#06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 32px rgba(6,182,212,0.4)",
            }}
          >
            <Shield size={28} color="#fff" />
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: pal.text,
              letterSpacing: -0.5,
            }}
          >
            ZBFinanceManager
          </div>
          <div style={{ fontSize: 13, color: pal.mute, marginTop: 6 }}>
            {hasHash
              ? "Enter your password to continue"
              : "Set a master password to get started"}
          </div>
        </div>

        {/* Password field */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <Lock
              size={16}
              color={pal.mute}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={
                hasHash
                  ? "Your password"
                  : "Create master password (min. 6 chars)"
              }
              style={{ ...inpStyle, paddingLeft: 44 }}
              autoFocus
            />
            <button
              onClick={() => setShow((s) => !s)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: pal.mute,
                cursor: "pointer",
                lineHeight: 0,
                padding: 4,
              }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm password — only on first-time setup */}
        {!hasHash && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ position: "relative" }}>
              <KeyRound
                size={16}
                color={pal.mute}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type={show ? "text" : "password"}
                value={pw2}
                onChange={(e) => {
                  setPw2(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Confirm password"
                style={{ ...inpStyle, paddingLeft: 44 }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {err && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: "#ef4444",
              marginBottom: 14,
            }}
          >
            {err}
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 0",
            background: loading
              ? "rgba(6,182,212,0.5)"
              : "linear-gradient(135deg,#0d9488,#06b6d4)",
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontSize: 15,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 6px 24px rgba(6,182,212,0.35)",
            letterSpacing: 0.4,
            fontFamily: "inherit",
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Verifying…" : hasHash ? "Unlock" : "Set Password & Enter"}
        </button>

        {/* Footer note */}
        <div
          style={{
            textAlign: "center",
            marginTop: 18,
            fontSize: 11,
            color: pal.mute,
            lineHeight: 1.6,
          }}
        >
          🔐 Password hashed with SHA-256 · Synced centrally via Firebase
          <br />
          Session resets on tab close
        </div>
      </div>

      <style>{`
        @keyframes blobFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
