import React, { useState, useEffect, useCallback, useRef } from "react";
import AudioRecorder from "./AudioRecorder.jsx";
import EmptyState from "./EmptyState.jsx";
import { SHORT_SURAHS } from "../data/shortSurahs.js";
import { analyzeRecording, referenceFromSegments, compare, encouragement } from "../utils/tajweedAnalyzer.js";
import { aiCoach, isAiAvailable } from "../utils/speechRecognition.js";
import { buzz } from "../hooks/useProgress.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";
const PICKS = [112, 113, 114, 105, 106, 107];

export default function AITajweedCoach({ loadTimings, toArabicDigits, onToast }) {
  const [surah, setSurah] = useState(112);
  const [ayah, setAyah] = useState(1);
  const [timings, setTimings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [dismissed, setDismissed] = useState({});
  const [aiTip, setAiTip] = useState(null);
  const [aiOn, setAiOn] = useState(false);
  const audioRef = useRef(null);

  const s = SHORT_SURAHS[surah];
  const ayahText = s?.ayat?.[ayah - 1] || "";

  useEffect(() => {
    isAiAvailable().then(setAiOn);
  }, []);

  // توقيت الشيخ للسورة (الحصري) — منه بنبني المرجع
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadErr(false);
    setResult(null);
    Promise.resolve(loadTimings(6, surah))
      .then((d) => alive && setTimings(d))
      .catch(() => alive && setLoadErr(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [surah, loadTimings]);

  const line = timings?.ayat?.find((a) => a.ayah === ayah);
  const ref = line ? referenceFromSegments(line.segments) : null;

  const playReference = useCallback(() => {
    if (!timings || !line) return;
    const a = audioRef.current;
    if (!a) return;
    const start = line.segments[0][1] / 1000;
    const end = line.segments[line.segments.length - 1][2] / 1000;
    if (a.src !== timings.audioUrl) a.src = timings.audioUrl;
    const go = () => {
      a.currentTime = start;
      a.play().catch(() => {});
      const stop = () => {
        if (a.currentTime >= end) {
          a.pause();
          a.removeEventListener("timeupdate", stop);
        }
      };
      a.addEventListener("timeupdate", stop);
    };
    if (a.readyState >= 1) go();
    else a.addEventListener("loadedmetadata", go, { once: true });
  }, [timings, line]);

  const onRecorded = useCallback(
    async (blob) => {
      setBusy(true);
      setAiTip(null);
      const user = await analyzeRecording(blob);
      if (!user) {
        onToast?.("تعذّر تحليل التسجيل — جرّب تاني");
        setBusy(false);
        return;
      }
      const cmp = compare(user, ref);
      setResult({ user, ...cmp });
      setAttempts((n) => n + 1);
      setDismissed({});
      buzz(20);
      setBusy(false);

      // طبقة الـ AI — اختيارية تمامًا، وبتبعت القياسات مش الصوت
      if (aiOn) {
        const tip = await aiCoach({
          ayahText,
          metrics: {
            duration: +user.duration.toFixed(2),
            refDuration: +(ref?.duration || 0).toFixed(2),
            longestVoiced: +user.longestVoiced.toFixed(2),
            refLongest: +(ref?.longestWord || 0).toFixed(2),
            pauses: user.pauses.length,
            refPauses: ref?.pauses ?? 0,
          },
        });
        if (tip) setAiTip(tip.tip);
      }
    },
    [ref, ayahText, aiOn, onToast]
  );

  const visibleNotes = (result?.notes || []).filter((_, i) => !dismissed[i]);
  const enc = result ? encouragement(visibleNotes) : null;

  return (
    <div className="flex flex-col gap-5">
      <audio ref={audioRef} preload="none" />

      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">مدرّب التلاوة</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          اسمع الشيخ، اقرأ، وشوف الفرق — مساعدة مش حكم
        </p>
      </div>

      {/* اختيار السورة والآية */}
      <div className="iqra-card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {PICKS.map((id) => (
            <button
              key={id}
              onClick={() => {
                setSurah(id);
                setAyah(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                surah === id
                  ? "bg-[#D4A853] border-[#D4A853] text-[#1E2A24]"
                  : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
              }`}
              style={{ fontFamily: QURAN_FONT }}
            >
              {SHORT_SURAHS[id].name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {s?.ayat.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setAyah(i + 1);
                setResult(null);
              }}
              className={`w-9 h-9 rounded-lg text-sm font-bold border ${
                ayah === i + 1
                  ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                  : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
              }`}
            >
              {toArabicDigits(i + 1)}
            </button>
          ))}
        </div>
      </div>

      {/* الآية + الاستماع */}
      <div className="iqra-card p-6 flex flex-col items-center gap-4">
        <p
          dir="rtl"
          className="text-2xl leading-loose text-center text-[#1E2A24] dark:text-[#F5F0E8]"
          style={{ fontFamily: QURAN_FONT }}
        >
          {ayahText}
        </p>

        {loading ? (
          <span className="text-sm text-[#5B6B62]">جاري تحميل تلاوة الشيخ…</span>
        ) : loadErr || !ref ? (
          <p className="text-xs text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-2.5 text-center">
            تلاوة الشيخ محتاجة اتصال أول مرة. تقدر تسجّل، بس المقارنة مش هتشتغل
            من غيرها.
          </p>
        ) : (
          <button
            onClick={playReference}
            className="bg-[#1B4D3E] text-[#F5F0E8] px-6 py-2.5 rounded-xl font-bold text-sm"
          >
            ▶ اسمع الشيخ الحصري
          </button>
        )}
      </div>

      {/* التسجيل */}
      <div className="iqra-card p-5">
        <AudioRecorder onRecorded={onRecorded} disabled={busy} />
        {busy && <p className="text-xs text-[#8A7A4E] text-center mt-2">بنحلّل…</p>}
      </div>

      {/* النتيجة */}
      {result && (
        <div className="flex flex-col gap-3">
          {enc && (
            <div className="iqra-card p-5 text-center">
              <div className="text-4xl mb-1">{enc.icon}</div>
              <div className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">{enc.text}</div>
              <div className="text-[11px] text-[#8A7A4E] mt-1">
                محاولة {toArabicDigits(attempts)}
              </div>
            </div>
          )}

          {visibleNotes.map((n, i) => {
            const idx = result.notes.indexOf(n);
            return (
              <div
                key={idx}
                className={`rounded-2xl px-4 py-3.5 border ${
                  n.kind === "good"
                    ? "bg-[#1B4D3E]/8 border-[#1B4D3E]/25"
                    : n.kind === "warn"
                    ? "bg-[#FBF3E2] border-[#D4A853]"
                    : "bg-[#FBF8EF] dark:bg-[#243830] border-[#E4DCC3] dark:border-[#3A5148]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-start gap-2.5 min-w-0">
                    <span className="text-lg shrink-0">{n.icon}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{n.title}</span>
                      <span className="block text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-0.5 leading-relaxed">
                        {n.detail}
                      </span>
                      <span className="inline-block text-[10px] text-[#8A7A4E] mt-1.5 bg-[#1B4D3E]/8 rounded px-2 py-0.5 tabular-nums">
                        {n.metric}
                      </span>
                    </span>
                  </span>
                  {n.kind !== "good" && (
                    <button
                      onClick={() => setDismissed((d) => ({ ...d, [idx]: true }))}
                      className="shrink-0 text-[10px] text-[#8A7A4E] underline"
                      title="المدرّب ممكن يغلط — تجاهل الملاحظة دي"
                    >
                      تجاهل
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {aiTip && (
            <div className="rounded-2xl px-4 py-3.5 bg-[#7A5C9E]/10 border border-[#7A5C9E]/30">
              <span className="text-xs font-bold text-[#7A5C9E]">🤖 نصيحة إضافية</span>
              <p className="text-xs mt-1 leading-relaxed">{aiTip}</p>
            </div>
          )}

          {!visibleNotes.length && (
            <EmptyState
              icon="🌟"
              title="تجاهلت كل الملاحظات"
              desc="مفيش مشكلة — المدرّب أداة مساعدة، وسماعك من شيخ يفضل الأصل."
              action={() => setDismissed({})}
              actionLabel="رجّع الملاحظات"
            />
          )}
        </div>
      )}

      <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
        <strong>اقرأ ده مهم:</strong> المدرّب <strong>مش بيحكم</strong> على تلاوتك
        صح ولا غلط. بيقيس حاجات من الصوت — طول المدّ، الوقفات، السرعة — ويقارنها
        بتلاوة الشيخ، وبيوريك الأرقام عشان تحكم بنفسك. كل ملاحظة تقدر تتجاهلها.
        <br />
        <strong>ده مش بديل عن التلقّي من شيخ</strong> — القرآن يُؤخذ بالمشافهة.
        {!aiOn && (
          <>
            <br />
            <span className="text-[#8A7A4E]">
              طبقة الـ AI مطفية: محتاجة دالة <code className="font-mono">/api/tajweed</code> على
              Vercel — التحليل الحالي بيشتغل من غيرها وأوفلاين.
            </span>
          </>
        )}
      </p>
    </div>
  );
}
