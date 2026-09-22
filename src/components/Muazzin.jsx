import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MUEZZINS,
  DEFAULT_ATHAN,
  resolveAthan,
  AFTER_PRAYER,
  prayerDayKey,
} from "../utils/athan.js";
import { useLocation, usePrayerTimes } from "../hooks/usePrayerTimes.js";
import { PRAYERS, fmtTime, countdown } from "../utils/prayerTimes.js";
import { buzz } from "../hooks/useProgress.js";
import { idbGet, idbSet, STORES } from "../utils/db.js";
import { needsBatteryHint, BATTERY_HINT } from "../utils/nativeAthan.js";
import {
  isNative,
  status as athanStatus,
  playNow as playAthanNow,
  stopAthan,
} from "../utils/athanService.js";

const PRAYER_LIST = PRAYERS.filter((p) => !p.notPrayer);

export default function Muazzin({ settings, onChange, toArabicDigits, onToast }) {
  const cfg = { ...DEFAULT_ATHAN, ...(settings?.athan || {}) };
  const { loc } = useLocation();
  const { ready, times, next } = usePrayerTimes(loc, settings?.prayerMethod, settings?.madhab);

  const audioRef = useRef(null);
  const firedRef = useRef({}); // { "2026-08-15:dhuhr": true }
  const [playing, setPlaying] = useState(null); // معرّف الصلاة الشغّالة
  const [fellBack, setFellBack] = useState(false);
  const [done, setDone] = useState({}); // الصلوات المؤدّاة النهاردة
  const [dhikrFor, setDhikrFor] = useState(null);
  // الأذان الأصلي (Capacitor): بيشتغل والتطبيق مقفول. في المتصفّح
  // كل الدوال دي بترجّع false بهدوء، فالسلوك القديم ما بيتغيّرش.
  const [native, setNative] = useState(false);
  const [scheduled, setScheduled] = useState(0);

  const today = prayerDayKey();

  useEffect(() => {
    isNative().then(setNative);
  }, []);

  // ⚠️ الجدولة **مابقتش هنا**. كانت في المكوّن ده، والمكوّن مابيتركّبش
  // غير لما المستخدم يفتح شاشة المؤذّن — فاللي مابيفتحهاش مكانش
  // بيتجدوله أذان أصلًا. اتنقلت لـ App.jsx عشان تشتغل عند كل فتح
  // للتطبيق ولتلات أيام قدّام.
  //
  // هنا بنعرض بس العدد المعلّق فعلًا في النظام — مش رقم من الذاكرة.
  // لو عرضنا رقم محلي، هيفضل يقول "متجدول" حتى لو النظام ملغيها.
  // الحالة بتتقرا من النظام نفسه مش من ذاكرة الواجهة
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!native) return;
    let alive = true;
    const read = () => athanStatus().then((s) => alive && setState(s));
    read();
    const iv = setInterval(read, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [native, cfg.enabled, cfg.muezzin]);

  useEffect(() => {
    setScheduled(state?.upcoming || 0);
  }, [state]);

  useEffect(() => {
    idbGet(STORES.settings, "prayed").then((r) => {
      setDone(r?.day === today ? r.done || {} : {});
    });
  }, [today]);

  const markPrayed = useCallback(
    async (id) => {
      const nextDone = { ...done, [id]: true };
      setDone(nextDone);
      await idbSet(STORES.settings, { id: "prayed", day: today, done: nextDone });
      buzz([30, 50, 30]);
      onToast?.(`✅ صليت ${PRAYER_LIST.find((p) => p.id === id)?.label}`);
    },
    [done, today, onToast]
  );

  const play = useCallback(
    async (prayerId) => {
      const { src, fellBack: fb } = await resolveAthan(cfg.muezzin, prayerId);
      setFellBack(fb);
      const a = audioRef.current;
      if (!a) return;
      a.src = src;
      a.volume = cfg.volume ?? 0.9;
      try {
        await a.play();
        setPlaying(prayerId);
        if (cfg.vibrate) buzz([200, 100, 200]);
      } catch {
        onToast?.("المتصفح منع التشغيل التلقائي — دوس تشغيل");
      }
    },
    [cfg.muezzin, cfg.volume, cfg.vibrate, onToast]
  );

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlaying(null);
  }, []);

  // مراقبة دخول وقت الصلاة — بيشتغل والتطبيق مفتوح فقط
  useEffect(() => {
    if (!cfg.enabled || !ready || !times) return;
    const iv = setInterval(() => {
      const now = Date.now();
      for (const p of PRAYER_LIST) {
        if (!cfg.perPrayer?.[p.id]) continue;
        const t = times[p.id]?.getTime();
        if (!t) continue;
        const key = `${today}:${p.id}`;
        // نافذة دقيقة واحدة بعد الأذان — عشان مايفوتش لو التبويب كان نايم
        if (now >= t && now - t < 60000 && !firedRef.current[key]) {
          firedRef.current[key] = true;
          play(p.id);
          setDhikrFor(p.id);
        }
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [cfg.enabled, cfg.perPrayer, ready, times, today, play]);

  const c = next ? countdown(next.at) : null;
  const two = (n) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-col gap-5">
      <audio ref={audioRef} onEnded={() => setPlaying(null)} preload="none" />

      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">الموذّن</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          أذان عند دخول الوقت + أذكار بعد الصلاة
        </p>
      </div>

      {/* الصلاة الجاية */}
      {next && (
        <div className="bg-[#1B4D3E] text-[#F5F0E8] rounded-3xl p-5 text-center">
          <div className="text-xs opacity-75">أذان {next.label} بعد</div>
          <div className="text-3xl font-bold tabular-nums my-1" dir="ltr">
            {two(c.h)}:{two(c.m)}:{two(c.s)}
          </div>
          <div className="text-sm opacity-80">{fmtTime(next.at)}</div>
        </div>
      )}

      {/* التشغيل */}
      <div className="iqra-card p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">تشغيل الأذان تلقائيًا</span>
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={() => onChange({ athan: { ...cfg, enabled: !cfg.enabled } })}
            className="w-5 h-5 accent-[#1B4D3E]"
          />
        </div>

        <div>
          <div className="text-xs text-[#8A7A4E] mb-2">المؤذّن</div>
          <div className="flex flex-wrap gap-2">
            {MUEZZINS.map((m) => (
              <button
                key={m.id}
                onClick={() => onChange({ athan: { ...cfg, muezzin: m.id } })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                  cfg.muezzin === m.id
                    ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                    : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-[#8A7A4E] mb-1">
            <span>مستوى الصوت</span>
            <span>{Math.round((cfg.volume ?? 0.9) * 100)}٪</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={cfg.volume ?? 0.9}
            onChange={(e) => onChange({ athan: { ...cfg, volume: Number(e.target.value) } })}
            className="w-full accent-[#1B4D3E]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => (playing ? stop() : play(next?.id || "dhuhr"))}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm ${
              playing ? "bg-[#8A4E4E] text-[#F5F0E8]" : "bg-[#1B4D3E] text-[#F5F0E8]"
            }`}
          >
            {playing ? "إيقاف ■" : "جرّب الأذان ▶"}
          </button>
          <button
            onClick={() => play("fajr")}
            className="px-5 py-2.5 rounded-xl font-bold text-sm border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          >
            جرّب أذان الفجر
          </button>
        </div>

        {fellBack && (
          <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-2.5">
            أذان الفجر لهذا المؤذّن مش مرفوع لسه — بنشغّل العادي مؤقتًا. أذان
            الفجر فيه «الصلاة خير من النوم».
          </p>
        )}
      </div>

      {/* الصلوات لكل يوم */}
      <div className="iqra-card p-5">
        <div className="text-sm font-bold mb-3">صلوات النهاردة</div>
        <div className="flex flex-col gap-1.5">
          {PRAYER_LIST.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                done[p.id]
                  ? "bg-[#1B4D3E]/10"
                  : "bg-[#FBF8EF] dark:bg-[#1E2A24]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span>{p.icon}</span>
                <span className="text-sm font-semibold">{p.label}</span>
                {ready && (
                  <span className="text-[11px] text-[#8A7A4E] tabular-nums">
                    {fmtTime(times[p.id])}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] text-[#8A7A4E]">
                  <input
                    type="checkbox"
                    checked={!!cfg.perPrayer?.[p.id]}
                    onChange={() =>
                      onChange({
                        athan: {
                          ...cfg,
                          perPrayer: { ...cfg.perPrayer, [p.id]: !cfg.perPrayer?.[p.id] },
                        },
                      })
                    }
                    className="w-3.5 h-3.5 accent-[#1B4D3E]"
                  />
                  أذان
                </label>
                <button
                  onClick={() => (done[p.id] ? setDhikrFor(p.id) : markPrayed(p.id))}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                    done[p.id]
                      ? "text-[#1B4D3E] dark:text-[#8FD6C0]"
                      : "bg-[#D4A853] text-[#1E2A24]"
                  }`}
                >
                  {done[p.id] ? "✅ صليت" : "صليت"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* أذكار بعد الصلاة */}
      {dhikrFor && (
        <div
          className="fixed inset-0 bg-[#1E2A24]/50 z-[65] flex items-end sm:items-center justify-center p-3"
          onClick={() => setDhikrFor(null)}
        >
          <div
            className="iqra-card w-full max-w-md p-6 max-h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">
                أذكار بعد {PRAYER_LIST.find((p) => p.id === dhikrFor)?.label}
              </h3>
              <button onClick={() => setDhikrFor(null)} className="text-[#5B6B62] text-sm">
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {AFTER_PRAYER.map((d) => (
                <div
                  key={d.id}
                  className="bg-[#FBF8EF] dark:bg-[#1E2A24] rounded-xl px-4 py-3 flex items-start justify-between gap-3"
                >
                  <span className="text-sm leading-relaxed">{d.text}</span>
                  <span className="shrink-0 text-xs font-bold text-[#1B4D3E] dark:text-[#D4A853] bg-[#D4A853]/20 rounded-lg px-2 py-1">
                    ×{toArabicDigits(d.count)}
                  </span>
                </div>
              ))}
            </div>
            {!done[dhikrFor] && (
              <button
                onClick={() => {
                  markPrayed(dhikrFor);
                  setDhikrFor(null);
                }}
                className="w-full mt-4 bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold text-sm"
              >
                ✅ صليت
              </button>
            )}
          </div>
        </div>
      )}

      {/* الحالة بتتغيّر حسب النسخة: نسخة المتجر بتجدول أذانًا حقيقيًا،
          ونسخة الويب لأ. مهم نقول الحقيقة لكل واحدة بدل رسالة واحدة. */}
      {native ? (
        <div className="text-[11px] text-[#1B4D3E] dark:text-[#8FD6C0] bg-[#2E9E6B]/15 rounded-xl px-4 py-3 leading-relaxed">
          ✅ الأذان مجدوَل في نظام الجهاز — <strong>هيأذّن في وقته والتطبيق مقفول</strong>.
          {scheduled > 0 && (
            <>
              {" "}
              فيه <strong>{toArabicDigits(scheduled)}</strong> صلاة جاية متجدولة
              {state?.next ? (
                <>
                  ، وأقربها <strong>{state.nextLabel}</strong> الساعة{" "}
                  <strong>{fmtTime(new Date(state.next))}</strong>
                </>
              ) : null}
              . الجدولة بتتجدّد بعد كل أذان وعند كل فتح للتطبيق.
            </>
          )}
          <br />

          {/* التشغيل بقى من خدمة التطبيق مش من صوت الإشعار، فالتجربة
              الصح هي إننا نشغّل الأذان دلوقتي بنفس الطريقة اللي
              هيشتغل بيها في وقت الصلاة بالظبط. */}
          <button
            onClick={async () => {
              const ok = await playAthanNow(cfg.muezzin, "normal");
              onToast?.(ok ? "بيأذّن دلوقتي" : "تعذّر التشغيل");
            }}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1B4D3E] text-[#F5F0E8]"
          >
            🔔 شغّل الأذان دلوقتي
          </button>

          <button
            onClick={() => stopAthan()}
            className="mt-2 mr-2 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#8A4E4E] text-[#8A4E4E]"
          >
            ⏹️ إيقاف
          </button>

          {/* ⚠️ من أندرويد ١٢، المستخدم يقدر يمنع المنبّهات المضبوطة
              من إعدادات النظام. ولو ممنوعة، الأذان هيتأخّر أو يتلغى
              والتطبيق مش هيعرف يقول ليه — إلا لو فحصنا وقلنا. */}
          {state && state.exactAllowed === false && (
            <div className="mt-3 pt-3 border-t border-[#8A4E4E]/30 text-[#8A4E4E]">
              <strong>⚠️ المنبّهات المضبوطة متوقّفة لهذا التطبيق.</strong> الأذان
              هيتأخّر عن وقته. فعّلها من: إعدادات الهاتف ← التطبيقات ← اقرأ ←
              <strong> المنبّهات والتذكيرات</strong>.
            </div>
          )}

          {/* الإرشاد ده بيظهر لأصحاب الأجهزة اللي بتقتل التطبيقات بس.
              من غيره، الجدولة سليمة والمستخدم لسه ممكن يفوّت الأذان
              ومايعرفش ليه. */}
          {needsBatteryHint() && (
            <div className="mt-3 pt-3 border-t border-[#1B4D3E]/20 text-[#6B5A2E] dark:text-[#D4A853]">
              <strong>⚠️ {BATTERY_HINT.title}:</strong> جهازك بيقفل التطبيقات في
              الخلفية تلقائيًا، وده ممكن يلغي الأذان المجدوَل.
              <ul className="list-disc pr-4 mt-1.5 space-y-1">
                {BATTERY_HINT.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-3 leading-relaxed">
          في نسخة المتصفّح الأذان بيشتغل <strong>والتطبيق مفتوح بس</strong> — المتصفّح
          مابيسمحش بتشغيل صوت وهو مقفول، ودي حدود المتصفّح مش نقص في التطبيق.
          <strong> نسخة جوجل بلاي بتأذّن في وقتها والتطبيق مقفول</strong>، لأن نظام
          أندرويد هو اللي بيجدول الأذان.
        </p>
      )}
    </div>
  );
}
