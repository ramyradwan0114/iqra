import React from "react";
import NotificationSettings from "./NotificationSettings.jsx";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

export default function SettingsPanel({ settings, onChange, toArabicDigits }) {
  const dark = settings?.theme === "dark";
  const fontSize = settings?.fontSize ?? 2;

  return (
    <div className="flex flex-col gap-8">
      {/* المظهر */}
      <section className="flex flex-col gap-4">
        <h3 className="font-bold text-[#0F5C4C] dark:text-[#E7C873]">المظهر</h3>

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
              dark ? "bg-[#0F5C4C]" : "bg-[#E4DCC3]"
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
            className="w-full accent-[#0F5C4C]"
            aria-label="حجم خط المصحف"
          />
          <p
            dir="rtl"
            className="mt-3 text-center text-[#1E2A24] dark:text-[#F6F1E4] overflow-hidden"
            style={{ fontFamily: QURAN_FONT, fontSize: `${fontSize}rem`, lineHeight: 1.7 }}
          >
            بِسْمِ ٱللَّهِ
          </p>
        </div>
      </section>

      <div className="border-t border-[#E4DCC3] dark:border-[#3A5148]" />

      <NotificationSettings
        settings={settings?.notifications}
        onChange={(n) => onChange({ notifications: n })}
        toArabicDigits={toArabicDigits}
      />
    </div>
  );
}
