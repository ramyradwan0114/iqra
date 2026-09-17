// ============================================================
//  النطق العربي على التطبيق الأصلي
// ------------------------------------------------------------
//  المشكلة اللي الملف ده بيحلّها: WebView بتاع أندرويد **مابيوصّلش**
//  محرّك النطق بتاع النظام لصفحة الويب في أغلب الأجهزة —
//  speechSynthesis.getVoices() بترجّع قايمة فاضية حتى والجهاز فيه
//  حزمة عربية متثبّتة وشغّالة تمامًا في تطبيقات تانية.
//
//  يعني الرسالة اللي كانت بتظهر ("ثبّت حزمة اللغة العربية") كانت
//  بتلوم المستخدم على حاجة مش ذنبه — هو ممكن يكون مثبّتها فعلًا.
//
//  الإضافة بتكلّم android.speech.tts.TextToSpeech مباشرة، فبتشوف
//  الأصوات اللي المتصفّح مابيشوفهاش.
//
//  ⚠️ لسه محتاج صوت عربي متثبّت على الجهاز. الفرق إن دلوقتي بنقدر
//  نفرّق بين "مفيش صوت عربي" و"المتصفّح مش شايف الأصوات" — والرسالة
//  بتتغيّر حسب الحالة الحقيقية.
//
//  في المتصفّح كل الدوال بترجّع null/false بهدوء، والتطبيق بيرجع
//  للمسار القديم (speechSynthesis) من غير ما يتكسّر.
// ============================================================

// ⚠️ بنكاش **الوعد** مش النتيجة.
//
// الشكل القديم كان: `if (checked) return cachedApi;` مع `checked = true`
// في أول السطر. ده فيه سباق قاتل: React StrictMode بينفّذ الـeffects
// مرتين. النداء الأول بيقلب checked لـ true ويفضل مستني الاستيراد،
// والنداء التاني بيلاقي checked = true فيرجّع cachedApi — وهي **لسه
// null** لأن الأول ماخلصش. فالتطبيق بيستنتج «مفيش نطق أصلي» ويرجع
// لمسار المتصفّح، والمتصفّح مافيهوش أصوات، فتظهر رسالة «المتصفح لا
// يدعم النطق» حتى على تطبيق أصلي فيه الإضافة شغّالة.
//
// كاش الوعد بيخلّي أي نداء تاني يستنى نفس النتيجة بدل ما يسبقها.
let apiPromise = null;

// ليه بنسجّل السبب: اتغلطت مرتين وأنا بخمّن ليه النطق مش شغّال.
// السبب بيتعرض في الواجهة، فبدل ما نخمّن، الجهاز نفسه بيقول.
export let lastReason = "لسه ما اتفحصش";

function api() {
  if (apiPromise) return apiPromise;
  apiPromise = (async () => {
    let Capacitor, mod;
    try {
      ({ Capacitor } = await import("@capacitor/core"));
    } catch (e) {
      lastReason = "فشل تحميل Capacitor: " + (e?.message || e);
      return null;
    }
    if (!Capacitor?.isNativePlatform?.()) {
      lastReason = "مش تطبيق أصلي (نسخة متصفّح)";
      return null;
    }
    try {
      mod = await import("@capacitor-community/text-to-speech");
    } catch (e) {
      lastReason = "فشل تحميل إضافة النطق: " + (e?.message || e);
      return null;
    }
    if (!mod?.TextToSpeech) {
      lastReason = "الإضافة اتحمّلت من غير TextToSpeech";
      return null;
    }
    lastReason = "الإضافة جاهزة";
    return mod.TextToSpeech;
  })();
  return apiPromise;
}

export async function isNativeTTS() {
  return !!(await api());
}

// بيرجّع { available, arabic, lang, reason }
export async function probeArabicVoice() {
  const tts = await api();
  if (!tts) return { available: false, arabic: false, lang: null, reason: lastReason };
  try {
    const res = await tts.getSupportedLanguages();
    const langs = res?.languages || [];
    // أندرويد بيرجّع أكواد زي ar-EG و ar-SA و ar
    const ar = langs.find((l) => String(l).toLowerCase().startsWith("ar"));
    const reason = ar
      ? `صوت عربي متاح (${ar})`
      : `الإضافة شغّالة بس مفيش لغة عربية بين ${langs.length} لغة`;
    lastReason = reason;
    return { available: true, arabic: !!ar, lang: ar || null, reason };
  } catch (e) {
    // الإضافة موجودة بس الاستعلام وقع — نعتبرها متاحة عشان زر
    // التثبيت يظهر، وده على الأقل بيدّي المستخدم طريق.
    lastReason = "الإضافة موجودة، والاستعلام عن اللغات فشل: " + (e?.message || e);
    return { available: true, arabic: false, lang: null, reason: lastReason };
  }
}

// السرعة ٠٫٧ زي المسار القديم بالظبط — ده تطبيق تعليمي والحرف لازم
// يتنطق بمهل عشان الطفل يلحق يسمعه.
export async function speakNative(text, { lang = "ar-EG", rate = 0.7 } = {}) {
  const tts = await api();
  if (!tts) return false;
  try {
    // مهم: بنوقف اللي قبله. من غير ده، الدوس السريع على الحروف
    // بيعمل طابور والحروف بتتنطق ورا بعض بعد ما المستخدم مشي.
    await tts.stop().catch(() => {});
    await tts.speak({
      text: String(text || ""),
      lang,
      rate,
      pitch: 1.0,
      volume: 1.0,
      category: "playback",
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopNative() {
  const tts = await api();
  if (!tts) return false;
  try {
    await tts.stop();
    return true;
  } catch {
    return false;
  }
}

// بيفتح شاشة تثبيت أصوات النطق في إعدادات أندرويد — بدل ما نقول
// للمستخدم "روح الإعدادات" ونسيبه يدوّر.
export async function openInstallVoices() {
  const tts = await api();
  if (!tts) return false;
  try {
    await tts.openInstall();
    return true;
  } catch {
    return false;
  }
}
