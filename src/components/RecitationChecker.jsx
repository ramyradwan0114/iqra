import React, { useState, useRef, useEffect } from "react";
import { speechSupported, createRecognizer, compareRecitation } from "../utils/speech.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

export default function RecitationChecker({ ayahText, ayahNumber, onClose }) {
  const [supported] = useState(() => speechSupported());
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const recRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {}
    };
  }, []);

  const start = () => {
    const rec = createRecognizer({ lang: "ar-SA" });
    if (!rec) return;
    recRef.current = rec;
    setHeard("");
    setResult(null);
    setError(null);
    setListening(true);

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setHeard((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "لازم تسمح باستخدام الميكروفون من إعدادات المتصفح."
          : e.error === "no-speech"
          ? "مسمعتش صوت — جرّب تاني وقرّب من الميك."
          : "حصلت مشكلة في التسجيل."
      );
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      const said = (finalText || "").trim();
      if (said) setResult(compareRecitation(ayahText, said));
    };
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  };

  return (
    <div
      className="fixed inset-0 bg-[#1E2A24]/50 z-[65] flex items-end sm:items-center justify-center p-3"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFFFF] dark:bg-[#243830] rounded-3xl border border-[#E4DCC3] dark:border-[#3A5148] w-full max-w-lg p-6 max-h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">
            سجّل تلاوتك — آية {ayahNumber}
          </h3>
          <button onClick={onClose} className="text-[#5B6B62] text-sm font-semibold">
            ✕
          </button>
        </div>

        <p
          dir="rtl"
          className="text-2xl leading-loose text-center mb-5 text-[#1E2A24] dark:text-[#F5F0E8]"
          style={{ fontFamily: QURAN_FONT }}
        >
          {ayahText}
        </p>

        {!supported ? (
          <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
            التسجيل غير متاح على هذا الجهاز. خاصية التعرّف على الكلام مدعومة في
            كروم وإيدج على الكمبيوتر وأندرويد، ومش مدعومة في فَيرفُكس ولا في
            معظم متصفحات الآيفون.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={listening ? stop : start}
                className={`px-6 py-3 rounded-xl font-bold ${
                  listening
                    ? "bg-[#8A4E4E] text-[#F5F0E8] animate-pulse"
                    : "bg-[#1B4D3E] text-[#F5F0E8]"
                }`}
              >
                {listening ? "إيقاف ■" : "سجّل صوتك 🎤"}
              </button>
            </div>

            {error && (
              <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3 mb-4">
                {error}
              </p>
            )}

            {heard && (
              <div className="mb-4">
                <div className="text-[11px] text-[#8A7A4E] mb-1">اللي المحرّك سمعه:</div>
                <p className="text-sm bg-[#FBF8EF] dark:bg-[#1E2A24] rounded-xl px-4 py-2.5">
                  {heard}
                </p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-3">
                <div className="text-center">
                  <div
                    className={`text-4xl font-bold ${
                      result.score >= 80
                        ? "text-[#1B4D3E]"
                        : result.score >= 50
                        ? "text-[#8A7A4E]"
                        : "text-[#8A4E4E]"
                    }`}
                  >
                    {result.score}٪
                  </div>
                  <div className="text-xs text-[#8A7A4E]">مؤشّر تطابق تقريبي</div>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center" dir="rtl">
                  {result.ops
                    .filter((o) => o.type !== "ins")
                    .map((o, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded-lg text-sm ${
                          o.type === "match"
                            ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                            : o.type === "sub"
                            ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
                            : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
                        }`}
                      >
                        {o.expected}
                        {o.type === "sub" && (
                          <span className="text-[11px] opacity-70"> ← قلت «{o.actual}»</span>
                        )}
                        {o.type === "del" && <span className="text-[11px] opacity-70"> ← ناقصة</span>}
                      </span>
                    ))}
                </div>

                <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
                  <strong>اقرأ ده مهم:</strong> محرّك التعرّف في المتصفح مدرَّب على
                  العربية المنطوقة المعاصرة، مش على التلاوة المرتّلة. بيرجّع نصًّا
                  بدون تشكيل، وبيغلط كتير مع المدّ والغنّة. النسبة دي{" "}
                  <strong>مؤشّر تقريبي للتدريب</strong> — مش حكمًا على تلاوتك، ولا
                  بديلًا عن شيخ يسمع منك.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
