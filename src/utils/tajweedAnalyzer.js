// ============================================================
//  محلّل التلاوة — قياسات، مش أحكام
// ------------------------------------------------------------
//  الفلسفة هنا مهمة: التطبيق **مش بيحكم** على التلاوة صح ولا غلط.
//  بيقيس حاجات موضوعية من الصوت نفسه ويقارنها بتلاوة الشيخ:
//
//    • طول المدّ    → مدة أطول مقطع صوتي متصل
//    • الوقفات      → أماكن وأطوال السكوت
//    • السرعة       → مدة التلاوة مقابل مدة الشيخ
//    • ثبات الصوت   → تغيّر مستوى الصوت
//
//  دي أرقام مقيسة، مش رأي. «مدّك استمر ١.٢ ثانية والشيخ مدّه ٢.٠»
//  جملة صادقة. أما «تجويدك غلط» فدي حكم شرعي مش شغلنا.
//
//  ليه مش بنستخدم AI للحكم: الـ brief نفسه بيقتبس شكوى من منافس —
//  «AI's inaccurate detection… marking correct readings as wrong».
//  نموذج عام (Gemini/Whisper) مش متدرّب على أحكام التجويد، وهيدّي
//  أحكامًا واثقة وغلط. والضرر هنا مش باج — طفل بيتقاله إن تلاوته
//  الصحيحة غلط.
//
//  المرجع بيتحسب من **بيانات التوقيت** اللي عندنا أصلًا (حدود كل كلمة
//  بالمللي ثانية) — مش محتاجين نفكّ ترميز صوت الشيخ، فالمقارنة فورية
//  وبتشتغل أوفلاين.
// ============================================================

const FRAME_MS = 20;

// ---------- تحليل صوت المستخدم ----------
export async function analyzeRecording(blob) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const ctx = new AudioCtx();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    const sr = buf.sampleRate;
    const frameLen = Math.max(1, Math.round((FRAME_MS / 1000) * sr));

    // مغلّف الطاقة (RMS لكل إطار)
    const env = [];
    for (let i = 0; i + frameLen <= data.length; i += frameLen) {
      let sum = 0;
      for (let j = 0; j < frameLen; j++) sum += data[i + j] * data[i + j];
      env.push(Math.sqrt(sum / frameLen));
    }
    if (!env.length) return null;

    // عتبة تكيّفية: نسبة من أعلى طاقة، مع أرضية للضوضاء
    const peak = Math.max(...env);
    const sorted = [...env].sort((a, b) => a - b);
    const noise = sorted[Math.floor(sorted.length * 0.1)] || 0;
    const thr = Math.max(peak * 0.12, noise * 2.5, 0.008);

    // المقاطع الصوتية والسكوت
    const voiced = [];
    const silences = [];
    let run = null;
    let silRun = null;
    env.forEach((v, i) => {
      const t = (i * FRAME_MS) / 1000;
      if (v >= thr) {
        if (silRun) {
          silences.push({ start: silRun, end: t, dur: t - silRun });
          silRun = null;
        }
        if (!run) run = t;
      } else {
        if (run) {
          voiced.push({ start: run, end: t, dur: t - run });
          run = null;
        }
        if (!silRun) silRun = t;
      }
    });
    const endT = (env.length * FRAME_MS) / 1000;
    if (run) voiced.push({ start: run, end: endT, dur: endT - run });

    const speech = voiced.filter((s) => s.dur >= 0.08);
    const pauses = silences.filter((s) => s.dur >= 0.28); // وقفة معتبرة
    const speaking = speech.reduce((n, s) => n + s.dur, 0);

    // ثبات الصوت: معامل الاختلاف على الإطارات المسموعة
    const loud = env.filter((v) => v >= thr);
    const mean = loud.reduce((a, b) => a + b, 0) / (loud.length || 1);
    const varr = loud.reduce((a, b) => a + (b - mean) ** 2, 0) / (loud.length || 1);
    const steadiness = mean ? Math.max(0, 1 - Math.sqrt(varr) / mean) : 0;

    return {
      duration: buf.duration,
      speaking,
      segments: speech,
      pauses,
      longestVoiced: speech.reduce((m, s) => Math.max(m, s.dur), 0),
      steadiness,
      // نسبة الكلام للصمت — مؤشّر على التسرّع
      speechRatio: buf.duration ? speaking / buf.duration : 0,
    };
  } catch {
    return null;
  } finally {
    try {
      ctx.close();
    } catch {}
  }
}

// ---------- مرجع الشيخ من بيانات التوقيت ----------
// segments: [[موضع, بدايةms, نهايةms], ...] لآية واحدة
export function referenceFromSegments(segments) {
  if (!segments?.length) return null;
  const words = segments.map(([, s, e]) => ({ start: s / 1000, end: e / 1000, dur: (e - s) / 1000 }));
  const total = words[words.length - 1].end - words[0].start;

  const gaps = [];
  for (let i = 1; i < words.length; i++) {
    const g = words[i].start - words[i - 1].end;
    if (g >= 0.28) gaps.push(g);
  }

  return {
    duration: total,
    wordCount: words.length,
    longestWord: words.reduce((m, w) => Math.max(m, w.dur), 0),
    pauses: gaps.length,
    words,
  };
}

// ---------- المقارنة والإرشاد ----------
// بترجّع ملاحظات إرشادية — كل واحدة فيها الرقمين اللي اتقاسوا،
// عشان المستخدم يشوف الأساس بنفسه ويقدر يخالفه.
export function compare(user, ref) {
  if (!user || !ref) return { notes: [], pace: null };

  const notes = [];
  const pace = user.duration / ref.duration;

  // السرعة
  if (pace < 0.65) {
    notes.push({
      kind: "warn",
      icon: "⏩",
      title: "تلاوتك أسرع من الشيخ",
      detail: `قريتها في ${user.duration.toFixed(1)}ث والشيخ أخد ${ref.duration.toFixed(1)}ث. التأنّي بيدّي المدود حقها.`,
      metric: `${Math.round(pace * 100)}٪ من مدة الشيخ`,
    });
  } else if (pace > 1.6) {
    notes.push({
      kind: "info",
      icon: "⏸️",
      title: "تلاوتك أبطأ من الشيخ",
      detail: `قريتها في ${user.duration.toFixed(1)}ث والشيخ أخد ${ref.duration.toFixed(1)}ث. ده مش غلط — بس خلّي إيقاعك متّصل.`,
      metric: `${Math.round(pace * 100)}٪ من مدة الشيخ`,
    });
  } else {
    notes.push({
      kind: "good",
      icon: "✅",
      title: "إيقاعك قريب من الشيخ",
      detail: `${user.duration.toFixed(1)}ث مقابل ${ref.duration.toFixed(1)}ث — فرق بسيط.`,
      metric: `${Math.round(pace * 100)}٪`,
    });
  }

  // أطول مدّ
  const ratio = ref.longestWord ? user.longestVoiced / ref.longestWord : 1;
  if (ratio < 0.6) {
    notes.push({
      kind: "warn",
      icon: "〰️",
      title: "أطول مدّ عندك أقصر",
      detail: `أطول صوت متّصل عندك ${user.longestVoiced.toFixed(1)}ث، وعند الشيخ ${ref.longestWord.toFixed(1)}ث. جرّب تمدّ أكتر شوية.`,
      metric: `${user.longestVoiced.toFixed(1)}ث مقابل ${ref.longestWord.toFixed(1)}ث`,
    });
  } else {
    notes.push({
      kind: "good",
      icon: "✅",
      title: "المدود فيها نَفَس كويس",
      detail: `أطول صوت متّصل ${user.longestVoiced.toFixed(1)}ث — قريب من الشيخ (${ref.longestWord.toFixed(1)}ث).`,
      metric: `${user.longestVoiced.toFixed(1)}ث`,
    });
  }

  // الوقفات
  const up = user.pauses.length;
  if (up > ref.pauses + 2) {
    notes.push({
      kind: "info",
      icon: "✂️",
      title: "وقفات أكتر من اللازم",
      detail: `وقفت ${up} مرة والشيخ وقف ${ref.pauses}. حاول توصل الكلمات المترابطة.`,
      metric: `${up} مقابل ${ref.pauses}`,
    });
  }

  // ثبات الصوت
  if (user.steadiness < 0.35) {
    notes.push({
      kind: "info",
      icon: "📉",
      title: "صوتك بيعلا ويقل",
      detail: "حاول تثبّت مستوى صوتك — بيساعد على وضوح الحروف.",
      metric: `ثبات ${Math.round(user.steadiness * 100)}٪`,
    });
  }

  return { notes, pace };
}

// نتيجة تشجيعية عامة (مش درجة نجاح/رسوب)
export function encouragement(notes) {
  const warns = notes.filter((n) => n.kind === "warn").length;
  if (warns === 0) return { icon: "🌟", text: "ما شاء الله — تلاوة متزنة!" };
  if (warns === 1) return { icon: "👏", text: "كويسة جدًا — نقطة واحدة بس تتحسّن." };
  return { icon: "💪", text: "كمّل تمرين — كل مرة بتتحسّن." };
}
