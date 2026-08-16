import React, { useState } from "react";
import { TAJWEED_QUIZ } from "../utils/tajweedData.js";

const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

export default function TajweedQuiz({ toArabicDigits, onClose }) {
  const [questions] = useState(() => shuffle(TAJWEED_QUIZ));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);

  const q = questions[idx];
  const done = idx >= questions.length;

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-5 text-center py-10">
        <div className="text-5xl">{pct >= 70 ? "🎉" : "📖"}</div>
        <h3 className="text-2xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">
          {toArabicDigits(score)} من {toArabicDigits(questions.length)}
        </h3>
        <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] max-w-xs">
          {pct >= 70
            ? "ممتاز! أساسيات التجويد عندك كويسة."
            : "محتاج مراجعة — ارجع لتلوين التجويد في المصحف ودوس على الحروف الملوّنة."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIdx(0);
              setScore(0);
              setPicked(null);
            }}
            className="bg-[#1B4D3E] text-[#F5F0E8] px-6 py-3 rounded-xl font-bold"
          >
            إعادة
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="border border-[#E4DCC3] dark:border-[#3A5148] px-6 py-3 rounded-xl font-bold text-[#5B6B62] dark:text-[#A9BDB2]"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>
    );
  }

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.a) setScore((s) => s + 1);
    setTimeout(() => {
      setPicked(null);
      setIdx((n) => n + 1);
    }, 1100);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-xs text-[#8A7A4E]">
        <span>
          سؤال {toArabicDigits(idx + 1)} من {toArabicDigits(questions.length)}
        </span>
        <span>الدرجة: {toArabicDigits(score)}</span>
      </div>
      <div className="h-1.5 bg-[#E4DCC3] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1B4D3E] transition-all duration-300"
          style={{ width: `${(idx / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-lg font-bold text-[#1E2A24] dark:text-[#F5F0E8] text-center py-3">
        {q.q}
      </p>

      <div className="grid gap-2">
        {q.options.map((opt, i) => {
          const state =
            picked === null
              ? "idle"
              : i === q.a
              ? "right"
              : i === picked
              ? "wrong"
              : "idle";
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`text-right px-5 py-3 rounded-xl border transition-colors ${
                state === "right"
                  ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                  : state === "wrong"
                  ? "bg-[#FBEDED] border-[#8A4E4E] text-[#8A4E4E]"
                  : "bg-[#FBF8EF] dark:bg-[#243830] border-[#E4DCC3] dark:border-[#3A5148]"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
