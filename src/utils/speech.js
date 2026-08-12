// ============================================================
//  التعرّف على الكلام — مع تحفّظ مهم
// ------------------------------------------------------------
//  Web Speech API بيستخدم محرّك تعرّف مدرَّب على العربية *المعاصرة
//  المنطوقة*، مش على التلاوة القرآنية بأحكامها. يعني:
//
//   • بيرجّع نصًّا بدون تشكيل، فمقارنة الحركات مستحيلة أصلًا.
//   • بيغلط كتير مع المدّ والغنّة والتلاوة المرتّلة البطيئة.
//   • ممكن يقول "غلط" لطفل تلاوته سليمة تمامًا.
//
//  عشان كده النتيجة هنا معروضة كـ "مؤشّر تقريبي" مش تصحيح، والواجهة
//  بتقول ده صراحةً. تصحيح التلاوة الحقيقي محتاج نموذج مخصّص للقرآن
//  (زي اللي عند Tarteel) — مش الـ API المدمج في المتصفح.
// ============================================================

export function speechSupported() {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// تطبيع عربي: شيل التشكيل ووحّد أشكال الألف والياء والتاء المربوطة.
// من غير التطبيع ده أي مقارنة هتفشل، لأن المحرّك بيرجّع نصًّا بدون تشكيل
// والنص القرآني مشكول بالكامل.
export function normalizeArabic(s) {
  return (s || "")
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "") // تشكيل + خنجرية + علامات وقف + تطويل
    .replace(/[آأإاٱ]/g, "ا") // آ أ إ ا ٱ → ا
    .replace(/[ىي]/g, "ي") // ى ي → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^ء-ي\s]/g, " ") // أي حاجة مش عربية
    .replace(/\s+/g, " ")
    .trim();
}

export const toWords = (s) => normalizeArabic(s).split(" ").filter(Boolean);

// محاذاة كلمات بخوارزمية أقصر مسافة تحرير (Levenshtein على مستوى الكلمة).
// بترجّع عمليات: match / sub / del (ناقصة) / ins (زيادة)
export function alignWords(expected, actual) {
  const n = expected.length;
  const m = actual.length;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = expected[i - 1] === actual[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = expected[i - 1] === actual[j - 1] ? 0 : 1;
      if (d[i][j] === d[i - 1][j - 1] + cost) {
        ops.push({
          type: cost === 0 ? "match" : "sub",
          expected: expected[i - 1],
          actual: actual[j - 1],
          index: i - 1,
        });
        i--; j--;
        continue;
      }
    }
    if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ type: "del", expected: expected[i - 1], actual: null, index: i - 1 });
      i--;
      continue;
    }
    ops.push({ type: "ins", expected: null, actual: actual[j - 1], index: i });
    j--;
  }
  return ops.reverse();
}

export function compareRecitation(expectedText, actualText) {
  const expected = toWords(expectedText);
  const actual = toWords(actualText);
  if (!expected.length) return { score: 0, ops: [], expected, actual };
  const ops = alignWords(expected, actual);
  const matched = ops.filter((o) => o.type === "match").length;
  const score = Math.round((matched / expected.length) * 100);
  return { score, ops, expected, actual };
}

// غلاف حول SpeechRecognition برجوع نظيف
export function createRecognizer({ lang = "ar-SA", interim = true } = {}) {
  const Ctor =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = interim;
  rec.maxAlternatives = 1;
  return rec;
}
