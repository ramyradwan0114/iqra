import React, { useState, useEffect, useCallback } from "react";
import { ADHKAR, loadTasbih, saveTasbih, bump, resetDhikr } from "../utils/reminders.js";
import { buzz } from "../hooks/useProgress.js";

export default function TasbihCounter({ toArabicDigits, onChange, onToast }) {
  const [state, setState] = useState(null);
  const [flash, setFlash] = useState(null); // { id, n }
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadTasbih().then((s) => {
      setState(s);
      onChange?.(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = useCallback(
    (id) => {
      setState((prev) => {
        if (!prev) return prev;
        const { state: next, milestone } = bump(prev, id);
        saveTasbih(next);
        onChange?.(next);

        if (milestone) {
          buzz([40, 60, 40]);
          onToast?.(`أحسنت! ${toArabicDigits(milestone)} ${milestone === 100 ? "🏆" : "✨"}`);
        } else {
          buzz(12);
        }
        setFlash({ id, n: next.counts[id] });
        setTimeout(() => setFlash(null), 220);
        return next;
      });
    },
    [onChange, onToast, toArabicDigits]
  );

  if (!state) return null;

  const total = ADHKAR.reduce((n, a) => n + (state.counts[a.id] || 0), 0);

  return (
    <div className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl overflow-hidden mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[#0F5C4C] dark:text-[#E7C873]">
          📿 عدّاد التسبيح
          {total > 0 && (
            <span className="text-xs font-normal text-[#8A7A4E]">
              {toArabicDigits(total)} النهاردة
            </span>
          )}
        </span>
        <span className="text-[#5B6B62] dark:text-[#A9BDB2] text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-2">
          {ADHKAR.map((a) => {
            const n = state.counts[a.id] || 0;
            const isFlash = flash?.id === a.id;
            return (
              <div key={a.id} className="relative">
                <button
                  onClick={() => tap(a.id)}
                  className={`w-full rounded-2xl px-3 py-4 text-center border transition-transform active:scale-95 ${
                    isFlash ? "scale-95" : ""
                  } bg-[#FFFDF6] dark:bg-[#1E2A24] border-[#E4DCC3] dark:border-[#3A5148]`}
                  style={{ borderColor: n > 0 ? a.color : undefined }}
                >
                  <span
                    className="block text-[0.95rem] font-bold mb-1.5 leading-tight"
                    style={{ color: a.color }}
                  >
                    {a.text}
                  </span>
                  <span className="block text-2xl font-bold text-[#1E2A24] dark:text-[#F6F1E4]">
                    {toArabicDigits(n)}
                  </span>
                </button>
                {n > 0 && (
                  <button
                    onClick={() => {
                      const next = resetDhikr(state, a.id);
                      setState(next);
                      saveTasbih(next);
                      onChange?.(next);
                    }}
                    className="absolute top-1.5 left-1.5 text-[10px] text-[#A79E86] px-1.5 py-0.5 rounded"
                    aria-label="تصفير"
                    title="تصفير"
                  >
                    ↺
                  </button>
                )}
              </div>
            );
          })}
          <p className="col-span-2 text-[10px] text-[#8A7A4E] text-center mt-1">
            العدّاد بيتصفّر نص الليل، والإجمالي العمري محفوظ.
          </p>
        </div>
      )}
    </div>
  );
}
