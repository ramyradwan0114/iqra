import React, { useState, useEffect, useCallback } from "react";
import { getDaily, saveDaily, getLeaderboard, addPoints } from "../utils/db.js";
import { buildDailyQuestion, dayIndex, dayKey, POINTS_PER_CORRECT } from "../utils/dailyQuiz.js";

export default function DailyChallenge({ SURAHS, SHORT, studentName, toArabicDigits }) {
  const today = dayKey();
  const [question] = useState(() => buildDailyQuestion(SURAHS, SHORT, dayIndex()));
  const [state, setState] = useState(null); // { answered, correct, points }
  const [picked, setPicked] = useState(null);
  const [board, setBoard] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [nextIn, setNextIn] = useState("");

  const refreshBoard = useCallback(async () => setBoard(await getLeaderboard()), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const row = await getDaily(today);
      if (!alive) return;
      setState(row || null);
      if (row?.answered) setPicked(row.picked ?? null);
      setLoaded(true);
    })();
    refreshBoard();
    return () => {
      alive = false;
    };
  }, [today, refreshBoard]);

  // عدّاد للسؤال الجاي
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mid = new Date(now);
      mid.setHours(24, 0, 0, 0);
      const ms = mid - now;
      const h = Math.floor(ms / 36e5);
      const m = Math.floor((ms % 36e5) / 6e4);
      setNextIn(`${toArabicDigits(h)} ساعة و${toArabicDigits(m)} دقيقة`);
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [toArabicDigits]);

  const answer = async (i) => {
    if (state?.answered) return;
    setPicked(i);
    const correct = i === question.answer;
    const points = correct ? POINTS_PER_CORRECT : 0;
    const row = { answered: true, correct, points, picked: i };
    setState(row);
    await saveDaily(today, row);
    if (points) await addPoints(studentName, points, today);
    refreshBoard();
  };

  if (!loaded) return <p className="text-sm text-[#5B6B62] py-10 text-center">…</p>;

  const done = !!state?.answered;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F5C4C] dark:text-[#E7C873]">المسابقة اليومية</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          سؤال واحد كل يوم · {toArabicDigits(POINTS_PER_CORRECT)} نقط للإجابة الصح
        </p>
      </div>

      <div className="bg-[#FFFDF6] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-3xl p-6">
        <p className="text-lg font-bold text-[#1E2A24] dark:text-[#F6F1E4] text-center mb-5 whitespace-pre-line leading-relaxed">
          {question.q}
        </p>

        <div className="grid gap-2">
          {question.options.map((opt, i) => {
            const isAnswer = i === question.answer;
            const state2 = !done
              ? "idle"
              : isAnswer
              ? "right"
              : i === picked
              ? "wrong"
              : "idle";
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={done}
                className={`text-right px-5 py-3 rounded-xl border transition-colors ${
                  state2 === "right"
                    ? "bg-[#0F5C4C] border-[#0F5C4C] text-[#F6F1E4]"
                    : state2 === "wrong"
                    ? "bg-[#FBEDED] border-[#8A4E4E] text-[#8A4E4E]"
                    : "bg-[#FBF8EF] dark:bg-[#1E2A24] border-[#E4DCC3] dark:border-[#3A5148]"
                } ${done ? "cursor-default" : ""}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {done && (
          <div className="mt-5 text-center">
            <div className="text-3xl mb-1">{state.correct ? "🎉" : "📖"}</div>
            <p className="font-bold text-[#0F5C4C] dark:text-[#E7C873]">
              {state.correct
                ? `إجابة صحيحة! +${toArabicDigits(POINTS_PER_CORRECT)} نقط`
                : "إجابة غير صحيحة — بكرة فيه سؤال جديد"}
            </p>
            <p className="text-xs text-[#8A7A4E] mt-2">السؤال الجاي بعد {nextIn}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-[#0F5C4C] dark:text-[#E7C873] mb-2">
          لوحة المتصدرين (على هذا الجهاز)
        </h3>
        {!board.length ? (
          <p className="text-sm text-[#5B6B62] py-6 text-center">
            مفيش نقط لسه — جاوب سؤال النهاردة.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {board.slice(0, 10).map((r, i) => (
              <div
                key={r.name}
                className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] rounded-xl px-4 py-2.5"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 grid place-items-center rounded-full text-xs font-bold ${
                      i === 0
                        ? "bg-[#E7C873] text-[#1E2A24]"
                        : "bg-[#F1EAD6] dark:bg-[#1E2A24] text-[#5B6B62] dark:text-[#A9BDB2]"
                    }`}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : toArabicDigits(i + 1)}
                  </span>
                  <span className="font-semibold text-sm">{r.name}</span>
                </span>
                <span className="text-xs text-[#8A7A4E]">
                  {toArabicDigits(r.points)} نقطة · {toArabicDigits(r.days || 0)} يوم
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-[#8A7A4E] mt-3">
          اللوحة محلية على الجهاز ده بس — مش مشتركة بين الأجهزة.
        </p>
      </div>
    </div>
  );
}
