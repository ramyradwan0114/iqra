import React, { useState } from "react";
import { useHifz } from "../hooks/useQuranJournal.js";
import { HIFZ_STEPS } from "../utils/db.js";
import { SHORT_SURAHS } from "../data/shortSurahs.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";
const PICKS = [112, 113, 114, 105, 106, 107];

const fmtDue = (ts) => {
  const days = Math.ceil((ts - Date.now()) / 864e5);
  if (days <= 0) return "المراجعة النهاردة";
  if (days === 1) return "بكرة";
  return `بعد ${days} يوم`;
};

// اختبار الحفظ: بنخفي الآيات ونطلب يكمّل، وبعدين يكشف ويحكم على نفسه.
// ده تقييم ذاتي عن قصد — مفيش تعرّف صوتي موثوق للتلاوة، والحكم الآلي
// الغلط هيحبط الحافظ.
function HifzTest({ item, onDone, onCancel }) {
  const s = SHORT_SURAHS[item.surah];
  const [revealed, setRevealed] = useState(false);
  const ayat = (s?.ayat || []).slice(item.from - 1, item.to);

  return (
    <div className="bg-[#FFFDF6] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-3xl p-6 flex flex-col gap-5">
      <div className="text-center">
        <div className="text-xs text-[#8A7A4E] mb-1">
          {s?.name} — من آية {item.from} لـ {item.to}
        </div>
        <div className="font-bold text-[#0F5C4C] dark:text-[#E7C873]">
          {revealed ? "قارن مع النص" : "اقرأ من حفظك"}
        </div>
      </div>

      <div
        dir="rtl"
        className="text-xl leading-loose text-center min-h-[6rem] flex items-center justify-center"
        style={{ fontFamily: QURAN_FONT }}
      >
        {revealed ? (
          <span className="text-[#1E2A24] dark:text-[#F6F1E4]">{ayat.join(" ۝ ")}</span>
        ) : (
          <span className="text-[#E4DCC3] dark:text-[#3A5148] select-none blur-sm">
            {ayat.join(" ۝ ")}
          </span>
        )}
      </div>

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="bg-[#0F5C4C] text-[#F6F1E4] px-6 py-3 rounded-xl font-bold mx-auto"
        >
          اكشف النص
        </button>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => onDone(true)}
            className="bg-[#0F5C4C] text-[#F6F1E4] px-6 py-3 rounded-xl font-bold text-sm"
          >
            ✓ قريتها صح
          </button>
          <button
            onClick={() => onDone(false)}
            className="border border-[#8A4E4E] text-[#8A4E4E] px-6 py-3 rounded-xl font-bold text-sm"
          >
            ✗ محتاج مراجعة
          </button>
        </div>
      )}

      <button onClick={onCancel} className="text-xs text-[#5B6B62] underline mx-auto">
        إلغاء
      </button>
    </div>
  );
}

export default function HifzMode({ toArabicDigits }) {
  const { items, due, add, review, remove } = useHifz();
  const [surah, setSurah] = useState(112);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [testing, setTesting] = useState(null);

  const max = SHORT_SURAHS[surah]?.ayat.length || 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#0F5C4C] dark:text-[#E7C873]">وضع المحفّظ</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          سجّل اللي حفظته، والتطبيق هيفكّرك تراجعه: يوم ← ٣ ← ٧ ← ١٤ ← ٣٠
        </p>
      </div>

      {testing ? (
        <HifzTest
          item={testing}
          onCancel={() => setTesting(null)}
          onDone={(passed) => {
            review(testing.id, passed);
            setTesting(null);
          }}
        />
      ) : (
        <>
          <div className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col gap-3">
            <div className="text-sm font-bold text-[#0F5C4C] dark:text-[#E7C873]">
              سجّل حفظ جديد
            </div>
            <div className="flex flex-wrap gap-2">
              {PICKS.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setSurah(id);
                    setFrom(1);
                    setTo(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    surah === id
                      ? "bg-[#E7C873] border-[#E7C873] text-[#1E2A24]"
                      : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                  }`}
                  style={{ fontFamily: QURAN_FONT }}
                >
                  {SHORT_SURAHS[id].name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                من آية
                <select
                  value={from}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFrom(v);
                    if (to < v) setTo(v);
                  }}
                  className="bg-[#FFFDF6] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-3 py-1.5"
                >
                  {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {toArabicDigits(n)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                لـ
                <select
                  value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                  className="bg-[#FFFDF6] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-3 py-1.5"
                >
                  {Array.from({ length: max }, (_, i) => i + 1)
                    .filter((n) => n >= from)
                    .map((n) => (
                      <option key={n} value={n}>
                        {toArabicDigits(n)}
                      </option>
                    ))}
                </select>
              </label>
              <button
                onClick={() => add(surah, from, to)}
                className="bg-[#0F5C4C] text-[#F6F1E4] px-5 py-2 rounded-xl font-bold text-sm"
              >
                سجّل الحفظ
              </button>
            </div>
          </div>

          {due.length > 0 && (
            <div className="bg-[#FBF3E2] border border-[#E7C873] rounded-2xl px-4 py-3 text-sm text-[#6B5A2E]">
              عندك {toArabicDigits(due.length)} مقطع محتاج مراجعة النهاردة 📌
            </div>
          )}

          {!items.length ? (
            <p className="text-sm text-[#5B6B62] py-8 text-center">
              مسجّلتش أي حفظ لسه — ابدأ بسورة قصيرة.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((it) => {
                const isDue = (it.nextReview || 0) <= Date.now();
                return (
                  <div
                    key={it.id}
                    className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
                      isDue
                        ? "bg-[#FBF3E2] border-[#E7C873]"
                        : "bg-[#FFFDF6] dark:bg-[#243830] border-[#E4DCC3] dark:border-[#3A5148]"
                    }`}
                  >
                    <div>
                      <div
                        className="font-bold text-[#1E2A24] dark:text-[#F6F1E4]"
                        style={{ fontFamily: QURAN_FONT }}
                      >
                        {SHORT_SURAHS[it.surah]?.name}
                      </div>
                      <div className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-0.5">
                        آية {toArabicDigits(it.from)} — {toArabicDigits(it.to)} ·{" "}
                        {fmtDue(it.nextReview)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5" title="مراحل التثبيت">
                        {HIFZ_STEPS.map((_, i) => (
                          <span
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i <= it.stage ? "bg-[#0F5C4C]" : "bg-[#E4DCC3]"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setTesting(it)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#0F5C4C] text-[#F6F1E4] font-semibold"
                      >
                        اختبرني
                      </button>
                      <button
                        onClick={() => remove(it.id)}
                        className="text-xs px-3 py-1.5 rounded-lg text-[#8A4E4E] border border-[#8A4E4E]/40"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
