/**
 * ZBFinanceManager — Database Adapter v8
 * ════════════════════════════════════════
 * FIXES over v7:
 *  - Removed Firebase Storage (Spark plan incompatible) — replaced with
 *    canvas compression so images stay small enough for Firestore directly
 *  - Fixed saveCEOImages crash (undefined `urls` variable)
 *  - _syncAllToFirestore now runs ONCE per session, not every page load
 *  - iconBase64 in channels + payment methods auto-compressed before Firestore
 *  - _K declared before initFirebase to avoid reference fragility
 *  - Added loadSettlements to _syncAllToFirestore (was missing)
 *  - Exported compressImage so components can use it if needed
 *
 * Image size targets (canvas compression, no paid Firebase Storage needed):
 *   CEO photos       → max 200×200px, quality 0.72  (~30–60 KB)
 *   Channel icons    → max  64×64px,  quality 0.85  (~5–15 KB)
 *   Payment icons    → max  64×64px,  quality 0.85  (~5–15 KB)
 */

// ─── localStorage keys (declared first — used by initFirebase callbacks) ──
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
  syncedSession: "zbfm_synced_session", // flag: only sync once per session
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

// ─── Firebase bootstrap ───────────────────────────────────────────────
let _db = null;
let _fbReady = false;
let _initPromise = null;

const _pendingWrites = []; // writes queued before Firebase connects

function initFirebase() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const cfg = (await import("./firebaseConfig.js")).default;
      if (!cfg?.projectId) throw new Error("Invalid config");

      const { initializeApp, getApps, getApp } = await import("firebase/app");
      const app = getApps().length ? getApp() : initializeApp(cfg);

      // Modern persistence — falls back to basic getFirestore if already init'd
      try {
        const {
          initializeFirestore,
          persistentLocalCache,
          persistentMultipleTabManager,
        } = await import("firebase/firestore");
        _db = initializeFirestore(app, {
          cache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        const { getFirestore } = await import("firebase/firestore");
        _db = getFirestore(app);
      }

      _fbReady = true;
      console.info(
        `%c[ZBFinance] Firebase connected → ${cfg.projectId}`,
        "color:#06b6d4;font-weight:bold",
      );

      // Flush writes that were queued before Firebase was ready
      _flushPendingWrites();

      // Sync localStorage → Firestore ONCE per browser session
      // (not every page load — avoids flooding Firestore with writes)
      const sessionKey = sessionStorage.getItem(_K.syncedSession);
      if (!sessionKey) {
        sessionStorage.setItem(_K.syncedSession, "1");
        _syncAllToFirestore();
      }
    } catch (e) {
      _db = null;
      _fbReady = false;
      const silent =
        e.message?.includes("Cannot find module") ||
        e.message?.includes("Failed to resolve") ||
        e.message?.includes("already been");
      if (!silent) console.warn("[ZBFinance] Firebase unavailable:", e.message);
    }
  })();
  return _initPromise;
}

async function _flushPendingWrites() {
  if (!_pendingWrites.length) return;
  console.info(
    `[ZBFinance] Flushing ${_pendingWrites.length} queued writes...`,
  );
  for (const { col, id, data } of _pendingWrites) {
    await _fsSaveAwait(col, id, data).catch((e) =>
      console.warn(
        `[ZBFinance] Queued write failed (${col}/${id}):`,
        e.message,
      ),
    );
  }
  _pendingWrites.length = 0;
}

// Push all localStorage data to Firestore — runs ONCE per browser session
async function _syncAllToFirestore() {
  const cols = [
    { lsKey: _K.projects, fsCol: "projects" },
    { lsKey: _K.payments, fsCol: "payments" },
    { lsKey: _K.expenses, fsCol: "expenses" },
    { lsKey: _K.settlements, fsCol: "settlements" },
    { lsKey: _K.activity, fsCol: "activity" },
  ];

  for (const { lsKey, fsCol } of cols) {
    const items = ls.get(lsKey) || [];
    for (const item of items) {
      await _fsSaveAwait(fsCol, item.id, item).catch(() => {});
    }
  }

  // Config docs
  const currencies = ls.get(_K.currencies);
  if (currencies) _fsSave("config", "currencies", { list: currencies });

  // Sync settled baseline
  const baseline = ls.get(_K.settledBaseline);
  if (baseline !== null && baseline !== undefined) {
    _fsSave("config", "settledBaseline", {
      data: baseline,
      updatedAt: new Date().toISOString(),
    });
  }

  // Sync CEO images (stored as separate docs per CEO)
  const ceoImgs = ls.get(_K.ceoImages);
  if (ceoImgs?.sumaiya)
    _fsSave("config", "ceoImage_sumaiya", {
      data: ceoImgs.sumaiya,
      updatedAt: new Date().toISOString(),
    });
  if (ceoImgs?.rakib)
    _fsSave("config", "ceoImage_rakib", {
      data: ceoImgs.rakib,
      updatedAt: new Date().toISOString(),
    });

  const channels = ls.get(_K.channels);
  if (channels) {
    const compressed = await _compressAllImages(channels, 64, 0.85);
    _fsSave("config", "channels", { list: compressed });
  }

  const methods = ls.get(_K.paymentMethods);
  if (methods?.length) {
    const compressed = await _compressAllImages(methods, 64, 0.85);
    _fsSave("config", "paymentMethods", { list: compressed });
  }

  console.info("[ZBFinance] Session sync to Firestore complete ✓");
}

// Start connecting immediately on module load
initFirebase();

export const isUsingFirebase = () => _fbReady;

// ─── Firestore helpers ────────────────────────────────────────────────
async function _fsGet(col, id) {
  const { doc, getDoc } = await import("firebase/firestore");
  const s = await getDoc(doc(_db, col, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

async function _fsSaveAwait(col, id, data) {
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  await setDoc(doc(_db, col, id), { ...data, _syncedAt: serverTimestamp() });
  _emitSync(col, "save");
}

function _fsSave(col, id, data) {
  if (!_fbReady) {
    _pendingWrites.push({ col, id, data }); // queue for when Firebase connects
    return;
  }
  _fsSaveAwait(col, id, data).catch((e) =>
    console.warn(`[ZBFinance] Sync failed (${col}/${id}):`, e.message),
  );
}

function _fsDel(col, id) {
  if (!_fbReady) return;
  import("firebase/firestore")
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

// ══════════════════════════════════════════════════════════════════════
// IMAGE COMPRESSION  (canvas-based, no Firebase Storage needed)
// ══════════════════════════════════════════════════════════════════════

/**
 * Compress a base64/dataURL image using canvas.
 * Exported — components can call it directly if needed.
 *
 * @param {string} dataUrl   data:image/... string (or null/https URL — passed through unchanged)
 * @param {number} maxSize   max width OR height in px (aspect ratio preserved)
 * @param {number} quality   JPEG quality 0–1
 * @returns {Promise<string>}
 */
export function compressImage(dataUrl, maxSize = 200, quality = 0.75) {
  if (!dataUrl || !dataUrl.startsWith("data:image"))
    return Promise.resolve(dataUrl); // null, https:// URLs, etc — pass through

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const out = canvas.toDataURL("image/jpeg", quality);
      console.info(
        `[ZBFinance] Compressed image: ${Math.round(
          dataUrl.length / 1024,
        )}KB → ${Math.round(out.length / 1024)}KB`,
      );
      resolve(out);
    };
    img.onerror = () => resolve(dataUrl); // fallback: use original if canvas fails
    img.src = dataUrl;
  });
}

/**
 * Recursively walk an object/array and compress every base64 image field.
 * Used automatically before saving channels, payment methods, etc.
 */
async function _compressAllImages(data, maxSize = 64, quality = 0.85) {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data))
    return Promise.all(
      data.map((item) => _compressAllImages(item, maxSize, quality)),
    );

  const result = { ...data };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string" && val.startsWith("data:image")) {
      result[key] = await compressImage(val, maxSize, quality);
    } else if (val && typeof val === "object") {
      result[key] = await _compressAllImages(val, maxSize, quality);
    }
  }
  return result;
}

// ─── Smart hybrid load ────────────────────────────────────────────────
// Case A: localStorage has data  → return instantly, refresh Firestore silently
// Case B: localStorage empty     → await Firebase, pull Firestore, cache locally
async function _hybridLoad(lsKey, fsCol) {
  const local = ls.get(lsKey);

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

  await initFirebase();
  if (_fbReady) {
    try {
      const remote = await _fsAll(fsCol);
      if (remote.length > 0) {
        ls.set(lsKey, remote);
        return remote;
      }
    } catch (e) {
      console.warn(`[ZBFinance] Could not load ${fsCol}:`, e.message);
    }
  }
  return [];
}

// Compress any embedded images then save to both localStorage + Firestore
async function _hybridSaveCompressed(
  lsKey,
  fsCol,
  item,
  maxSize = 64,
  quality = 0.85,
) {
  // 1. localStorage — always instant with original data (UI sees full quality)
  const all = ls.get(lsKey) || [];
  const idx = all.findIndex((x) => x.id === item.id);
  ls.set(
    lsKey,
    idx >= 0 ? all.map((x) => (x.id === item.id ? item : x)) : [item, ...all],
  );

  // 2. Compress images, then push to Firestore
  const compressed = await _compressAllImages(item, maxSize, quality);
  _fsSave(fsCol, compressed.id, compressed);

  return item;
}

function _hybridSave(lsKey, fsCol, item) {
  // Standard save — no image compression (for data-only collections)
  const all = ls.get(lsKey) || [];
  const idx = all.findIndex((x) => x.id === item.id);
  ls.set(
    lsKey,
    idx >= 0 ? all.map((x) => (x.id === item.id ? item : x)) : [item, ...all],
  );
  _fsSave(fsCol, item.id, item);
  return item;
}

function _hybridDelete(lsKey, fsCol, id) {
  ls.set(
    lsKey,
    (ls.get(lsKey) || []).filter((x) => x.id !== id),
  );
  _fsDel(fsCol, id);
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
  _fsSave("activity", entry.id, entry);
}

// ══════════════════════════════════════════════════════════════════════
// SETTLED BASELINE
// Critical state — must sync across all browsers.
// ══════════════════════════════════════════════════════════════════════
export async function loadSettledBaseline() {
  // localStorage first — instant
  const local = ls.get(_K.settledBaseline);
  if (local !== null && local !== undefined) return local;

  // New browser — fetch from Firestore
  await initFirebase();
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "settledBaseline");
      if (rec?.data !== undefined) {
        ls.set(_K.settledBaseline, rec.data);
        console.info("[ZBFinance] Settled baseline loaded from Firestore ✓");
        return rec.data;
      }
    } catch (e) {
      console.warn("[ZBFinance] Failed to load settled baseline:", e.message);
    }
  }
  return null;
}

export async function saveSettledBaseline(b) {
  ls.set(_K.settledBaseline, b);
  _fsSave("config", "settledBaseline", {
    data: b,
    updatedAt: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════════════════
// CEO IMAGES
// Raw base64 from FileReader → compressed to 200×200px → stored in Firestore
// No Firebase Storage needed (free Spark plan compatible ✓)
// ══════════════════════════════════════════════════════════════════════
export async function loadCEOImages() {
  // localStorage cache — instant on returning visits
  const cached = ls.get(_K.ceoImages);
  if (cached?.sumaiya || cached?.rakib) return cached;

  // New browser — fetch from Firestore (stored as two separate docs to avoid 1MB limit)
  await initFirebase();
  if (_fbReady) {
    try {
      const [recS, recR] = await Promise.all([
        _fsGet("config", "ceoImage_sumaiya"),
        _fsGet("config", "ceoImage_rakib"),
      ]);
      const imgs = {
        sumaiya: recS?.data || null,
        rakib: recR?.data || null,
      };
      if (imgs.sumaiya || imgs.rakib) {
        ls.set(_K.ceoImages, imgs);
        console.info("[ZBFinance] CEO images loaded from Firestore ✓");
      }
      return imgs;
    } catch (e) {
      console.warn("[ZBFinance] Failed to load CEO images:", e.message);
    }
  }
  return { sumaiya: null, rakib: null };
}

export async function saveCEOImages(imgs) {
  // Compress each photo separately — keeps each doc well under Firestore 1MB limit
  const compressed = {
    sumaiya: await compressImage(imgs.sumaiya, 200, 0.72),
    rakib: await compressImage(imgs.rakib, 200, 0.72),
  };

  // 1. localStorage — instant, always works
  ls.set(_K.ceoImages, compressed);

  // 2. Firestore — one doc per CEO (same fire-and-forget pattern as saveChannels)
  // Storing each image in its own document avoids any combined size issues
  await initFirebase();
  if (_fbReady) {
    if (compressed.sumaiya !== undefined) {
      _fsSave("config", "ceoImage_sumaiya", {
        data: compressed.sumaiya,
        updatedAt: new Date().toISOString(),
      });
    }
    if (compressed.rakib !== undefined) {
      _fsSave("config", "ceoImage_rakib", {
        data: compressed.rakib,
        updatedAt: new Date().toISOString(),
      });
    }
    console.info("[ZBFinance] CEO images queued for Firestore sync ✓");
  }

  return compressed;
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENT CHANNELS
// iconBase64 fields auto-compressed to 64×64px before Firestore
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
  return null; // null = component uses DEF_CHANNELS
}

export async function saveChannels(list) {
  // Save raw to localStorage immediately (UI sees full-res icons instantly)
  ls.set(_K.channels, list);
  // Compress icons before pushing to Firestore
  const compressed = await _compressAllImages(list, 64, 0.85);
  _fsSave("config", "channels", {
    list: compressed,
    updatedAt: new Date().toISOString(),
  });
}

// ══════════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// iconBase64 fields auto-compressed to 64×64px before Firestore
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
  // Save raw to localStorage immediately
  ls.set(_K.paymentMethods, list);
  // Compress icons before pushing to Firestore
  const compressed = await _compressAllImages(list, 64, 0.85);
  _fsSave("config", "paymentMethods", {
    list: compressed,
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
  // Fast path — cached in localStorage (instant on returning visits)
  const cached = localStorage.getItem(_K.authHash);
  if (cached) return cached;

  // Slow path — new browser, fetch master hash from Firestore
  console.info("[ZBFinance] No local hash, checking Firestore...");
  await initFirebase();
  if (_fbReady) {
    try {
      const rec = await _fsGet("config", "auth");
      if (rec?.passwordHash) {
        localStorage.setItem(_K.authHash, rec.passwordHash);
        console.info("[ZBFinance] Master hash loaded from Firestore ✓");
        return rec.passwordHash;
      }
    } catch (e) {
      console.warn("[ZBFinance] Failed to fetch master hash:", e.message);
    }
  }
  return null; // no password set anywhere → first-time setup
}

export async function setStoredHash(h) {
  // Save locally first
  localStorage.setItem(_K.authHash, h);
  // Await Firestore write so all devices get the password immediately
  await initFirebase();
  if (_fbReady) {
    try {
      await _fsSaveAwait("config", "auth", {
        passwordHash: h,
        setAt: new Date().toISOString(),
      });
      console.info("[ZBFinance] Master password saved to Firestore ✓");
    } catch (e) {
      console.error("[ZBFinance] FAILED to save master hash:", e.message);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
// SESSION  (local only — resets on tab close by design)
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
// THEME  (local only — per-device preference)
// ══════════════════════════════════════════════════════════════════════
export function loadTheme() {
  return localStorage.getItem(_K.theme) || "dark";
}
export function saveTheme(t) {
  localStorage.setItem(_K.theme, t);
}
