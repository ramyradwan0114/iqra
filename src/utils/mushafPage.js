// ============================================================
//  مصحف المدينة — صفحة بصفحة
// ------------------------------------------------------------
//  الهدف: صفحة ١ في التطبيق = صفحة ١ في المصحف المطبوع بالظبط،
//  و١٥ سطر في كل صفحة كل واحد بنفس كلماته.
//
//  البيانات من نفس الـ API اللي التطبيق بيستخدمه أصلًا. اتأكدت من
//  شكل الرد على صفحة ١ قبل ما أكتب الملف ده — كل كلمة بترجع ومعاها:
//    page_number   رقم الصفحة (١–٦٠٤)
//    line_number   رقم السطر جوّه الصفحة (١–١٥)
//    text_uthmani  رسم الكلمة العثماني
//    char_type_name  "word" للكلمة، "end" لرقم الآية
//
//  ملاحظة على الرسم: إحنا بنستخدم text_uthmani بخط أميري قرآن.
//  ده بيدّي **نفس فواصل الصفحات والأسطر** بالظبط، لكن شكل الحروف
//  نفسه مش رسم مجمع الملك فهد (ده محتاج خط QCF منفصل لكل صفحة).
//  فالحافظ هيلاقي الآية في مكانها المعتاد، بس العين اللي متعوّدة
//  على رسم المجمع هتلاحظ فرق في شكل الحروف.
// ============================================================
import { getCachedTranslations, cacheTranslations } from "./db.js";

export const TOTAL_PAGES = 604;
export const LINES_PER_PAGE = 15;

const api = (page) =>
  `https://api.qurancdn.com/api/qdc/verses/by_page/${page}` +
  `?words=true&word_fields=text_uthmani,line_number,page_number&fields=text_uthmani&per_page=300`;

export function clampPage(n) {
  const p = Number(n);
  if (!Number.isFinite(p)) return 1;
  return Math.min(TOTAL_PAGES, Math.max(1, Math.round(p)));
}

// بيحوّل رد الـ API لأسطر جاهزة للعرض:
//   [{ line: 1, words: [{ text, ayah, pos, isEnd }] }, ...]
export function buildLines(verses) {
  const byLine = new Map();

  for (const v of verses || []) {
    const ayah = v.verse_number;
    let pos = 0;
    for (const w of v.words || []) {
      const isEnd = w.char_type_name === "end";
      if (!isEnd) pos += 1;
      const ln = w.line_number;
      if (!ln) continue;
      if (!byLine.has(ln)) byLine.set(ln, []);
      byLine.get(ln).push({
        text: w.text_uthmani || "",
        ayah,
        pos: isEnd ? null : pos,
        isEnd,
        // بداية سورة جديدة: أول كلمة في أول آية
        startsSurah: ayah === 1 && pos === 1 && !isEnd,
        surahId: Number(String(v.verse_key || "").split(":")[0]) || null,
      });
    }
  }

  return [...byLine.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([line, words]) => ({ line, words }));
}

const inflight = new Map();

// بيرجّع { lines, verses } أو null. بيتخزّن في IndexedDB فبيشتغل أوفلاين
// بعد أول فتح للصفحة.
export async function loadPage(page) {
  const p = clampPage(page);
  const key = `mpage:${p}`;

  const cached = await getCachedTranslations(key);
  if (cached) return cached;
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      const res = await fetch(api(p));
      if (!res.ok) throw new Error("http " + res.status);
      const json = await res.json();
      const verses = json.verses || [];
      if (!verses.length) throw new Error("empty");

      const data = {
        page: p,
        lines: buildLines(verses),
        // نحتفظ بأرقام الآيات عشان زر العلامة والتفسير
        ayat: verses.map((v) => ({
          ayah: v.verse_number,
          surah: Number(String(v.verse_key).split(":")[0]),
          key: v.verse_key,
        })),
        juz: verses[0]?.juz_number || null,
      };
      await cacheTranslations(key, data);
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

// السور اللي بتبدأ في الصفحة دي (عشان نرسم عنوان السورة والبسملة)
export function surahStartsIn(data) {
  if (!data?.ayat) return [];
  return data.ayat.filter((a) => a.ayah === 1).map((a) => a.surah);
}
