// ============================================================
//  نص أي سورة — كلمة كلمة
// ------------------------------------------------------------
//  المسمّع والحفظ كانوا محدودين بالسور المدمجة في التطبيق
//  (data/shortSurahs.js). الملف ده بيفتحهم على المصحف كله.
//
//  الأولوية: المدمج ← الكاش ← الشبكة. يعني السور القصيرة بتفضل
//  فورية وأوفلاين زي ما هي، وأي سورة تانية تفتحها مرة واحدة
//  بتتخزّن وتشتغل أوفلاين بعد كده.
// ============================================================
import { getCachedTranslations, cacheTranslations } from "./db.js";
import { SHORT_SURAHS } from "../data/shortSurahs.js";

const api = (surah) =>
  `https://api.qurancdn.com/api/qdc/verses/by_chapter/${surah}` +
  `?words=true&word_fields=text_uthmani&fields=text_uthmani&per_page=300`;

const inflight = new Map();

// بيرجّع { name, ayat: [ "نص الآية", ... ] } أو null
export async function loadSurahText(surah, fallbackName = "") {
  const id = Number(surah);
  if (!id) return null;

  // ١) مدمج جوّه التطبيق
  const embedded = SHORT_SURAHS[id];
  if (embedded?.ayat?.length) {
    return { name: embedded.name, ayat: embedded.ayat, source: "embedded" };
  }

  const key = `stext:${id}`;
  const cached = await getCachedTranslations(key);
  if (cached?.ayat?.length) return { ...cached, source: "cache" };
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const res = await fetch(api(id));
      if (!res.ok) throw new Error("http " + res.status);
      const json = await res.json();

      const ayat = (json.verses || []).map((v) =>
        (v.words || [])
          .filter((w) => w.char_type_name === "word")
          .map((w) => w.text_uthmani)
          .join(" ")
          .trim()
      );
      if (!ayat.length || ayat.every((a) => !a)) throw new Error("empty");

      const data = { name: fallbackName || `سورة ${id}`, ayat };
      await cacheTranslations(key, data);
      return { ...data, source: "network" };
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

// السور المتاحة أوفلاين على طول (من غير أي تحميل)
export function offlineSurahIds() {
  return Object.keys(SHORT_SURAHS).map(Number);
}
