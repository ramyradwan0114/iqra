import React, { useState, useEffect } from "react";
import { loadAyahTafsir, atLevel, TAFSIR_NAME } from "../utils/tafsir.js";
import { dayIndex } from "../utils/dailyQuiz.js";
import { SHORT_SURAHS } from "../data/shortSurahs.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

// مجموعة آيات قصيرة معروفة، نصّها مأخوذ حرفيًا من بيانات المشروع
// (data/shortSurahs.js) — مش مكتوب من الذاكرة.
// الاختيار حتمي حسب اليوم: نفس الآية طول اليوم، وبتتغيّر نص الليل.
function buildPool() {
  const pool = [];
  for (const [id, s] of Object.entries(SHORT_SURAHS)) {
    s.ayat.forEach((text, i) => {
      pool.push({ surah: Number(id), ayah: i + 1, text, surahName: s.name });
    });
  }
  return pool;
}

export function ayahOfTheDay(day = dayIndex()) {
  const pool = buildPool();
  if (!pool.length) return null;
  // خلط بسيط بالبذرة عشان الآيات ماتيجيش بالترتيب
  const idx = Math.abs((day * 2654435761) >>> 0) % pool.length;
  return pool[idx];
}

export default function AyahOfTheDay({ toArabicDigits, onOpenMushaf, compact }) {
  const pick = ayahOfTheDay();
  const [tafsir, setTafsir] = useState({ loading: true, text: null });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!pick) return;
    let alive = true;
    setTafsir({ loading: true, text: null });
    loadAyahTafsir(pick.surah, pick.ayah).then((r) => {
      if (alive) setTafsir({ loading: false, text: r.text });
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick?.surah, pick?.ayah]);

  if (!pick) return null;

  const view = tafsir.text ? atLevel(tafsir.text, expanded ? "full" : "short") : null;

  return (
    <div className="iqra-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853]">☀️ آية اليوم</span>
        <span className="text-[11px] text-[#8A7A4E]">
          {pick.surahName} · {toArabicDigits(pick.ayah)}
        </span>
      </div>

      <p
        dir="rtl"
        className="text-center leading-loose text-[#1E2A24] dark:text-[#F5F0E8] mb-3"
        style={{ fontFamily: QURAN_FONT, fontSize: compact ? "1.35rem" : "1.6rem" }}
      >
        {pick.text}
      </p>

      <div className="border-t border-[#E4DCC3] dark:border-[#3A5148] pt-3">
        {tafsir.loading ? (
          <p className="text-xs text-[#8A7A4E] text-center py-2">جاري تحميل التفسير…</p>
        ) : view ? (
          <>
            <p className="text-[13px] leading-relaxed text-[#5B6B62] dark:text-[#A9BDB2]">
              {view.text}
            </p>
            {view.truncated && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[11px] font-bold text-[#1B4D3E] dark:text-[#8FD6C0] mt-2"
              >
                التفسير كامل ↓
              </button>
            )}
            <p className="text-[10px] text-[#8A7A4E] mt-2">{TAFSIR_NAME}</p>
          </>
        ) : (
          <p className="text-xs text-[#8A7A4E] text-center py-1">
            التفسير محتاج اتصال أول مرة — وبعدها بيشتغل أوفلاين.
          </p>
        )}
      </div>

      {onOpenMushaf && (
        <button
          onClick={() => onOpenMushaf(pick.surah, pick.ayah)}
          className="w-full mt-3 text-xs font-bold text-[#1B4D3E] dark:text-[#8FD6C0] bg-[#1B4D3E]/8 rounded-xl py-2.5"
        >
          افتحها في المصحف ←
        </button>
      )}
    </div>
  );
}
