// ============================================================
//  Streak — أيام التعلّم المتتالية
// ------------------------------------------------------------
//  دوال خالصة (pure) عشان تتختبر لوحدها من غير React ولا تخزين.
// ============================================================

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const daysBetween = (a, b) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 864e5);
};

export const MILESTONES = [
  { days: 7, id: "streak7", icon: "🥉", label: "أسبوع كامل", gold: false },
  { days: 30, id: "streak30", icon: "🥇", label: "شهر ذهبي", gold: true },
];

// المنطق الأساسي: بيرجّع الحالة الجديدة عند فتح درس.
//  • نفس اليوم           → مفيش تغيير
//  • اليوم اللي بعده     → +1
//  • فات يوم أو أكتر     → يرجع لـ 1 (اليوم ده بيتحسب)
// ملاحظة: المواصفة بتقول "يرجع لـ ٠"، بس اليوم اللي بيفتح فيه بيتحسب
// فورًا، فالنتيجة الظاهرة 1 مش 0 — وده اللي بيعمله Duolingo بالظبط.
export function advanceStreak(prev, today = dayKey()) {
  const count = prev?.count || 0;
  const lastDay = prev?.lastDay || null;
  const best = prev?.best || 0;

  if (lastDay === today) return { count, lastDay, best: Math.max(best, count), changed: false };

  let next;
  if (!lastDay) next = 1;
  else next = daysBetween(lastDay, today) === 1 ? count + 1 : 1;

  return { count: next, lastDay: today, best: Math.max(best, next), changed: true };
}

// حالة العرض من غير ما نعدّل حاجة — بتخلّي الشعلة تبرد لو اليوم عدّى
export function viewStreak(prev, today = dayKey()) {
  const count = prev?.count || 0;
  const lastDay = prev?.lastDay || null;
  if (!lastDay || !count) return { count: 0, alive: false, atRisk: false };
  const gap = daysBetween(lastDay, today);
  if (gap === 0) return { count, alive: true, atRisk: false }; // اتعلّم النهاردة
  if (gap === 1) return { count, alive: true, atRisk: true }; // آخر فرصة النهاردة
  return { count: 0, alive: false, atRisk: false }; // اتكسرت
}

// المعالم اللي اتحققت عند الرقم ده
export function reachedMilestones(count) {
  return MILESTONES.filter((m) => count >= m.days);
}

// المعلم اللي اتحقق دلوقتي بالظبط (للاحتفال)
export function justReached(count) {
  return MILESTONES.find((m) => m.days === count) || null;
}

export function nextMilestone(count) {
  return MILESTONES.find((m) => m.days > count) || null;
}
