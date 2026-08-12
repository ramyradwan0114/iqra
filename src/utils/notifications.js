// ============================================================
//  التذكيرات المحلية
// ------------------------------------------------------------
//  اقرأ ده قبل ما تعتمد عليها:
//
//  الويب مافيهوش جدولة تذكيرات حقيقية من غير سيرفر. الـ Notification
//  Triggers API (اللي كان هيسمح بجدولة محلية) اتسحب ومحدش شحنه.
//  يعني تذكير "الساعة ٧ مساءً" **مش هيوصل والتطبيق مقفول**.
//
//  اللي بنعمله هنا وشغّال فعلًا:
//   • التطبيق مفتوح ووصل الميعاد → التذكير بيظهر في وقته بالظبط.
//   • التطبيق كان مقفول وفتحه بعد الميعاد → بيظهر تذكير متأخّر
//     ("فاتك درس النهاردة") مرة واحدة بس في اليوم.
//   • انكسار السلسلة وسورة اليوم → بيتفحصوا عند كل فتح.
//
//  عشان تذكير مضمون في ٧ مساءً والتطبيق مقفول، محتاج Web Push:
//  اشتراك pushManager + مفاتيح VAPID + كرون على السيرفر (Vercel Cron
//  + web-push يعملوها ببلاش). ودي بتحتاج باك-إند، فخرجت عن نطاق
//  "PWA من غير سيرفر".
// ============================================================

export const NOTIF_KINDS = {
  lesson: {
    id: "lesson",
    label: "وقت الدرس",
    desc: "تذكير يومي في الميعاد اللي تختاره",
    title: "وقت الدرس! 📖",
    body: "خمس دقايق بس تفرق — تعالى نكمّل.",
  },
  streak: {
    id: "streak",
    label: "انكسار السلسلة",
    desc: "لما تعدّي يوم من غير قراءة",
    title: "ما قرأتش من إمبارح 🔥",
    body: "سلسلتك في خطر — اقرأ آية واحدة وترجع تاني.",
  },
  surah: {
    id: "surah",
    label: "سورة اليوم",
    desc: "سورة مختلفة كل يوم",
    title: "سورة اليوم ﴿﴾",
    body: "افتح المصحف واقرأ سورة النهاردة.",
  },
};

export const DEFAULT_NOTIF_SETTINGS = {
  enabled: false,
  lesson: true,
  streak: true,
  surah: false,
  hour: 19, // ٧ مساءً
  minute: 0,
  lastShown: {}, // { lesson: "2026-08-10", ... }
};

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission; // default | granted | denied
}

export async function requestPermission() {
  if (!notificationsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// الأفضل نعرض من الـ Service Worker: كده الإشعار بيفضل موجود لو
// التبويب اتقفل، وبيشتغل على أندرويد صح.
export async function showNotification(title, options = {}) {
  if (permission() !== "granted") return false;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.showNotification) {
        await reg.showNotification(title, {
          icon: "/icon-192.svg",
          badge: "/icon-192.svg",
          dir: "rtl",
          lang: "ar",
          ...options,
        });
        return true;
      }
    }
    new Notification(title, { icon: "/icon-192.svg", dir: "rtl", lang: "ar", ...options });
    return true;
  } catch {
    return false;
  }
}

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// بيرجّع قائمة التذكيرات المستحقّة دلوقتي (من غير ما يعرضها)
export function dueReminders(settings, ctx = {}) {
  const s = { ...DEFAULT_NOTIF_SETTINGS, ...(settings || {}) };
  if (!s.enabled || permission() !== "granted") return [];
  const today = dayKey();
  const out = [];
  const shown = s.lastShown || {};

  if (s.lesson && shown.lesson !== today) {
    const now = new Date();
    const due = new Date();
    due.setHours(s.hour, s.minute, 0, 0);
    if (now >= due) out.push("lesson");
  }

  // السلسلة اتكسرت: آخر يوم نشاط أقدم من إمبارح
  if (s.streak && shown.streak !== today && ctx.lastActiveDay) {
    const yesterday = dayKey(new Date(Date.now() - 864e5));
    if (ctx.lastActiveDay !== today && ctx.lastActiveDay < yesterday) out.push("streak");
  }

  if (s.surah && shown.surah !== today) out.push("surah");

  return out;
}

// سورة اليوم — اختيار ثابت لليوم الواحد
export function surahOfTheDay(day) {
  return ((day % 114) + 114) % 114 + 1;
}
