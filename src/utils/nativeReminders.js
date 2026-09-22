// ============================================================
//  تذكيرات الذِّكر — عبر نظام أندرويد
// ------------------------------------------------------------
//  الفكرة اللي الملف ده بيحقّقها: الإشعار **يحمل الذِّكر نفسه**.
//  المستخدم يقراه من شاشة القفل ويسبّح، من غير ما يفتح التطبيق
//  أصلًا. الإشعار اللي بيقول "افتح التطبيق عشان تذكر الله" بيضيف
//  خطوة بين الواحد وبين الذِّكر — والخطوة دي هي اللي بتخلّي
//  التذكير يتجاهل.
//
//  ليه ده مابقاش ممكن غير دلوقتي: نفس قيد الأذان. المتصفّح مابيقدرش
//  يجدول إشعار في وقت محدد وهو مقفول (Notification Triggers اتسحبت
//  من المعايير). Capacitor بيخلّي نظام أندرويد نفسه هو اللي يجدول.
//  في المتصفّح كل الدوال هنا بترجّع 0/false بهدوء، فنسخة الويب
//  مابتتأثرش وبتفضل شغّالة بالتنبيه الداخلي زي ما هي.
//
//  ⚠️ مدى الجدولة: يومين قدّام، وبتتجدّد كل ما التطبيق يتفتح —
//  نفس سياسة nativeAthan.js بالظبط وللسبب نفسه (أندرويد بيحدّد
//  عدد التنبيهات المعلّقة، وجدولة شهر مقدّمًا بتاكل الحد من غير داعي).
// ============================================================
import { SALAWAT_TEXT, ADHKAR } from "./reminders.js";
import { getCachedTranslations } from "./db.js";
import { testerSlots, inTesterWindow } from "./testerMode.js";

// نفس حسبة الأذان: حد أندرويد ٥٠٠ منبّه للتطبيق كله، والأذان واخد
// ٣٠٠ منها. فالتذكيرات ليها ميزانية ١٥٠ وهامش ٥٠.
//
// بنجدول ٣٠ يوم، **بس** بسقف لكل نوع. الفرق مهم: تذكير كل ساعة
// على ٣٠ يوم = ٤٢٠ منبّه — ده لوحده بياكل الحد ويخلّي جدولة الأذان
// كلها تفشل. السقف بيخلّي اللي بيختار "كل ساعة" ياخد تذكيرات
// لأيام أقل، بدل ما يكسر الأذان لنفسه ولغيره.
export const REMINDER_DAYS_AHEAD = 29; // اليوم + ٢٩ = ٣٠ يوم

export const CAPS = {
  salawat: 50,
  tasbih: 50,
  adhkar: 30, // ١٥ يوم × نوعين
  lesson: 15,
  kahf: 5, // ٥ جُمَع
  tester: 45, // ٣ × ١٥ يوم — مؤقّت لفترة الاختبار
};

// ⚠️ المدى ده **لازم** يفضل برّه مدى الأذان.
// nativeAthan.js بيلغي كل تنبيه في 7100..8099، فلو حطّينا تذكيرات
// الذِّكر جوّه المدى ده، أول إعادة جدولة للأذان هتمسحها كلها.
const BASE_ID = 9000;
const ID_SPAN = 500; // 9000..9499

// ------------------------------------------------------------
//  القنوات
// ------------------------------------------------------------
//  الأهمية مختلفة بين الاتنين عن قصد:
//
//  • الصلاة على النبي والتسبيح → أهمية ٢ (منخفضة): بيظهر في شريط
//    الإشعارات **من غير صوت**. ده تذكير لطيف مش إنذار. تذكير بصوت
//    كل ساعة هو أسرع طريقة تخلّي المستخدم يقفل إشعارات التطبيق
//    كلها — وساعتها يخسر الأذان نفسه.
//
//  • أذكار الصباح والمساء → أهمية ٤ (عالية): بصوت وبيطلع فوق
//    الشاشة. مرتين في اليوم بس، ومربوطين بوقت له معنى.
export const CHANNELS = {
  gentle: {
    id: "dhikr_gentle",
    name: "تذكير بالذِّكر",
    description: "الصلاة على النبي ﷺ والتسبيح — بدون صوت",
    importance: 2,
  },
  adhkar: {
    id: "dhikr_adhkar",
    name: "أذكار الصباح والمساء",
    description: "تذكير في وقته بصوت",
    importance: 4,
  },
};

// كاش الوعد مش النتيجة — نفس سبب nativeAthan.js بالظبط.
let apiPromise = null;

function api() {
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    try {
      const [{ Capacitor }, { LocalNotifications }] = await Promise.all([
        import("@capacitor/core"),
        import("@capacitor/local-notifications"),
      ]);
      if (!Capacitor?.isNativePlatform?.()) return null;
      return { Capacitor, LocalNotifications };
    } catch {
      return null;
    }
  })();
  return apiPromise;
}

export async function isNative() {
  return !!(await api());
}

export async function ensureChannels() {
  const a = await api();
  if (!a) return false;
  try {
    for (const c of Object.values(CHANNELS)) {
      await a.LocalNotifications.createChannel({
        id: c.id,
        name: c.name,
        description: c.description,
        importance: c.importance,
        visibility: 1,
        vibration: c.importance >= 4,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearScheduled() {
  const a = await api();
  if (!a) return false;
  try {
    const pending = await a.LocalNotifications.getPending();
    const mine = (pending?.notifications || []).filter(
      (n) => n.id >= BASE_ID && n.id < BASE_ID + ID_SPAN
    );
    if (mine.length) await a.LocalNotifications.cancel({ notifications: mine });
    return true;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------
//  حساب المواعيد
// ------------------------------------------------------------

// ساعات الهدوء: من quietFrom لحد quietTo. بتلفّ حوالين نص الليل
// (٢٢ → ٨ يعني الليل كله).
function isQuiet(h, from = 22, to = 8) {
  return from > to ? h >= from || h < to : h >= from && h < to;
}

// كل المواعيد في الأيام الجاية اللي بتوافق فاصل زمني معيّن وبرّه
// ساعات الهدوء. بيرجّع Date[] مرتّبة، والأوقات اللي فاتت متشالة.
export function slotsFor({
  intervalHours = 1,
  quietFrom = 22,
  quietTo = 8,
  days = REMINDER_DAYS_AHEAD,
  now = new Date(),
} = {}) {
  const out = [];
  const step = Math.max(1, Math.round(intervalHours));
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  for (let d = 0; d <= days; d++) {
    for (let h = 0; h < 24; h += step) {
      const t = new Date(start);
      t.setDate(t.getDate() + d);
      t.setHours(h, 0, 0, 0);
      if (t.getTime() <= now.getTime()) continue;
      if (isQuiet(h, quietFrom, quietTo)) continue;
      out.push(t);
    }
  }
  return out.sort((a, b) => a - b);
}

// موعد يومي ثابت (الساعة كذا) على مدى الأيام الجاية.
// weekday: لو متحدّد، بناخد اليوم ده بس من الأسبوع (٠ = الأحد).
export function dailySlots(
  hour,
  { minute = 0, weekday = null, days = REMINDER_DAYS_AHEAD, now = new Date() } = {}
) {
  const out = [];
  for (let d = 0; d <= days; d++) {
    const t = new Date(now);
    t.setDate(t.getDate() + d);
    t.setHours(hour, minute, 0, 0);
    if (t.getTime() <= now.getTime()) continue;
    if (weekday != null && t.getDay() !== weekday) continue;
    out.push(t);
  }
  return out;
}

// ------------------------------------------------------------
//  نصوص الأذكار
// ------------------------------------------------------------
//  النص الديني **مابيتكتبش من الذاكرة** هنا — نفس القاعدة اللي في
//  adhkar.js. أذكار الصباح والمساء بتتقرا من الكاش اللي اتجاب من
//  حصن المسلم. لو لسه ماتحمّلتش (أول تشغيل من غير إنترنت)، بنرجع
//  للأذكار القصيرة الموجودة في reminders.js — ودي كلمات معدودة
//  متعارَف عليها وموجودة في الكود أصلًا من زمان.

const CACHE_KEY = "adhkar:27";

// الإشعار بيتقصّ في سطر واحد لما يبقى مطبَّق. النص الطويل بيتعرض
// في largeBody لما المستخدم يوسّعه. فبناخد أول جملة للـ body
// والنص كامل للـ largeBody.
function firstLine(text, max = 90) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut) + "…";
}

// بيرجّع [{ text }] للوقت المطلوب، أو [] لو مفيش كاش
async function cachedAdhkar(mode) {
  try {
    const row = await getCachedTranslations(CACHE_KEY);
    const items = row?.items || [];
    if (!items.length) return [];
    return items.filter((d) => d.time === "both" || d.time === mode);
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
//  الجدولة
// ------------------------------------------------------------

/**
 * settings:
 *   salawat: { enabled, intervalHours, quietFrom, quietTo }
 *   tasbih:  { enabled, intervalHours, quietFrom, quietTo }
 *   morning: { enabled, hour }
 *   evening: { enabled, hour }
 *
 * بيرجّع { scheduled, byKind } — عدد التنبيهات اللي اتجدولت فعلًا.
 */
export async function scheduleDhikrReminders(settings = {}) {
  const a = await api();
  if (!a) return { scheduled: 0, byKind: {} };

  await ensureChannels();
  await clearScheduled();

  const list = [];
  const byKind = {};
  let i = 0;
  const nextId = () => BASE_ID + i++;

  // ---------- الصلاة على النبي ﷺ ----------
  const sal = settings.salawat || {};
  if (sal.enabled) {
    const slots = slotsFor(sal).slice(0, CAPS.salawat);
    for (const at of slots) {
      if (i >= ID_SPAN) break;
      list.push({
        id: nextId(),
        title: "صلِّ على النبي ﷺ",
        // الذِّكر نفسه في الـ body — ده بيت القصيد
        body: SALAWAT_TEXT,
        largeBody: SALAWAT_TEXT,
        summaryText: "قُلها ولو مرة",
        channelId: CHANNELS.gentle.id,
        autoCancel: true,
        schedule: { at, allowWhileIdle: false },
        extra: { url: "/?go=home&focus=iqra-tasbih", kind: "salawat" },
      });
    }
    byKind.salawat = slots.length;
  }

  // ---------- التسبيح ----------
  // كل إشعار بذِكر مختلف بالتناوب، عشان مايبقاش نفس الجملة كل مرة.
  const tas = settings.tasbih || {};
  if (tas.enabled) {
    const pool = ADHKAR.filter((d) => !d.salawat);
    const slots = slotsFor(tas).slice(0, CAPS.tasbih);
    let k = 0;
    for (const at of slots) {
      if (i >= ID_SPAN) break;
      const d = pool[k++ % pool.length];
      list.push({
        id: nextId(),
        title: "ذكر الله",
        body: d.text,
        largeBody: d.text,
        summaryText: `الهدف ${d.target} مرة`,
        channelId: CHANNELS.gentle.id,
        autoCancel: true,
        schedule: { at, allowWhileIdle: false },
        // الضغط بيفتح العدّاد على الذِّكر ده بالتحديد
        extra: { url: `/?go=home&focus=iqra-tasbih&dhikr=${d.id}`, kind: "tasbih", dhikr: d.id },
      });
    }
    byKind.tasbih = slots.length;
  }

  // ---------- تذكير الدرس ----------
  //  ⚠️ ده كان بيعدّي على showNotification() بتاعة الويب، ودي
  //  بتفحص Notification.permission — وWebView أندرويد مافيهاش
  //  window.Notification خالص. فالدالة كانت بترجّع false بهدوء
  //  والتذكير مابيتبعتش أبدًا في التطبيق الأصلي. المستخدم بيظبّط
  //  «ميعاد الدرس ٧:٠٠م» ومايجيلوش حاجة ولا رسالة خطأ.
  const les = settings.lesson || {};
  if (les.enabled) {
    const slots = dailySlots(les.hour ?? 19, { minute: les.minute ?? 0 }).slice(
      0,
      CAPS.lesson
    );
    for (const at of slots) {
      if (i >= ID_SPAN) break;
      list.push({
        id: nextId(),
        title: "وقت الدرس 📖",
        body: "خمس دقايق بس تفرق — تعالى نكمّل.",
        channelId: CHANNELS.adhkar.id,
        autoCancel: true,
        schedule: { at, allowWhileIdle: true },
        extra: { url: "/?go=lesson", kind: "lesson" },
      });
    }
    byKind.lesson = slots.length;
  }

  // ---------- سورة الكهف — الجمعة ----------
  const kahf = settings.kahf || {};
  if (kahf.enabled) {
    // ٥ = الجمعة (٠ = الأحد)
    const slots = dailySlots(kahf.hour ?? 6, { weekday: 5 }).slice(0, CAPS.kahf);
    for (const at of slots) {
      if (i >= ID_SPAN) break;
      list.push({
        id: nextId(),
        title: "🌅 اقرأ سورة الكهف",
        body: "الجمعة النهاردة — من قرأ سورة الكهف نُوِّر له ما بين الجمعتين.",
        channelId: CHANNELS.adhkar.id,
        autoCancel: true,
        schedule: { at, allowWhileIdle: true },
        extra: { url: "/?go=quran&surah=18", kind: "kahf" },
      });
    }
    byKind.kahf = slots.length;
  }

  // ---------- تذكير المختبِرين (مؤقّت) ----------
  //  بيتجدول من **بكرة** مش النهاردة — اللي بيجدول دلوقتي هو
  //  التطبيق وهو مفتوح، يعني المستخدم استعمله خلاص. وبما إن
  //  الجدولة بتتجدّد عند كل فتح، اللي بيفتحه يوميًا مابيشوفش ولا
  //  إشعار، واللي نسي هو اللي بيتنبّه.
  //
  //  🔴 مؤقّت: بيقف لوحده بعد TESTER_UNTIL في testerMode.js
  if (settings.tester?.enabled && inTesterWindow()) {
    const slots = testerSlots({ max: CAPS.tester });
    for (const s of slots) {
      if (i >= ID_SPAN) break;
      list.push({
        id: nextId(),
        title: s.title,
        body: s.body,
        largeBody: s.body,
        summaryText: "فترة الاختبار",
        channelId: CHANNELS.gentle.id,
        autoCancel: true,
        schedule: { at: s.at, allowWhileIdle: false },
        extra: { url: s.url, kind: "tester" },
      });
    }
    byKind.tester = slots.length;
  }

  // ---------- أذكار الصباح والمساء ----------
  for (const mode of ["morning", "evening"]) {
    const cfg = settings[mode] || {};
    if (!cfg.enabled) continue;

    const items = await cachedAdhkar(mode);
    const label = mode === "morning" ? "أذكار الصباح" : "أذكار المساء";
    const hour = cfg.hour ?? (mode === "morning" ? 6 : 18);
    const slots = dailySlots(hour).slice(0, Math.floor(CAPS.adhkar / 2));

    for (const at of slots) {
      if (i >= ID_SPAN) break;
      // الذِّكر بيتغيّر باليوم، عشان مايبقاش نفس الذِّكر كل صباح
      const pick = items.length ? items[at.getDate() % items.length] : null;
      const text = pick?.text || ADHKAR[0].text;

      list.push({
        id: nextId(),
        title: `📿 ${label}`,
        body: firstLine(text),
        largeBody: text,
        summaryText: items.length ? `${label} — وفيه غيره` : label,
        channelId: CHANNELS.adhkar.id,
        autoCancel: true,
        // دي مربوطة بوقت له معنى، فبتتبعت حتى والجهاز في وضع التوفير
        schedule: { at, allowWhileIdle: true },
        extra: { url: `/?go=more&sub=adhkar&time=${mode}`, kind: mode },
      });
    }
    byKind[mode] = slots.length;
  }

  if (!list.length) return { scheduled: 0, byKind };
  try {
    await a.LocalNotifications.schedule({ notifications: list });
    return { scheduled: list.length, byKind };
  } catch {
    return { scheduled: 0, byKind };
  }
}

// ------------------------------------------------------------
//  الضغط على الإشعار
// ------------------------------------------------------------
//  في نسخة المتصفّح، الـ Service Worker هو اللي بيفتح data.url.
//  في التطبيق الأصلي مفيش Service Worker في المعادلة — أندرويد
//  بيفتح التطبيق وخلاص، والتطبيق مش هيعرف إن المستخدم جاي من
//  إشعار معيّن إلا لو سمعنا الحدث ده بنفسنا.
//
//  من غير الدالة دي، الضغط على "صلِّ على النبي" بيفتح آخر شاشة
//  كان المستخدم فيها — وده بالظبط الشكوى اللي اتقالت قبل كده.
//
//  بيرجّع دالة إلغاء الاشتراك.
export async function onNativeNotificationTap(handler) {
  const a = await api();
  if (!a) return () => {};
  try {
    const sub = await a.LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (ev) => {
        const url = ev?.notification?.extra?.url;
        if (url) handler(url);
      }
    );
    return () => sub?.remove?.();
  } catch {
    return () => {};
  }
}

// للتجربة: تذكير بالذِّكر بعد ثواني قليلة
export async function testNotification({
  title = "تذكير تجريبي",
  body = "لو شفت ده، التذكيرات شغّالة ✅",
  url = "/?go=home",
  gentle = true,
  afterSeconds = 5,
} = {}) {
  const a = await api();
  if (!a) return false;
  await ensureChannels();
  try {
    // بنطلب الإذن هنا كمان: ممكن يكون المستخدم فعّل المفاتيح من غير
    // ما يوافق على الإشعارات، فالتجربة تفضل صامتة من غير ما يعرف ليه.
    const perm = await a.LocalNotifications.requestPermissions();
    if (perm?.display !== "granted") return false;
    await a.LocalNotifications.schedule({
      notifications: [
        {
          id: BASE_ID + ID_SPAN - 1,
          title,
          body,
          largeBody: body,
          summaryText: "تجربة",
          channelId: gentle ? CHANNELS.gentle.id : CHANNELS.adhkar.id,
          autoCancel: true,
          schedule: { at: new Date(Date.now() + afterSeconds * 1000), allowWhileIdle: true },
          extra: { url, kind: "test" },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

// تذكير بالذِّكر بالنص الحقيقي مش برسالة تجريبية، عشان المستخدم
// يشوف الشكل اللي هيوصله فعلًا
export async function testDhikr(afterSeconds = 5) {
  return testNotification({
    title: "صلِّ على النبي ﷺ",
    body: SALAWAT_TEXT,
    url: "/?go=home&focus=iqra-tasbih",
    gentle: true,
    afterSeconds,
  });
}
