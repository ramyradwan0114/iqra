// ============================================================
//  هدف اليوم — ٣ أهداف ثابتة بتتجدد نص الليل
// ------------------------------------------------------------
//  التجديد مبني على مفتاح اليوم المحلي (سنة-شهر-يوم) مش على مؤقّت.
//  المؤقّت بيفشل لو الجهاز كان نايم الساعة ١٢، أو لو المستخدم سافر
//  وغيّر المنطقة الزمنية. مقارنة مفتاح اليوم بتشتغل صح في الحالتين.
// ============================================================
import { idbGet, idbSet, STORES } from "./db.js";
import { dayKey } from "./reminders.js";

export const GOALS = [
  {
    id: "lesson",
    icon: "📖",
    label: "اقرأ درس",
    hint: "أكمل أي درس في مستواك",
    target: 1,
  },
  {
    id: "salawat",
    icon: "ﷺ",
    label: "صلِّ على النبي ١٠٠ مرة",
    hint: "من عدّاد الصلاة على النبي",
    target: 100,
  },
  {
    id: "tasbih",
    icon: "📿",
    label: "سبِّح ٣٣ مرة",
    hint: "أي ذِكْر من الأربعة",
    target: 33,
  },
];

const GOALS_ID = "daily";

export async function loadGoals() {
  const row = (await idbGet(STORES.goals, GOALS_ID)) || {};
  const today = dayKey();
  if (row.day === today) return { id: GOALS_ID, day: today, done: row.done || {}, awarded: !!row.awarded, yesterday: row.yesterday || null };
  // يوم جديد: نحتفظ بنتيجة إمبارح للعرض
  const prevCount = Object.values(row.done || {}).filter(Boolean).length;
  return {
    id: GOALS_ID,
    day: today,
    done: {},
    awarded: false,
    yesterday: row.day ? { day: row.day, count: prevCount, total: GOALS.length } : null,
  };
}

export async function saveGoals(state) {
  await idbSet(STORES.goals, { ...state, id: GOALS_ID });
  return state;
}

// بيحسب حالة الأهداف من الأرقام الحالية
// ctx: { lessonDone, salawatToday, tasbihMax }
export function evaluate(state, ctx) {
  const done = { ...state.done };
  if (ctx.lessonDone) done.lesson = true;
  if ((ctx.salawatToday || 0) >= 100) done.salawat = true;
  if ((ctx.tasbihMax || 0) >= 33) done.tasbih = true;
  return done;
}

export const progressOf = (goalId, ctx) => {
  if (goalId === "lesson") return ctx.lessonDone ? 1 : 0;
  if (goalId === "salawat") return Math.min(ctx.salawatToday || 0, 100);
  if (goalId === "tasbih") return Math.min(ctx.tasbihMax || 0, 33);
  return 0;
};

export const countDone = (done) => GOALS.filter((g) => done?.[g.id]).length;
export const allDone = (done) => countDone(done) === GOALS.length;
