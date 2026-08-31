import React, { useEffect, useState, useCallback, useRef } from "react";
import { loadPage, clampPage, TOTAL_PAGES } from "../utils/mushafPage.js";
import { toggleBookmark, bookmarksForSurah, listBookmarks } from "../utils/bookmarks.js";
import { SURAH_LIST, JUZ_START_PAGE, surahAtPage } from "../data/surahList.js";
import TafsirAccordion from "./TafsirAccordion.jsx";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

// ============================================================
//  مصحف المدينة — صفحة بصفحة
// ------------------------------------------------------------
//  التنقّل: بالسورة، بالجزء، أو برقم الصفحة. أرقام الصفحات مثبّتة
//  في data/surahList.js فالتنقّل بيشتغل أوفلاين من غير أي طلب.
//
//  العلامة: ضغطة طويلة على رقم الآية. نوع واحد بس — الفئات الأربعة
//  القديمة اتشالت لأن حد متمرّس مالقاش الزر أصلًا، وأربع فئات كانت
//  قرار زيادة على حاجة المفروض تكون ضغطة.
// ============================================================

function AyahSheet({ target, marked, onClose, onToggle, onTafsir, onCopy }) {
  if (!target) return null;
  const items = [
    {
      id: "mark",
      icon: marked ? "🔖" : "📑",
      label: marked ? "شيل العلامة" : "سجّل علامة هنا",
      act: onToggle,
    },
    { id: "tafsir", icon: "📖", label: "تفسير الآية", act: onTafsir },
    { id: "copy", icon: "📋", label: "انسخ الآية", act: onCopy },
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-[#1E2A24]/40" />
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full bg-[#FFFFFF] dark:bg-[#243830] rounded-t-3xl border-t border-[#E4DCC3] dark:border-[#3A5148] p-5 pb-8"
      >
        <div className="w-10 h-1 rounded-full bg-[#E4DCC3] dark:bg-[#3A5148] mx-auto mb-4" />
        <div className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mb-3">
          {target.surahName} · الآية {target.ayah}
        </div>
        <div className="flex flex-col gap-1">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={it.act}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-right hover:bg-[#FBF8EF] dark:hover:bg-[#1E2A24]"
            >
              <span className="text-xl w-7">{it.icon}</span>
              <span className="text-sm font-semibold">{it.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MushafPage({
  page: pageProp = 1,
  onPageChange,
  toArabicDigits,
  onTafsir,
  fontSize = 1.75,
}) {
  const [page, setPage] = useState(clampPage(pageProp));
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading");
  const [marks, setMarks] = useState({});
  const [sheet, setSheet] = useState(null);
  // التفسير بيتعرض جوّه المكوّن ده — كان معتمد على prop اسمها onTafsir
  // الأب مابيمرّرهاش أصلًا، فالزر كان بيتدوس ومايحصلش حاجة.
  const [tafsirFor, setTafsirFor] = useState(null); // { surah, ayah }
  const [marksOpen, setMarksOpen] = useState(false);
  const [allMarks, setAllMarks] = useState([]);
  const holdRef = useRef(null);
  const tafsirRef = useRef(null);

  // قائمة كل العلامات — بتتحدّث كل ما نضيف أو نشيل واحدة
  const refreshAll = useCallback(() => {
    listBookmarks().then((r) => setAllMarks(r || []));
  }, []);
  useEffect(() => refreshAll(), [refreshAll, marks]);

  // التفسير بيتعرض فوق الصفحة. لو المستخدم كان نازل في نص الصفحة
  // وفتح تفسير آية، التفسير بيتفتح فوق **برّه الشاشة** — فيبان
  // كأن الزر مش شغّال. فبننزّل الشاشة عليه.
  useEffect(() => {
    if (!tafsirFor) return;
    const t = setTimeout(() => {
      tafsirRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => clearTimeout(t);
  }, [tafsirFor]);

  useEffect(() => setPage(clampPage(pageProp)), [pageProp]);

  useEffect(() => {
    let alive = true;
    setState("loading");
    setData(null);
    loadPage(page).then((d) => {
      if (!alive) return;
      setData(d);
      setState(d ? "ready" : "failed");
    });
    return () => {
      alive = false;
    };
  }, [page]);

  useEffect(() => {
    if (!data?.ayat?.length) return;
    let alive = true;
    const surahs = [...new Set(data.ayat.map((a) => a.surah))];
    Promise.all(surahs.map((s) => bookmarksForSurah(s).then((m) => [s, m]))).then((rows) => {
      if (!alive) return;
      const merged = {};
      for (const [s, m] of rows)
        for (const ayah of Object.keys(m || {})) merged[`${s}:${ayah}`] = true;
      setMarks(merged);
    });
    return () => {
      alive = false;
    };
  }, [data]);

  const go = useCallback(
    (n) => {
      const p = clampPage(n);
      setPage(p);
      onPageChange?.(p);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [onPageChange]
  );

  const surahOf = useCallback(
    (ayah) => data?.ayat.find((a) => a.ayah === ayah)?.surah ?? null,
    [data]
  );

  const openSheet = (ayah) => {
    const surah = surahOf(ayah);
    if (!surah) return;
    const meta = SURAH_LIST.find((s) => s.id === surah);
    setSheet({ ayah, surah, surahName: meta?.name || "" });
  };

  const startHold = (ayah) => {
    holdRef.current = setTimeout(() => openSheet(ayah), 450);
  };
  const cancelHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current);
    holdRef.current = null;
  };

  const doToggle = async () => {
    if (!sheet) return;
    const row = await toggleBookmark(sheet.surah, sheet.ayah, { page });
    setMarks((m) => {
      const c = { ...m };
      const k = `${sheet.surah}:${sheet.ayah}`;
      if (row) c[k] = true;
      else delete c[k];
      return c;
    });
    setSheet(null);
    refreshAll();
  };

  const here = surahAtPage(page);

  const Nav = ({ compact }) => (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={() => go(page + 1)}
        disabled={page >= TOTAL_PAGES}
        className={`rounded-xl font-bold border border-[#E4DCC3] dark:border-[#3A5148] disabled:opacity-40 ${
          compact ? "px-3 py-1.5 text-xs" : "px-5 py-3 text-sm flex-1"
        }`}
      >
        التالية ←
      </button>
      <label className="flex items-center gap-2 text-xs text-[#8A7A4E] shrink-0">
        <input
          type="number"
          min={1}
          max={TOTAL_PAGES}
          value={page}
          onChange={(e) => go(e.target.value)}
          className="w-16 text-center bg-[#FBF8EF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg py-1"
        />
        / {toArabicDigits(TOTAL_PAGES)}
      </label>
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className={`rounded-xl font-bold border border-[#E4DCC3] dark:border-[#3A5148] disabled:opacity-40 ${
          compact ? "px-3 py-1.5 text-xs" : "px-5 py-3 text-sm flex-1"
        }`}
      >
        → السابقة
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* التنقّل بالسورة والجزء */}
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="block text-[11px] text-[#8A7A4E] mb-1">السورة</span>
          <select
            value={here.id}
            onChange={(e) => {
              const s = SURAH_LIST.find((x) => x.id === Number(e.target.value));
              if (s) go(s.page);
            }}
            className="w-full bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-3 py-2.5 text-sm"
          >
            {SURAH_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {toArabicDigits(s.id)} · {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="w-28">
          <span className="block text-[11px] text-[#8A7A4E] mb-1">الجزء</span>
          <select
            value={data?.juz || ""}
            onChange={(e) => go(JUZ_START_PAGE[Number(e.target.value) - 1])}
            className="w-full bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-3 py-2.5 text-sm"
          >
            {!data?.juz && <option value="">—</option>}
            {JUZ_START_PAGE.map((_, i) => (
              <option key={i} value={i + 1}>
                {toArabicDigits(i + 1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* علاماتي — جوّه المصحف نفسه. كانت في «المزيد» بس، يعني عشان
          ترجع لعلامة كنت لازم تسيب المصحف وتدوّر عليها. */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMarksOpen((v) => !v)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            marksOpen
              ? "bg-[#D4A853] border-[#D4A853] text-[#1E2A24]"
              : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          }`}
        >
          🔖 علاماتي ({toArabicDigits(allMarks.length)})
        </button>
        {allMarks.length > 0 && (
          <button
            onClick={() => go(allMarks[0].page || SURAH_LIST.find((x) => x.id === allMarks[0].surah)?.page || 1)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          >
            ↩︎ آخر علامة
          </button>
        )}
      </div>

      {marksOpen && (
        <div className="iqra-card p-4 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {allMarks.length === 0 ? (
            <p className="text-xs text-[#8A7A4E] text-center py-3">
              لسه مافيش علامات — اضغط ضغطة طويلة على أي آية واختار «سجّل علامة هنا».
            </p>
          ) : (
            allMarks.map((b) => {
              const pg = b.page || SURAH_LIST.find((x) => x.id === b.surah)?.page || 1;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    go(pg);
                    setMarksOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-right ${
                    pg === page ? "bg-[#D4A853]/20" : "hover:bg-[#FBF8EF] dark:hover:bg-[#1E2A24]"
                  }`}
                >
                  <span className="text-sm font-semibold truncate">
                    {SURAH_LIST.find((x) => x.id === b.surah)?.name} — آية{" "}
                    {toArabicDigits(b.ayah)}
                  </span>
                  <span className="text-[11px] text-[#8A7A4E] shrink-0">
                    ص {toArabicDigits(pg)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      <Nav compact />

      {/* التفسير */}
      {tafsirFor && (
        <div ref={tafsirRef} className="iqra-card p-4 ring-2 ring-[#D4A853]">
          <TafsirAccordion
            surah={tafsirFor.surah}
            ayah={tafsirFor.ayah}
            toArabicDigits={toArabicDigits}
            onClose={() => setTafsirFor(null)}
          />
        </div>
      )}

      <div className="iqra-card p-5 sm:p-7">
        {state === "loading" && (
          <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] py-16 text-center">
            جاري تحميل الصفحة…
          </p>
        )}

        {state === "failed" && (
          <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
            تعذّر تحميل الصفحة — محتاج اتصال أول مرة، وبعدها بتشتغل أوفلاين.
          </p>
        )}

        {state === "ready" && data && (
          <div dir="rtl" style={{ fontFamily: QURAN_FONT }}>
            {data.lines.map(({ line, words }) => {
              const opener = words.find((w) => w.startsSurah);
              const openMeta = opener
                ? SURAH_LIST.find((s) => s.id === opener.surahId)
                : null;
              return (
                <React.Fragment key={line}>
                  {openMeta && (
                    <div className="my-4 py-2 border-y-2 border-[#D4A853] text-center text-[#1B4D3E] dark:text-[#D4A853]">
                      <div className="text-sm font-bold">سورة {openMeta.name}</div>
                      {/* التوبة مفيهاش بسملة، والفاتحة البسملة آية منها */}
                      {openMeta.bismillah && <div className="text-lg mt-1">﷽</div>}
                    </div>
                  )}
                  <div
                    className="text-[#1E2A24] dark:text-[#F5F0E8] select-none"
                    style={{
                      textAlign: "justify",
                      textAlignLast: "justify",
                      fontSize: `${fontSize}rem`,
                      lineHeight: 2.1,
                    }}
                  >
                    {words.map((w, i) => {
                      const mk = marks[`${surahOf(w.ayah)}:${w.ayah}`];
                      if (w.isEnd) {
                        return (
                          <span
                            key={i}
                            onPointerDown={() => startHold(w.ayah)}
                            onPointerUp={cancelHold}
                            onPointerLeave={cancelHold}
                            onPointerCancel={cancelHold}
                            onClick={() => openSheet(w.ayah)}
                            className="cursor-pointer mx-0.5"
                            style={{ color: mk ? "#D4A853" : "#1B4D3E" }}
                            title="دوس على رقم الآية لخياراتها"
                          >
                            {mk && "🔖"}۝{toArabicDigits(w.ayah)}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={i}
                          onPointerDown={() => startHold(w.ayah)}
                          onPointerUp={cancelHold}
                          onPointerLeave={cancelHold}
                          onPointerCancel={cancelHold}
                          style={
                            mk
                              ? { backgroundColor: "#D4A85333", borderRadius: "0.25rem" }
                              : undefined
                          }
                        >
                          {w.text}{" "}
                        </span>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}

            <div className="mt-6 pt-3 border-t border-[#E4DCC3] dark:border-[#3A5148] flex justify-between text-[11px] text-[#8A7A4E]">
              <span>{data.juz ? `الجزء ${toArabicDigits(data.juz)}` : ""}</span>
              <span>صفحة {toArabicDigits(page)}</span>
            </div>
          </div>
        )}
      </div>

      {state === "ready" && <Nav />}

      <p className="text-[11px] text-[#8A7A4E] leading-relaxed">
        فواصل الصفحات والأسطر مطابقة لمصحف المدينة تمامًا — صفحة {toArabicDigits(page)} هنا
        هي صفحة {toArabicDigits(page)} في المصحف المطبوع.
        <strong> شكل الحروف بخط أميري مش رسم المجمع.</strong> اضغط ضغطة طويلة على أي
        آية — أو دوس على رقمها — تفتحلك خياراتها.
      </p>

      <AyahSheet
        target={sheet}
        marked={sheet ? !!marks[`${sheet.surah}:${sheet.ayah}`] : false}
        onClose={() => setSheet(null)}
        onToggle={doToggle}
        onTafsir={() => {
          setTafsirFor({ surah: sheet.surah, ayah: sheet.ayah });
          setSheet(null);
        }}
        onCopy={() => {
          const txt = (data?.lines || [])
            .flatMap((l) => l.words)
            .filter((w) => w.ayah === sheet.ayah && !w.isEnd)
            .map((w) => w.text)
            .join(" ");
          navigator.clipboard?.writeText(txt).catch(() => {});
          setSheet(null);
        }}
      />
    </div>
  );
}
