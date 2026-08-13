import React, { useState } from "react";
import { viewStreak, reachedMilestones, nextMilestone, MILESTONES } from "../utils/streak.js";

export default function StreakBadge({ streak, toArabicDigits }) {
  const [open, setOpen] = useState(false);
  const v = viewStreak(streak);
  const earned = reachedMilestones(v.count);
  const next = nextMilestone(v.count);

  const dayWord = (n) => (n === 1 ? "يوم" : n === 2 ? "يومين" : "أيام");

  if (!v.count) {
    return (
      <span className="text-[11px] text-[#A79E86] whitespace-nowrap" title="ابدأ درس النهاردة">
        🔥 ابدأ سلسلتك
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`text-sm font-bold whitespace-nowrap transition-colors ${
          v.atRisk ? "text-[#8A4E4E]" : "text-[#8A7A4E] dark:text-[#E7C873]"
        }`}
        title={v.atRisk ? "سلسلتك في خطر — اقرأ النهاردة" : "سلسلة أيام التعلّم"}
      >
        <span className={v.atRisk ? "opacity-50" : ""}>🔥</span> {toArabicDigits(v.count)}{" "}
        {dayWord(v.count)}
        {earned.length > 0 && (
          <span className="ml-1">{earned.map((m) => m.icon).join("")}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-[#1E2A24]/50 z-[70] flex items-center justify-center p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#FFFDF6] dark:bg-[#243830] rounded-3xl border border-[#E4DCC3] dark:border-[#3A5148] max-w-sm w-full p-7 text-center"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="text-5xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-[#0F5C4C] dark:text-[#E7C873]">
              {toArabicDigits(v.count)} {dayWord(v.count)}
            </div>
            {streak?.best > v.count && (
              <div className="text-xs text-[#8A7A4E] mt-1">
                أطول سلسلة: {toArabicDigits(streak.best)} {dayWord(streak.best)}
              </div>
            )}

            {v.atRisk && (
              <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3 mt-4">
                ما قرأتش من إمبارح! افتح أي درس النهاردة عشان السلسلة ماتتكسرش.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {MILESTONES.map((m) => {
                const got = v.count >= m.days;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${
                      got
                        ? m.gold
                          ? "bg-[#FBF3E2] border-[#E7C873]"
                          : "bg-[#0F5C4C]/10 border-[#0F5C4C]/30"
                        : "bg-[#FBF8EF] dark:bg-[#1E2A24] border-[#E4DCC3] dark:border-[#3A5148] opacity-60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-2xl">{got ? m.icon : "🔒"}</span>
                      <span className="text-sm font-semibold">{m.label}</span>
                    </span>
                    <span className="text-xs text-[#8A7A4E]">
                      {toArabicDigits(m.days)} {dayWord(m.days)}
                    </span>
                  </div>
                );
              })}
            </div>

            {next && (
              <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-4">
                فاضل {toArabicDigits(next.days - v.count)} {dayWord(next.days - v.count)} على{" "}
                {next.label}
              </p>
            )}

            <button
              onClick={() => setOpen(false)}
              className="mt-5 bg-[#0F5C4C] text-[#F6F1E4] px-7 py-2.5 rounded-xl font-bold text-sm"
            >
              تمام
            </button>
          </div>
        </div>
      )}
    </>
  );
}
