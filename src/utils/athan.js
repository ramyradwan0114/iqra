// ============================================================
//  الأذان
// ------------------------------------------------------------
//  أذان الفجر مختلف: فيه «الصلاة خير من النوم» (التثويب). تشغيل
//  الأذان العادي في الفجر غلط، فالاختيار بيتم حسب الصلاة تلقائيًا.
//
//  ملاحظة على الملفات: مستوى الصوت اتوحّد بين المؤذنين. ملف الفجر
//  الأصلي كان -0.4 LUFS (أعلى من التانيين بـ١٤ ديسيبل تقريبًا) —
//  لو اتساب كده كان هيفزّع اللي نايم في الفجر.
//
//  الملفات مستثناة من الـ precache عمدًا (٢.٦ ميجا) — بتتحمّل أول
//  مرة تشغّلها، وبعدين المتصفح بيكاشها.
// ============================================================

export const MUEZZINS = [
  {
    id: "haram",
    name: "الحرم المكي",
    normal: "/audio/athan/haram_normal.mp3",
    fajr: "/audio/athan/haram_fajr.mp3", // لسه مترفعش — بيرجع للعادي
  },
  {
    id: "basit",
    name: "عبد الباسط عبد الصمد",
    normal: "/audio/athan/basit_normal.mp3",
    fajr: "/audio/athan/basit_fajr.mp3",
  },
];

export const DEFAULT_ATHAN = {
  enabled: false,
  muezzin: "haram",
  volume: 0.9,
  perPrayer: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  vibrate: true,
};

// بيرجّع مسار الملف المناسب للصلاة دي
export function athanSrc(muezzinId, prayerId) {
  const m = MUEZZINS.find((x) => x.id === muezzinId) || MUEZZINS[0];
  return prayerId === "fajr" ? m.fajr || m.normal : m.normal;
}

// بيتأكد إن الملف موجود فعلًا (عشان ملفات الفجر الناقصة)
const probed = new Map();
export async function srcExists(url) {
  if (probed.has(url)) return probed.get(url);
  const p = (async () => {
    try {
      const r = await fetch(url, { method: "HEAD" });
      return r.ok;
    } catch {
      return false;
    }
  })();
  probed.set(url, p);
  return p;
}

// بيرجّع المسار المتاح فعليًا — لو ملف الفجر ناقص، بيرجع للعادي
export async function resolveAthan(muezzinId, prayerId) {
  const m = MUEZZINS.find((x) => x.id === muezzinId) || MUEZZINS[0];
  if (prayerId === "fajr" && m.fajr) {
    if (await srcExists(m.fajr)) return { src: m.fajr, isFajr: true, fellBack: false };
    return { src: m.normal, isFajr: true, fellBack: true };
  }
  return { src: m.normal, isFajr: false, fellBack: false };
}

// ---------- ذكر ما بعد الصلاة ----------
export const AFTER_PRAYER = [
  { text: "أَسْتَغْفِرُ اللَّه", count: 3, id: "istighfar" },
  { text: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَام، تَبَارَكْتَ يَا ذَا الجَلَالِ وَالإِكْرَام", count: 1, id: "salam" },
  { text: "سُبْحَانَ اللَّه", count: 33, id: "subhan" },
  { text: "الحَمْدُ لِلَّه", count: 33, id: "hamd" },
  { text: "اللَّهُ أَكْبَر", count: 33, id: "akbar" },
  {
    text: "لَا إِلٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَه، لَهُ المُلْكُ وَلَهُ الحَمْد، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِير",
    count: 1,
    id: "tahlil",
  },
];

// ---------- تتبّع الصلوات المؤدّاة ----------
export const prayerDayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
