import React, { useState, useRef, useCallback, useEffect } from "react";
import { listenOnce, stopListening } from "../utils/speechRecognition.js";
import { alignRecitation, summarize, LEVELS } from "../utils/tasmee3.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

// ============================================================
//  المسمّع
// ------------------------------------------------------------
//  تسمّع من حفظك، والتطبيق يكتب وراك ويعلّم الكلمات.
//
//  قرارات مقصودة:
//  • النص بيتخفي مش بيتمسح — الكلمة بتفضل مكانها كمستطيل، فالمستخدم
//    شايف عدد الكلمات وطولها. ده بيدّي إحساس "سمّع" مش "خمّن".
//  • كل كلمة ليها ٣ حالات، والأصفر معناه "التطبيق مش متأكد" مش "غلط".
//  • أي كلمة يقدر يتجاوزها بضغطة — وساعتها التطبيق بيعتمد كلام
//    المستخدم فورًا ويعيد حساب النتيجة. الطفل مايتحبطش من خطأ تقني.
//  • مفيش رسوب. أسوأ نتيجة اسمها "محتاج مراجعة".
// ============================================================

const STATUS = {
  match: { cls: "bg-[#2E9E6B]/20 text-[#1B4D3E] dark:text-[#8FD6C0] border-[#2E9E6B]/50", label: "مضبوطة" },
  close: { cls: "bg-[#D4A853]/25 text-[#6B5A2E] dark:text-[#D4A853] border-[#D4A853]/60", label: "مش متأكد" },
  miss: { cls: "bg-[#8A4E4E]/15 text-[#8A4E4E] border-[#8A4E4E]/40", label: "ماسمعتهاش" },
};

export default function Tasmee3({ ayah, words = [], toArabicDigits, onDone }) {
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState("idle"); // idle | listening | result
  const [heard, setHeard] = useState("");
  const [overrides, setOverrides] = useState({});
  const [error, setError] = useState(null);
  const supported = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const lvl = LEVELS.find((l) => l.id === level) || LEVELS[0];
  const aligned = phase === "result" ? alignRecitation(words, heard, { overrides }) : [];
  const stats = phase === "result" ? summarize(aligned) : null;

  // نوقّف السماع لو المكوّن اتقفل وسط التسميع
  useEffect(() => () => stopListening(), []);

  const start = useCallback(async () => {
    setError(null);
    setOverrides({});
    setHeard("");
    setPhase("listening");
    // listenOnce مابترميش خطأ أبدًا — بترجّع null لو الميكروفون
    // مرفوض أو التعرّف وقع. فبنفحص النتيجة مش try/catch.
    const text = await listenOnce({ lang: "ar-SA", onPartial: (t) => setHeard(t) });
    if (!text) {
      setError(
        "معرفناش نسمع حاجة. اتأكد إن الميكروفون مسموح، وإنك في مكان هادي، وجرّب تاني."
      );
      setPhase("idle");
      return;
    }
    setHeard(text);
    setPhase("result");
  }, []);

  const stop = () => {
    stopListening();
    setPhase("result");
  };

  const toggleOverride = (i) =>
    setOverrides((o) => {
      const n = { ...o };
      if (n[i]) delete n[i];
      else n[i] = true;
      return n;
    });

  if (!supported) {
    return (
      <div className="iqra-card p-6 text-center flex flex-col gap-3">
        <div className="text-3xl">🎙️</div>
        <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] leading-relaxed">
          متصفّحك مابيدعمش التعرّف على الكلام، فالمسمّع مش هيشتغل هنا.
          جرّب Chrome على أندرويد أو الكمبيوتر. باقي التطبيق شغّال عادي.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* المستوى */}
      <div className="flex gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              setLevel(l.id);
              setPhase("idle");
            }}
            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
              level === l.id
                ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
            }`}
          >
            {toArabicDigits(l.id)} · {l.name}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#8A7A4E] -mt-2">{lvl.hint}</p>

      {/* الآية */}
      <div className="iqra-card p-6">
        <div className="text-[11px] text-[#8A7A4E] mb-3">
          الآية {toArabicDigits(ayah)} · {toArabicDigits(words.length)} كلمة
        </div>

        <div
          dir="rtl"
          className="flex flex-wrap gap-2 justify-center leading-loose"
          style={{ fontFamily: QURAN_FONT }}
        >
          {words.map((w, i) => {
            const res = aligned[i];
            const hidden = phase !== "result" && !(lvl.revealFirst && i === 0);

            if (hidden) {
              // مستطيل بعرض الكلمة — بيحافظ على شكل الآية من غير ما يكشفها
              return (
                <span
                  key={i}
                  className="inline-block rounded-lg bg-[#E4DCC3] dark:bg-[#3A5148]"
                  style={{ width: `${Math.max(2.2, w.length * 0.62)}rem`, height: "2rem" }}
                  aria-hidden
                />
              );
            }

            if (!res) {
              return (
                <span key={i} className="text-xl text-[#1E2A24] dark:text-[#F5F0E8]">
                  {w}
                </span>
              );
            }

            const st = STATUS[res.status];
            return (
              <button
                key={i}
                onClick={() => toggleOverride(i)}
                title={
                  res.overridden
                    ? "إنت أكّدت إنك قلتها — دوس تاني للتراجع"
                    : res.heard
                    ? `التطبيق سمع: ${res.heard} (${Math.round(res.score * 100)}٪)`
                    : "التطبيق ماسمعش الكلمة دي"
                }
                className={`text-xl px-2 py-0.5 rounded-lg border ${st.cls} ${
                  res.overridden ? "ring-1 ring-[#1B4D3E]" : ""
                }`}
              >
                {w}
                {res.overridden && <span className="text-[0.5em] align-super mr-1">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* اللي بيتسمع دلوقتي */}
      {phase === "listening" && (
        <div className="iqra-card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8A4E4E] animate-pulse" />
            بنسمعك…
          </div>
          <p dir="rtl" className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] min-h-[1.5rem]">
            {heard || "ابدأ التسميع…"}
          </p>
        </div>
      )}

      {/* النتيجة */}
      {phase === "result" && stats && (
        <div className="iqra-card p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">{stats.title}</span>
            <span className="text-2xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">
              {toArabicDigits(stats.pct)}٪
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px]">
            {[
              ["match", stats.match],
              ["close", stats.close],
              ["miss", stats.miss],
            ].map(([k, n]) => (
              <span key={k} className={`px-2.5 py-1 rounded-lg border ${STATUS[k].cls}`}>
                {STATUS[k].label}: {toArabicDigits(n)}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-[#8A7A4E] leading-relaxed">
            التعرّف على الكلام مدرَّب على العربية المنطوقة مش على التلاوة المرتّلة،
            فهو <strong>بيغلط أحيانًا</strong>. أي كلمة إنت متأكد إنك قلتها صح —
            دوس عليها وهتتحسب لك.
          </p>

          <div className="flex gap-2">
            <button
              onClick={start}
              className="flex-1 bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold text-sm"
            >
              سمّع تاني
            </button>
            {onDone && (
              <button
                onClick={() => onDone(stats)}
                className="flex-1 border border-[#E4DCC3] dark:border-[#3A5148] py-3 rounded-xl font-bold text-sm"
              >
                خلّصت
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">{error}</p>
      )}

      {phase === "idle" && (
        <button
          onClick={start}
          className="bg-[#1B4D3E] text-[#F5F0E8] py-4 rounded-2xl font-bold"
        >
          🎙️ ابدأ التسميع
        </button>
      )}
      {phase === "listening" && (
        <button
          onClick={stop}
          className="border-2 border-[#8A4E4E] text-[#8A4E4E] py-4 rounded-2xl font-bold"
        >
          ⏹️ خلصت
        </button>
      )}
    </div>
  );
}
