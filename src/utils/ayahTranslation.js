// ============================================================
//  ترجمة الآيات — إنجليزي
// ------------------------------------------------------------
//  ملاحظة مهمة: في المشروع بالفعل loadTranslations() في
//  hooks/useSurahTimings.js — بس دي ترجمة **كلمة بكلمة** للـ popup
//  اللي بيظهر مع الضغطة الطويلة. الملف ده حاجة تانية خالص:
//  ترجمة **الآية كاملة** كجملة مفهومة.
//
//  الشكل اللي رجع فعليًا من الـ API (اتأكدت منه على 112 قبل ما أكتب
//  السطر ده، مش تخمين):
//    { verses: [ { verse_number, translations: [ { resource_id, text } ] } ],
//      pagination: { next_page, total_pages, ... } }
//
//  النص بيرجع فيه HTML للهوامش:
//    Say, "He is Allāh, [who is] One,<sup foot_note=197829>1</sup>
//  فبنشيل الـ <sup> بالكامل (الرقم اللي جوّاه معاه) — لأن الهامش نفسه
//  مش راجع في نفس الطلب، وسيبانه بيدّي "One,1" وده مربك للقارئ.
//
//  الكاش: بنستخدم نفس store الـ translations بس ببادئة "en:" عشان
//  مايتصادمش مع كاش ترجمة الكلمات (اللي مفتاحه رقم السورة لوحده).
// ============================================================
import { getCachedTranslations, cacheTranslations } from "./db.js";

// Saheeh International — الترجمة الإنجليزية الأشهر والأقرب للنص الحرفي
export const EN_ID = 20;
export const EN_NAME = "Saheeh International";
export const EN_SOURCE = "عبر Quran.com";

const api = (surah, page) =>
  `https://api.qurancdn.com/api/qdc/verses/by_chapter/${surah}` +
  `?translations=${EN_ID}&words=false&per_page=50&page=${page}`;

// شيل الهوامش والوسوم، ووحّد المسافات
export function cleanTranslation(html) {
  return String(html || "")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "") // الهوامش بأرقامها
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

const inflight = new Map();

// بيرجّع { 1: "Say, ...", 2: "...", ... } أو null لو مافيش شبكة ولا كاش
export async function loadAyahTranslations(surah) {
  const key = `en:${EN_ID}:${surah}`;
  const cached = await getCachedTranslations(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const byAyah = {};
      let page = 1;
      // بنمشي على الصفحات لحد ما next_page يبقى null — أضمن من إننا
      // نفترض إن per_page بيقبل ٢٨٦ آية في طلب واحد.
      for (let guard = 0; guard < 20; guard++) {
        const res = await fetch(api(surah, page));
        if (!res.ok) throw new Error("http " + res.status);
        const json = await res.json();
        for (const v of json.verses || []) {
          const t = (v.translations || []).find((x) => x.resource_id === EN_ID);
          if (t) byAyah[v.verse_number] = cleanTranslation(t.text);
        }
        const next = json?.pagination?.next_page;
        if (!next) break;
        page = next;
      }
      if (!Object.keys(byAyah).length) throw new Error("empty");
      await cacheTranslations(key, byAyah);
      return byAyah;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}
