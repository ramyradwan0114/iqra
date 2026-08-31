// ============================================================
//  أذكار الصباح والمساء
// ------------------------------------------------------------
//  المصدر: حصن المسلم — سعيد بن علي بن وهف القحطاني، عبر الـ API
//  الرسمي للموقع (hisnmuslim.com). الباب رقم ٢٧.
//
//  قرار مقصود: **مانكتبش النص الديني من الذاكرة**، ولا نضمّنه في
//  الكود منقولًا بالإيد. أي حرف غلط في ذِكر أو آية مسؤولية مش بسيطة.
//  فالنص بيتجاب من المصدر ويتخزّن في IndexedDB — محتاج إنترنت أول
//  مرة بس، وبعد كده بيشتغل أوفلاين للأبد.
//
//  الصوت: الموقع بيوفّر تسجيلًا لكل ذِكر — ده بيخلّي الأذكار متاحة
//  لحد مش بيقرأ، بصوت **إنسان حقيقي** مش قراءة آلية. روابط الصوت
//  في الـ API مكتوبة http، وموقعنا https، فالمتصفّح بيرفضها
//  (mixed content) — عشان كده بنحوّلها لـ https قبل الاستخدام.
// ============================================================
import { getCachedTranslations, cacheTranslations } from "./db.js";

export const SOURCE_NAME = "حصن المسلم";
export const SOURCE_URL = "https://www.hisnmuslim.com";

const API = "https://www.hisnmuslim.com/api/ar/27.json";
const CACHE_KEY = "adhkar:27";

// http → https، وإلا المتصفّح هيرفض الملف على صفحة آمنة
export function secureUrl(u) {
  return String(u || "").replace(/^http:\/\//i, "https://");
}

// تنضيف بسيط: مسافات زيادة بس — من غير أي تعديل على النص نفسه
function tidy(t) {
  return String(t || "").replace(/\s+/g, " ").trim();
}

// الأذكار اللي مخصوصة بالصباح أو المساء متعلَّمة في نصّها نفسه
// («إذا أصبحَ» / «إذا أمسى»). بنستخدم ده للفلترة بدل ما نخمّن.
export function timeOf(text) {
  const t = String(text || "");
  const morning = /إذا\s*أصبحَ?/.test(t);
  const evening = /إذا\s*أمسى/.test(t);
  if (morning && !evening) return "morning";
  if (evening && !morning) return "evening";
  return "both";
}

let inflight = null;

// بيرجّع [{ id, text, repeat, audio, time }] أو null
export async function loadAdhkar() {
  const cached = await getCachedTranslations(CACHE_KEY);
  if (cached?.items?.length) return cached.items;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("http " + res.status);
      // الملف بيبدأ بـ BOM، وJSON.parse بيقع عليه
      const raw = (await res.text()).replace(/^﻿/, "");
      const json = JSON.parse(raw);
      const list = json["أذكار الصباح والمساء"] || Object.values(json)[0] || [];

      const items = list
        .map((d) => ({
          id: d.ID,
          text: tidy(d.ARABIC_TEXT),
          repeat: Number(d.REPEAT) || 1,
          audio: secureUrl(d.AUDIO),
          time: timeOf(d.ARABIC_TEXT),
        }))
        .filter((d) => d.text);

      if (!items.length) throw new Error("empty");
      await cacheTranslations(CACHE_KEY, { items, at: Date.now() });
      return items;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function filterByTime(items, mode) {
  if (!items) return [];
  if (mode === "all") return items;
  return items.filter((d) => d.time === "both" || d.time === mode);
}
