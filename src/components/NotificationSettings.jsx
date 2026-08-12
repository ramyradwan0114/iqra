import React, { useState } from "react";
import {
  NOTIF_KINDS,
  DEFAULT_NOTIF_SETTINGS,
  notificationsSupported,
  permission,
  requestPermission,
  showNotification,
} from "../utils/notifications.js";

export default function NotificationSettings({ settings, onChange, toArabicDigits }) {
  const s = { ...DEFAULT_NOTIF_SETTINGS, ...(settings || {}) };
  const [perm, setPerm] = useState(() => permission());
  const supported = notificationsSupported();

  const ask = async () => {
    const p = await requestPermission();
    setPerm(p);
    if (p === "granted") onChange({ ...s, enabled: true });
  };

  const toggle = (key) => onChange({ ...s, [key]: !s[key] });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-[#0F5C4C] dark:text-[#E7C873]">التذكيرات</h3>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          تذكيرات محلية على الجهاز — من غير سيرفر ومن غير حسابات
        </p>
      </div>

      {!supported ? (
        <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
          المتصفح ده مابيدعمش الإشعارات.
        </p>
      ) : perm !== "granted" ? (
        <div className="bg-[#FBF3E2] border border-[#E7C873] rounded-2xl px-4 py-4 flex flex-col gap-3">
          <p className="text-sm text-[#6B5A2E]">
            {perm === "denied"
              ? "الإشعارات مرفوضة من إعدادات المتصفح — لازم تسمح بيها من إعدادات الموقع."
              : "محتاجين إذنك عشان نبعت التذكيرات."}
          </p>
          {perm !== "denied" && (
            <button
              onClick={ask}
              className="bg-[#0F5C4C] text-[#F6F1E4] px-5 py-2.5 rounded-xl font-bold text-sm self-start"
            >
              اسمح بالإشعارات
            </button>
          )}
        </div>
      ) : (
        <>
          <label className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
            <span className="font-semibold text-sm">تفعيل التذكيرات</span>
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={() => toggle("enabled")}
              className="w-5 h-5 accent-[#0F5C4C]"
            />
          </label>

          {s.enabled && (
            <>
              {Object.values(NOTIF_KINDS).map((k) => (
                <label
                  key={k.id}
                  className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3"
                >
                  <span>
                    <span className="font-semibold text-sm block">{k.label}</span>
                    <span className="text-[11px] text-[#5B6B62] dark:text-[#A9BDB2]">{k.desc}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!s[k.id]}
                    onChange={() => toggle(k.id)}
                    className="w-5 h-5 accent-[#0F5C4C]"
                  />
                </label>
              ))}

              {s.lesson && (
                <div className="flex items-center gap-3 bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
                  <span className="text-sm font-semibold">ميعاد الدرس</span>
                  <input
                    type="time"
                    value={`${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(":").map(Number);
                      onChange({ ...s, hour: h, minute: m });
                    }}
                    className="bg-[#FFFDF6] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              )}

              <button
                onClick={() =>
                  showNotification(NOTIF_KINDS.lesson.title, { body: "ده تذكير تجريبي ✅" })
                }
                className="text-xs text-[#0F5C4C] dark:text-[#8FD6C0] underline self-start"
              >
                جرّب تذكير دلوقتي
              </button>
            </>
          )}
        </>
      )}

      <div className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
        <strong>مهم تعرفه:</strong> المتصفحات مابتسمحش بجدولة إشعارات والتطبيق
        مقفول من غير سيرفر (خاصية الجدولة المحلية اتسحبت من المعايير). يعني:
        <br />• التطبيق مفتوح ووصل الميعاد → التذكير بيظهر في وقته.
        <br />• التطبيق كان مقفول → التذكير بيظهر <strong>أول ما تفتحه</strong> بعد
        الميعاد، مرة واحدة في اليوم.
        <br />
        عشان تذكير مضمون في ميعاده والتطبيق مقفول، محتاج Web Push بمفاتيح VAPID
        وكرون على السيرفر — ينفع ببلاش على Vercel، بس محتاج باك-إند.
      </div>
    </div>
  );
}
