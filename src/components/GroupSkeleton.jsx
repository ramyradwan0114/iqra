import React from "react";

// هيكل تحميل بتأثير shimmer.
// ملاحظة: الأبعاد مقصودة إنها تشبه الكارت الحقيقي عشان الصفحة ماتنطّش
// (layout shift) لما البيانات توصل.
function Shimmer({ className = "" }) {
  return (
    <span
      className={`block rounded-lg bg-[#E4DCC3] dark:bg-[#3A5148] relative overflow-hidden ${className}`}
    >
      <span className="absolute inset-0 iqra-shimmer" />
    </span>
  );
}

export default function GroupSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="جاري التحميل">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <span className="flex-1 min-w-0">
            <Shimmer className="h-4 w-32 mb-2" />
            <Shimmer className="h-3 w-44" />
          </span>
          <Shimmer className="h-6 w-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
