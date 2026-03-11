/**
 * ZBFinanceManager — Database Adapter v3 (Hybrid)
 * ══════════════════════════════════════════════════
 * Strategy: localStorage FIRST (instant) + Firestore BACKGROUND (sync)
 *
 * Reads  → localStorage immediately, Firestore syncs silently behind
 * Writes → localStorage immediately, Firestore fire-and-forget (no await)
 * Offline → works fully from localStorage, Firestore SDK auto-queues writes
 * New device → Firestore bootstrap fills localStorage on first load
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

      // Enable offline persistence so Firestore queues writes when offline
      try {
        await enableIndexedDbPersistence(_db);
      } catch (e) {
        // Already enabled or unsupported — not critical
      }

      _fbReady = true;
      console.info(
        `%c[ZBFinance] Firebase connected (Hybrid mode) → ${cfg.projectId}`,
        "color:#06b6d4;font-weight:bold",
      );

      // Bootstrap: on first load push Firestore data into localStorage
      _bootstrapFromFirestore();
    } catch (e) {
      _db = null;
      _fbReady = false;
      const isNotFound =
        e.message?.includes("Cannot find module") ||
        e.message?.includes("Failed to resolve");
      if (!isNotFound)
        console.warn(
          "[ZBFinance] Firebase unavailable, running local-only:",
          e.message,
        );
    }
  })();
  return _initPromise;
}

// Run once on startup — pull Firestore → localStorage for every collection
async function _bootstrapFromFirestore() {
  const collections = [
    "projects",
    "payments",
    "expenses",
    "settlements",
    "activity",
  ];
  for (const name of collections) {
    try {
      const items = await _fsAll(name);
      if (items.length > 0) {
        // Merge: remote wins for matching IDs, keep any local-only items
        const local = ls.get(_K[name]) || [];
        const remoteIds = new Set(items.map((i) => i.id));
        const localOnly = local.filter((i) => !remoteIds.has(i.id));
        ls.set(_K[name], [...items, ...localOnly]);
        console.info(
          `[ZBFinance] Bootstrapped ${items.length} ${name} from Firestore`,
        );
      }
    } catch {
      // Offline or collection empty — fine, local data is used
    }
  }
}

export const isUsingFirebase = () => _fbReady;

// Fire Firebase init immediately on module load (non-blocking)
initFirebase();

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

// ─── Firestore helpers (internal) ────────────────────────────────────
async function _fsGet(col, id) {
  const { doc, getDoc } = await import("firebase/firestore");
  const s = await getDoc(doc(_db, col, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

function _fsSave(col, id, data) {
  // Fire-and-forget — returns promise but callers don't await it
  return import("firebase/firestore")
    .then(({ doc, setDoc, serverTimestamp }) =>
      setDoc(doc(_db, col, id), { ...data, _syncedAt: serverTimestamp() }),
    )
    .catch((e) =>
      console.warn(`[ZBFinance] Sync failed (${col}/${id}):`, e.message),
    );
}

function _fsDel(col, id) {
  return import("firebase/firestore")
    .then(({ doc, deleteDoc }) => deleteDoc(doc(_db, col, id)))
    .catch((e) =>
      console.warn(`[ZBFinance] Delete sync failed (${col}/${id}):`, e.message),
    );
}

async function _fsAll(col) {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(_db, col));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Sync status event (optional UI indicator) ────────────────────────
// Listen with: window.addEventListener("zbfm:synced", e => console.log(e.detail))
function _emitSync(col, action) {
  window.dispatchEvent(
    new CustomEvent("zbfm:synced", { detail: { col, action } }),
  );
}

// ══════════════════════════════════════════════════════════════════════
// HYBRID WRITE HELPERS
// ══════════════════════════════════════════════════════════════════════

// Upsert one item into a localStorage array, then push to Firestore
function _hybridSave(lsKey, fsCol, item) {
  // 1. localStorage — instant, synchronous
  const all = ls.get(lsKey) || [];
  const idx = all.findIndex((x) => x.id === item.id);
  ls.set(
    lsKey,
    idx >= 0 ? all.map((x) => (x.id === item.id ? item : x)) : [item, ...all],
  );

  // 2. Firestore — background, no await
  if (_fbReady) {
    _fsSave(fsCol, item.id, item).then(() => _emitSync(fsCol, "save"));
  }

  return item;
}

function _hybridDelete(lsKey, fsCol, id) {
  // 1. localStorage — instant
  ls.set(
    lsKey,
    (ls.get(lsKey) || []).filter((x) => x.id !== id),
  );

  // 2. Firestore — background
  if (_fbReady) {
    _fsDel(fsCol, id).then(() => _emitSync(fsCol, "delete"));
  }
}

// ══════════════════════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════════════════════

export async function loadProjects() {
  return ls.get(_K.projects) || []; // localStorage is always ready instantly
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
  return ls.get(_K.currencies) || defaults;
}

export async function saveCurrencies(list) {
  ls.set(_K.currencies, list);
  if (_fbReady) {
    _fsSave("config", "currencies", {
      list,
      updatedAt: new Date().toISOString(),
    }).then(() => _emitSync("currencies", "save"));
  }
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════════════════════════════════

export async function loadPayments() {
  return ls.get(_K.payments) || [];
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
  return ls.get(_K.expenses) || [];
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
  return ls.get(_K.settlements) || [];
}

export async function saveSettlement(s) {
  return _hybridSave(_K.settlements, "settlements", s);
}

// ══════════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════════════════════════════════════

export async function loadActivity() {
  return ls.get(_K.activity) || [];
}

export async function logActivity(entry) {
  // 1. localStorage — prepend, cap at 500
  const all = ls.get(_K.activity) || [];
  ls.set(_K.activity, [entry, ...all].slice(0, 500));

  // 2. Firestore — background
  if (_fbReady) {
    _fsSave("activity", entry.id, entry).then(() =>
      _emitSync("activity", "log"),
    );
  }
}

// ══════════════════════════════════════════════════════════════════════
// SETTLED BASELINE  (local only — derived data, no need to sync)
// ══════════════════════════════════════════════════════════════════════

export async function loadSettledBaseline() {
  return ls.get(_K.settledBaseline) || null;
}
export async function saveSettledBaseline(b) {
  ls.set(_K.settledBaseline, b);
}

// ══════════════════════════════════════════════════════════════════════
// CEO PROFILE IMAGES  (local only — base64 blobs, too large for Firestore)
// ══════════════════════════════════════════════════════════════════════

export async function loadCEOImages() {
  return ls.get(_K.ceoImages) || { sumaiya: null, rakib: null };
}
export async function saveCEOImages(imgs) {
  ls.set(_K.ceoImages, imgs);
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENT CHANNELS  (synced — shared config)
// ══════════════════════════════════════════════════════════════════════

export async function loadChannels() {
  return ls.get(_K.channels) || null; // null = use DEF_CHANNELS
}
export async function saveChannels(list) {
  ls.set(_K.channels, list);
  if (_fbReady) {
    _fsSave("config", "channels", {
      list,
      updatedAt: new Date().toISOString(),
    }).then(() => _emitSync("channels", "save"));
  }
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENT METHODS  (synced — shared config)
// ══════════════════════════════════════════════════════════════════════

export async function loadPaymentMethods() {
  return ls.get(_K.paymentMethods) || [];
}
export async function savePaymentMethods(list) {
  ls.set(_K.paymentMethods, list);
  if (_fbReady) {
    _fsSave("config", "paymentMethods", {
      list,
      updatedAt: new Date().toISOString(),
    }).then(() => _emitSync("paymentMethods", "save"));
  }
}

// ══════════════════════════════════════════════════════════════════════
// AUTH — master password hash (hybrid: local cache + Firestore source of truth)
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
  // 1. Check localStorage cache (instant)
  const local = localStorage.getItem(_K.authHash);
  if (local) return local;

  // 2. Fallback: fetch from Firestore (new device or cleared storage)
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "auth");
      if (rec?.passwordHash) {
        localStorage.setItem(_K.authHash, rec.passwordHash); // cache it
        return rec.passwordHash;
      }
    } catch {
      /* offline */
    }
  }
  return null;
}

export async function setStoredHash(h) {
  // 1. localStorage — instant
  localStorage.setItem(_K.authHash, h);

  // 2. Firestore — background (so all devices share the same master password)
  if (_fbReady) {
    _fsSave("config", "auth", {
      passwordHash: h,
      setAt: new Date().toISOString(),
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// SESSION  (always local — intentionally resets on tab close)
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
