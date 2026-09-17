import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "../hooks/usePrayerTimes.js";
import { qiblaBearing, CITIES } from "../utils/prayerTimes.js";

// اتجاه القبلة من موقعك = زاوية من الشمال. البوصلة بتديك اتجاه الجهاز،
// والفرق بينهم هو اللي بندوّر السهم بيه.
export default function QiblaCompass({ toArabicDigits }) {
  const { loc, status, loaded, askGPS, pickCity } = useLocation();
  const [heading, setHeading] = useState(null); // اتجاه الجهاز
  const [perm, setPerm] = useState("idle"); // idle | need | ok | denied | unsupported
  const [absolute, setAbsolute] = useState(true);

  const bearing = loc ? qiblaBearing(loc.lat, loc.lng) : null;

  // ⚠️ إصلاح مهم: إحنا مشتركين في حدثين —
  //   deviceorientationabsolute → alpha محسوبة من الشمال الحقيقي ✅
  //   deviceorientation         → alpha نسبية، صفرها عشوائي حسب وضع
  //                               الجهاز أول ما الحسّاس اشتغل ❌
  //
  // الاتنين كانوا بيروحوا لنفس الدالة، والحدثين بيتبادلوا. فالقراءة
  // النسبية كانت بتدوس على القراءة المطلقة عدّة مرات في الثانية —
  // السهم بيرقص والتحذير «بوصلتك نسبية» بيظهر حتى لو الجهاز بيدّي
  // قراءة مطلقة سليمة.
  //
  // دلوقتي: أول ما نشوف قراءة مطلقة، بنتجاهل النسبية نهائيًا.
  const sawAbsolute = useRef(false);

  const onOrient = useCallback((e) => {
    // iOS بيدّي webkitCompassHeading جاهز (من الشمال المغناطيسي)
    if (typeof e.webkitCompassHeading === "number") {
      sawAbsolute.current = true;
      setHeading(e.webkitCompassHeading);
      setAbsolute(true);
      return;
    }
    if (e.alpha == null) return;

    const isAbsolute = e.absolute === true || e.type === "deviceorientationabsolute";
    if (isAbsolute) sawAbsolute.current = true;
    else if (sawAbsolute.current) return; // عندنا مصدر أحسن، مانقبلش الأقل

    // alpha بيلف عكس عقارب الساعة، فبنعكسه
    setHeading((360 - e.alpha) % 360);
    setAbsolute(isAbsolute);
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !window.DeviceOrientationEvent) {
      setPerm("unsupported");
      return;
    }
    // iOS 13+ لازم يطلب إذن من داخل حدث مباشر من المستخدم
    const needsPermission = typeof DeviceOrientationEvent.requestPermission === "function";
    if (needsPermission) {
      try {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted") {
          setPerm("denied");
          return;
        }
      } catch {
        setPerm("denied");
        return;
      }
    }
    window.addEventListener("deviceorientationabsolute", onOrient, true);
    window.addEventListener("deviceorientation", onOrient, true);
    setPerm("ok");
  }, [onOrient]);

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrient, true);
      window.removeEventListener("deviceorientation", onOrient, true);
    };
  }, [onOrient]);

  if (!loaded) return <p className="text-sm text-[#5B6B62] py-10 text-center">…</p>;

  if (!loc) {
    return (
      <div className="flex flex-col gap-5">
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">اتجاه القبلة</h2>
        <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col gap-4">
          <button onClick={askGPS} className="bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold">
            📍 استخدم موقعي
          </button>
          {status === "denied" && (
            <p className="text-xs text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-2.5">
              مسمحتش بالموقع — اختار مدينتك.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCity(c.id)}
                className="px-3 py-1.5 rounded-lg text-sm border border-[#E4DCC3] dark:border-[#3A5148]"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // زاوية السهم على الشاشة = اتجاه القبلة - اتجاه الجهاز
  const arrow = heading == null ? bearing : (bearing - heading + 360) % 360;
  const aligned = heading != null && Math.min(arrow, 360 - arrow) <= 5;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">اتجاه القبلة</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">📍 {loc.name || "موقعك"}</p>
      </div>

      <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-3xl p-6 flex flex-col items-center gap-5">
        <div className="relative w-64 h-64 grid place-items-center">
          {/* قرص البوصلة */}
          <div
            className="absolute inset-0 rounded-full border-4 border-[#E4DCC3] dark:border-[#3A5148] transition-transform duration-200"
            style={{ transform: `rotate(${heading == null ? 0 : -heading}deg)` }}
          >
            {[
              ["ش", 0],
              ["ق", 90],
              ["ج", 180],
              ["غ", 270],
            ].map(([label, deg]) => (
              <span
                key={label}
                className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-bold text-[#5B6B62] dark:text-[#A9BDB2]"
                style={{ transform: `rotate(${deg}deg) translateY(0)`, transformOrigin: "50% 120px" }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* سهم القبلة */}
          <div
            className="absolute inset-0 grid place-items-center transition-transform duration-200"
            style={{ transform: `rotate(${arrow}deg)` }}
          >
            <div className="flex flex-col items-center" style={{ marginBottom: "3rem" }}>
              <span className={`text-4xl ${aligned ? "scale-125" : ""} transition-transform`}>🕋</span>
              <div
                className={`w-1 h-20 rounded-full ${
                  aligned ? "bg-[#2E9E6B]" : "bg-[#1B4D3E]"
                }`}
              />
            </div>
          </div>

          <div className="w-3 h-3 rounded-full bg-[#8A7A4E] z-10" />
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">
            {toArabicDigits(Math.round(bearing))}° من الشمال
          </div>
          {aligned && (
            <div className="text-sm font-bold text-[#2E9E6B] mt-1">✓ إنت في اتجاه القبلة</div>
          )}
        </div>

        {perm !== "ok" && (
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={start}
              className="bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold text-sm"
            >
              🧭 فعّل البوصلة
            </button>
            {perm === "denied" && (
              <p className="text-xs text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-2.5">
                مسمحتش بالبوصلة — استخدم الزاوية اللي فوق مع بوصلة عادية.
              </p>
            )}
            {perm === "unsupported" && (
              <p className="text-xs text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-2.5">
                جهازك مافيهوش حسّاس اتجاه. استخدم الزاوية:{" "}
                <strong>{toArabicDigits(Math.round(bearing))}° من الشمال</strong> مع أي بوصلة.
              </p>
            )}
          </div>
        )}

        {perm === "ok" && !absolute && (
          <p className="text-[11px] text-[#6B5A2E] bg-[#FBF3E2] rounded-xl px-4 py-2.5 leading-relaxed">
            بوصلة جهازك نسبية مش مطلقة — ممكن تكون غير دقيقة. لفّ الجهاز على
            شكل رقم ٨ لمعايرتها، أو اعتمد على الزاوية مع بوصلة عادية.
          </p>
        )}

        <p className="text-[11px] text-[#8A7A4E] text-center leading-relaxed">
          الحساب من إحداثياتك للكعبة (٢١.٤٢٢٥° شمالًا، ٣٩.٨٢٦٢° شرقًا) — بيشتغل
          أوفلاين. البوصلة بتتأثر بالمعادن والمغناطيس حواليك.
        </p>
      </div>
    </div>
  );
}
