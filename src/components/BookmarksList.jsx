import React, { useEffect, useState, useCallback } from "react";
import { listBookmarks, removeBookmark } from "../utils/bookmarks.js";
import { SURAH_LIST, SURAH_NAMES } from "../data/surahList.js";

// ============================================================
//  علاماتي
// ------------------------------------------------------------
//  الملاحظة اللي بنّت الشاشة دي: «لما أحب أعرف أنا سايب علامة فين
//  ألاقيها؟». وضع علامة من غير مكان تشوف فيه كل علاماتك = ميزة نص.
//
//  العلامات القديمة اتحفظت من غير رقم صفحة (الحقل ده اتضاف بعدها)،
//  فبناخد صفحة السورة كتقريب — أحسن من إننا نعطّل الزر.
// ============================================================
export default function BookmarksList({ toArabicDigits, onOpen }) {
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    listBookmarks().then((r) => setRows(r || []));
  }, []);

  useEffect(() => load(), [load]);

  const drop = async (b) => {
    await removeBookmark(b.surah, b.ayah);
    load();
  };

  const pageOf = (b) =>
    b.page || SURAH_LIST.find((s) => s.id === b.surah)?.page || 1;

  if (rows === null) {
    return <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] py-10 text-center">…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">🔖 علاماتي</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          {rows.length
            ? `${toArabicDigits(rows.length)} علامة — الأحدث الأول`
            : "المواضع اللي وقفت عندها"}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="iqra-card p-8 text-center flex flex-col gap-3">
          <div className="text-3xl">📑</div>
          <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] leading-relaxed">
            لسه مافيش علامات. افتح <strong>المصحف</strong>، واضغط ضغطة طويلة على
            أي آية — أو دوس على رقمها — واختار «سجّل علامة هنا».
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((b) => (
            <div
              key={b.id}
              className="iqra-card p-4 flex items-center justify-between gap-3"
            >
              <button
                onClick={() => onOpen?.(pageOf(b), b.surah, b.ayah)}
                className="flex-1 text-right min-w-0"
              >
                <div className="font-bold text-sm text-[#1B4D3E] dark:text-[#D4A853] truncate">
                  سورة {SURAH_NAMES[b.surah] || b.surah} — الآية {toArabicDigits(b.ayah)}
                </div>
                <div className="text-[11px] text-[#8A7A4E] mt-0.5">
                  صفحة {toArabicDigits(pageOf(b))}
                  {b.at ? ` · ${new Date(b.at).toLocaleDateString("ar-EG")}` : ""}
                </div>
              </button>
              <button
                onClick={() => drop(b)}
                aria-label="احذف العلامة"
                title="احذف العلامة"
                className="shrink-0 text-[#8A4E4E] px-3 py-2 rounded-lg hover:bg-[#FBEDED]"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
