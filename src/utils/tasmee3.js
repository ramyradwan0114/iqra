// ============================================================
//  المسمّع — مطابقة التسميع بالنص المتوقّع
// ------------------------------------------------------------
//  الفكرة اللي بتخلّي ده ممكن أصلًا: إحنا **مش** بنعمل تفريغ صوتي
//  مفتوح. إحنا عارفين الآية المتوقّعة كلمة كلمة، ومحتاجين بس نتأكد
//  إن اللي اتقال يطابقها. المسألة بقت "محاذاة نص معروف" مش "تعرّف
//  على كلام مجهول" — وده أسهل بكتير وأدق.
//
//  ومع ذلك، Web Speech مدرَّب على العربية المنطوقة مش التلاوة
//  المرتّلة. فهو **هيغلط**. عشان كده كل كلمة ليها ٣ حالات مش ٢:
//    match   اتطابقت
//    close   قريبة جدًا — غالبًا صح والتعرّف هو اللي حرّفها
//    miss    مااتقالتش
//  و"close" بيتعرض بلون تالت، والمستخدم يقدر يتجاوز أي حكم.
//
//  ⚠️ الملف ده مالوش أي علاقة بالتجويد. الأحكام (إخفاء، إدغام،
//  غنّة) مش ممكن تتقاس من نص مكتوب — لازم قياس صوتي، وده شغل
//  tajweedAnalyzer.js.
// ============================================================

// شيل التشكيل وعلامات الوقف ووحّد الحروف اللي التعرّف بيخلط بينها
export function normalize(word) {
  // أهم نقطتين هنا، والاتنين اتكشفوا بالاختبار مش بالتخمين:
  //
  // ١) الألف الخنجرية في الرسم العثماني **حرف بيتنطق**، مش تشكيل.
  //    كلمة العالمين مرسومة بيها، وبتتقال بألف. لو شلناها زي باقي
  //    التشكيل بتبقى «العلمين» ومابتطابقش اللي المستخدم قاله فعلًا.
  //
  // ٢) الألف أكتر حرف بيختلف بين الرسم العثماني والإملاء الحديث:
  //    «الرحمن» و«العالمين» فيهم نفس العلامة وسلوك مختلف. فبنشيل كل
  //    الألفات من الطرفين قبل المقارنة — ده بيلغي المشكلة من أصلها،
  //    وخسارته إن كلمتين مختلفتين في الألف بس بيبقوا متطابقين، وده
  //    نادر جدًا ومسافة التحرير بتمسك الباقي.
  const base = String(word || "")
    .replace(/\u0670/g, "\u0627")
    // نطاقات التشكيل فقط، مكتوبة بـ escapes عن قصد: النطاقات دي بتتقري
    // غلط جوّه محرر ثنائي الاتجاه، والغلطة الشائعة بتبلع كل الحروف
    // (0621-064A) وتسيب الكلمة فاضية — وده اللي حصل معايا فعلًا.
    //   0610-061A علامات شرفية · 064B-065F تشكيل · 06D6-06ED علامات المصحف
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .replace(/[\u0649\u064A]/g, "\u064A")
    .replace(/[\u0624\u0626]/g, "\u0621")
    .replace(/[^\u0621-\u064A]/g, "")
    .trim();

  const collapsed = base.replace(/\u0627/g, "");
  // كلمة زي «ما» بتبقى فاضية بعد الحذف — نرجّع الأصل ساعتها
  return collapsed || base;
}

// مسافة ليفنشتاين — عدد التعديلات للوصول من a لـ b
export function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

// نسبة التشابه ٠..١
export function similarity(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  const max = Math.max(x.length, y.length);
  if (!max) return 0;
  return 1 - editDistance(x, y) / max;
}

export const CLOSE_THRESHOLD = 0.72; // تحتها بنعتبرها مااتقالتش

// ------------------------------------------------------------
//  المحاذاة
// ------------------------------------------------------------
//  بنمشي على الكلمات المتوقّعة بالترتيب وندوّر على كل واحدة في
//  المسموع بدايةً من آخر موضع اتطابق. النافذة (٣ كلمات) بتسمح
//  إن التعرّف يزوّد أو ينقّص كلمة من غير ما كل اللي بعدها يبوظ.
//
//  بيرجّع: [{ word, index, status, heard, score }]
export function alignRecitation(expectedWords, heardText, { overrides = {} } = {}) {
  const expected = (expectedWords || []).filter(Boolean);
  const heard = String(heardText || "").split(/\s+/).map(normalize).filter(Boolean);

  const out = [];
  let cursor = 0;

  for (let i = 0; i < expected.length; i++) {
    if (overrides[i]) {
      out.push({ word: expected[i], index: i, status: "match", heard: null, score: 1, overridden: true });
      continue;
    }

    let best = { score: 0, at: -1 };
    for (let j = cursor; j < Math.min(heard.length, cursor + 3); j++) {
      const s = similarity(expected[i], heard[j]);
      if (s > best.score) best = { score: s, at: j };
    }

    let status;
    if (best.score >= 0.92) status = "match";
    else if (best.score >= CLOSE_THRESHOLD) status = "close";
    else status = "miss";

    if (status !== "miss" && best.at >= 0) cursor = best.at + 1;

    out.push({
      word: expected[i],
      index: i,
      status,
      heard: best.at >= 0 ? heard[best.at] : null,
      score: Number(best.score.toFixed(2)),
    });
  }

  return out;
}

// ملخّص بشري — من غير أحكام قاطعة
export function summarize(aligned) {
  const total = aligned.length || 1;
  const match = aligned.filter((w) => w.status === "match").length;
  const close = aligned.filter((w) => w.status === "close").length;
  const miss = aligned.filter((w) => w.status === "miss").length;
  const pct = Math.round(((match + close * 0.5) / total) * 100);

  let tone, title;
  if (pct >= 95) {
    tone = "great";
    title = "ما شاء الله — تسميع متقن";
  } else if (pct >= 80) {
    tone = "good";
    title = "تسميع كويس، فاضل كلمات بسيطة";
  } else if (pct >= 50) {
    tone = "ok";
    title = "نص الطريق — راجع اللي بالأحمر وجرّب تاني";
  } else {
    tone = "low";
    title = "محتاج مراجعة قبل التسميع";
  }

  return { total, match, close, miss, pct, tone, title };
}

// المستويات: ١ بيسيب أول كلمة من كل آية ظاهرة، ٢ بيخفي كل حاجة
export const LEVELS = [
  {
    id: 1,
    name: "مبتدئ",
    hint: "أول كلمة من كل آية ظاهرة تساعدك تبدأ",
    revealFirst: true,
  },
  {
    id: 2,
    name: "حافظ",
    hint: "النص كله مخفي — سمّع من حفظك",
    revealFirst: false,
  },
];
