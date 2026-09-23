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

// السبب الحقيقي لو حاجة فشلت — بيتعرض في الواجهة بدل ما نخمّن.
let lastReason = "لسه ما اتفحصش";

// ============================================================
//  الوصول للإضافة
// ------------------------------------------------------------
//  ⚠️ بنقرا من window.Capacitor مباشرة، **من غير أي import**.
//
//  السبب: النسخة اللي قبلها كانت بتعمل
//      const { registerPlugin } = await import("@capacitor/core")
//  وده بيخلّي نجاح الكود معتمد على إزاي أداة الحزم تعاملت مع
//  الاستيراد الديناميكي وتصدير الأسماء. النتيجة كانت إن التطبيق
//  الأصلي يقول «الإضافة ماشتغلتش» من غير سبب واضح.
//
//  الجسر الأصلي بيحقن window.Capacitor و window.Capacitor.Plugins
//  في الصفحة **قبل** ما كود التطبيق يشتغل. القراءة منهم مباشرة
//  مالهاش علاقة بالحزم خالص — وده أبسط وأضمن.
//
//  registerPlugin سايبينها كخطة بديلة بس، مش الطريق الأساسي.
// ============================================================

function bridge() {
  return typeof window !== "undefined" ? window.Capacitor : null;
}

function nativeNow() {
  try {
    return bridge()?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

let apiPromise = null;

function api() {
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    if (!nativeNow()) {
      lastReason = "نسخة متصفّح";
      return null;
    }

    // الطريق الأساسي: الإضافة محقونة في الجسر
    let p = null;
    try {
      p = bridge()?.Plugins?.Athan || null;
    } catch {}

    // الخطة البديلة: registerPlugin — لو الجسر مابيحقنش الأسماء
    if (!p) {
      try {
        const core = await import("@capacitor/core");
        if (typeof core.registerPlugin === "function") {
          p = core.registerPlugin("Athan");
        }
      } catch (e) {
        lastReason = "فشل تحميل Capacitor: " + (e?.message || e);
      }
    }

    if (!p) {
      let names = [];
      try {
        names = Object.keys(bridge()?.Plugins || {});
      } catch {}
      lastReason = names.length
        ? `الجسر مش شايف Athan. الموجود: ${names.join(", ")}`
        : "الجسر مش شايف أي إضافة";
      return null;
    }

    // نداء حقيقي: أضمن من مجرد وجود الكائن — الوكيل بيتعمل حتى
    // لو الجافا ماسجّلتش الإضافة، والفشل ساعتها بيظهر عند أول نداء.
    try {
      await p.status();
      lastReason = "الإضافة جاهزة";
      return p;
    } catch (e) {
      lastReason = "نداء الإضافة فشل: " + (e?.message || e);
      return null;
    }
  })();
  return apiPromise;
}

export async function isNative() {
  return nativeNow();
}

/**
 * هل إضافة الأذان نفسها شغّالة؟ بترجّع { ok, reason }.
 *
 * ⚠️ بترجّع السبب **في نفس القيمة** مش من متغيّر مصدَّر.
 * جرّبنا `export let lastReason` والاستيراد منه — والرابط الحيّ
 * ده مابيوصلش بعد الحزم، فالواجهة كانت بتعرض «الإضافة ماشتغلتش»
 * من غير أي سبب. القيمة المرجَّعة مافيهاش الالتباس ده.
 */
export async function pluginReady() {
  const p = await api();
  return { ok: !!p, reason: lastReason };
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
  { muezzinId = "haram", enabled = {}, volume = 0.9, days = 7, now = new Date() } = {}
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
        // أزرار الصوت في الموبايل مابتأثّرش على قناة المنبّه،
        // فمؤشّر الصوت اللي في التطبيق هو المتحكّم الوحيد.
        volume,
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
export async function playNow(muezzinId, kind = "normal", volume = 0.9) {
  const a = await api();
  if (!a) return false;
  try {
    await a.playNow({ sound: soundNameFor(muezzinId, kind), label: "تجربة", volume });
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
