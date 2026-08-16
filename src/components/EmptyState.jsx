import React from "react";

// مكوّن عام لكل الشاشات الفاضية أو اللي فيها خطأ.
// القاعدة: كل حالة فاضية لازم تقول للمستخدم **يعمل إيه دلوقتي**،
// مش تسيبه قدام شاشة بيضا.
export default function EmptyState({
  icon = "📭",
  title,
  desc,
  action,
  actionLabel,
  secondary,
  secondaryLabel,
  tone = "neutral", // neutral | error | info
}) {
  const tones = {
    neutral: "bg-[#FBF8EF] dark:bg-[#243830] border-[#E4DCC3] dark:border-[#3A5148]",
    error: "bg-[#FBEDED] border-[#8A4E4E]/40",
    info: "bg-[#FBF3E2] border-[#D4A853]",
  };

  return (
    <div
      className={`rounded-2xl border ${tones[tone]} px-6 py-10 flex flex-col items-center text-center gap-3`}
    >
      <div className="text-4xl">{icon}</div>
      <h3
        className={`font-bold ${
          tone === "error" ? "text-[#8A4E4E]" : "text-[#1B4D3E] dark:text-[#D4A853]"
        }`}
      >
        {title}
      </h3>
      {desc && (
        <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] max-w-xs leading-relaxed">{desc}</p>
      )}
      {(action || secondary) && (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {action && (
            <button
              onClick={action}
              className="bg-[#1B4D3E] text-[#F5F0E8] px-6 py-2.5 rounded-xl font-bold text-sm"
            >
              {actionLabel}
            </button>
          )}
          {secondary && (
            <button
              onClick={secondary}
              className="border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] px-6 py-2.5 rounded-xl font-bold text-sm"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
