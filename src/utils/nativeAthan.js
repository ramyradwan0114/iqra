// ============================================================
//  الأذان الحقيقي — عبر نظام أندرويد
// ------------------------------------------------------------
//  المشكلة اللي الملف ده بيحلّها: المتصفّح **مابيقدرش** يشغّل صوت
//  في وقت محدد وهو مقفول. لا PWA ولا TWA. الحل الوحيد إن نظام
//  التشغيل نفسه هو اللي يجدول التنبيه — وده اللي Capacitor بيعمله.
//
//  تفصيلة حرجة من توثيق الإضافة:
//    «On Android 8+ it sets the default channel sound and can't be
//     changed unless the app is uninstalled»
//  يعني صوت القناة بيتقفل أول ما تتعمل. لو عملنا قناة واحدة اسمها
//  "الأذان"، المستخدم **مش هيقدر يغيّر المؤذّن أبدًا** بعد كده.
//  عشان كده بنعمل **قناة لكل مؤذّن × كل نوع (عادي/فجر)**، وتغيير
//  المؤذّن معناه استخدام قناة تانية مش تعديل القناة الحالية.
//
//  والملف ده بيشتغل في المتصفّح عادي: كل الدوال بترجّع false بهدوء
//  لو Capacitor مش موجود، فنسخة الويب على Vercel ما بتتأثرش.
// ============================================================

// الأذان بيتجدول لليوم الحالي بس. الجدولة بتتجدّد كل ما التطبيق
// يتفتح — ده مقصود: أندرويد بيحدّد عدد التنبيهات المجدولة، وجدولة
// شهر كامل مقدّمًا بتستهلك الحد من غير داعي.
export const ATHAN_DAYS_AHEAD = 2;

// معرّفات ثابتة عشان نقدر نلغي ونعيد الجدولة من غير تكرار
const BASE_ID = 7100;

let cachedApi = null;
let checked = false;

// بنحمّل Capacitor ديناميكيًا. لو مش متثبّت (نسخة الويب) بنرجّع null
// من غير ما نكسّر أي حاجة.
async function api() {
  if (checked) return cachedApi;
  checked = true;
  try {
    const [{ Capacitor }, { LocalNotifications }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/local-notifications"),
    ]);
    if (!Capacitor?.isNativePlatform?.()) return (cachedApi = null);
    cachedApi = { Capacitor, LocalNotifications };
    return cachedApi;
  } catch {
    return (cachedApi = null);
  }
}

export async function isNative() {
  return !!(await api());
}

// اسم القناة لكل مؤذّن ونوع. الصوت بيتحدّد هنا مرة واحدة للأبد.
export function channelIdFor(muezzinId, kind) {
  return `athan_${muezzinId}_${kind}`; // kind: normal | fajr
}

// اسم ملف الصوت جوّه android/app/src/main/res/raw (من غير امتداد)
export function soundNameFor(muezzinId, kind) {
  return `${muezzinId}_${kind}`; // haram_normal, basit_fajr …
}

// بنعمل القنوات لكل المؤذّنين مرة واحدة عند أول تشغيل.
// إعادة الإنشاء بنفس المعرّف مابتعملش حاجة، فآمن نناديها كل مرة.
export async function ensureChannels(muezzins = []) {
  const a = await api();
  if (!a) return false;
  try {
    for (const m of muezzins) {
      for (const kind of ["normal", "fajr"]) {
        await a.LocalNotifications.createChannel({
          id: channelIdFor(m.id, kind),
          name: `الأذان — ${m.name}${kind === "fajr" ? " (الفجر)" : ""}`,
          description: "تنبيه الأذان في وقته",
          sound: soundNameFor(m.id, kind),
          importance: 5, // أعلى أهمية: بيظهر فوق الشاشة ويصوّت
          visibility: 1,
          vibration: true,
        });
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function requestPermission() {
  const a = await api();
  if (!a) return "unsupported";
  try {
    const r = await a.LocalNotifications.requestPermissions();
    return r?.display || "denied";
  } catch {
    return "denied";
  }
}

// بيلغي كل تنبيهات الأذان المجدولة. لازم قبل أي إعادة جدولة،
// وإلا بيتراكم عندنا تنبيهات قديمة بمواقيت اليوم اللي فات.
export async function clearScheduled() {
  const a = await api();
  if (!a) return false;
  try {
    const pending = await a.LocalNotifications.getPending();
    const mine = (pending?.notifications || []).filter(
      (n) => n.id >= BASE_ID && n.id < BASE_ID + 1000
    );
    if (mine.length) await a.LocalNotifications.cancel({ notifications: mine });
    return true;
  } catch {
    return false;
  }
}

// prayers: [{ id, label, at: Date }] — من محرّك المواقيت الموجود
// بيرجّع عدد التنبيهات اللي اتجدولت فعلًا
export async function scheduleAthan(prayers, { muezzinId, enabled = {} } = {}) {
  const a = await api();
  if (!a) return 0;

  await clearScheduled();

  const now = Date.now();
  const list = [];
  let i = 0;

  for (const p of prayers) {
    if (!p?.at) continue;
    // الأوقات اللي فاتت مابتتجدولش — أندرويد بيرميها فورًا
    if (new Date(p.at).getTime() <= now) continue;
    // الشروق مش صلاة، ومفيش أذان ليه
    if (p.notPrayer || p.id === "sunrise") continue;
    if (enabled[p.id] === false) continue;

    const kind = p.id === "fajr" ? "fajr" : "normal";
    list.push({
      id: BASE_ID + i++,
      title: `أذان ${p.label}`,
      body: "حان الآن موعد الصلاة",
      channelId: channelIdFor(muezzinId, kind),
      schedule: {
        at: new Date(p.at),
        // بيشتغل حتى والجهاز في وضع توفير الطاقة — من غيرها
        // أندرويد بيأجّل التنبيه لحد ما الجهاز يصحى
        allowWhileIdle: true,
      },
      extra: { kind: "athan", prayer: p.id },
    });
  }

  if (!list.length) return 0;
  try {
    await a.LocalNotifications.schedule({ notifications: list });
    return list.length;
  } catch {
    return 0;
  }
}

// للتجربة: تنبيه أذان بعد ثواني قليلة، عشان المستخدم يتأكد إن
// الصوت شغّال قبل ما يعتمد عليه في صلاة حقيقية
export async function testAthan(muezzinId, kind = "normal", afterSeconds = 5) {
  const a = await api();
  if (!a) return false;
  try {
    await a.LocalNotifications.schedule({
      notifications: [
        {
          id: BASE_ID + 999,
          title: "تجربة الأذان",
          body: "لو سمعت الأذان دلوقتي، يبقى كل حاجة تمام",
          channelId: channelIdFor(muezzinId, kind),
          schedule: { at: new Date(Date.now() + afterSeconds * 1000), allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}
