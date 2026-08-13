// ============================================================
//  مجموعات الدراسة
// ------------------------------------------------------------
//  حقيقة لازم تكون واضحة: المجموعة **محتاجة سيرفر مشترك** عشان تشتغل.
//  من غيره، "مجموعة" على جهازك مش مجموعة — محدش تاني يقدر يشوفها ولا
//  ينضم لها. الكود هنا بيكتب ويقرا من Firestore لما المفاتيح تكون
//  متظبّطة، وبيرجع لتخزين محلي لما مايكونش — بس الواجهة بتقول للمستخدم
//  صراحةً إن المجموعة محلية ومش مشتركة، بدل ما نوهمه إنه شارك حد.
//
//  رابط الدعوة: بنستخدم ?join=CODE مش /join/CODE.
//  السبب: التطبيق مافيهوش راوتر، و/join/abc على Vercel هيدّي 404 من غير
//  قاعدة rewrite. الـ query param بيشتغل فورًا من غير أي إعداد.
// ============================================================
import { isFirebaseConfigured } from "./firebase.js";
import { idbGet, idbSet, idbAll, idbDelete, STORES } from "./db.js";
import { APP_URL } from "./share.js";

const COLLECTION = "groups";

export const LEVEL_LABELS = {
  1: "مبتدئ — الحروف",
  2: "الحركات والمقاطع",
  3: "كلمات وجمل",
  4: "سور قصيرة",
  5: "متقدّم — المصحف",
};

export const inviteUrl = (code) => `${APP_URL}/?join=${code}`;

export function makeCode() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789"; // من غير حروف/أرقام متشابهة
  let s = "";
  for (let i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

export function readJoinCode() {
  try {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("join");
    return c ? c.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function clearJoinParam() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("join");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  } catch {}
}

// ---------- طبقة Firestore ----------
let cached = null;
async function fs() {
  if (!isFirebaseConfigured()) return null;
  if (cached) return cached;
  try {
    const [{ initializeApp, getApps }, fns] = await Promise.all([
      import("firebase/app"),
      import("firebase/firestore"),
    ]);
    const { firebaseConfig } = await import("./firebase.js");
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    cached = { db: fns.getFirestore(app), fns };
    return cached;
  } catch {
    return null;
  }
}

export const cloudReady = () => isFirebaseConfigured();

// ---------- عمليات ----------
export async function createGroup({ name, level, goal, member }) {
  const code = makeCode();
  const group = {
    id: code,
    name: (name || "").trim().slice(0, 50),
    level: Number(level) || 1,
    goal: (goal || "").trim().slice(0, 120),
    members: [member],
    createdAt: Date.now(),
    ownerId: member.id,
    local: !cloudReady(),
  };

  const f = await fs();
  if (f) {
    try {
      await f.fns.setDoc(f.fns.doc(f.db, COLLECTION, code), { ...group, local: false });
      group.local = false;
    } catch {
      group.local = true;
    }
  }
  await idbSet(STORES.groups, group);
  return group;
}

export async function fetchGroup(code) {
  const f = await fs();
  if (f) {
    try {
      const snap = await f.fns.getDoc(f.fns.doc(f.db, COLLECTION, code));
      if (snap.exists()) {
        const g = { id: snap.id, ...snap.data(), local: false };
        await idbSet(STORES.groups, g);
        return g;
      }
      return null; // مش موجودة على السحابة
    } catch {
      /* نكمّل للمحلي */
    }
  }
  return (await idbGet(STORES.groups, code)) || null;
}

export async function joinGroup(code, member) {
  const g = await fetchGroup(code);
  if (!g) return { ok: false, reason: "not-found" };

  const members = [...(g.members || [])];
  const i = members.findIndex((m) => m.id === member.id);
  if (i >= 0) members[i] = { ...members[i], ...member };
  else members.push(member);

  const next = { ...g, members };
  const f = await fs();
  if (f) {
    try {
      await f.fns.setDoc(f.fns.doc(f.db, COLLECTION, code), next, { merge: true });
      next.local = false;
    } catch {
      next.local = true;
    }
  }
  await idbSet(STORES.groups, next);
  return { ok: true, group: next };
}

// تحديث بيانات العضو (المستوى/السلسلة) في كل مجموعاته
export async function syncMember(member) {
  const groups = await idbAll(STORES.groups);
  for (const g of groups) {
    if (!(g.members || []).some((m) => m.id === member.id)) continue;
    const members = g.members.map((m) => (m.id === member.id ? { ...m, ...member } : m));
    const next = { ...g, members };
    await idbSet(STORES.groups, next);
    const f = await fs();
    if (f) {
      try {
        await f.fns.setDoc(f.fns.doc(f.db, COLLECTION, g.id), { members }, { merge: true });
      } catch {}
    }
  }
}

export async function myGroups() {
  const rows = await idbAll(STORES.groups);
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function leaveGroup(code) {
  await idbDelete(STORES.groups, code);
}

// الترتيب حسب السلسلة
export function rankMembers(members = []) {
  return [...members].sort(
    (a, b) => (b.streak || 0) - (a.streak || 0) || (b.level || 0) - (a.level || 0)
  );
}
