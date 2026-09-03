import React, { useState, useEffect } from "react";
import {
  loadAyahTafsir,
  atLevel,
  nextLevel,
  LEVELS,
  TAFSIRS,
  DEFAULT_TAFSIR_ID,
  tafsirById,
} from "../utils/tafsir.js";
import { getSettings, saveSettings } from "../utils/db.js";

export default function TafsirAccordion({ surah, ayah, toArabicDigits, onClose }) {
  const [state, setState] = useState({ loading: true, text: null, error: null, cached: false });
  const [level, setLevel] = useState("short");
  // اختيار التفسير بيتحفظ، فالمستخدم مايختارش من أول وجديد كل آية
  const [tafsirId, setTafsirId] = useState(DEFAULT_TAFSIR_ID);
  const [picker, setPicker] = useState(false);

  useEffect(() => {
    getSettings().then((v) => {
      if (v?.tafsirId) setTafsirId(Number(v.tafsirId));
    });
  }, []);

  const meta = tafsirById(tafsirId);

  const pick = (id) => {
    setTafsirId(id);
    setPicker(false);
    saveSettings({ tafsirId: id });
  };

  useEffect(() => {
    let alive = true;
    setState({ loading: true, text: null, error: null, cached: false });
    setLevel("short");
    loadAyahTafsir(surah, ayah, tafsirId).then((r) => {
      if (!alive) return;
      setState({ loading: false, text: r.text, error: r.error || null, cached: !!r.fromCache });
    });
    return () => {
      alive = false;
    };
  }, [surah, ayah, tafsirId]);

  const view = state.text ? atLevel(state.text, level) : null;
  const more = state.text ? nextLevel(level, state.text) : null;

  return (
    // خلفية رمادية فاتحة مختلفة عن لون الآية، وscroll جوّه الصندوق نفسه
    // مش على الصفحة كلها
    <span
      className="block my-3 rounded-2xl bg-[#f5f5f5] dark:bg-[#1A2520] border border-[#E4DCC3] dark:border-[#3A5148] overflow-hidden text-right"
      dir="rtl"
      style={{ fontSize: "1rem", lineHeight: 1.6 }}
    >
      <span className="flex items-center justify-between px-4 py-2.5 border-b border-[#E4DCC3] dark:border-[#3A5148] bg-[#efefef] dark:bg-[#16201C]">
        <button
          onClick={() => setPicker((v) => !v)}
          className="text-xs font-bold text-[#1B4D3E] dark:text-[#D4A853] text-right"
          title="غيّر التفسير"
        >
          📖 {meta.name} ▾ — آية {toArabicDigits(ayah)}
          {state.cached && <span className="font-normal text-[#8A7A4E]"> · محفوظ</span>}
        </button>
        <button
          onClick={onClose}
          className="text-[#5B6B62] dark:text-[#A9BDB2] text-xs font-semibold px-1"
          aria-label="إغلاق التفسير"
        >
          ✕
        </button>
      </span>

      {picker && (
        <span className="block px-3 py-2 border-b border-[#E4DCC3] dark:border-[#3A5148] bg-[#FBF8EF] dark:bg-[#1E2A24]">
          {TAFSIRS.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`block w-full text-right px-3 py-2 rounded-lg mb-1 ${
                t.id === tafsirId
                  ? "bg-[#1B4D3E] text-[#F5F0E8]"
                  : "hover:bg-[#FFFFFF] dark:hover:bg-[#243830]"
              }`}
            >
              <span className="block text-xs font-bold">{t.name}</span>
              <span
                className={`block text-[10px] ${
                  t.id === tafsirId ? "text-[#F5F0E8]/75" : "text-[#8A7A4E]"
                }`}
              >
                {t.hint} · {t.source}
              </span>
            </button>
          ))}
        </span>
      )}

      <span className="block px-4 py-3">
        {state.loading ? (
          <span className="block text-sm text-[#5B6B62] py-3 text-center">جاري التحميل…</span>
        ) : state.error || !state.text ? (
          <span className="block text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
            تعذّر تحميل التفسير. محتاج اتصال أول مرة لكل آية، وبعدها بيتحفظ
            ويشتغل أوفلاين.
          </span>
        ) : (
          <>
            <span
              className="block text-[15px] text-[#1E2A24] dark:text-[#F5F0E8] overflow-y-auto"
              style={{ maxHeight: "14rem", lineHeight: 1.9 }}
            >
              {view.text}
            </span>

            <span className="flex flex-wrap items-center gap-2 mt-3">
              {more && (
                <button
                  onClick={() => setLevel(more)}
                  className="text-xs font-bold text-[#1B4D3E] dark:text-[#8FD6C0] bg-[#1B4D3E]/10 rounded-lg px-3 py-1.5"
                >
                  {LEVELS[more].label} ↓
                </button>
              )}
              {level !== "short" && (
                <button
                  onClick={() => setLevel("short")}
                  className="text-xs font-semibold text-[#5B6B62] dark:text-[#A9BDB2] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-3 py-1.5"
                >
                  اختصر ↑
                </button>
              )}
              {view.truncated && (
                <span className="text-[11px] text-[#8A7A4E]">
                  {toArabicDigits(view.totalSentences)} جملة في الأصل
                </span>
              )}
            </span>

            <span className="block text-[10px] text-[#8A7A4E] mt-2.5 leading-relaxed">
              المصدر: {meta.source} — عبر Quran.com. الأزرار بتعرض <strong>أول سطور النص
              الأصلي</strong> — مفيش تلخيص ولا إعادة صياغة.
            </span>
          </>
        )}
      </span>
    </span>
  );
}
