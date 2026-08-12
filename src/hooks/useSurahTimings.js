// ============================================================
//  تحميل توقيت السورة — IndexedDB أولًا، ثم الشبكة
// ------------------------------------------------------------
//  الترتيب: مدمج (الفاتحة/الحصري) ← كاش IndexedDB ← الشبكة ← كاش
//  قديم لو الشبكة وقعت. يعني أي سورة فتحتها مرة تفضل شغّالة أوفلاين.
// ============================================================
import {
  getCachedTimings,
  cacheTimings,
  getCachedTranslations,
  cacheTranslations,
  getCachedTafsir,
  cacheTafsir,
} from "../utils/db.js";

// التفسير الميسر (King Fahd Complex) — id 16.
// ملاحظة: مفيش تفسير الجلالين في هذا الـ API، والميسر أنسب أصلًا لتطبيق
// تعليمي لأنه مكتوب بعربية مبسّطة عن قصد.
export const TAFSIR_ID = 16;
export const TAFSIR_NAME = "التفسير الميسر";

export async function loadTafsir(surah, ayah) {
  const key = `${TAFSIR_ID}:${surah}:${ayah}`;
  const cached = await getCachedTafsir(key);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://api.qurancdn.com/api/qdc/tafsirs/${TAFSIR_ID}/by_ayah/${surah}:${ayah}`
    );
    if (!res.ok) throw new Error("tafsir failed");
    const json = await res.json();
    const text = (json?.tafsir?.text || "").replace(/<[^>]+>/g, "").trim();
    if (!text) throw new Error("empty");
    await cacheTafsir(key, text);
    return text;
  } catch {
    return null;
  }
}

export const segmentsApi = (qdcId, surah) =>
  `https://api.qurancdn.com/api/qdc/audio/reciters/${qdcId}/audio_files?chapter=${surah}&segments=true`;

export const versesApi = (surah) =>
  `https://api.qurancdn.com/api/qdc/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&fields=text_uthmani&per_page=300`;

// الـ API بيطلع المقاطع إما [موضع، بداية، نهاية] أو بالشكل الأقدم
// [أول كلمة، آخر كلمة، بداية، نهاية]. بنوحّد الاتنين.
export function normaliseSegments(raw) {
  const out = [];
  for (const s of raw || []) {
    if (s.length >= 4) {
      const [wStart, wEnd, start, end] = s;
      for (let p = wStart; p < Math.max(wEnd, wStart + 1); p++) {
        out.push([p + 1, Math.round(start), Math.round(end)]);
      }
    } else if (s.length === 3) {
      out.push([s[0], Math.round(s[1]), Math.round(s[2])]);
    }
  }
  return out;
}

const inflight = new Map();

async function fetchFromNetwork(qdcId, surah) {
  const [audioRes, versesRes] = await Promise.all([
    fetch(segmentsApi(qdcId, surah)),
    fetch(versesApi(surah)),
  ]);
  if (!audioRes.ok || !versesRes.ok) throw new Error("timing fetch failed");

  const audioJson = await audioRes.json();
  const versesJson = await versesRes.json();
  const file = audioJson.audio_files?.[0];
  if (!file) throw new Error("no segmented audio");

  // نفس الطلب بيرجّع ترجمة كل كلمة — بنخزّنها هنا بدل طلب تاني
  const wordsByAyah = {};
  const trByAyah = {};
  for (const v of versesJson.verses || []) {
    const words = v.words.filter((w) => w.char_type_name === "word");
    wordsByAyah[v.verse_number] = words.map((w) => w.text_uthmani);
    trByAyah[v.verse_number] = words.map((w) => ({
      t: w.translation?.text || "",
      r: w.transliteration?.text || "",
    }));
  }

  const ayat = (file.verse_timings || []).map((vt) => {
    const ayah = Number(vt.verse_key.split(":")[1]);
    return {
      ayah,
      words: wordsByAyah[ayah] || [],
      segments: normaliseSegments(vt.segments),
    };
  });
  if (!ayat.some((a) => a.segments.length)) throw new Error("no segments");

  return {
    data: { audioUrl: file.audio_url, durationMs: file.duration || 0, ayat },
    translations: trByAyah,
  };
}

// embedded: خريطة { "6:1": {...} } للبيانات المدمجة في الكود
export function makeTimingLoader(embedded = {}) {
  return async function loadSurahTimings(qdcId, surah) {
    const key = `${qdcId}:${surah}`;
    if (embedded[key]) return embedded[key];
    if (inflight.has(key)) return inflight.get(key);

    const job = (async () => {
      const cached = await getCachedTimings(key);
      if (cached) {
        // تحديث في الخلفية من غير ما نأخّر العرض
        fetchFromNetwork(qdcId, surah)
          .then(({ data, translations }) => {
            cacheTimings(key, data);
            cacheTranslations(surah, translations);
          })
          .catch(() => {});
        return cached;
      }
      try {
        const { data, translations } = await fetchFromNetwork(qdcId, surah);
        await cacheTimings(key, data);
        await cacheTranslations(surah, translations);
        return data;
      } catch (err) {
        const stale = await getCachedTimings(key);
        if (stale) return stale;
        throw err;
      }
    })();

    inflight.set(key, job);
    job.catch(() => {}).then(() => inflight.delete(key));
    return job;
  };
}

// النص العثماني مُعلَّمًا بالتجويد — بيانات مُدقّقة من Quran.com، مش استنتاج
const tajweedApi = (surah) =>
  `https://api.qurancdn.com/api/qdc/verses/by_chapter/${surah}?fields=text_uthmani_tajweed&per_page=300`;

const tajweedMem = new Map();

export async function loadTajweed(surah) {
  const key = `tajweed:${surah}`;
  if (tajweedMem.has(key)) return tajweedMem.get(key);
  const cached = await getCachedTranslations(key);
  if (cached) {
    tajweedMem.set(key, cached);
    return cached;
  }
  try {
    const res = await fetch(tajweedApi(surah));
    if (!res.ok) throw new Error("tajweed failed");
    const json = await res.json();
    const byAyah = {};
    for (const v of json.verses || []) byAyah[v.verse_number] = v.text_uthmani_tajweed || "";
    await cacheTranslations(key, byAyah);
    tajweedMem.set(key, byAyah);
    return byAyah;
  } catch {
    return null;
  }
}

export async function loadTranslations(surah) {
  const cached = await getCachedTranslations(surah);
  if (cached) return cached;
  try {
    const res = await fetch(versesApi(surah));
    if (!res.ok) throw new Error("translations failed");
    const json = await res.json();
    const trByAyah = {};
    for (const v of json.verses || []) {
      trByAyah[v.verse_number] = v.words
        .filter((w) => w.char_type_name === "word")
        .map((w) => ({ t: w.translation?.text || "", r: w.transliteration?.text || "" }));
    }
    await cacheTranslations(surah, trByAyah);
    return trByAyah;
  } catch {
    return null;
  }
}
