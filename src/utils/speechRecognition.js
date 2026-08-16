// ============================================================
//  التعرّف على الكلام + طبقة الـ AI الاختيارية
// ------------------------------------------------------------
//  الأساس موجود في utils/speech.js (تطبيع عربي + محاذاة كلمات).
//  الملف ده بيضيف:
//   • غلاف مبسّط للتلاوة
//   • محوّل (adapter) لـ Gemini — **معطّل افتراضيًا وبيتطلب وسيط**
//
//  ⚠️ ليه Gemini مش شغّال من المتصفح مباشرة:
//  أي مفتاح API بتحطه في كود العميل بيتشحن مع الباندل، وأي حد يفتح
//  أدوات المطوّر ياخده. حصة الـ 60 req/min هتتحرق في يوم، وممكن
//  تتحاسب على استهلاك مش بتاعك.
//
//  الحل الصح (ومجاني على Vercel):
//    api/tajweed.js  ← دالة serverless
//    process.env.GEMINI_API_KEY  ← المفتاح على السيرفر
//    التطبيق بينادي /api/tajweed مش googleapis مباشرة
//
//  لحد ما توصلها، التحليل بيشتغل بالكامل من القياسات المحلية
//  (utils/tajweedAnalyzer.js) — مجانية، فورية، وشغّالة أوفلاين.
// ============================================================
import { compareRecitation, speechSupported, createRecognizer } from "./speech.js";

export { speechSupported, createRecognizer, compareRecitation };

// نقطة النهاية للوسيط — لو مش موجودة، بنتخطّى الـ AI بهدوء
export const AI_ENDPOINT = "/api/tajweed";

let aiAvailable = null;
export async function isAiAvailable() {
  if (aiAvailable !== null) return aiAvailable;
  try {
    const r = await fetch(AI_ENDPOINT, { method: "HEAD" });
    aiAvailable = r.ok;
  } catch {
    aiAvailable = false;
  }
  return aiAvailable;
}

// بيبعت **القياسات** للوسيط — مش الصوت.
// السبب: أخفّ بكتير، وأحفظ لخصوصية الطفل (مفيش تسجيل بيسيب الجهاز)،
// والنموذج شغلته يصيغ نصيحة من أرقام مقيسة، مش يحكم على تلاوة.
export async function aiCoach({ ayahText, metrics, transcript }) {
  if (!(await isAiAvailable())) return null;
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ayahText, metrics, transcript }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const tip = (json?.tip || "").trim();
    return tip ? { tip, source: "ai" } : null;
  } catch {
    return null;
  }
}

// تسجيل ما قاله المستخدم أثناء التلاوة (اختياري — لو المتصفح داعم)
export function listenOnce({ lang = "ar-SA", onPartial } = {}) {
  return new Promise((resolve) => {
    const rec = createRecognizer({ lang, interim: true });
    if (!rec) return resolve(null);
    let text = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) text += t + " ";
        else interim += t;
      }
      onPartial?.((text + interim).trim());
    };
    rec.onerror = () => resolve(text.trim() || null);
    rec.onend = () => resolve(text.trim() || null);
    try {
      rec.start();
    } catch {
      resolve(null);
    }
    // نرجّع دالة الإيقاف على الكائن نفسه
    resolve.stop = () => {
      try {
        rec.stop();
      } catch {}
    };
    listenOnce._active = rec;
  });
}

export function stopListening() {
  try {
    listenOnce._active?.stop();
  } catch {}
}
