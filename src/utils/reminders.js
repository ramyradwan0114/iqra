// ============================================================
//  الصلاة على النبي ﷺ — التذكير والعدّاد
// ------------------------------------------------------------
//  نفس قيد الإشعارات المعروف: المتصفح مابيجدولش إشعارات والتطبيق مقفول
//  من غير سيرفر. مع تذكير "كل ساعة" القيد ده بيبقى أوضح — المستخدم
//  متوقّع ٢٤ إشعار في اليوم وهيوصله واحد لما يفتح التطبيق. عشان كده
//  الوضع الافتراضي بيعرض تنبيه *جوّه التطبيق* عند الفتح، وده اللي
//  اتفقنا عليه في المواصفة.
//
//  قرار مهم: فيه "ساعات هدوء" (١٠م → ٨ص) والتذكير بيتوقف فيها. تذكير
//  كل ساعة بالليل هيخلّي الناس تقفل الإشعارات خالص — وساعتها تخسر
//  التذكير كله مش بس اللي بالليل.
// ============================================================
import { idbGet, idbSet, STORES } from "./db.js";

export const SALAWAT_TEXT = "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّد";

export const SALAWAT_NOTIF = {
  title: "صلِّ على النبي ﷺ",
  body: "اللهم صلِّ وسلِّم على نبينا محمد",
};

export const DEFAULT_SALAWAT = {
  enabled: false,
  intervalHours: 1, // ١ أو ٣
  lastShown: 0,
  quietFrom: 22, // ١٠ مساءً
  quietTo: 8, // ٨ صباحًا
};

export const INTERVAL_OPTIONS = [
  { hours: 1, label: "كل ساعة" },
  { hours: 3, label: "كل ٣ ساعات" },
];

export function inQuietHours(s, now = new Date()) {
  const h = now.getHours();
  const from = s?.quietFrom ?? 22;
  const to = s?.quietTo ?? 8;
  return from > to ? h >= from || h < to : h >= from && h < to;
}

export function salawatDue(s, now = Date.now()) {
  if (!s?.enabled) return false;
  if (inQuietHours(s, new Date(now))) return false;
  const gap = (s.intervalHours || 1) * 3600e3;
  return now - (s.lastShown || 0) >= gap;
}

// ---------- عدّاد التسبيح ----------
// ملاحظة على التصميم: بنحتفظ برقمين لكل ذِكْر —
//   today  : بيتصفّر نص الليل، وعليه بتتحسب أهداف اليوم
//   total  : عمري، مابيتصفّرش أبدًا
// كده "مايتصفّرش لما يقفل التطبيق" متحققة، وفي نفس الوقت "هدف اليوم"
// يقدر يقيس اليوم لوحده.
// كل ذِكْر له هدف يومي — الهدف بيظهر كشريط تقدّم تحت العدّاد
export const ADHKAR = [
  { id: "subhan", text: "سُبْحَانَ اللَّه", color: "#1B4D3E", target: 33 },
  { id: "hamd", text: "الحَمْدُ لِلَّه", color: "#2E7D5B", target: 33 },
  { id: "akbar", text: "اللَّهُ أَكْبَر", color: "#8A7A4E", target: 33 },
  { id: "tahlil", text: "لَا إِلٰهَ إِلَّا اللَّه", color: "#5B6B62", target: 33 },
  { id: "istighfar", text: "أَسْتَغْفِرُ اللَّه", color: "#8A4E4E", target: 33 },
  // الصلاة على النبي ﷺ — لازمة عشان هدف "صلِّ على النبي ١٠٠ مرة"
  // يبقى قابل للتحقيق أصلًا (الباقي مفيهوش صلاة على النبي)
  { id: "salat", text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّد", color: "#7A5C9E", salawat: true, target: 100 },
];

export const MILESTONES = [33, 66, 99, 100];

const TASBIH_ID = "tasbih";

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const emptyCounts = () => Object.fromEntries(ADHKAR.map((a) => [a.id, 0]));

export async function loadTasbih() {
  const row = (await idbGet(STORES.tasbih, TASBIH_ID)) || {};
  const today = dayKey();
  const totals = { ...emptyCounts(), ...(row.totals || {}) };
  // يوم جديد → عدّاد اليوم يبدأ من الصفر، والإجمالي زي ما هو
  const counts = row.day === today ? { ...emptyCounts(), ...(row.counts || {}) } : emptyCounts();
  return { id: TASBIH_ID, day: today, counts, totals };
}

export async function saveTasbih(state) {
  await idbSet(STORES.tasbih, { ...state, id: TASBIH_ID });
  return state;
}

// بيرجّع { state, milestone } — milestone = الرقم اللي اتوصل له دلوقتي أو null
export function bump(state, id) {
  const counts = { ...state.counts, [id]: (state.counts[id] || 0) + 1 };
  const totals = { ...state.totals, [id]: (state.totals[id] || 0) + 1 };
  const n = counts[id];
  const milestone = MILESTONES.includes(n) ? n : null;
  return { state: { ...state, counts, totals }, milestone };
}

export function resetDhikr(state, id) {
  return { ...state, counts: { ...state.counts, [id]: 0 } };
}

export const salawatCount = (state) => state?.counts?.salat || 0;
export const maxTasbih = (state) =>
  Math.max(...ADHKAR.filter((a) => !a.salawat).map((a) => state?.counts?.[a.id] || 0), 0);
