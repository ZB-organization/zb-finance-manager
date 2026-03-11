/**
 * ZBFinanceManager — Database Adapter v4 (Hybrid Fixed)
 * ═══════════════════════════════════════════════════════
 * FIX: On new browser/device with empty localStorage,
 *      load functions now WAIT for Firestore instead of
 *      returning empty arrays immediately.
 *
 * Reads  → localStorage if data exists (instant)
 *        → Firestore if localStorage empty (new device)
 * Writes → localStorage immediately + Firestore background
 * Auth   → One master password stored in Firestore, cached locally
 */

// ─── Firebase bootstrap ───────────────────────────────────────────────
let _db = null;
let _fbReady = false;
let _initPromise = null;

function initFirebase() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const cfg = (await import("./firebaseConfig.js")).default;
      if (!cfg?.projectId) throw new Error("Invalid config");

      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const { getFirestore, enableIndexedDbPersistence } = await import(
        "firebase/firestore"
      );

      const app = getApps().length ? getApp() : initializeApp(cfg);
      _db = getFirestore(app);

      try {
        await enableIndexedDbPersistence(_db);
      } catch {}

      _fbReady = true;
      console.info(
        `%c[ZBFinance] Firebase connected → ${cfg.projectId}`,
        "color:#06b6d4;font-weight:bold",
      );
    } catch (e) {
      _db = null;
      _fbReady = false;
      const isNotFound =
        e.message?.includes("Cannot find module") ||
        e.message?.includes("Failed to resolve");
      if (!isNotFound)
        console.warn(
          "[ZBFinance] Firebase unavailable, local-only mode:",
          e.message,
        );
    }
  })();
  return _initPromise;
}

// Start connecting immediately on module load
initFirebase();

export const isUsingFirebase = () => _fbReady;

// ─── localStorage keys ────────────────────────────────────────────────
const _K = {
  projects: "zbfm_projects",
  currencies: "zbfm_currencies",
  settlements: "zbfm_settlements",
  activity: "zbfm_activity",
  theme: "zbfm_theme",
  authHash: "zbfm_auth_hash",
  session: "zbfm_session",
  payments: "zbfm_payments",
  expenses: "zbfm_expenses",
  settledBaseline: "zbfm_settled_baseline",
  ceoImages: "zbfm_ceo_images",
  channels: "zbfm_channels",
  paymentMethods: "zbfm_payment_methods",
};

const ls = {
  get: (k) => {
    try {
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

// ─── Firestore internal helpers ───────────────────────────────────────
async function _fsGet(col, id) {
  const { doc, getDoc } = await import("firebase/firestore");
  const s = await getDoc(doc(_db, col, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

function _fsSave(col, id, data) {
  return import("firebase/firestore")
    .then(({ doc, setDoc, serverTimestamp }) =>
      setDoc(doc(_db, col, id), { ...data, _syncedAt: serverTimestamp() }),
    )
    .then(() => _emitSync(col, "save"))
    .catch((e) =>
      console.warn(`[ZBFinance] Sync failed (${col}/${id}):`, e.message),
    );
}

function _fsDel(col, id) {
  return import("firebase/firestore")
    .then(({ doc, deleteDoc }) => deleteDoc(doc(_db, col, id)))
    .then(() => _emitSync(col, "delete"))
    .catch((e) =>
      console.warn(`[ZBFinance] Delete failed (${col}/${id}):`, e.message),
    );
}

async function _fsAll(col) {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(_db, col));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function _emitSync(col, action) {
  window.dispatchEvent(
    new CustomEvent("zbfm:synced", { detail: { col, action } }),
  );
}

// ─── THE KEY FIX: Smart hybrid load ───────────────────────────────────
//
//  Case A: localStorage HAS data  → return instantly, refresh Firestore in background
//  Case B: localStorage is EMPTY  → await Firebase, fetch Firestore, cache locally
//
async function _hybridLoad(lsKey, fsCol) {
  const local = ls.get(lsKey);

  // Case A: have local data — return immediately
  if (local && local.length > 0) {
    if (_fbReady) {
      _fsAll(fsCol)
        .then((remote) => {
          if (remote.length > 0) ls.set(lsKey, remote);
        })
        .catch(() => {});
    }
    return local;
  }

  // Case B: no local data — wait for Firebase then pull from Firestore
  await initFirebase();
  if (_fbReady) {
    try {
      const remote = await _fsAll(fsCol);
      if (remote.length > 0) {
        ls.set(lsKey, remote);
        return remote;
      }
    } catch (e) {
      console.warn(
        `[ZBFinance] Could not load ${fsCol} from Firestore:`,
        e.message,
      );
    }
  }

  return [];
}

// ─── Hybrid write helpers ─────────────────────────────────────────────
function _hybridSave(lsKey, fsCol, item) {
  const all = ls.get(lsKey) || [];
  const idx = all.findIndex((x) => x.id === item.id);
  ls.set(
    lsKey,
    idx >= 0 ? all.map((x) => (x.id === item.id ? item : x)) : [item, ...all],
  );
  if (_fbReady) _fsSave(fsCol, item.id, item);
  return item;
}

function _hybridDelete(lsKey, fsCol, id) {
  ls.set(
    lsKey,
    (ls.get(lsKey) || []).filter((x) => x.id !== id),
  );
  if (_fbReady) _fsDel(fsCol, id);
}

// ══════════════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════════════
export async function loadProjects() {
  return _hybridLoad(_K.projects, "projects");
}
export async function saveProject(p) {
  return _hybridSave(_K.projects, "projects", p);
}
export async function deleteProject(id) {
  _hybridDelete(_K.projects, "projects", id);
}

// ══════════════════════════════════════════════════════════════════════
// CURRENCIES
// ══════════════════════════════════════════════════════════════════════
export async function loadCurrencies(defaults) {
  const local = ls.get(_K.currencies);
  if (local) return local;
  await initFirebase();
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "currencies");
      if (rec?.list) {
        ls.set(_K.currencies, rec.list);
        return rec.list;
      }
    } catch {}
  }
  return defaults;
}
export async function saveCurrencies(list) {
  ls.set(_K.currencies, list);
  if (_fbReady)
    _fsSave("config", "currencies", {
      list,
      updatedAt: new Date().toISOString(),
    });
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════
export async function loadPayments() {
  return _hybridLoad(_K.payments, "payments");
}
export async function savePayment(p) {
  return _hybridSave(_K.payments, "payments", p);
}
export async function deletePayment(id) {
  _hybridDelete(_K.payments, "payments", id);
}

// ══════════════════════════════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════════════════════════════
export async function loadExpenses() {
  return _hybridLoad(_K.expenses, "expenses");
}
export async function saveExpense(e) {
  return _hybridSave(_K.expenses, "expenses", e);
}
export async function deleteExpense(id) {
  _hybridDelete(_K.expenses, "expenses", id);
}

// ══════════════════════════════════════════════════════════════════════
// SETTLEMENTS
// ══════════════════════════════════════════════════════════════════════
export async function loadSettlements() {
  return _hybridLoad(_K.settlements, "settlements");
}
export async function saveSettlement(s) {
  return _hybridSave(_K.settlements, "settlements", s);
}

// ══════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════════════════════════════════════
export async function loadActivity() {
  return _hybridLoad(_K.activity, "activity");
}
export async function logActivity(entry) {
  const all = ls.get(_K.activity) || [];
  ls.set(_K.activity, [entry, ...all].slice(0, 500));
  if (_fbReady) _fsSave("activity", entry.id, entry);
}

// ══════════════════════════════════════════════════════════════════════
// SETTLED BASELINE  (local only — derived data)
// ══════════════════════════════════════════════════════════════════════
export async function loadSettledBaseline() {
  return ls.get(_K.settledBaseline) || null;
}
export async function saveSettledBaseline(b) {
  ls.set(_K.settledBaseline, b);
}

// ══════════════════════════════════════════════════════════════════════
// CEO IMAGES  (local only — base64 blobs exceed Firestore 1MB limit)
// ══════════════════════════════════════════════════════════════════════
export async function loadCEOImages() {
  return ls.get(_K.ceoImages) || { sumaiya: null, rakib: null };
}
export async function saveCEOImages(imgs) {
  ls.set(_K.ceoImages, imgs);
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENT CHANNELS  (synced)
// ══════════════════════════════════════════════════════════════════════
export async function loadChannels() {
  const local = ls.get(_K.channels);
  if (local) return local;
  await initFirebase();
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "channels");
      if (rec?.list) {
        ls.set(_K.channels, rec.list);
        return rec.list;
      }
    } catch {}
  }
  return null;
}
export async function saveChannels(list) {
  ls.set(_K.channels, list);
  if (_fbReady)
    _fsSave("config", "channels", {
      list,
      updatedAt: new Date().toISOString(),
    });
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENT METHODS  (synced)
// ══════════════════════════════════════════════════════════════════════
export async function loadPaymentMethods() {
  const local = ls.get(_K.paymentMethods);
  if (local && local.length > 0) return local;
  await initFirebase();
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "paymentMethods");
      if (rec?.list) {
        ls.set(_K.paymentMethods, rec.list);
        return rec.list;
      }
    } catch {}
  }
  return [];
}
export async function savePaymentMethods(list) {
  ls.set(_K.paymentMethods, list);
  if (_fbReady)
    _fsSave("config", "paymentMethods", {
      list,
      updatedAt: new Date().toISOString(),
    });
}

// ══════════════════════════════════════════════════════════════════════
// AUTH — one master password, Firestore = source of truth
// ══════════════════════════════════════════════════════════════════════
export async function hashPassword(raw) {
  const salt = "zbfm_salt_v1_secure";
  const data = new TextEncoder().encode(raw + salt);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getStoredHash() {
  // 1. localStorage cache — instant on returning visits
  const local = localStorage.getItem(_K.authHash);
  if (local) return local;

  // 2. New browser/device — pull from Firestore (source of truth)
  await initFirebase();
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "auth");
      if (rec?.passwordHash) {
        localStorage.setItem(_K.authHash, rec.passwordHash);
        return rec.passwordHash;
      }
    } catch {}
  }
  return null; // no password set anywhere yet
}

export async function setStoredHash(h) {
  localStorage.setItem(_K.authHash, h);
  // Awaited — ensures Firestore write completes before user enters app
  await initFirebase();
  if (_fbReady) {
    await _fsSave("config", "auth", {
      passwordHash: h,
      setAt: new Date().toISOString(),
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// SESSION  (always local — resets on tab close by design)
// ══════════════════════════════════════════════════════════════════════
export function getSession() {
  return sessionStorage.getItem(_K.session);
}
export function setSession() {
  sessionStorage.setItem(_K.session, "authenticated_" + Date.now());
}
export function clearSession() {
  sessionStorage.removeItem(_K.session);
}

// ══════════════════════════════════════════════════════════════════════
// THEME  (always local — per-device preference)
// ══════════════════════════════════════════════════════════════════════
export function loadTheme() {
  return localStorage.getItem(_K.theme) || "dark";
}
export function saveTheme(t) {
  localStorage.setItem(_K.theme, t);
}
