import React from "react";
import { useLocation, usePrayerTimes } from "../hooks/usePrayerTimes.js";
import { fmtTime, countdown, PRAYERS } from "../utils/prayerTimes.js";
import { formatHijri, nextEvent } from "../utils/islamicCalendar.js";
import { viewStreak } from "../utils/streak.js";
import AyahOfTheDay from "./AyahOfTheDay.jsx";

const greet = () => {
  const h = new Date().getHours();
  if (h < 5) return "ليلة مباركة";
  if (h < 12) return "صباح الخير";
  if (h < 17) return "نهارك سعيد";
  if (h < 20) return "مساء الخير";
  return "مساء الخير";
};

function Card({ children, className = "" }) {
  return <div className={`iqra-card p-4 ${className}`}>{children}</div>;
}

export default function HomeScreen({
  name,
  streak,
  progress,
  audience,
  levels,
  levelId,
  onStartLesson,
  onGo,
  toArabicDigits,
  settings,
}) {
  const { loc } = useLocation();
  const { ready, times, next } = usePrayerTimes(
    loc,
    settings?.prayerMethod,
    settings?.madhab
  );
  const v = viewStreak(streak);
  const ev = nextEvent();

  const doneIds = progress?.[audience] || [];
  const total = levels?.length || 1;
  const pct = Math.round((doneIds.length / total) * 100);
  const current = levels?.find((l) => l.id === levelId);
  const c = next ? countdown(next.at) : null;
  const two = (n) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-col gap-4">
      {/* ترحيب */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-[#1B4D3E] dark:text-[#D4A853] truncate">
            {greet()}{name ? ` يا ${name}` : ""} 👋
          </h1>
          <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-0.5">
            {formatHijri()}
          </p>
        </div>
        {v.count > 0 && (
          <div className="shrink-0 text-center bg-[#D4A853]/20 rounded-2xl px-3 py-2">
            <div className="text-xl leading-none">{v.atRisk ? "🔥" : "🔥"}</div>
            <div className="text-sm font-bold text-[#8A7A4E]">{toArabicDigits(v.count)}</div>
          </div>
        )}
      </div>

      {/* تقدّمك */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853]">🎯 تقدّمك</span>
          <span className="text-xs text-[#8A7A4E]">
            {toArabicDigits(doneIds.length)}/{toArabicDigits(total)} مستويات
          </span>
        </div>
        <div className="h-2.5 bg-[#E4DCC3] dark:bg-[#3A5148] rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-[#1B4D3E] dark:bg-[#D4A853] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button
          onClick={onStartLesson}
          className="w-full bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold text-sm"
        >
          {doneIds.length ? "كمّل" : "ابدأ"}: {current?.title || "الدرس"}
        </button>
      </Card>

      {/* اختصارات */}
      <div className="grid grid-cols-2 gap-3">
        {[
          ["quran", "📖", "المصحف", "اقرأ واسمع"],
          ["qibla", "🧭", "القبلة", "اتجاه الكعبة"],
        ].map(([go, icon, title, sub]) => (
          <button key={go} onClick={() => onGo(go)} className="iqra-card p-4 text-right">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="font-bold text-sm">{title}</div>
            <div className="text-[11px] text-[#5B6B62] dark:text-[#A9BDB2]">{sub}</div>
          </button>
        ))}
      </div>

      {/* آية اليوم */}
      <AyahOfTheDay
        toArabicDigits={toArabicDigits}
        compact
        onOpenMushaf={(s, a) => onGo("quran", null, { surah: s, ayah: a })}
      />

      {/* الصلاة الجاية */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853]">🕌 الصلاة</span>
          <button
            onClick={() => onGo("more", "prayer")}
            className="text-[11px] text-[#8A7A4E] underline"
          >
            كل المواقيت
          </button>
        </div>

        {!loc ? (
          <button
            onClick={() => onGo("more", "prayer")}
            className="w-full text-sm text-[#5B6B62] dark:text-[#A9BDB2] py-3"
          >
            📍 حدّد موقعك عشان نعرض المواقيت
          </button>
        ) : ready && next ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold">{next.label}</span>
              <span className="text-2xl font-bold tabular-nums text-[#1B4D3E] dark:text-[#D4A853]" dir="ltr">
                {two(c.h)}:{two(c.m)}
              </span>
            </div>
            <div className="text-xs text-[#8A7A4E] mt-1">{fmtTime(next.at)}</div>
            <div className="flex justify-between mt-3 pt-3 border-t border-[#E4DCC3] dark:border-[#3A5148]">
              {PRAYERS.filter((p) => !p.notPrayer).map((p) => (
                <span key={p.id} className="text-center">
                  <span className="block text-[10px] text-[#8A7A4E]">{p.label}</span>
                  <span
                    className={`block text-[11px] tabular-nums ${
                      next.id === p.id ? "font-bold text-[#1B4D3E] dark:text-[#D4A853]" : ""
                    }`}
                  >
                    {fmtTime(times[p.id])}
                  </span>
                </span>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      {/* مناسبة قريبة */}
      {ev && ev.inDays <= 45 && (
        <Card className="flex items-center gap-3">
          <span className="text-2xl">{ev.icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold truncate">{ev.name}</span>
            <span className="block text-[11px] text-[#8A7A4E]">
              {ev.inDays === 0
                ? "النهاردة"
                : ev.inDays === 1
                ? "بكرة"
                : `بعد ${toArabicDigits(ev.inDays)} يوم`}
            </span>
          </span>
        </Card>
      )}
    </div>
  );
}
