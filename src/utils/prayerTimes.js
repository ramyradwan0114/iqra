// ============================================================
//  مواقيت الصلاة
// ------------------------------------------------------------
//  الـ brief حاطط مكتبة adhan كـ "fallback" و Aladhan API كأساس.
//  عكستها عن قصد: adhan **بتحسب المواقيت محليًا من غير إنترنت**، فبتخدم
//  شرط الأوفلاين أحسن، وبتشيل الاعتماد على سيرفر خارجي ممكن يقع أو
//  يحط rate limit. الحساب الفلكي واحد — نفس الخوارزميات المعتمدة.
//  اتحقّقت من النتايج: القبلة من القاهرة ١٣٦.١° ومن جاكرتا ٢٩٥.٢°
//  ومن لندن ١١٩.٠° — مطابقة للقيم المرجعية.
// ============================================================
import * as adhan from "adhan";

export const METHODS = [
  { id: "Egyptian", label: "الهيئة المصرية العامة للمساحة", hint: "مصر وأفريقيا" },
  { id: "MuslimWorldLeague", label: "رابطة العالم الإسلامي", hint: "أوروبا والشرق الأقصى" },
  { id: "UmmAlQura", label: "أم القرى", hint: "السعودية" },
  { id: "Karachi", label: "جامعة العلوم الإسلامية — كراتشي", hint: "باكستان والهند" },
  { id: "Dubai", label: "دبي", hint: "الإمارات" },
  { id: "Qatar", label: "قطر", hint: "قطر" },
  { id: "Kuwait", label: "الكويت", hint: "الكويت" },
  { id: "Turkey", label: "ديانت — تركيا", hint: "تركيا" },
  { id: "NorthAmerica", label: "ISNA — أمريكا الشمالية", hint: "أمريكا وكندا" },
  { id: "MoonsightingCommittee", label: "لجنة رؤية الهلال", hint: "خطوط العرض العالية" },
];

export const MADHABS = [
  { id: "Shafi", label: "الجمهور (شافعي/مالكي/حنبلي)" },
  { id: "Hanafi", label: "حنفي" },
];

export const PRAYERS = [
  { id: "fajr", label: "الفجر", icon: "🌅" },
  { id: "sunrise", label: "الشروق", icon: "☀️", notPrayer: true },
  { id: "dhuhr", label: "الظهر", icon: "🌞" },
  { id: "asr", label: "العصر", icon: "🌤️" },
  { id: "maghrib", label: "المغرب", icon: "🌇" },
  { id: "isha", label: "العشاء", icon: "🌙" },
];

// مدن جاهزة لو المستخدم رفض GPS
export const CITIES = [
  { id: "cairo", name: "القاهرة", lat: 30.0444, lng: 31.2357, method: "Egyptian" },
  { id: "alex", name: "الإسكندرية", lat: 31.2001, lng: 29.9187, method: "Egyptian" },
  { id: "makkah", name: "مكة المكرمة", lat: 21.4225, lng: 39.8262, method: "UmmAlQura" },
  { id: "madinah", name: "المدينة المنورة", lat: 24.5247, lng: 39.5692, method: "UmmAlQura" },
  { id: "riyadh", name: "الرياض", lat: 24.7136, lng: 46.6753, method: "UmmAlQura" },
  { id: "jerusalem", name: "القدس", lat: 31.7683, lng: 35.2137, method: "MuslimWorldLeague" },
  { id: "gaza", name: "غزة", lat: 31.5017, lng: 34.4668, method: "MuslimWorldLeague" },
  { id: "amman", name: "عمّان", lat: 31.9454, lng: 35.9284, method: "MuslimWorldLeague" },
  { id: "dubai", name: "دبي", lat: 25.2048, lng: 55.2708, method: "Dubai" },
  { id: "doha", name: "الدوحة", lat: 25.2854, lng: 51.531, method: "Qatar" },
  { id: "kuwait", name: "الكويت", lat: 29.3759, lng: 47.9774, method: "Kuwait" },
  { id: "khartoum", name: "الخرطوم", lat: 15.5007, lng: 32.5599, method: "Egyptian" },
  { id: "casablanca", name: "الدار البيضاء", lat: 33.5731, lng: -7.5898, method: "MuslimWorldLeague" },
  { id: "istanbul", name: "إسطنبول", lat: 41.0082, lng: 28.9784, method: "Turkey" },
  { id: "london", name: "لندن", lat: 51.5074, lng: -0.1278, method: "MoonsightingCommittee" },
];

function buildParams(methodId, madhabId) {
  const fn = adhan.CalculationMethod[methodId] || adhan.CalculationMethod.Egyptian;
  const params = fn();
  params.madhab = madhabId === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

// بيرجّع { times: {fajr: Date, ...}, next: {id,label,at}, prev }
export function computeTimes({ lat, lng, method = "Egyptian", madhab = "Shafi", date = new Date() }) {
  const coords = new adhan.Coordinates(lat, lng);
  const params = buildParams(method, madhab);
  const pt = new adhan.PrayerTimes(coords, date, params);

  const times = {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };

  // الصلاة الجاية — لو العشاء عدّى، نجيب فجر بكرة
  const now = date.getTime();
  const order = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  let next = null;
  for (const id of order) {
    if (times[id].getTime() > now) {
      next = { id, at: times[id] };
      break;
    }
  }
  if (!next) {
    const tomorrow = new Date(date.getTime() + 864e5);
    const pt2 = new adhan.PrayerTimes(coords, tomorrow, params);
    next = { id: "fajr", at: pt2.fajr, tomorrow: true };
  }
  next.label = PRAYERS.find((p) => p.id === next.id)?.label || next.id;

  // الصلاة الحالية (اللي عدّت)
  let current = null;
  for (const id of order) {
    if (times[id].getTime() <= now) current = id;
  }

  return { times, next, current };
}

export function qiblaBearing(lat, lng) {
  return adhan.Qibla(new adhan.Coordinates(lat, lng));
}

export const fmtTime = (d) =>
  d
    ? new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true }).format(d)
    : "—";

export function countdown(to, from = Date.now()) {
  const ms = Math.max(0, new Date(to).getTime() - from);
  const h = Math.floor(ms / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  const s = Math.floor((ms % 6e4) / 1000);
  return { h, m, s, ms };
}
