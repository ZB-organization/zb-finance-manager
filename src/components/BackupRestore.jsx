/**
 * BackupRestore.jsx
 * Drop this anywhere — currently used inside SettingsPage.
 *
 * Usage in App.jsx SettingsPage return JSX:
 *   import BackupRestore from "./components/BackupRestore";
 *   ...
 *   <BackupRestore onLog={onLog} />
 */

import { useState, useRef } from "react";
import { Download, Upload, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { exportBackup, importBackup } from "../db";
import { usePalette } from "../theme";

export default function BackupRestore({ onLog }) {
  const pal = usePalette();
  const fileRef = useRef(null);

  const [exportState, setExportState] = useState("idle"); // idle | loading | done | error
  const [importState, setImportState] = useState("idle"); // idle | loading | done | error
  const [importProgress, setImportProgress] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Export ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExportState("loading");
    setErrorMsg("");
    try {
      const meta = await exportBackup();
      setExportState("done");
      onLog?.({
        type: "BACKUP_EXPORTED",
        detail: `Backup exported: ${meta.counts.projects} projects, ${meta.counts.expenses} expenses`,
      });
      setTimeout(() => setExportState("idle"), 3000);
    } catch (e) {
      setErrorMsg(e.message);
      setExportState("error");
      setTimeout(() => setExportState("idle"), 5000);
    }
  };

  // ── Import ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset so same file can be re-selected

    if (!file.name.endsWith(".json")) {
      setErrorMsg("Please select a .json backup file.");
      setImportState("error");
      setTimeout(() => setImportState("idle"), 4000);
      return;
    }

    const confirmed = window.confirm(
      `Import "${file.name}"?\n\nThis will MERGE the backup data with your current data. Existing records with the same ID will be overwritten.\n\nContinue?`
    );
    if (!confirmed) return;

    setImportState("loading");
    setImportProgress("Reading file…");
    setImportResult(null);
    setErrorMsg("");

    try {
      const result = await importBackup(file, {
        onProgress: (msg) => setImportProgress(msg),
      });
      setImportResult(result.counts);
      setImportState("done");
      onLog?.({
        type: "BACKUP_IMPORTED",
        detail: `Backup imported: ${result.counts?.projects ?? "?"} projects, ${result.counts?.expenses ?? "?"} expenses`,
      });
    } catch (e) {
      setErrorMsg(e.message);
      setImportState("error");
      setTimeout(() => setImportState("idle"), 6000);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────
  const cardStyle = {
    background: pal.surfaceElevated,
    border: `1px solid ${pal.border}`,
    borderRadius: 16,
    padding: "20px 22px",
    flex: 1,
    minWidth: 240,
  };

  const btnBase = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "11px 0",
    borderRadius: 11,
    border: "none",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 16,
    transition: "opacity 0.2s",
  };

  const exportBusy = exportState === "loading";
  const importBusy = importState === "loading";

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section title */}
      <div style={{
        fontSize: 10, fontWeight: 800, color: "#06b6d4",
        letterSpacing: 1.5, textTransform: "uppercase",
        marginBottom: 14, paddingBottom: 7,
        borderBottom: "1px solid rgba(6,182,212,0.18)",
      }}>
        Backup & Restore
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>

        {/* ── Export card ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(16,185,129,0.13)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Download size={16} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: pal.text }}>Export Backup</div>
              <div style={{ fontSize: 11, color: pal.textMute }}>Download full DB as JSON</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: pal.textMute, lineHeight: 1.6 }}>
            Exports all projects, payments, expenses, settlements, activity logs, currencies, channels, and CEO photos into a single <code style={{ color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "1px 5px", borderRadius: 4 }}>.json</code> file you can save anywhere.
          </div>

          <button
            onClick={handleExport}
            disabled={exportBusy}
            style={{
              ...btnBase,
              background: exportState === "done"
                ? "rgba(16,185,129,0.15)"
                : exportState === "error"
                  ? "rgba(239,68,68,0.15)"
                  : "linear-gradient(135deg,#0d9488,#10b981)",
              color: exportState === "done" ? "#10b981"
                   : exportState === "error" ? "#ef4444"
                   : "#fff",
              border: exportState === "done" ? "1px solid rgba(16,185,129,0.3)"
                    : exportState === "error" ? "1px solid rgba(239,68,68,0.3)"
                    : "none",
              opacity: exportBusy ? 0.7 : 1,
              boxShadow: exportState === "idle" ? "0 4px 16px rgba(16,185,129,0.3)" : "none",
            }}
          >
            {exportState === "loading" && <Loader size={14} style={{ animation: "spin 0.8s linear infinite" }} />}
            {exportState === "done"    && <CheckCircle size={14} />}
            {exportState === "error"   && <AlertCircle size={14} />}
            {exportState === "idle"    && <Download size={14} />}
            {exportState === "loading" ? "Preparing…"
           : exportState === "done"    ? "Downloaded!"
           : exportState === "error"   ? "Export Failed"
           : "Download Backup"}
          </button>

          {exportState === "error" && errorMsg && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>{errorMsg}</div>
          )}
        </div>

        {/* ── Import card ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(139,92,246,0.13)", border: "1px solid rgba(139,92,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Upload size={16} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: pal.text }}>Import Backup</div>
              <div style={{ fontSize: 11, color: pal.textMute }}>Restore from a JSON file</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: pal.textMute, lineHeight: 1.6 }}>
            Select a <code style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "1px 5px", borderRadius: 4 }}>zbfm-backup-*.json</code> file. Records are merged — existing items with the same ID are overwritten, others are kept.
          </div>

          {/* Progress / result */}
          {importState === "loading" && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", fontSize: 12, color: "#a78bfa", display: "flex", alignItems: "center", gap: 8 }}>
              <Loader size={13} style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              {importProgress}
            </div>
          )}

          {importState === "done" && importResult && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", fontSize: 12, color: "#10b981" }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>✓ Import complete — page will reload</div>
              <div style={{ color: pal.textMute }}>
                {importResult.projects ?? "?"} projects · {importResult.expenses ?? "?"} expenses · {importResult.settlements ?? "?"} settlements · {importResult.activity ?? "?"} logs
              </div>
            </div>
          )}

          {importState === "error" && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }}>
              <AlertCircle size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
              {errorMsg || "Import failed"}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          <button
            onClick={() => {
              if (importState === "done") {
                window.location.reload();
              } else {
                fileRef.current?.click();
              }
            }}
            disabled={importBusy}
            style={{
              ...btnBase,
              background: importState === "done"
                ? "linear-gradient(135deg,#0d9488,#10b981)"
                : importState === "error"
                  ? "rgba(239,68,68,0.15)"
                  : "linear-gradient(135deg,#7c3aed,#8b5cf6)",
              color: importState === "error" ? "#ef4444" : "#fff",
              border: importState === "error" ? "1px solid rgba(239,68,68,0.3)" : "none",
              opacity: importBusy ? 0.7 : 1,
              boxShadow: importState === "idle" ? "0 4px 16px rgba(139,92,246,0.3)"
                       : importState === "done" ? "0 4px 16px rgba(16,185,129,0.3)"
                       : "none",
            }}
          >
            {importState === "loading" && <Loader size={14} style={{ animation: "spin 0.8s linear infinite" }} />}
            {importState === "done"    && <CheckCircle size={14} />}
            {importState === "error"   && <AlertCircle size={14} />}
            {importState === "idle"    && <Upload size={14} />}
            {importState === "loading" ? "Importing…"
           : importState === "done"    ? "Reload App"
           : importState === "error"   ? "Try Again"
           : "Select Backup File"}
          </button>
        </div>

      </div>

      {/* Warning note */}
      <div style={{ marginTop: 10, fontSize: 11, color: pal.textFaint, display: "flex", alignItems: "flex-start", gap: 6 }}>
        <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Backups include CEO photos as compressed base64. Keep backup files private — they contain your full financial data.</span>
      </div>
    </div>
  );
}