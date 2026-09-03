// ============================================================
//  IndexedDB — التخزين المحلي الكامل
// ------------------------------------------------------------
//  كل حاجة بتمرّ من هنا: التوقيتات، الترجمات، التقدّم، الإعدادات،
//  التكرار المتباعد، الشارات، وبيانات الطلاب.
//
//  مهم: IndexedDB بيرمي استثناء (أو بيتعلّق) في وضع التصفح الخاص على
//  بعض المتصفحات، وفي iOS داخل WebView. عشان كده كل دالة هنا ليها
//  مسار بديل على الذاكرة + localStorage، والتطبيق مايقفش لو التخزين
//  اتمنع.
// ============================================================
import { openDB } from "idb";

export const DB_NAME = "IqraDB";
export const DB_VERSION = 1;

export const STORES = {
  timings: "timings", // key: "6:1"  → { key, data, timestamp }
  audioMeta: "audioMeta", // key: url    → { url, duration, ayatCount, timestamp }
  progress: "progress", // key: id     → { id, progress, timestamp }
  settings: "settings", // key: id     → { id, ... }
  students: "students", // key: id     → { id, name, progress, lastActive, scores, dirty }
  srs: "srs", // key: letter → { letter, wrongCount, rightStreak, nextReview }
  badges: "badges", // key: id     → { id, earnedAt }
  translations: "translations", // key: surah → { surah, data, timestamp }
  khatma: "khatma", // key: surah  → { id, surah, readAt }
  hifz: "hifz", // key: id     → { id, surah, from, to, stage, nextReview, createdAt }
  journal: "journal", // key: id     → { id, day, surah, seconds, feeling, challenge }
  daily: "daily", // key: day    → { id: day, answered, correct, points }
  leaderboard: "leaderboard", // key: name → { name, points, lastDay, days }
  tafsir: "tafsir", // key: key    → { key: "16:1:1", text, timestamp }
  groups: "groups", // key: id     → { id, name, level, goal, members[], local }
  tasbih: "tasbih", // key: id     → { id, day, counts, totals }
  goals: "goals", // key: id     → { id, day, done, awarded, yesterday }
  bookmarks: "bookmarks", // key: "2:255" → { id, surah, ayah, category, note, at }
};

let dbPromise = null;
let idbBroken = false;
const memory = new Map(); // بديل الطوارئ

const memKey = (store, key) => `${store}::${key}`;

// نسخة احتياطية على localStorage عشان البيانات تعيش بعد إعادة التحميل
// حتى لو IndexedDB مرفوض
function lsSet(store, key, value) {
  try {
    localStorage.setItem(`iqra.idb.${memKey(store, key)}`, JSON.stringify(value));
  } catch {}
}
function lsGet(store, key) {
  try {
    const raw = localStorage.getItem(`iqra.idb.${memKey(store, key)}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
function lsDel(store, key) {
  try {
    localStorage.removeItem(`iqra.idb.${memKey(store, key)}`);
  } catch {}
}
function lsAll(store) {
  const out = [];
  try {
    const prefix = `iqra.idb.${store}::`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.push(JSON.parse(localStorage.getItem(k)));
    }
  } catch {}
  return out;
}

function getDB() {
  if (idbBroken) return Promise.resolve(null);
  if (typeof indexedDB === "undefined") {
    idbBroken = true;
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.timings))
          db.createObjectStore(STORES.timings, { keyPath: "key" });
        if (!db.objectStoreNames.contains(STORES.audioMeta))
          db.createObjectStore(STORES.audioMeta, { keyPath: "url" });
        if (!db.objectStoreNames.contains(STORES.progress))
          db.createObjectStore(STORES.progress, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.settings))
          db.createObjectStore(STORES.settings, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.students))
          db.createObjectStore(STORES.students, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.srs))
          db.createObjectStore(STORES.srs, { keyPath: "letter" });
        if (!db.objectStoreNames.contains(STORES.badges))
          db.createObjectStore(STORES.badges, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.translations))
          db.createObjectStore(STORES.translations, { keyPath: "surah" });
        if (!db.objectStoreNames.contains(STORES.khatma))
          db.createObjectStore(STORES.khatma, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.hifz))
          db.createObjectStore(STORES.hifz, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.journal))
          db.createObjectStore(STORES.journal, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.daily))
          db.createObjectStore(STORES.daily, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.leaderboard))
          db.createObjectStore(STORES.leaderboard, { keyPath: "name" });
        if (!db.objectStoreNames.contains(STORES.tafsir))
          db.createObjectStore(STORES.tafsir, { keyPath: "key" });
        if (!db.objectStoreNames.contains(STORES.groups))
          db.createObjectStore(STORES.groups, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.tasbih))
          db.createObjectStore(STORES.tasbih, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.goals))
          db.createObjectStore(STORES.goals, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.bookmarks))
          db.createObjectStore(STORES.bookmarks, { keyPath: "id" });
      },
    }).catch(() => {
      idbBroken = true;
      return null;
    });
  }
  return dbPromise;
}

export async function idbGet(store, key) {
  try {
    const db = await getDB();
    if (db) {
      const v = await db.get(store, key);
      if (v !== undefined) return v;
    }
  } catch {}
  const m = memory.get(memKey(store, key));
  return m !== undefined ? m : lsGet(store, key);
}

export async function idbSet(store, value) {
  const keyPath =
    store === STORES.timings || store === STORES.tafsir
      ? "key"
      : store === STORES.audioMeta
      ? "url"
      : store === STORES.srs
      ? "letter"
      : store === STORES.translations
      ? "surah"
      : store === STORES.leaderboard
      ? "name"
      : "id";
  const key = value[keyPath];
  memory.set(memKey(store, key), value);
  try {
    const db = await getDB();
    if (db) {
      await db.put(store, value);
      return value;
    }
  } catch {}
  lsSet(store, key, value); // بديل فقط لما IndexedDB مش متاح
  return value;
}

export async function idbDelete(store, key) {
  memory.delete(memKey(store, key));
  lsDel(store, key);
  try {
    const db = await getDB();
    if (db) await db.delete(store, key);
  } catch {}
}

export async function idbAll(store) {
  try {
    const db = await getDB();
    if (db) {
      const v = await db.getAll(store);
      if (v && v.length) return v;
    }
  } catch {}
  const mem = [...memory.entries()]
    .filter(([k]) => k.startsWith(`${store}::`))
    .map(([, v]) => v);
  return mem.length ? mem : lsAll(store);
}

export async function idbClear(store) {
  for (const k of [...memory.keys()]) if (k.startsWith(`${store}::`)) memory.delete(k);
  for (const row of lsAll(store)) {
    const kp = row?.key ?? row?.url ?? row?.letter ?? row?.surah ?? row?.id;
    if (kp !== undefined) lsDel(store, kp);
  }
  try {
    const db = await getDB();
    if (db) await db.clear(store);
  } catch {}
}

// ---------- الإعدادات ----------
const SETTINGS_ID = "app";
export const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  studentName: "",
  theme: "light", // light | dark
  fontSize: 2, // rem — سلايدر المصحف
  lastPosition: null, // { surah, ayah, word }
  recentSurahs: [], // آخر ٥ سور
  streak: { count: 0, lastDay: null },
  notifications: null, // شوف utils/notifications.js
  salawat: null, // شوف utils/reminders.js
  followMode: "ayah", // سرعة تمرير المتابعة: ayah | three | page
  lastLessonDay: null, // لهدف "اقرأ درس"
  location: null, // { lat, lng, source, name } — محلي فقط، مابيتبعتش لأي سيرفر
  prayerMethod: null, // طريقة حساب المواقيت
  madhab: "Shafi", // مذهب العصر
  tafsirId: 16, // التفسير المختار — الميسر افتراضيًا
};

export async function getSettings() {
  const v = await idbGet(STORES.settings, SETTINGS_ID);
  return { ...DEFAULT_SETTINGS, ...(v || {}) };
}

export async function saveSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch, id: SETTINGS_ID };
  await idbSet(STORES.settings, next);
  return next;
}

// ---------- التوقيتات ----------
const TIMINGS_TTL = 1000 * 60 * 60 * 24 * 120; // ١٢٠ يوم

export async function getCachedTimings(key) {
  const row = await idbGet(STORES.timings, key);
  if (!row) return null;
  if (Date.now() - (row.timestamp || 0) > TIMINGS_TTL) return null;
  return row.data;
}

export async function cacheTimings(key, data) {
  await idbSet(STORES.timings, { key, data, timestamp: Date.now() });
  if (data?.audioUrl) {
    await idbSet(STORES.audioMeta, {
      url: data.audioUrl,
      duration: data.durationMs || 0,
      ayatCount: data.ayat?.length || 0,
      timestamp: Date.now(),
    });
  }
}

// ---------- الترجمات ----------
export async function getCachedTranslations(surah) {
  const row = await idbGet(STORES.translations, String(surah));
  return row?.data || null;
}
export async function cacheTranslations(surah, data) {
  await idbSet(STORES.translations, { surah: String(surah), data, timestamp: Date.now() });
}

// ---------- التقدّم ----------
export async function getLocalProgress(id = "local") {
  const row = await idbGet(STORES.progress, id);
  return row?.progress || null;
}
export async function setLocalProgress(progress, id = "local") {
  await idbSet(STORES.progress, { id, progress, timestamp: Date.now() });
}

// ---------- الطلاب (وضع المعلّم) ----------
export async function listStudents() {
  const rows = await idbAll(STORES.students);
  return rows.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
}
export async function putStudent(student) {
  return idbSet(STORES.students, student);
}
export async function removeStudent(id) {
  return idbDelete(STORES.students, id);
}

// ---------- التكرار المتباعد ----------
export async function getSrsAll() {
  return idbAll(STORES.srs);
}
export async function bumpSrs(letter, wasRight) {
  const row = (await idbGet(STORES.srs, letter)) || {
    letter,
    wrongCount: 0,
    rightStreak: 0,
    nextReview: 0,
  };
  if (wasRight) {
    row.rightStreak += 1;
    // الفاصل بيتضاعف مع كل إجابة صحيحة: يوم، يومين، ٤، ٨…
    const days = Math.min(2 ** Math.max(0, row.rightStreak - 1), 16);
    row.nextReview = Date.now() + days * 864e5;
  } else {
    row.wrongCount += 1;
    row.rightStreak = 0;
    row.nextReview = Date.now(); // للمراجعة فورًا
  }
  await idbSet(STORES.srs, row);
  return row;
}
export async function clearSrs() {
  return idbClear(STORES.srs);
}

// ---------- الشارات ----------
export async function getBadges() {
  return idbAll(STORES.badges);
}
export async function awardBadge(id) {
  const existing = await idbGet(STORES.badges, id);
  if (existing) return null; // اتمنحت قبل كده
  const row = { id, earnedAt: Date.now() };
  await idbSet(STORES.badges, row);
  return row;
}

// ---------- الختمة ----------
export async function getKhatma() {
  return idbAll(STORES.khatma);
}
export async function markSurahRead(surah) {
  const id = String(surah);
  const existing = await idbGet(STORES.khatma, id);
  if (existing) return existing;
  return idbSet(STORES.khatma, { id, surah: Number(surah), readAt: Date.now() });
}
export async function resetKhatma() {
  return idbClear(STORES.khatma);
}

// ---------- الحفظ ----------
// فواصل المراجعة: يوم ← ٣ ← ٧ ← ١٤ ← ٣٠
export const HIFZ_STEPS = [1, 3, 7, 14, 30];

export async function getHifz() {
  const rows = await idbAll(STORES.hifz);
  return rows.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
}
export async function addHifz(surah, from, to) {
  const id = `${surah}_${from}_${to}`;
  const row = {
    id,
    surah: Number(surah),
    from: Number(from),
    to: Number(to),
    stage: 0,
    nextReview: Date.now() + HIFZ_STEPS[0] * 864e5,
    createdAt: Date.now(),
  };
  return idbSet(STORES.hifz, row);
}
export async function reviewHifz(id, passed) {
  const row = await idbGet(STORES.hifz, id);
  if (!row) return null;
  const stage = passed ? Math.min(row.stage + 1, HIFZ_STEPS.length - 1) : 0;
  const next = { ...row, stage, nextReview: Date.now() + HIFZ_STEPS[stage] * 864e5 };
  await idbSet(STORES.hifz, next);
  return next;
}
export async function removeHifz(id) {
  return idbDelete(STORES.hifz, id);
}

// ---------- يوميات القراءة (اقرأ بثقة) ----------
export async function getJournal() {
  const rows = await idbAll(STORES.journal);
  return rows.sort((a, b) => (b.at || 0) - (a.at || 0));
}
export async function addJournalEntry(entry) {
  const id = `j_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return idbSet(STORES.journal, { id, at: Date.now(), ...entry });
}

// ---------- المسابقة اليومية ----------
export async function getDaily(day) {
  return idbGet(STORES.daily, day);
}
export async function saveDaily(day, data) {
  return idbSet(STORES.daily, { id: day, ...data });
}
export async function getLeaderboard() {
  const rows = await idbAll(STORES.leaderboard);
  return rows.sort((a, b) => (b.points || 0) - (a.points || 0));
}
export async function addPoints(name, points, day) {
  const key = (name || "ضيف").trim() || "ضيف";
  const row = (await idbGet(STORES.leaderboard, key)) || { name: key, points: 0, days: 0 };
  // مانحسبش نقط مرتين في نفس اليوم
  if (row.lastDay === day) return row;
  const next = { ...row, points: (row.points || 0) + points, days: (row.days || 0) + 1, lastDay: day };
  await idbSet(STORES.leaderboard, next);
  return next;
}

// ---------- التفسير ----------
export async function getCachedTafsir(key) {
  const row = await idbGet(STORES.tafsir, key);
  return row?.text || null;
}
export async function cacheTafsir(key, text) {
  return idbSet(STORES.tafsir, { key, text, timestamp: Date.now() });
}

export async function wipeEverything() {
  for (const s of Object.values(STORES)) await idbClear(s);
}
