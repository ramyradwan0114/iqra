import React, { useState, useEffect } from "react";
import Tasmee3 from "./Tasmee3.jsx";
import { loadSurahText, offlineSurahIds } from "../utils/surahText.js";

// ============================================================
//  شاشة المسمّع — أي سورة، آية واحدة أو السورة كلها
// ------------------------------------------------------------
//  عن «السورة كلها»: التعرّف على الكلام في المتصفّح بيقف لوحده
//  بعد فترة صمت أو بعد دقيقة تقريبًا — ده قيد في المتصفّح مش في
//  الكود. فتسميع البقرة في جلسة واحدة **مش هيشتغل**، والادّعاء
//  بغير كده هيضيّع تعب المستخدم.
//
//  الحل: وضع السورة بيمشي **آية آية بالتتابع**. تسمّع آية، يتحسب
//  نتيجتها، وتنتقل للّي بعدها، وفي الآخر تشوف نتيجة السورة كلها.
//  النتيجة اللي إنت عايزها (هل أنا حافظها ولا لأ؟) بتتحقّق بالكامل،
//  والفرق إن كل آية ليها ضغطة.
// ============================================================

export default function Tasmee3Screen({ toArabicDigits, surahs = [] }) {
  const offline = new Set(offlineSurahIds());
  const [surahId, setSurahId] = useState(112);
  const [mode, setMode] = useState("ayah"); // ayah | surah
  const [ayahIdx, setAyahIdx] = useState(0);
  const [text, setText] = useState(null);
  const [state, setState] = useState("loading");
  const [scores, setScores] = useState({}); // { فهرس الآية: نسبة }

  const meta = surahs.find((s) => s.id === surahId);

  useEffect(() => {
    let alive = true;
    setState("loading");
    setText(null);
    setAyahIdx(0);
    setScores({});
    loadSurahText(surahId, meta?.name).then((d) => {
      if (!alive) return;
      setText(d);
      setState(d ? "ready" : "failed");
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahId]);

  const ayat = text?.ayat || [];
  const words = (ayat[ayahIdx] || "").split(/\s+/).filter(Boolean);
  const done = Object.keys(scores).length;
  const avg = done ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / done) : 0;

  const onAyahDone = (stats) => {
    setScores((s) => ({ ...s, [ayahIdx]: stats.pct }));
    if (mode === "surah" && ayahIdx < ayat.length - 1) setAyahIdx((i) => i + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">🎤 المسمّع</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          سمّع من حفظك والتطبيق يكتب وراك ويعلّم الكلمات
        </p>
      </div>

      {/* السورة */}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold shrink-0">السورة</span>
        <select
          value={surahId}
          onChange={(e) => setSurahId(Number(e.target.value))}
          className="flex-1 bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-3 py-2.5 text-sm"
        >
          {surahs.map((s) => (
            <option key={s.id} value={s.id}>
              {toArabicDigits(s.id)} · {s.name} ({toArabicDigits(s.ayat)} آية)
              {offline.has(s.id) ? " — أوفلاين" : ""}
            </option>
          ))}
        </select>
      </label>

      {/* الوضع */}
      <div className="flex gap-2">
        {[
          ["ayah", "آية واحدة", "اختار آية وسمّعها"],
          ["surah", "السورة كلها", "آية آية بالتتابع، ونتيجة في الآخر"],
        ].map(([id, label, hint]) => (
          <button
            key={id}
            onClick={() => {
              setMode(id);
              setAyahIdx(0);
              setScores({});
            }}
            title={hint}
            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
              mode === id
                ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {state === "loading" && (
        <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] py-10 text-center">
          جاري تحميل نص السورة…
        </p>
      )}

      {state === "failed" && (
        <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
          تعذّر تحميل نص السورة — محتاج اتصال أول مرة. السور القصيرة
          المكتوب جنبها «أوفلاين» شغّالة من غير إنترنت.
        </p>
      )}

      {state === "ready" && ayat.length > 0 && (
        <>
          {mode === "ayah" ? (
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold shrink-0">الآية</span>
              <select
                value={ayahIdx}
                onChange={(e) => setAyahIdx(Number(e.target.value))}
                className="flex-1 bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-3 py-2.5 text-sm"
              >
                {ayat.map((_, i) => (
                  <option key={i} value={i}>
                    الآية {toArabicDigits(i + 1)}
                    {scores[i] != null ? ` — ${toArabicDigits(scores[i])}٪` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="iqra-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">
                  الآية {toArabicDigits(ayahIdx + 1)} من {toArabicDigits(ayat.length)}
                </span>
                {done > 0 && (
                  <span className="text-xs text-[#8A7A4E]">
                    المتوسط: {toArabicDigits(avg)}٪
                  </span>
                )}
              </div>
              <div className="h-2 bg-[#E4DCC3] dark:bg-[#3A5148] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1B4D3E] dark:bg-[#D4A853] transition-all duration-500"
                  style={{ width: `${(done / ayat.length) * 100}%` }}
                />
              </div>
              {/* خريطة الآيات — نظرة سريعة على اللي حافظه واللي لأ */}
              <div className="flex flex-wrap gap-1 mt-1">
                {ayat.map((_, i) => {
                  const p = scores[i];
                  const bg =
                    p == null
                      ? "bg-[#E4DCC3] dark:bg-[#3A5148]"
                      : p >= 95
                      ? "bg-[#2E9E6B]"
                      : p >= 60
                      ? "bg-[#D4A853]"
                      : "bg-[#8A4E4E]";
                  return (
                    <button
                      key={i}
                      onClick={() => setAyahIdx(i)}
                      title={`الآية ${i + 1}${p != null ? ` — ${p}٪` : ""}`}
                      className={`w-5 h-5 rounded ${bg} ${
                        i === ayahIdx ? "ring-2 ring-[#1B4D3E] dark:ring-[#D4A853]" : ""
                      }`}
                    />
                  );
                })}
              </div>
              {done === ayat.length && (
                <p className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mt-2">
                  خلّصت السورة — متوسطك {toArabicDigits(avg)}٪
                </p>
              )}
            </div>
          )}

          <Tasmee3
            key={`${surahId}:${ayahIdx}`}
            ayah={ayahIdx + 1}
            words={words}
            toArabicDigits={toArabicDigits}
            onDone={onAyahDone}
          />
        </>
      )}

      <p className="text-[11px] text-[#8A7A4E] leading-relaxed border-t border-[#E4DCC3] dark:border-[#3A5148] pt-4">
        <strong>ليه السورة بتتسمّع آية آية؟</strong> التعرّف على الكلام في المتصفّح
        بيقف لوحده بعد شوية — ده قيد في المتصفّح نفسه. فبدل ما تسمّع سورة كاملة
        ويضيع تعبك، بنمشي آية آية وتشوف خريطة كاملة في الآخر لكل آية حافظها
        وكل آية محتاجة مراجعة.
        <br />
        <br />
        والمسمّع بيتأكد إنك <strong>قلت الكلمات صح</strong> — مابيحكمش على التجويد.
        لتحليل تلاوتك صوتيًا استخدم <strong>مدرّب التلاوة</strong>.
      </p>
    </div>
  );
}
