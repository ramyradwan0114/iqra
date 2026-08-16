import React from "react";

export const NAV_ITEMS = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "quran", label: "قرآن", icon: "📖" },
  { id: "learn", label: "تعلم", icon: "📚" },
  { id: "qibla", label: "قبلة", icon: "🧭" },
  { id: "more", label: "المزيد", icon: "⚙️" },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-[#243830] border-t border-[#E4DCC3] dark:border-[#3A5148]"
      // safe-area عشان الآيفونات اللي فيها شريط منزلق تحت
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="التنقّل الرئيسي"
    >
      <div className="max-w-3xl mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-current={active ? "page" : undefined}
              // ارتفاع ٤.٢٥rem ولمسة كاملة العرض — الحد الأدنى المريح
              // للإصبع على الموبايل (٤٤px+)
              className="flex-1 h-[4.25rem] flex flex-col items-center justify-center gap-1 relative transition-colors"
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[#1B4D3E] dark:bg-[#D4A853]" />
              )}
              <span
                className={`text-xl leading-none transition-transform ${
                  active ? "scale-110" : "opacity-55"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`text-[11px] font-semibold ${
                  active
                    ? "text-[#1B4D3E] dark:text-[#D4A853]"
                    : "text-[#5B6B62] dark:text-[#A9BDB2]"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
