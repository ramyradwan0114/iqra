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

export const TAFSIR_ID = 16;
export const TAFSIR_NAME = "التفسير الميسر";
export const TAFSIR_SOURCE = "مجمع الملك فهد — عبر Quran.com";

const endpoint = (surah, ayah) =>
  `https://api.qurancdn.com/api/qdc/tafsirs/${TAFSIR_ID}/by_ayah/${surah}:${ayah}`;

const inflight = new Map();

export async function loadAyahTafsir(surah, ayah) {
  const key = `${TAFSIR_ID}:${surah}:${ayah}`;
  const cached = await getCachedTafsir(key);
  if (cached) return { text: cached, fromCache: true };
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const res = await fetch(endpoint(surah, ayah));
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
