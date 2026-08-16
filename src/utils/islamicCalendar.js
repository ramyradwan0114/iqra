// ============================================================
//  التقويم الهجري (أم القرى)
// ------------------------------------------------------------
//  الـ brief اقترح حزمة hijri-date. مش محتاجينها: المتصفحات بتدعم
//  تقويم أم القرى مدمجًا عن طريق Intl مع اللاحقة -u-ca-islamic-umalqura.
//  ده أدق (بيتحدّث مع بيانات النظام) وبصفر كيلوبايت زيادة، وشغّال أوفلاين.
//
//  تنبيه: بداية الشهر الهجري فيها خلاف بين الحساب والرؤية. القيم هنا
//  حسابية (أم القرى)، وممكن تفرق يوم عن الرؤية المحلية في بلدك.
// ============================================================

const CAL = "islamic-umalqura";

export const HIJRI_MONTHS = [
  "محرّم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة",
];

// بيرجّع { day, month (1-12), year, monthName }
export function toHijri(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat(`en-u-ca-${CAL}`, {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(date);
    const get = (t) => Number(parts.find((p) => p.type === t)?.value);
    const month = get("month");
    return { day: get("day"), month, year: get("year"), monthName: HIJRI_MONTHS[month - 1] };
  } catch {
    return null;
  }
}

export function formatHijri(date = new Date()) {
  const h = toHijri(date);
  if (!h) return "";
  return `${h.day} ${h.monthName} ${h.year} هـ`;
}

// المناسبات الثابتة (يوم/شهر هجري)
export const EVENTS = [
  { d: 1, m: 1, name: "رأس السنة الهجرية", icon: "🌙" },
  { d: 10, m: 1, name: "يوم عاشوراء", icon: "🤍" },
  { d: 12, m: 3, name: "المولد النبوي", icon: "🕌" },
  { d: 27, m: 7, name: "الإسراء والمعراج", icon: "✨" },
  { d: 15, m: 8, name: "ليلة النصف من شعبان", icon: "🌕" },
  { d: 1, m: 9, name: "أول رمضان", icon: "🌙" },
  { d: 27, m: 9, name: "ليلة القدر (المرجّحة)", icon: "⭐" },
  { d: 1, m: 10, name: "عيد الفطر", icon: "🎉" },
  { d: 9, m: 12, name: "يوم عرفة", icon: "🕋" },
  { d: 10, m: 12, name: "عيد الأضحى", icon: "🎉" },
];

// أيام الصيام المستحبّة في الشهر الحالي
export function fastingDaysThisMonth(date = new Date()) {
  const h = toHijri(date);
  if (!h) return [];
  const out = [{ label: "الاثنين والخميس", note: "كل أسبوع" }];
  if (h.month === 9) return [{ label: "رمضان", note: "صيام الشهر كامل" }];
  if (h.month === 12) out.push({ label: "التسع الأوائل من ذي الحجة", note: "وآكدها يوم عرفة" });
  if (h.month === 1) out.push({ label: "عاشوراء وتاسوعاء", note: "٩ و١٠ محرّم" });
  if (h.month === 10) out.push({ label: "ستة من شوّال", note: "بعد العيد" });
  out.push({ label: "الأيام البيض", note: "١٣ و١٤ و١٥ من كل شهر" });
  return out;
}

// أقرب مناسبة جاية + كام يوم فاضل
export function nextEvent(date = new Date()) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (let i = 0; i <= 400; i++) {
    const d = new Date(today.getTime() + i * 864e5);
    const h = toHijri(d);
    if (!h) return null;
    const ev = EVENTS.find((e) => e.d === h.day && e.m === h.month);
    if (ev) return { ...ev, inDays: i, gregorian: d, hijri: h };
  }
  return null;
}

// كل المناسبات الجاية في السنة القادمة
export function upcomingEvents(date = new Date(), limit = 5) {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const found = [];
  for (let i = 0; i <= 400 && found.length < limit; i++) {
    const d = new Date(today.getTime() + i * 864e5);
    const h = toHijri(d);
    if (!h) break;
    const ev = EVENTS.find((e) => e.d === h.day && e.m === h.month);
    if (ev) found.push({ ...ev, inDays: i, gregorian: d, hijri: h });
  }
  return found;
}

export const fmtGregorian = (d) =>
  new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
