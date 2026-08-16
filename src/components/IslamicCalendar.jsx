import React from "react";
import {
  toHijri,
  formatHijri,
  fmtGregorian,
  upcomingEvents,
  fastingDaysThisMonth,
  nextEvent,
} from "../utils/islamicCalendar.js";

export default function IslamicCalendar({ toArabicDigits }) {
  const today = new Date();
  const h = toHijri(today);
  const events = upcomingEvents(today, 5);
  const fasting = fastingDaysThisMonth(today);
  const soon = nextEvent(today);

  if (!h) {
    return (
      <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
        متصفحك مابيدعمش التقويم الهجري.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">التقويم الهجري</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">تقويم أم القرى</p>
      </div>

      {/* اليوم */}
      <div className="bg-[#1B4D3E] text-[#F5F0E8] rounded-3xl p-6 text-center">
        <div className="text-xs opacity-75 mb-1">النهاردة</div>
        <div className="text-3xl font-bold">{formatHijri(today)}</div>
        <div className="text-sm opacity-80 mt-2">{fmtGregorian(today)}</div>
      </div>

      {/* أقرب مناسبة */}
      {soon && (
        <div className="bg-[#FBF3E2] border border-[#D4A853] rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="text-2xl">{soon.icon}</span>
            <span>
              <span className="block font-bold text-sm text-[#6B5A2E]">{soon.name}</span>
              <span className="block text-[11px] text-[#8A7A4E]">
                {soon.inDays === 0
                  ? "النهاردة"
                  : soon.inDays === 1
                  ? "بكرة"
                  : `بعد ${toArabicDigits(soon.inDays)} يوم`}
              </span>
            </span>
          </span>
        </div>
      )}

      {/* المناسبات الجاية */}
      <div>
        <h3 className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mb-2">مناسبات جاية</h3>
        <div className="flex flex-col gap-1.5">
          {events.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] rounded-xl px-4 py-3"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-lg shrink-0">{e.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{e.name}</span>
                  <span className="block text-[11px] text-[#8A7A4E]">
                    {e.hijri.day} {e.hijri.monthName} · {fmtGregorian(e.gregorian)}
                  </span>
                </span>
              </span>
              <span className="text-xs text-[#8A7A4E] shrink-0">
                {e.inDays === 0 ? "النهاردة" : `${toArabicDigits(e.inDays)} يوم`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* الصيام */}
      <div>
        <h3 className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mb-2">
          صيام هذا الشهر ({h.monthName})
        </h3>
        <div className="flex flex-col gap-1.5">
          {fasting.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] rounded-xl px-4 py-2.5"
            >
              <span className="text-sm font-semibold">🌙 {f.label}</span>
              <span className="text-[11px] text-[#8A7A4E]">{f.note}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
        التواريخ حسابية بتقويم أم القرى وبتشتغل أوفلاين. بداية الشهر الهجري فيها
        خلاف بين الحساب والرؤية — <strong>ممكن تفرق يوم عن الرؤية في بلدك</strong>،
        فاعتمد على إعلان دار الإفتاء عندك في الصيام والعيد.
      </p>
    </div>
  );
}
