import React, { useState, useRef, useEffect } from "react";
import { useReadingJournal, CONFIDENCE_LEVELS } from "../hooks/useQuranJournal.js";
import { SHORT_SURAHS } from "../data/shortSurahs.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";
const PICKS = [112, 113, 114, 105, 106, 107];

const FEELINGS = [
  { id: "yes", icon: "😀", label: "أيوه، حاسس بتحسّن" },
  { id: "some", icon: "🙂", label: "شوية" },
  { id: "no", icon: "😐", label: "لسه لأ" },
];

export default function ConfidenceMode({ toArabicDigits }) {
  const { entries, log, streak } = useReadingJournal();
  const [surah, setSurah] = useState(112);
  const [challenge, setChallenge] = useState(1);
  const [phase, setPhase] = useState("ready"); // ready | reading | ask
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState(null);
  const [denied, setDenied] = useState(false);
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const ivRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(ivRef.current);
      try {
        mrRef.current?.stop();
      } catch {}
    };
  }, []);

  const s = SHORT_SURAHS[surah];

  const start = async () => {
    setUrl(null);
    setSeconds(0);
    setDenied(false);
    // التسجيل هنا للسماع الذاتي بس — مفيش أي تقييم، وده مقصود:
    // الهدف بناء الثقة، والتقييم بيزوّد الرهبة بدل ما يقلّلها.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunksRef.current, { type: "audio/webm" })));
      };
      mr.start();
    } catch {
      setDenied(true); // نكمّل من غير تسجيل
    }
    setPhase("reading");
    ivRef.current = setInterval(() => setSeconds((n) => n + 1), 1000);
  };

  const finish = () => {
    clearInterval(ivRef.current);
    try {
      mrRef.current?.stop();
    } catch {}
    setPhase("ask");
  };

  const answer = async (feeling) => {
    await log({ surah, seconds, feeling, challenge });
    setPhase("ready");
  };

  const todayCount = entries.filter(
    (e) => e.day === new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">اقرأ بثقة</h2>
          <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
            اقرأ وسجّل — من غير أي تقييم ولا درجات. الهدف إنك تسمع نفسك وتتعوّد.
          </p>
        </div>
        {streak > 0 && (
          <span className="text-sm font-bold text-[#8A7A4E] dark:text-[#D4A853] whitespace-nowrap">
            🔥 {toArabicDigits(streak)} {streak === 1 ? "يوم" : streak === 2 ? "يومين" : "أيام"} قراءة
          </span>
        )}
      </div>

      {/* تحدّيات تدريجية */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CONFIDENCE_LEVELS.map((c) => (
          <button
            key={c.level}
            onClick={() => setChallenge(c.level)}
            className={`text-right rounded-2xl border p-3 transition-colors ${
              challenge === c.level
                ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                : "bg-[#FBF8EF] dark:bg-[#243830] border-[#E4DCC3] dark:border-[#3A5148]"
            }`}
          >
            <div className="text-xl mb-1">{c.icon}</div>
            <div className="text-xs font-bold">{c.title}</div>
            <div
              className={`text-[10px] mt-0.5 ${
                challenge === c.level ? "text-[#F5F0E8]/75" : "text-[#5B6B62] dark:text-[#A9BDB2]"
              }`}
            >
              {c.desc}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-3xl p-6">
        {phase === "ready" && (
          <>
            <div className="flex flex-wrap gap-2 mb-5 justify-center">
              {PICKS.map((id) => (
                <button
                  key={id}
                  onClick={() => setSurah(id)}
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
            <p
              dir="rtl"
              className="text-xl leading-loose text-center mb-6 text-[#1E2A24] dark:text-[#F5F0E8]"
              style={{ fontFamily: QURAN_FONT }}
            >
              {s.ayat.join(" ۝ ")}
            </p>
            <div className="text-center">
              <button
                onClick={start}
                className="bg-[#1B4D3E] text-[#F5F0E8] px-8 py-3 rounded-xl font-bold"
              >
                ابدأ القراءة
              </button>
            </div>
          </>
        )}

        {phase === "reading" && (
          <div className="flex flex-col items-center gap-6">
            <p
              dir="rtl"
              className="text-2xl leading-loose text-center text-[#1E2A24] dark:text-[#F5F0E8]"
              style={{ fontFamily: QURAN_FONT }}
            >
              {s.ayat.join(" ۝ ")}
            </p>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#8A4E4E] animate-pulse" />
              <span className="text-2xl font-bold text-[#1B4D3E] dark:text-[#8FD6C0]">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </div>
            {denied && (
              <p className="text-xs text-[#8A7A4E]">
                التسجيل مش شغّال — كمّل قراءة عادي، ده مش هيوقف حاجة.
              </p>
            )}
            <button
              onClick={finish}
              className="bg-[#8A4E4E] text-[#F5F0E8] px-8 py-3 rounded-xl font-bold"
            >
              خلّصت
            </button>
          </div>
        )}

        {phase === "ask" && (
          <div className="flex flex-col items-center gap-5">
            <div className="text-4xl">🎧</div>
            {url && <audio src={url} controls className="w-full max-w-sm" />}
            <p className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">حاسس بتحسّن؟</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {FEELINGS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => answer(f.id)}
                  className="px-5 py-3 rounded-xl border border-[#E4DCC3] dark:border-[#3A5148] hover:border-[#1B4D3E] text-sm"
                >
                  <span className="text-xl ml-1">{f.icon}</span> {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mb-2">
            يوميات القراءة {todayCount > 0 && `(${toArabicDigits(todayCount)} النهاردة)`}
          </h3>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
            {entries.slice(0, 12).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-xs bg-[#FBF8EF] dark:bg-[#243830] rounded-xl px-4 py-2"
              >
                <span style={{ fontFamily: QURAN_FONT }}>
                  {SHORT_SURAHS[e.surah]?.name || e.surah}
                </span>
                <span className="text-[#8A7A4E]">
                  {FEELINGS.find((f) => f.id === e.feeling)?.icon} ·{" "}
                  {toArabicDigits(Math.floor((e.seconds || 0) / 60))}:
                  {String((e.seconds || 0) % 60).padStart(2, "0")} · {e.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
