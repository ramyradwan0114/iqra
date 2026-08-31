import React, { useEffect, useState, useRef, useCallback } from "react";
import { loadAdhkar, filterByTime, SOURCE_NAME, SOURCE_URL } from "../utils/adhkar.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

// ============================================================
//  أذكار الصباح والمساء
// ------------------------------------------------------------
//  ثلاث حاجات مقصودة:
//
//  ١) عدّاد لكل ذِكر. الذِّكر اللي تكراره ١٠٠ مرة مستحيل تعدّه في
//     دماغك وإنت بتقرأ — فدوسة على الذِّكر بتنقّص واحد، ولما يخلص
//     بيتعلّم ✓ ويهدى لونه فتعرف إنك خلصته.
//
//  ٢) صوت لكل ذِكر. ده مش تحسين شكلي — ده اللي بيخلّي الأذكار
//     متاحة لحد **مش بيقرأ ويكتب**، وهم جزء أصيل من جمهور التطبيق.
//     التسجيل بصوت إنسان من حصن المسلم، مش قراءة آلية.
//
//  ٣) الوضع بيتحدّد تلقائيًا من الساعة: قبل الضهر صباح، بعده مساء.
// ============================================================

const defaultMode = () => (new Date().getHours() < 12 ? "morning" : "evening");

export default function AdhkarScreen({ toArabicDigits }) {
  const [items, setItems] = useState(null);
  const [state, setState] = useState("loading");
  const [mode, setMode] = useState(defaultMode);
  const [left, setLeft] = useState({}); // { id: الباقي }
  const [playing, setPlaying] = useState(null);
  const [audioErr, setAudioErr] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let alive = true;
    loadAdhkar().then((r) => {
      if (!alive) return;
      setItems(r);
      setState(r ? "ready" : "failed");
    });
    return () => {
      alive = false;
      audioRef.current?.pause();
    };
  }, []);

  const list = filterByTime(items, mode);

  // نبدأ العدّادات من عدد التكرار المطلوب
  useEffect(() => {
    if (!list.length) return;
    setLeft((prev) => {
      const next = { ...prev };
      for (const d of list) if (next[d.id] == null) next[d.id] = d.repeat;
      return next;
    });
  }, [items, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (d) =>
    setLeft((l) => ({ ...l, [d.id]: Math.max(0, (l[d.id] ?? d.repeat) - 1) }));

  const resetAll = () =>
    setLeft(Object.fromEntries(list.map((d) => [d.id, d.repeat])));

  const play = useCallback((d) => {
    const a = audioRef.current;
    if (!a) return;
    if (playing === d.id) {
      a.pause();
      setPlaying(null);
      return;
    }
    setAudioErr(false);
    a.src = d.audio;
    a.play()
      .then(() => setPlaying(d.id))
      .catch(() => {
        setAudioErr(true);
        setPlaying(null);
      });
  }, [playing]);

  const doneCount = list.filter((d) => (left[d.id] ?? d.repeat) === 0).length;

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} preload="none" />

      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">📿 الأذكار</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          دوس على الذِّكر تعدّه · 🔊 تسمعه
        </p>
      </div>

      <div className="flex gap-2">
        {[
          ["morning", "☀️ الصباح"],
          ["evening", "🌙 المساء"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
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
          جاري تحميل الأذكار…
        </p>
      )}

      {state === "failed" && (
        <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3 leading-relaxed">
          تعذّر تحميل الأذكار — محتاج اتصال <strong>أول مرة بس</strong>، وبعدها
          بتشتغل بدون إنترنت. جرّب تاني لما يبقى معاك نت.
        </p>
      )}

      {state === "ready" && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8A7A4E]">
              خلّصت {toArabicDigits(doneCount)} من {toArabicDigits(list.length)}
            </span>
            <button onClick={resetAll} className="text-[#1B4D3E] dark:text-[#8FD6C0] underline">
              ابدأ من جديد
            </button>
          </div>

          {audioErr && (
            <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-2.5">
              الصوت مش متاح دلوقتي — النص شغّال عادي.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {list.map((d) => {
              const rem = left[d.id] ?? d.repeat;
              const done = rem === 0;
              return (
                <div
                  key={d.id}
                  className={`iqra-card p-4 transition-opacity ${done ? "opacity-60" : ""}`}
                >
                  <button
                    onClick={() => tap(d)}
                    disabled={done}
                    className="w-full text-right"
                  >
                    <p
                      dir="rtl"
                      className="text-[#1E2A24] dark:text-[#F5F0E8] leading-loose"
                      style={{ fontFamily: QURAN_FONT, fontSize: "1.15rem" }}
                    >
                      {d.text}
                    </p>
                  </button>

                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#E4DCC3] dark:border-[#3A5148]">
                    <button
                      onClick={() => play(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        playing === d.id
                          ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                          : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                      }`}
                    >
                      {playing === d.id ? "⏸️ إيقاف" : "🔊 استمع"}
                    </button>

                    {done ? (
                      <span className="text-sm font-bold text-[#2E9E6B]">✓ تمّت</span>
                    ) : (
                      <button
                        onClick={() => tap(d)}
                        className="px-4 py-1.5 rounded-lg text-sm font-bold bg-[#D4A853]/25 text-[#6B5A2E] dark:text-[#D4A853]"
                      >
                        باقي {toArabicDigits(rem)}
                        {d.repeat > 1 ? ` من ${toArabicDigits(d.repeat)}` : ""}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-[#8A7A4E] leading-relaxed border-t border-[#E4DCC3] dark:border-[#3A5148] pt-4">
            المصدر: <strong>{SOURCE_NAME}</strong> — الشيخ سعيد بن علي القحطاني،
            والنص والتسجيلات من{" "}
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
              hisnmuslim.com
            </a>
            . النص متجاب من المصدر مباشرة مش مكتوب في التطبيق، عشان مايحصلش أي
            تحريف. بعض الأذكار مخصوصة بالصباح أو المساء وبتظهر في وقتها.
          </p>
        </>
      )}
    </div>
  );
}
