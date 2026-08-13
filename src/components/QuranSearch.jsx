import React, { useState, useRef, useEffect, useCallback } from "react";
import { speechSupported, createRecognizer } from "../utils/speech.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

const searchApi = (q, page = 1) =>
  `https://api.qurancdn.com/api/qdc/search?q=${encodeURIComponent(q)}&size=20&page=${page}`;

export default function QuranSearch({ SURAHS, toArabicDigits, onPick, onClose, startVoice: autoVoice }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listening, setListening] = useState(false);
  const [total, setTotal] = useState(0);
  const recRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {}
      abortRef.current?.abort();
    },
    []
  );

  const run = useCallback(async (term) => {
    const text = (term || "").trim();
    if (!text) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(searchApi(text), { signal: ctrl.signal });
      if (!res.ok) throw new Error("search failed");
      const json = await res.json();
      setResults(json?.result?.verses || []);
      setTotal(json?.pagination?.total_records || 0);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError("البحث محتاج اتصال بالإنترنت — مش متاح أوفلاين.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // فتح مباشر في وضع الصوت (من زر 🎤 اللي فوق في المصحف)
  useEffect(() => {
    if (!autoVoice || !speechSupported()) return;
    const t = setTimeout(() => startVoice(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVoice]);

  const startVoice = () => {
    const rec = createRecognizer({ lang: "ar-SA", interim: false });
    if (!rec) return;
    rec.continuous = false;
    recRef.current = rec;
    setListening(true);
    let said = "";
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) said += e.results[i][0].transcript;
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      const t = said.trim();
      if (t) {
        setQ(t);
        run(t);
      }
    };
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  const surahName = (id) => SURAHS.find((s) => s.id === id)?.name || id;

  return (
    <div
      className="fixed inset-0 bg-[#1E2A24]/50 z-[62] flex items-start justify-center p-3 sm:p-8"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDF6] dark:bg-[#243830] rounded-3xl border border-[#E4DCC3] dark:border-[#3A5148] w-full max-w-xl max-h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* خانة البحث أصغر، وزر الصوت جنبها من فوق وكبير على الموبايل */}
        <div className="p-3 border-b border-[#E4DCC3] dark:border-[#3A5148]">
          <div className="flex items-center gap-2">
            <form
              className="flex-1 flex items-center gap-2 min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                run(q);
              }}
            >
              <input
                autoFocus={!autoVoice}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث…"
                className="flex-1 min-w-0 bg-[#FBF8EF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0F5C4C]"
              />
              <button
                type="submit"
                className="shrink-0 w-11 h-11 grid place-items-center rounded-xl bg-[#0F5C4C] text-[#F6F1E4] text-lg"
                aria-label="بحث"
                title="بحث"
              >
                🔍
              </button>
            </form>

            {speechSupported() && (
              <button
                type="button"
                onClick={startVoice}
                className={`shrink-0 w-14 h-14 grid place-items-center rounded-2xl border-2 text-2xl transition-colors ${
                  listening
                    ? "bg-[#8A4E4E] border-[#8A4E4E] text-[#F6F1E4] animate-pulse"
                    : "bg-[#E7C873] border-[#E7C873] text-[#1E2A24]"
                }`}
                title="بحث صوتي"
                aria-label="بحث صوتي"
              >
                🎤
              </button>
            )}

            <button
              onClick={onClose}
              className="shrink-0 text-[#5B6B62] dark:text-[#A9BDB2] text-lg font-semibold px-1"
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto">
          {listening && (
            <p className="text-sm text-[#0F5C4C] dark:text-[#8FD6C0] text-center py-6">
              بتكلّم… قول الآية أو الكلمة
            </p>
          )}
          {loading && <p className="text-sm text-[#5B6B62] text-center py-10">بيدوّر…</p>}
          {error && (
            <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3 m-4">{error}</p>
          )}

          {results && !loading && (
            <>
              <div className="px-5 py-2 text-[11px] text-[#8A7A4E] border-b border-[#F1EAD6] dark:border-[#3A5148]">
                {results.length
                  ? `${toArabicDigits(total)} نتيجة — أول ${toArabicDigits(results.length)}`
                  : "مفيش نتائج"}
              </div>
              {results.map((v) => {
                const [sId, aId] = v.verse_key.split(":").map(Number);
                return (
                  <button
                    key={v.verse_key}
                    onClick={() => onPick(sId, aId)}
                    className="w-full text-right px-5 py-3.5 border-b border-[#F1EAD6] dark:border-[#3A5148] hover:bg-[#F6F1E4] dark:hover:bg-[#1E2A24] transition-colors"
                  >
                    <div
                      dir="rtl"
                      className="text-lg leading-loose text-[#1E2A24] dark:text-[#F6F1E4] mb-1"
                      style={{ fontFamily: QURAN_FONT }}
                    >
                      {v.words
                        ?.filter((w) => w.char_type === "word")
                        .map((w, i) => (
                          <span
                            key={i}
                            className={w.highlight ? "bg-[#E7C873] text-[#1E2A24] rounded px-0.5" : ""}
                          >
                            {w.text}{" "}
                          </span>
                        ))}
                    </div>
                    <div className="text-[11px] text-[#8A7A4E]">
                      سورة {surahName(sId)} — آية {toArabicDigits(aId)}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {!results && !loading && !error && !listening && (
            <p className="text-sm text-[#5B6B62] text-center py-12 px-6">
              دوّر بكلمة زي «الرحمن» أو «الصلاة»، أو استخدم البحث الصوتي 🎤
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
