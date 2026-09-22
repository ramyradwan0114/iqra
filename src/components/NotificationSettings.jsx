import React, { useState, useEffect } from "react";
import {
  NOTIF_KINDS,
  DEFAULT_NOTIF_SETTINGS,
  notificationsSupported,
  permission,
  requestPermission,
  showNotification,
} from "../utils/notifications.js";
import { isNative, testDhikr, testNotification } from "../utils/nativeReminders.js";
import { requestPermission as askNativePerm } from "../utils/nativeAthan.js";
import { inTesterWindow } from "../utils/testerMode.js";

export default function NotificationSettings({ settings, onChange, toArabicDigits }) {
  const s = { ...DEFAULT_NOTIF_SETTINGS, ...(settings || {}) };
  const [perm, setPerm] = useState(() => permission());
  const supported = notificationsSupported();

  // على التطبيق الأصلي القيود اللي مكتوبة تحت مابتنطبقش — النظام
  // نفسه بيجدول. عرض تحذير مش صحيح أسوأ من عدم عرض أي حاجة.
  const [native, setNative] = useState(false);
  const [tested, setTested] = useState(null); // soon | sent | failed
  useEffect(() => {
    isNative().then(async (n) => {
      setNative(n);
      // ⚠️ WebView بتاع أندرويد **مافيهوش** window.Notification خالص.
      // فـ notificationsSupported() بترجّع false جوّه التطبيق الأصلي،
      // وكانت بتخبّي كل مفاتيح التذكيرات وتكتب «المتصفح ده مابيدعمش
      // الإشعارات» — على تطبيق إشعاراته شغّالة فعلًا وبتأذّن.
      // الإذن الحقيقي هنا بيتاخد من النظام مش من المتصفّح.
      if (n) setPerm(await askNativePerm());
    });
  }, []);

  // على الأصلي بنتجاهل فحص المتصفّح تمامًا
  const usable = native || supported;

  const ask = async () => {
    const p = native ? await askNativePerm() : await requestPermission();
    setPerm(p);
    if (p === "granted") onChange({ ...s, enabled: true });
  };

  const toggle = (key) => onChange({ ...s, [key]: !s[key] });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">التذكيرات</h3>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          تذكيرات محلية على الجهاز — من غير سيرفر ومن غير حسابات
        </p>
      </div>

      {!usable ? (
        <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3">
          المتصفح ده مابيدعمش الإشعارات.
        </p>
      ) : perm !== "granted" ? (
        <div className="bg-[#FBF3E2] border border-[#D4A853] rounded-2xl px-4 py-4 flex flex-col gap-3">
          <p className="text-sm text-[#6B5A2E]">
            {perm === "denied"
              ? "الإشعارات مرفوضة من إعدادات المتصفح — لازم تسمح بيها من إعدادات الموقع."
              : "محتاجين إذنك عشان نبعت التذكيرات."}
          </p>
          {perm !== "denied" && (
            <button
              onClick={ask}
              className="bg-[#1B4D3E] text-[#F5F0E8] px-5 py-2.5 rounded-xl font-bold text-sm self-start"
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
              className="w-5 h-5 accent-[#1B4D3E]"
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
                    className="w-5 h-5 accent-[#1B4D3E]"
                  />
                </label>
              ))}

              {/* تذكير التسبيح — كل إشعار بذِكر مختلف بالتناوب */}
              <label className="flex items-center justify-between bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
                <span>
                  <span className="font-semibold text-sm block">تذكير بالتسبيح</span>
                  <span className="text-[11px] text-[#5B6B62] dark:text-[#A9BDB2]">
                    الذِّكر نفسه مكتوب في الإشعار — تقراه وتسبّح من غير ما تفتح
                    التطبيق
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={!!s.tasbih}
                  onChange={() => toggle("tasbih")}
                  className="w-5 h-5 accent-[#1B4D3E]"
                />
              </label>

              {s.tasbih && (
                <div className="flex items-center gap-3 bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl px-4 py-3">
                  <span className="text-sm font-semibold">كل</span>
                  <select
                    value={s.tasbihInterval || 3}
                    onChange={(e) =>
                      onChange({ ...s, tasbihInterval: Number(e.target.value) })
                    }
                    className="bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-3 py-1.5 text-sm"
                  >
                    {[1, 2, 3, 4, 6].map((h) => (
                      <option key={h} value={h}>
                        {toArabicDigits(h)} ساعة
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-[#5B6B62] dark:text-[#A9BDB2]">
                    بيقف من ١٠م لـ ٨ص
                  </span>
                </div>
              )}

              {/* 🔴 مؤقّت — لفترة الاختبار بس.
                  بيختفي لوحده بعد TESTER_UNTIL في testerMode.js،
                  فلو اتنسي مش هيفضل يزنّ على المستخدمين للأبد. */}
              {inTesterWindow() && (
                <label className="flex items-center justify-between bg-[#FBF3E2] border border-[#D4A853] rounded-2xl px-4 py-3">
                  <span>
                    <span className="font-semibold text-sm block text-[#6B5A2E]">
                      تذكير فترة الاختبار
                    </span>
                    <span className="text-[11px] text-[#8A7A4E]">
                      ٣ تذكيرات في اليوم — <strong>بس في الأيام اللي ما تفتحش
                      فيها التطبيق</strong>. بيقف تلقائيًا بعد انتهاء الاختبار.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={s.tester !== false}
                    onChange={() => onChange({ ...s, tester: s.tester === false })}
                    className="w-5 h-5 accent-[#D4A853]"
                  />
                </label>
              )}

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
                    className="bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              )}

              <button
                onClick={async () => {
                  // ⚠️ على التطبيق الأصلي لازم نعدّي على النظام.
                  // showNotification() بتاعة الويب بتفحص
                  // Notification.permission، وWebView أندرويد مافيهاش
                  // window.Notification — فكانت بترجّع false من غير أي
                  // رسالة والزر يبان ميّت.
                  const ok = native
                    ? await testNotification({
                        title: NOTIF_KINDS.lesson.title,
                        body: "ده تذكير تجريبي ✅ — دوس عليه يوديك للدرس",
                        url: NOTIF_KINDS.lesson.link || "/?go=lesson",
                        gentle: false,
                        afterSeconds: 5,
                      })
                    : await showNotification(NOTIF_KINDS.lesson.title, {
                        body: "ده تذكير تجريبي ✅ — دوس عليه يوديك للدرس",
                        tag: "iqra-test",
                        // لازم data.url — من غيرها الضغط مابيعملش حاجة
                        data: { url: NOTIF_KINDS.lesson.link || "/?go=lesson" },
                      });
                  setTested(ok ? (native ? "soon" : "sent") : "failed");
                }}
                className="text-xs text-[#1B4D3E] dark:text-[#8FD6C0] underline self-start"
              >
                جرّب تذكير دلوقتي
              </button>
              {/* الزر كان بيرجّع false بصمت. أي نتيجة أحسن من لا نتيجة. */}
              {tested && (
                <p
                  className={`text-[11px] ${
                    tested === "failed" ? "text-[#8A4E4E]" : "text-[#1B4D3E] dark:text-[#8FD6C0]"
                  }`}
                >
                  {tested === "soon"
                    ? "هيوصل بعد ٥ ثوانٍ — اقفل التطبيق وجرّب"
                    : tested === "sent"
                    ? "اتبعت ✅"
                    : "متعذّر — اتأكد إن إشعارات التطبيق مسموحة من إعدادات الجهاز"}
                </p>
              )}
            </>
          )}
        </>
      )}

      {native ? (
        <div className="text-[11px] text-[#1B4D3E] dark:text-[#8FD6C0] bg-[#1B4D3E]/10 rounded-xl px-4 py-3 leading-relaxed">
          <strong>التذكيرات بتشتغل والتطبيق مقفول.</strong> نظام أندرويد نفسه
          هو اللي بيجدولها، والذِّكر مكتوب جوّه الإشعار — تقراه من شاشة القفل.
          <br />
          تذكير التسبيح والصلاة على النبي <strong>من غير صوت</strong> عن قصد،
          عشان تكرارها مايخلّيكش تقفل إشعارات التطبيق كلها وتخسر الأذان. أذكار
          الصباح والمساء بصوت.
          {perm === "granted" && (
            <>
              <br />
              <button
                onClick={() => testDhikr(5)}
                className="mt-2 underline font-bold"
              >
                جرّب تذكير ذِكر بعد ٥ ثوانٍ
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
          <strong>مهم تعرفه:</strong> المتصفحات مابتسمحش بجدولة إشعارات والتطبيق
          مقفول من غير سيرفر (خاصية الجدولة المحلية اتسحبت من المعايير). يعني في
          نسخة المتصفح:
          <br />• التطبيق مفتوح ووصل الميعاد → التذكير بيظهر في وقته.
          <br />• التطبيق كان مقفول → التذكير بيظهر <strong>أول ما تفتحه</strong> بعد
          الميعاد، مرة واحدة في اليوم.
          <br />
          <strong>نسخة أندرويد من المتجر مافيهاش القيد ده</strong> — التذكيرات
          بتوصل في ميعادها والتطبيق مقفول، والذِّكر مكتوب جوّه الإشعار.
        </div>
      )}
    </div>
  );
}
