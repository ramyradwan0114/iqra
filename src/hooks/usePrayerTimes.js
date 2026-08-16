import { useState, useEffect, useCallback, useRef } from "react";
import { computeTimes, CITIES } from "../utils/prayerTimes.js";
import { getSettings, saveSettings } from "../utils/db.js";

// ---------- الموقع ----------
// GPS اختياري تمامًا: لو المستخدم رفض أو الجهاز مش داعم، بيختار مدينة يدويًا
// والتطبيق بيشتغل عادي. مفيش أي إرسال للموقع لأي سيرفر — الحساب كله محلي.
export function useLocation() {
  const [loc, setLoc] = useState(null); // { lat, lng, source, name, method }
  const [status, setStatus] = useState("idle"); // idle | asking | ok | denied | unsupported
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      if (s?.location) {
        setLoc(s.location);
        setStatus("ok");
      }
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next) => {
    setLoc(next);
    saveSettings({ location: next });
  }, []);

  const askGPS = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persist({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "gps",
          name: "موقعك الحالي",
        });
        setStatus("ok");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 6 * 3600e3 }
    );
  }, [persist]);

  const pickCity = useCallback(
    (id) => {
      const c = CITIES.find((x) => x.id === id);
      if (!c) return;
      persist({ lat: c.lat, lng: c.lng, source: "city", name: c.name, method: c.method });
      setStatus("ok");
    },
    [persist]
  );

  return { loc, status, loaded, askGPS, pickCity, setStatus };
}

// ---------- المواقيت + العدّاد ----------
export function usePrayerTimes(loc, method, madhab) {
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef(null);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  if (!loc) return { ready: false, now };

  const result = computeTimes({
    lat: loc.lat,
    lng: loc.lng,
    method: method || loc.method || "Egyptian",
    madhab: madhab || "Shafi",
    date: new Date(now),
  });

  return { ready: true, now, ...result };
}
