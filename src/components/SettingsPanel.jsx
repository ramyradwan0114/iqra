import React from "react";
import NotificationSettings from "./NotificationSettings.jsx";
import { DEFAULT_SALAWAT, INTERVAL_OPTIONS } from "../utils/reminders.js";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

export default function SettingsPanel({ settings, onChange, toArabicDigits }) {
  const dark = settings?.theme === "dark";
  const fontSize = settings?.fontSize ?? 2;
  const sal = { ...DEFAULT_SALAWAT, ...(settings?.salawat || {}) };

  return (
    <div className="flex flex-col gap-8">
      {/* المظهر */}
      <section className="flex flex-col gap-4">
        <h3 className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">المظهر</h3>

        <label className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
          <span>
            <span className="font-semibold text-sm block">الوضع الليلي</span>
            <span className="text-[11px] text-[#5B6B62] dark:text-[#A9BDB2]">
              ألوان غامقة أريح للعين في الإضاءة الخافتة
            </span>
          </span>
          <button
            onClick={() => onChange({ theme: dark ? "light" : "dark" })}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${
              dark ? "bg-[#1B4D3E]" : "bg-[#E4DCC3]"
            }`}
            aria-label="تبديل الوضع الليلي"
          >
            <span
              className={`block w-6 h-6 rounded-full bg-white grid place-items-center text-xs transition-transform ${
                dark ? "-translate-x-6" : "translate-x-0"
              }`}
            >
              {dark ? "🌙" : "☀️"}
            </span>
          </button>
        </label>

        <div className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">حجم خط المصحف</span>
            <span className="text-xs text-[#8A7A4E]">{fontSize.toFixed(1)}rem</span>
          </div>
          <input
            type="range"
            min="1.5"
            max="4"
            step="0.1"
            value={fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-full accent-[#1B4D3E]"
            aria-label="حجم خط المصحف"
          />
          <p
            dir="rtl"
            className="mt-3 text-center text-[#1E2A24] dark:text-[#F5F0E8] overflow-hidden"
            style={{ fontFamily: QURAN_FONT, fontSize: `${fontSize}rem`, lineHeight: 1.7 }}
          >
            بِسْمِ ٱللَّهِ
          </p>
        </div>
      </section>

      <div className="border-t border-[#E4DCC3] dark:border-[#3A5148]" />

      {/* الصلاة على النبي ﷺ */}
      <section className="flex flex-col gap-4">
        <h3 className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">الصلاة على النبي ﷺ</h3>

        <label className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
          <span>
            <span className="font-semibold text-sm block">تذكير دوري</span>
            <span className="text-[11px] text-[#5B6B62] dark:text-[#A9BDB2]">
              «صلِّ على النبي ﷺ» على فترات
            </span>
          </span>
          <input
            type="checkbox"
            checked={!!sal.enabled}
            onChange={() => onChange({ salawat: { ...sal, enabled: !sal.enabled } })}
            className="w-5 h-5 accent-[#1B4D3E]"
          />
        </label>

        {sal.enabled && (
          <>
            <div className="flex flex-wrap items-center gap-2 bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
              <span className="text-sm font-semibold ml-1">الفترة</span>
              {INTERVAL_OPTIONS.map((o) => (
                <button
                  key={o.hours}
                  onClick={() => onChange({ salawat: { ...sal, intervalHours: o.hours } })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    (sal.intervalHours || 1) === o.hours
                      ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                      : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
              التذكير بيتوقّف تلقائيًا من <strong>١٠ مساءً لـ ٨ صباحًا</strong> عشان
              ما يزعجكش بالليل. ولأن المتصفح مابيجدولش إشعارات والتطبيق مقفول،
              التذكير بيظهر <strong>جوّه التطبيق</strong> لما تفتحه لو الإشعار
              ماوصلش.
            </p>
          </>
        )}
      </section>

      <div className="border-t border-[#E4DCC3] dark:border-[#3A5148]" />

      <NotificationSettings
        settings={settings?.notifications}
        onChange={(n) => onChange({ notifications: n })}
        toArabicDigits={toArabicDigits}
      />

      {/* ختم البناء — مش زينة. لما نصلّح حاجة وتفضل ظاهرة، الرقم ده
          بيفرّق فورًا بين «الإصلاح مانفعش» و«الجهاز شغّال نسخة قديمة». */}
      <p className="text-[10px] text-[#A79E86] text-center pt-2" dir="ltr">
        build {typeof __IQRA_BUILD__ !== "undefined" ? __IQRA_BUILD__ : "dev"}
      </p>
    </div>
  );
}
