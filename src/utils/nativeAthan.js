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

// ============================================================
//  مدى الجدولة — ليه مش "للأبد"
// ------------------------------------------------------------
//  أندرويد بيحدّد **٥٠٠ منبّه مضبوط (exact alarm) لكل تطبيق**. مفيش
//  طريقة تعدّي الحد ده، ومفيش طريقة تقول للنظام "أذّن كل يوم للأبد" —
//  التكرار المدعوم (repeats/every) بيكرّر على فاصل ثابت، ومواقيت
//  الصلاة بتتحرّك كل يوم فمابتنفعش معاه.
//
//  فالحل إننا نملا المدى المتاح: ٦٠ يوم × ٥ صلوات = ٣٠٠ منبّه،
//  وبنسيب ٢٠٠ للتذكيرات وهامش أمان. ٦٠ يوم عمليًا "على طول":
//  المستخدم هيفتح التطبيق مرة خلال شهرين، وأول ما يفتحه بتتجدّد
//  لـ٦٠ يوم تانيين من تاريخه.
//
//  واللي بيقفل الدايرة إن الجدولة بتتجدّد كمان:
//    • عند كل فتح للتطبيق
//    • عند كل رجوع من الخلفية (appStateChange)
//    • بعد إعادة تشغيل الموبايل — الإضافة نفسها بتسجّل
//      BOOT_COMPLETED وبترجّع المنبّهات لوحدها
//
//  الحاجة الوحيدة اللي بتلغي كل ده: إغلاق قسري (Force stop) أو
//  إن النظام يقتل التطبيق. وده مش قابل للحل من جوّه الكود —
//  بيتحل بإعفاء التطبيق من تقييد البطارية (شوف batteryHint).
// ⚠️ اتقلّل من ٦٠ يوم (٣٠٠ منبّه) لـ٧ أيام (٣٥ منبّه).
//
// السبب: ٣٠٠ منبّه مضبوط رقم كبير، وأجهزة شاومي وهونر وأوبو
// بيقصّوا عدد المنبّهات بسياسات خاصة بيهم فوق سياسة أندرويد.
// المنبّهات الأولى بتشتغل والباقي بيتقص بهدوء — فالأذان يشتغل
// مرة ويسكت مرات، وده بالظبط اللي كان بيحصل.
//
// ٧ أيام أكتر من كفاية: الجدولة بتتجدّد عند كل فتح للتطبيق،
// وعند كل رجوع من الخلفية، وبعد إعادة تشغيل الموبايل.
export const ATHAN_DAYS_AHEAD = 6; // اليوم + ٦ = ٧ أيام
export const ATHAN_MAX_NOTIFS = 40;

// معرّفات ثابتة عشان نقدر نلغي ونعيد الجدولة من غير تكرار
const BASE_ID = 7100;

// بنحمّل Capacitor ديناميكيًا. لو مش متثبّت (نسخة الويب) بنرجّع null
// من غير ما نكسّر أي حاجة.
//
// ⚠️ بنكاش الوعد مش النتيجة. الشكل القديم (علم `checked` بيتقلب قبل
// ما الاستيراد يخلّص) بيخلّي أي نداء تاني في نفس اللحظة يرجّع null —
// وده بيتحوّل عندنا لـ«مش تطبيق أصلي» وهو تطبيق أصلي فعلًا.
// StrictMode بينفّذ الـeffects مرتين فالسباق ده مش نظري.
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

// ⚠️ رقم النسخة ده مهم جدًا.
//
// صوت القناة وأهميتها بيتقفلوا وقت إنشائها ومابيتغيّروش أبدًا —
// ولا حتى لو التطبيق اتحدّث. الطريقة الوحيدة لتغيير إعدادات قناة
// هي **معرّف جديد**.
//
// النسخة ١ كانت بـ importance: 5، وده رقم مش مدعوم فعليًا في
// أندرويد (٠ لـ ٤ بس، و IMPORTANCE_MAX = 5 ملغي في التوثيق).
// فبننشئ قنوات جديدة بـ ٤.
//
// 👉 لو احتجنا نغيّر صوت أو أهمية أي قناة مستقبلًا: زوّد الرقم ده،
//    مايتعدّلش الإعداد في المكان القديم لأنه مش هيسري.
const CHANNEL_VERSION = 2;

// اسم القناة لكل مؤذّن ونوع. الصوت بيتحدّد هنا مرة واحدة للأبد.
export function channelIdFor(muezzinId, kind) {
  return `athan${CHANNEL_VERSION}_${muezzinId}_${kind}`; // kind: normal | fajr
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
          // ٤ = IMPORTANCE_HIGH، وده **أعلى قيمة مدعومة فعلًا**.
          // كانت ٥ (IMPORTANCE_MAX) وهي ملغية في توثيق أندرويد
          // وسلوكها غير مضمون — ممكن النظام يتعامل معاها كقيمة
          // غير صالحة ويرجّع للافتراضي الصامت.
          importance: 4,
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

// ------------------------------------------------------------
//  جدولة عدّة أيام
// ------------------------------------------------------------
//  computeForDate(date) لازم ترجّع { fajr, dhuhr, asr, maghrib, isha }
//  كـ Date لليوم ده. بنبني قائمة مسطّحة لكل الأيام وندّيها
//  لـ scheduleAthan مرة واحدة — هي اللي بتلغي القديم وتشيل الماضي.
//
//  بيرجّع { count, first, last } عشان الواجهة تقدر تطمّن المستخدم
//  بأرقام حقيقية بدل ما تقول "متجدول" وخلاص.
export async function scheduleAthanForDays(
  computeForDate,
  { muezzinId, enabled = {}, days = ATHAN_DAYS_AHEAD, now = new Date() } = {}
) {
  const flat = [];
  for (let d = 0; d <= days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    let t;
    try {
      t = computeForDate(date);
    } catch {
      continue;
    }
    if (!t) continue;
    for (const p of PRAYER_IDS) {
      const at = t[p.id];
      if (!at) continue;
      flat.push({ id: p.id, label: p.label, at });
    }
  }
  flat.sort((a, b) => new Date(a.at) - new Date(b.at));
  // سقف صارم: لو عدّينا حد أندرويد، schedule() بترمي والجدولة كلها
  // بتفشل — يعني المستخدم يخسر الأذان خالص بدل ما يخسر آخر يوم.
  const capped = flat
    .filter((p) => new Date(p.at).getTime() > now.getTime())
    .slice(0, ATHAN_MAX_NOTIFS);
  const count = await scheduleAthan(capped, { muezzinId, enabled });
  const future = capped;
  return {
    count,
    first: future[0]?.at || null,
    last: future[future.length - 1]?.at || null,
  };
}

// ------------------------------------------------------------
//  تقييد البطارية — السبب رقم ١ لضياع الأذان
// ------------------------------------------------------------
//  أجهزة شاومي وهواوي وأوبو وفيفو وسامسونج بتقتل التطبيقات في
//  الخلفية بسياسات خاصة بيها **فوق** سياسة أندرويد الأصلية. لما
//  النظام يقتل التطبيق بالطريقة دي، المنبّهات المجدولة بتتلغي —
//  ومفيش سطر كود يمنع ده.
//
//  الحل الوحيد إن المستخدم يعفي التطبيق بإيده. الدالة دي بتقول
//  إحنا على جهاز من دول ولا لأ، عشان الواجهة تعرض الإرشاد للي
//  محتاجه بس بدل ما تزنّ على الكل.
export function needsBatteryHint() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  return /xiaomi|redmi|poco|huawei|honor|oppo|realme|vivo|oneplus|samsung/i.test(ua);
}

export const BATTERY_HINT = {
  title: "عشان الأذان مايتقطعش",
  steps: [
    "إعدادات الهاتف ← التطبيقات ← اقرأ ← البطارية ← اختر «بدون قيود»",
    "في شاومي وريدمي: مدير التطبيقات ← اقرأ ← التشغيل التلقائي ← فعّله",
    "في شاومي كمان: اضغط مطوّلًا على التطبيق في قائمة المهام ← اقفل القفل 🔒",
  ],
};

// ------------------------------------------------------------
//  زرار الرجوع في أندرويد
// ------------------------------------------------------------
//  من غير التعامل ده، زرار الرجوع بيقفل التطبيق كله — حتى لو
//  المستخدم واقف في شاشة الدرس وكان قصده يرجع بس. handler بترجّع
//  true يعني "أنا اتصرّفت"، و false يعني سيب النظام يتصرّف.
//
//  (الملف ده بقى بيشيل مساعدات النظام الأصلي عمومًا مش الأذان بس —
//  @capacitor/app متستورد هنا أصلًا فمفيش داعي لملف تالت.)
export async function onHardwareBack(handler) {
  try {
    const [{ Capacitor }, { App }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/app"),
    ]);
    if (!Capacitor?.isNativePlatform?.()) return () => {};
    const sub = await App.addListener("backButton", ({ canGoBack }) => {
      const handled = handler();
      if (handled) return;
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
    return () => sub?.remove?.();
  } catch {
    return () => {};
  }
}

// ------------------------------------------------------------
//  الرجوع للواجهة
// ------------------------------------------------------------
//  الجدولة بتغطّي ٣ أيام، لكن المستخدم اللي سايب التطبيق مفتوح في
//  الخلفية أسبوع مش هيعدّي بـ"فتحة" جديدة. الحدث ده بيمسك الحالة
//  دي: كل ما التطبيق يرجع قدّام، نعيد الجدولة.
export async function onAppResume(handler) {
  try {
    const [{ Capacitor }, { App }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/app"),
    ]);
    if (!Capacitor?.isNativePlatform?.()) return () => {};
    const sub = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) handler();
    });
    return () => sub?.remove?.();
  } catch {
    return () => {};
  }
}

// الشروق مش هنا عن قصد — مفيش أذان للشروق
const PRAYER_IDS = [
  { id: "fajr", label: "الفجر" },
  { id: "dhuhr", label: "الظهر" },
  { id: "asr", label: "العصر" },
  { id: "maghrib", label: "المغرب" },
  { id: "isha", label: "العشاء" },
];

// ------------------------------------------------------------
//  فحص القنوات — الحقيقة من النظام نفسه
// ------------------------------------------------------------
//  ليه محتاجينه: صوت القناة في أندرويد ٨+ **بيتقفل وقت إنشائها
//  ومابيتغيّرش أبدًا** إلا بإلغاء تثبيت التطبيق. فلو القناة اتعملت
//  مرة من غير صوت (أو بصوت ملف مش موجود)، كل تحديث بعد كده
//  هيفضل صامت — والإشعار بيظهر عادي فتفتكر إن المشكلة في الجدولة.
//
//  ودي بالظبط الحالة اللي بتحصل لمّا نحدّث التطبيق فوق القديم
//  عشرات المرات وإحنا بنطوّر.
//
//  الدالة دي بتقرا القنوات الفعلية من أندرويد وترجّع حالتها،
//  فنعرف على طول: القناة صامتة ولا الجدولة غلط.
export async function inspectAthanChannels() {
  const a = await api();
  if (!a) return null;
  try {
    const res = await a.LocalNotifications.listChannels();
    const all = res?.channels || [];
    return all
      .filter((c) => String(c.id).startsWith("athan_"))
      .map((c) => ({
        id: c.id,
        sound: c.sound || null,
        importance: c.importance,
        // أهمية أقل من ٣ = مفيش صوت مهما كان الملف متظبّط
        silent: !c.sound || c.importance < 3,
      }));
  } catch {
    return null;
  }
}

// عدد تنبيهات الأذان المعلّقة فعلًا في النظام — مصدر الحقيقة الوحيد.
// الواجهة كانت بتعرض رقم من الـ state، وده بيفضل صح لحد ما أي حاجة
// تانية تلغي الجدولة من ورا ظهرها.
export async function pendingAthanCount() {
  const a = await api();
  if (!a) return 0;
  try {
    const pending = await a.LocalNotifications.getPending();
    return (pending?.notifications || []).filter(
      (n) => n.id >= BASE_ID && n.id < BASE_ID + 1000
    ).length;
  } catch {
    return 0;
  }
}

// ------------------------------------------------------------
//  تجربة بالمسار الحقيقي
// ------------------------------------------------------------
//  ليه الدالة دي موجودة: testAthan بتبعت تنبيه **واحد** مباشرة،
//  والأذان الحقيقي بيتبعت جوّه دفعة من ٣٥ تنبيه ومعاه حقل extra
//  ومعرّف مختلف. الاتنين بيستعملوا نفس القناة ونفس الصوت — ومع
//  ذلك التجربة بتصوّت والحقيقي لأ.
//
//  فالفرق إما في **الوقت** (التطبيق اتجمّد بعد ساعات) أو في
//  **شكل الاستدعاء** (دفعة كبيرة بدل تنبيه واحد).
//
//  الدالة دي بتجرّب الأذان من خلال scheduleAthan نفسها — نفس
//  المسار بالحرف — بس بموعد بعد دقايق. فلو صوّتت، يبقى المسار
//  سليم والمشكلة في الوقت. ولو سكتت، يبقى المشكلة في الدفعة.
//
//  ⚠️ بتمسح الجدولة الحالية (scheduleAthan بتنضّف قبل ما تجدول).
//  التطبيق بيعيد الجدولة لوحده عند أول فتح أو رجوع من الخلفية.
export async function testViaRealPath(muezzinId, afterMinutes = 5) {
  const a = await api();
  if (!a) return 0;
  const at = new Date(Date.now() + afterMinutes * 60000);
  return scheduleAthan([{ id: "dhuhr", label: "تجربة المسار", at }], {
    muezzinId,
    enabled: {},
  });
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
