import React, { useState } from "react";
import { useLocation, usePrayerTimes } from "../hooks/usePrayerTimes.js";
import { PRAYERS, METHODS, MADHABS, CITIES, fmtTime, countdown } from "../utils/prayerTimes.js";

export default function PrayerTimes({ settings, onChange, toArabicDigits }) {
  const { loc, status, loaded, askGPS, pickCity } = useLocation();
  const method = settings?.prayerMethod || loc?.method || "Egyptian";
  const madhab = settings?.madhab || "Shafi";
  const { ready, times, next, current } = usePrayerTimes(loc, method, madhab);
  const [showSettings, setShowSettings] = useState(false);

  const two = (n) => String(n).padStart(2, "0");

  if (!loaded) return <p className="text-sm text-[#5B6B62] py-10 text-center">…</p>;

  // ---------- اختيار الموقع ----------
  if (!loc) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">مواقيت الصلاة</h2>
          <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
            محتاجين نعرف مكانك عشان نحسب المواقيت
          </p>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col gap-4">
          <button
            onClick={askGPS}
            disabled={status === "asking"}
            className="bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold"
          >
            {status === "asking" ? "بنحدّد موقعك…" : "📍 استخدم موقعي الحالي"}
          </button>

          {status === "denied" && (
            <p className="text-xs text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-2.5">
              مسمحتش بالموقع — عادي، اختار مدينتك من تحت.
            </p>
          )}
          {status === "unsupported" && (
            <p className="text-xs text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-2.5">
              الجهاز مابيدعمش تحديد الموقع — اختار مدينتك.
            </p>
          )}

          <div className="border-t border-[#E4DCC3] dark:border-[#3A5148] pt-4">
            <div className="text-xs text-[#8A7A4E] mb-2">أو اختار مدينتك</div>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickCity(c.id)}
                  className="px-3 py-1.5 rounded-lg text-sm border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] hover:border-[#1B4D3E]"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#8A7A4E] leading-relaxed">
            موقعك بيتحفظ على جهازك بس — <strong>مابيتبعتش لأي سيرفر</strong>، والمواقيت
            بتتحسب محليًا من غير إنترنت.
          </p>
        </div>
      </div>
    );
  }

  const c = next ? countdown(next.at) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">مواقيت الصلاة</h2>
          <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
            📍 {loc.name || "موقعك"}
            {loc.source === "gps" && " (GPS)"}
          </p>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
        >
          ⚙️ الإعدادات
        </button>
      </div>

      {/* العدّاد للصلاة الجاية */}
      {next && (
        <div className="bg-[#1B4D3E] text-[#F5F0E8] rounded-3xl p-6 text-center">
          <div className="text-xs opacity-75 mb-1">
            {next.tomorrow ? "أول صلاة بكرة" : "الصلاة الجاية"}
          </div>
          <div className="text-2xl font-bold mb-2">{next.label}</div>
          <div className="text-4xl font-bold tabular-nums tracking-wider" dir="ltr">
            {two(c.h)}:{two(c.m)}:{two(c.s)}
          </div>
          <div className="text-sm opacity-80 mt-2">{fmtTime(next.at)}</div>
        </div>
      )}

      {/* الجدول */}
      {ready && (
        <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl overflow-hidden">
          {PRAYERS.map((p) => {
            const isNext = next?.id === p.id && !p.notPrayer;
            const passed = current === p.id;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-5 py-3.5 border-b last:border-b-0 border-[#F1EAD6] dark:border-[#3A5148] ${
                  isNext ? "bg-[#1B4D3E]/10" : ""
                } ${p.notPrayer ? "opacity-60" : ""}`}
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">{p.icon}</span>
                  <span className={`font-semibold ${isNext ? "text-[#1B4D3E] dark:text-[#8FD6C0]" : ""}`}>
                    {p.label}
                  </span>
                  {passed && !p.notPrayer && <span className="text-xs text-[#8A7A4E]">✓</span>}
                </span>
                <span className={`tabular-nums ${isNext ? "font-bold text-[#1B4D3E] dark:text-[#8FD6C0]" : ""}`}>
                  {fmtTime(times[p.id])}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showSettings && (
        <div className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <div className="text-sm font-bold mb-2">طريقة الحساب</div>
            <select
              value={method}
              onChange={(e) => onChange({ prayerMethod: e.target.value })}
              className="w-full bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-3 py-2.5 text-sm"
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm font-bold mb-2">مذهب العصر</div>
            <div className="flex gap-2">
              {MADHABS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChange({ madhab: m.id })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                    madhab === m.id
                      ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                      : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-bold mb-2">تغيير الموقع</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={askGPS}
                className="px-3 py-1.5 rounded-lg text-xs border border-[#E4DCC3] dark:border-[#3A5148]"
              >
                📍 موقعي
              </button>
              {CITIES.map((x) => (
                <button
                  key={x.id}
                  onClick={() => pickCity(x.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    loc.name === x.name
                      ? "bg-[#D4A853] border-[#D4A853] text-[#1E2A24]"
                      : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                  }`}
                >
                  {x.name}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#8A7A4E] leading-relaxed">
            المواقيت محسوبة فلكيًا على جهازك (مكتبة adhan) — شغّالة أوفلاين بالكامل.
            لو فيه فرق دقيقة أو اتنين عن مسجد منطقتك، غيّر طريقة الحساب.
          </p>
        </div>
      )}
    </div>
  );
}
