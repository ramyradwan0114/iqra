// ============================================================
//  العلامات المرجعية الملوّنة
// ------------------------------------------------------------
//  كل علامة ليها فئة ولون. الفئات مقصودة إنها تطابق طريقة الاستخدام
//  الحقيقية: مكان وقفت فيه في الختمة، آية محتاجة مراجعة، آية بتعلّمها
//  لحد، أو آية عايز ترجعلها.
// ============================================================
import { idbGet, idbSet, idbAll, idbDelete, STORES } from "./db.js";

export const CATEGORIES = [
  { id: "khatma", label: "ختمة", icon: "📗", color: "#1B4D3E", bg: "bg-[#1B4D3E]", hint: "وقفت هنا" },
  { id: "review", label: "مراجعة", icon: "📙", color: "#D4A853", bg: "bg-[#D4A853]", hint: "محتاجة مراجعة" },
  { id: "teach", label: "تعليم", icon: "📘", color: "#3E6D9E", bg: "bg-[#3E6D9E]", hint: "بعلّمها لحد" },
  { id: "favorite", label: "محفوظة", icon: "📕", color: "#8A4E4E", bg: "bg-[#8A4E4E]", hint: "أرجعلها" },
];

export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

const key = (surah, ayah) => `${surah}:${ayah}`;

export async function listBookmarks() {
  const rows = await idbAll(STORES.bookmarks);
  return rows.sort((a, b) => (b.at || 0) - (a.at || 0));
}

export async function getBookmark(surah, ayah) {
  return idbGet(STORES.bookmarks, key(surah, ayah));
}

export async function addBookmark(surah, ayah, category = "khatma", note = "") {
  const row = {
    id: key(surah, ayah),
    surah: Number(surah),
    ayah: Number(ayah),
    category,
    note: (note || "").slice(0, 140),
    at: Date.now(),
  };
  await idbSet(STORES.bookmarks, row);
  return row;
}

export async function removeBookmark(surah, ayah) {
  return idbDelete(STORES.bookmarks, key(surah, ayah));
}

// دورة الفئات: بدون → ختمة → مراجعة → تعليم → محفوظة → بدون
// forced: لو المستخدم اختار فئة بعينها من شريط الأدوات، بندّيهاله على
// طول بدل ما يفضل يدوس لحد ما يوصلها. ولو دوس على نفس الفئة تاني
// بنشيل العلامة — فالزر بيشتغل تبديل.
export async function cycleBookmark(surah, ayah, forced = null) {
  if (forced) {
    const cur = await getBookmark(surah, ayah);
    if (cur?.category === forced) {
      await removeBookmark(surah, ayah);
      return null;
    }
    return addBookmark(surah, ayah, forced, cur?.note);
  }
  const cur = await getBookmark(surah, ayah);
  if (!cur) return addBookmark(surah, ayah, CATEGORIES[0].id);
  const i = CATEGORIES.findIndex((c) => c.id === cur.category);
  if (i === CATEGORIES.length - 1) {
    await removeBookmark(surah, ayah);
    return null;
  }
  return addBookmark(surah, ayah, CATEGORIES[i + 1].id, cur.note);
}

// خريطة سريعة لسورة واحدة: { [رقم الآية]: category }
export async function bookmarksForSurah(surah) {
  const all = await listBookmarks();
  const map = {};
  for (const b of all) if (b.surah === Number(surah)) map[b.ayah] = b.category;
  return map;
}

// ------------------------------------------------------------
//  علامة واحدة بسيطة (النموذج الحالي)
// ------------------------------------------------------------
//  الفئات الأربعة (ختمة/مراجعة/تعليم/محفوظة) اتشالت من الواجهة:
//  المستخدمين — وفيهم شيخ متمرّس — ماكانوش بيلاقوا الزر أصلًا، ولما
//  لقوه كانت ٤ فئات قرار زيادة على حاجة المفروض تكون ضغطة واحدة.
//  الحقول القديمة سايبينها في قاعدة البيانات فالعلامات المحفوظة
//  قبل كده مابتضيعش.

// بيحطّ العلامة أو يشيلها. بيرجّع الصف الجديد أو null لو اتشالت.
export async function toggleBookmark(surah, ayah, extra = {}) {
  const cur = await getBookmark(surah, ayah);
  if (cur) {
    await removeBookmark(surah, ayah);
    return null;
  }
  const row = {
    id: key(surah, ayah),
    surah: Number(surah),
    ayah: Number(ayah),
    category: "khatma", // للتوافق مع الصفوف القديمة
    note: "",
    at: Date.now(),
    ...extra, // page مثلًا — عشان نقدر نفتحها في المصحف على طول
  };
  await idbSet(STORES.bookmarks, row);
  return row;
}

export async function isBookmarked(surah, ayah) {
  return !!(await getBookmark(surah, ayah));
}
