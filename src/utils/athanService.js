// ============================================================
//  الأذان — عبر الخدمة الأصلية
// ------------------------------------------------------------
//  ده البديل لـ nativeAthan.js.
//
//  الفرق الجوهري: القديم كان بيطلب من أندرويد **يعرض إشعار
//  بصوت**، والجديد بيطلب منه **ينبّه التطبيق في وقت محدد**،
//  والتطبيق هو اللي بيشغّل الأذان بنفسه.
//
//  ليه ده أهم: صوت الإشعار بيتحكّم فيه النظام — بيتكتم في وضع
//  «عدم الإزعاج»، وبيتقص، والشركات المصنّعة بتكتمه للتطبيقات
//  الخاملة. أما التشغيل من خدمة على قناة المنبّه فبيعدّي كل ده،
//  وبيشغّل الأذان كامل.
//
//  واستخدمنا setAlarmClock في الجافا — النوع الوحيد من المنبّهات
//  المعفي تمامًا من وضع السكون في أندرويد.
//
//  في المتصفّح كل الدوال بترجّع قيم فاضية بهدوء.
// ============================================================

let apiPromise = null;

function api() {
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    try {
      const { Capacitor, registerPlugin } = await import("@capacitor/core");
      if (!Capacitor?.isNativePlatform?.()) return null;
      // الاسم لازم يطابق @CapacitorPlugin(name = "Athan") في الجافا
      return registerPlugin("Athan");
    } catch {
      return null;
    }
  })();
  return apiPromise;
}

export async function isNative() {
  return !!(await api());
}

// اسم ملف الصوت جوّه res/raw من غير امتداد
export function soundNameFor(muezzinId, kind) {
  return `${muezzinId}_${kind}`; // haram_normal, basit_fajr …
}

/**
 * computeForDate(date) لازم ترجّع { fajr, dhuhr, asr, maghrib, isha } كـ Date.
 *
 * بنبعت الجدول كله للجافا (بيتحفظ)، والجافا بيجدول الخمسة
 * الجايين بس كمنبّهات فعلية ويعيد البناء بعد كل أذان. السبب إن
 * المنبّهات المضبوطة ليها حصة، والشركات المصنّعة بتقص الزيادة —
 * فخمسة شغّالين أضمن من أربعين نصّهم متقصوص.
 *
 * بيرجّع { saved, scheduled, exactAllowed }
 */
export async function scheduleAthan(
  computeForDate,
  { muezzinId = "haram", enabled = {}, days = 7, now = new Date() } = {}
) {
  const a = await api();
  if (!a) return { saved: 0, scheduled: 0, exactAllowed: true };

  const PRAYERS = [
    { id: "fajr", label: "الفجر" },
    { id: "dhuhr", label: "الظهر" },
    { id: "asr", label: "العصر" },
    { id: "maghrib", label: "المغرب" },
    { id: "isha", label: "العشاء" },
  ];

  const prayers = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);

    let t;
    try {
      t = computeForDate(date);
    } catch {
      continue;
    }
    if (!t) continue;

    for (const p of PRAYERS) {
      if (enabled[p.id] === false) continue;
      const at = t[p.id];
      if (!at) continue;
      const ms = new Date(at).getTime();
      if (ms <= now.getTime()) continue;

      prayers.push({
        at: ms,
        // الفجر له أذان مختلف فيه التثويب
        sound: soundNameFor(muezzinId, p.id === "fajr" ? "fajr" : "normal"),
        label: p.label,
      });
    }
  }

  prayers.sort((x, y) => x.at - y.at);

  try {
    return await a.schedule({ prayers });
  } catch {
    return { saved: 0, scheduled: 0, exactAllowed: true };
  }
}

export async function cancelAll() {
  const a = await api();
  if (!a) return false;
  try {
    await a.cancelAll();
    return true;
  } catch {
    return false;
  }
}

/** إيقاف الأذان اللي شغّال دلوقتي */
export async function stopAthan() {
  const a = await api();
  if (!a) return false;
  try {
    await a.stop();
    return true;
  } catch {
    return false;
  }
}

/** تشغيل الأذان فورًا — لتجربة الصوت نفسه */
export async function playNow(muezzinId, kind = "normal") {
  const a = await api();
  if (!a) return false;
  try {
    await a.playNow({ sound: soundNameFor(muezzinId, kind), label: "تجربة" });
    return true;
  } catch {
    return false;
  }
}

/**
 * الحالة الحقيقية من النظام — مش من ذاكرة الواجهة.
 * { saved, upcoming, next, nextLabel, exactAllowed }
 */
export async function status() {
  const a = await api();
  if (!a) return null;
  try {
    return await a.status();
  } catch {
    return null;
  }
}
