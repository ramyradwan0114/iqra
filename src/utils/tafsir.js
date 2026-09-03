// ============================================================
//  التفسير — آية × آية
// ------------------------------------------------------------
//  ملاحظة على الـ endpoint: الرابط
//  /v4/quran/verses/uthmani_tafsir?chapter=&verse= **مش تفسير**.
//  جرّبته: بيرجّع نص المصحف العثماني لكل الآيات ويتجاهل chapter و verse
//  تمامًا ("uthmani_tafsir" هنا اسم نوع رسم النص، مش تفسير). استخدامه كان
//  هيدّينا بالظبط المشكلة اللي بنحاول نحلّها: بلوك واحد كبير مش مربوط بآية.
//
//  الصح هو ده، وبيرجّع تفسير الآية الواحدة بس:
//    /api/qdc/tafsirs/16/by_ayah/{surah}:{ayah}
//
//  عن المستويات الثلاثة: الـ API بيرجّع **نصًّا واحدًا** للآية. مفيش نسخة
//  مختصرة ونسخة مفصّلة. فبنعمل كشفًا تدريجيًا لنفس النص مقسومًا عند حدود
//  الجُمل — من غير ما نلخّص أو نعيد صياغة. تلخيص تفسير آليًا معناه تعديل
//  كلام مفسّر، وده مالناش فيه. عشان كده الأزرار مكتوب عليها "أول سطور"
//  و"سطور أكتر" مش "اختصار" — عشان محدش يفتكر إن فيه تلخيصًا معتمدًا.
// ============================================================
import { getCachedTafsir, cacheTafsir } from "./db.js";

// ------------------------------------------------------------
//  التفاسير المتاحة
// ------------------------------------------------------------
//  الأرقام دي من /resources/tafsirs في الـ API، واتأكدت إن الميسر
//  والسعدي بيرجّعوا نفس شكل الرد بالظبط قبل ما أضيفهم — نفس المسار
//  ونفس الحقل tafsir.text.
//
//  الترتيب مقصود: من الأقصر والأبسط للأطول. ده تطبيق تعليمي،
//  والافتراضي لازم يكون اللي طفل أو مبتدئ يقدر يقراه.
//
//  ⚠️ الطبري والقرطبي طويلين جدًا — الآية الواحدة ممكن تطلع صفحات
//  على الموبايل. سايبينهم كخيار لمن يريد، مع تنبيه في الواجهة،
//  والكشف التدريجي (atLevel) بيتكفّل بالباقي.
export const TAFSIRS = [
  { id: 16, name: "التفسير الميسر", hint: "مبسّط — للمبتدئ والطفل", source: "مجمع الملك فهد" },
  { id: 91, name: "تفسير السعدي", hint: "واضح ومختصر", source: "عبد الرحمن السعدي" },
  { id: 14, name: "تفسير ابن كثير", hint: "بالأثر والروايات", source: "ابن كثير" },
  { id: 94, name: "تفسير البغوي", hint: "متوسط الطول", source: "البغوي" },
  { id: 93, name: "التفسير الوسيط", hint: "متوسط، بلغة معاصرة", source: "محمد سيد طنطاوي" },
  { id: 15, name: "تفسير الطبري", hint: "مطوّل — بالمأثور", source: "ابن جرير الطبري", long: true },
  { id: 90, name: "تفسير القرطبي", hint: "مطوّل — أحكام فقهية", source: "القرطبي", long: true },
];

export const DEFAULT_TAFSIR_ID = 16;

export const tafsirById = (id) =>
  TAFSIRS.find((t) => t.id === Number(id)) || TAFSIRS[0];

// للتوافق مع الكود القديم اللي بيستورد الاسم مباشرة
export const TAFSIR_ID = DEFAULT_TAFSIR_ID;
export const TAFSIR_NAME = TAFSIRS[0].name;
export const TAFSIR_SOURCE = "عبر Quran.com";

const endpoint = (id, surah, ayah) =>
  `https://api.qurancdn.com/api/qdc/tafsirs/${id}/by_ayah/${surah}:${ayah}`;

const inflight = new Map();

export async function loadAyahTafsir(surah, ayah, tafsirId = DEFAULT_TAFSIR_ID) {
  const id = tafsirById(tafsirId).id;
  // المفتاح فيه رقم التفسير، فكل تفسير له كاش مستقل ومابيدوسش
  // على التاني — ده كان شغّال صح من الأول بالصدفة لأن الرقم ثابت.
  const key = `${id}:${surah}:${ayah}`;
  const cached = await getCachedTafsir(key);
  if (cached) return { text: cached, fromCache: true };
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const res = await fetch(endpoint(id, surah, ayah));
      if (!res.ok) throw new Error("http " + res.status);
      const json = await res.json();
      const text = (json?.tafsir?.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!text) throw new Error("empty");
      await cacheTafsir(key, text);
      return { text, fromCache: false };
    } catch (e) {
      return { text: null, error: e.message };
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

// تقسيم عند حدود الجمل العربية مع الحفاظ على علامة الترقيم
export function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.؟!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const LEVELS = {
  short: { id: "short", sentences: 2, label: "أول سطور" },
  medium: { id: "medium", sentences: 5, label: "سطور أكتر" },
  full: { id: "full", sentences: Infinity, label: "النص كامل" },
};

// بيرجّع { text, truncated, totalSentences }
export function atLevel(fullText, level = "short") {
  const parts = splitSentences(fullText);
  const want = LEVELS[level]?.sentences ?? 2;
  if (parts.length <= want) {
    return { text: fullText, truncated: false, totalSentences: parts.length };
  }
  return {
    text: parts.slice(0, want).join(" "),
    truncated: true,
    totalSentences: parts.length,
  };
}

// المستوى اللي بعده، أو null لو إحنا في الآخر
export function nextLevel(level, fullText) {
  const total = splitSentences(fullText).length;
  if (level === "short" && total > LEVELS.short.sentences)
    return total > LEVELS.medium.sentences ? "medium" : "full";
  if (level === "medium" && total > LEVELS.medium.sentences) return "full";
  return null;
}
