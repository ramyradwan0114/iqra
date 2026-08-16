import React, { useState, useEffect, useRef } from "react";
import {
  GOALS,
  loadGoals,
  saveGoals,
  evaluate,
  progressOf,
  countDone,
  allDone,
} from "../utils/dailyGoals.js";
import { salawatCount, maxTasbih } from "../utils/reminders.js";
import { buzz } from "../hooks/useProgress.js";
import { awardBadge } from "../utils/db.js";

export default function DailyGoal({ tasbih, lessonDoneToday, toArabicDigits, onToast, onGoLesson }) {
  const [state, setState] = useState(null);
  const [justDone, setJustDone] = useState(null);
  const prevDone = useRef({});

  useEffect(() => {
    loadGoals().then(setState);
  }, []);

  const ctx = {
    lessonDone: !!lessonDoneToday,
    salawatToday: salawatCount(tasbih),
    tasbihMax: maxTasbih(tasbih),
  };

  // إعادة التقييم مع كل تغيير في الأرقام
  useEffect(() => {
    if (!state) return;
    const done = evaluate(state, ctx);
    const changed = GOALS.some((g) => done[g.id] && !state.done[g.id]);
    if (!changed) return;

    const newly = GOALS.find((g) => done[g.id] && !prevDone.current[g.id]);
    prevDone.current = done;

    const complete = allDone(done);
    const next = { ...state, done, awarded: state.awarded || complete };
    setState(next);
    saveGoals(next);

    if (newly) {
      setJustDone(newly.id);
      setTimeout(() => setJustDone(null), 900);
      buzz(20);
    }
    if (complete && !state.awarded) {
      awardBadge("dailyGoal");
      buzz([40, 60, 40, 60, 80]);
      onToast?.("🏆 أحسنت! أكملت هدفك اليوم");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.lessonDone, ctx.salawatToday, ctx.tasbihMax, state]);

  if (!state) return null;

  const n = countDone(state.done);
  const complete = allDone(state.done);
  const y = state.yesterday;

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853]">
          {complete ? "🏆 " : "🎯 "}هدف اليوم
        </span>
        <span
          className={`text-xs font-bold ${
            complete ? "text-[#1B4D3E] dark:text-[#8FD6C0]" : "text-[#8A7A4E]"
          }`}
        >
          {toArabicDigits(n)}/{toArabicDigits(GOALS.length)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {GOALS.map((g) => {
          const done = !!state.done[g.id];
          const p = progressOf(g.id, ctx);
          const pct = Math.min((p / g.target) * 100, 100);
          return (
            <div
              key={g.id}
              className={`rounded-xl px-3 py-2.5 border transition-all ${
                done
                  ? "bg-[#1B4D3E]/10 border-[#1B4D3E]/30"
                  : "bg-[#FBF8EF] dark:bg-[#1E2A24] border-[#E4DCC3] dark:border-[#3A5148]"
              } ${justDone === g.id ? "scale-[1.02]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{g.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold truncate">{g.label}</span>
                    {!done && (
                      <span className="block text-[10px] text-[#8A7A4E]">{g.hint}</span>
                    )}
                  </span>
                </span>
                <span
                  className={`text-sm shrink-0 transition-transform ${
                    justDone === g.id ? "scale-125" : ""
                  }`}
                >
                  {done ? (
                    "✅"
                  ) : (
                    <span className="text-[11px] text-[#8A7A4E]">
                      {toArabicDigits(p)}/{toArabicDigits(g.target)}
                    </span>
                  )}
                </span>
              </div>
              {!done && g.target > 1 && (
                <div className="h-1 bg-[#E4DCC3] dark:bg-[#3A5148] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#1B4D3E] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {complete && (
        <p className="text-center text-xs font-bold text-[#1B4D3E] dark:text-[#8FD6C0] mt-3">
          أحسنت! أكملت هدفك اليوم 🏆
        </p>
      )}

      {!complete && y && y.count < y.total && (
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#E4DCC3] dark:border-[#3A5148]">
          <span className="text-[11px] text-[#8A7A4E]">
            هدف الأمس: {toArabicDigits(y.count)}/{toArabicDigits(y.total)}
          </span>
          <button
            onClick={onGoLesson}
            className="text-[11px] font-bold text-[#1B4D3E] dark:text-[#8FD6C0] bg-[#1B4D3E]/10 rounded-lg px-3 py-1.5"
          >
            أكمل اليوم ←
          </button>
        </div>
      )}
    </div>
  );
}
