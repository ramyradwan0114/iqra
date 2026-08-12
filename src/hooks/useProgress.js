// ============================================================
//  التقدّم + الإعدادات + التعلّم المتباعد + السلسلة والشارات
// ------------------------------------------------------------
//  IndexedDB هو المصدر الموثوق محليًا، والسحابة (لو متظبّطة) بتاخد نسخة.
//  التطبيق بيفضل شغّال بالكامل من غير أي منهم.
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getLocalProgress,
  setLocalProgress,
  getSettings,
  saveSettings,
  getSrsAll,
  bumpSrs,
  getBadges,
  awardBadge,
  DEFAULT_SETTINGS,
} from "../utils/db.js";
import { useSyncProgress } from "./useFirebase.js";

const EMPTY = { child: [], adult: [] };
const LEGACY_KEY = "iqra.progress.v1"; // نقل بيانات النسخة القديمة

export function useProgress(studentId) {
  const [progress, setProgress] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const { syncProgress } = useSyncProgress(studentId);

  useEffect(() => {
    let alive = true;
    (async () => {
      let p = await getLocalProgress(studentId || "local");
      // ترحيل من localStorage القديم مرة واحدة
      if (!p) {
        try {
          const raw = localStorage.getItem(LEGACY_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            p = {
              child: Array.isArray(parsed.child) ? parsed.child : [],
              adult: Array.isArray(parsed.adult) ? parsed.adult : [],
            };
            await setLocalProgress(p, studentId || "local");
          }
        } catch {}
      }
      if (!alive) return;
      setProgress(p || EMPTY);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [studentId]);

  const complete = useCallback(
    (audience, levelId) => {
      setProgress((prev) => {
        if (prev[audience].includes(levelId)) return prev;
        const next = {
          ...prev,
          [audience]: [...prev[audience], levelId].sort((a, b) => a - b),
        };
        syncProgress(next);
        return next;
      });
    },
    [syncProgress]
  );

  const reset = useCallback(() => {
    setProgress(EMPTY);
    syncProgress(EMPTY);
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {}
  }, [syncProgress]);

  return { progress, complete, reset, loaded };
}

// ---------- الإعدادات (الثيم، حجم الخط، آخر موضع، السور الأخيرة) ----------
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(patch);
      return next;
    });
  }, []);

  const pushRecentSurah = useCallback((surahId) => {
    setSettings((prev) => {
      const list = [surahId, ...(prev.recentSurahs || []).filter((s) => s !== surahId)].slice(0, 5);
      saveSettings({ recentSurahs: list });
      return { ...prev, recentSurahs: list };
    });
  }, []);

  return { settings, update, pushRecentSurah, loaded };
}

// ---------- السلسلة اليومية ----------
const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const daysBetween = (a, b) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 864e5);
};

export function useStreak(settingsLoaded, settings, update) {
  const done = useRef(false);
  const streak = settings?.streak || { count: 0, lastDay: null };

  useEffect(() => {
    if (!settingsLoaded || done.current) return;
    done.current = true;
    const today = dayKey();
    const last = streak.lastDay;
    if (last === today) return; // اتحسبت النهاردة
    let count;
    if (!last) count = 1;
    else {
      const gap = daysBetween(last, today);
      count = gap === 1 ? (streak.count || 0) + 1 : 1; // فات يوم = نبدأ من ١
    }
    update({ streak: { count, lastDay: today } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  return streak.count || 0;
}

// ---------- التكرار المتباعد + الشارات ----------
export const BADGES = {
  firstWord: { id: "firstWord", icon: "🏆", label: "أول كلمة" },
  fiveStreak: { id: "fiveStreak", icon: "⭐", label: "٥ صح متتالية" },
  fullDay: { id: "fullDay", icon: "🌟", label: "يوم كامل دراسة" },
};

export function useLearning() {
  const [srs, setSrs] = useState([]);
  const [badges, setBadges] = useState([]);
  const [toast, setToast] = useState(null);
  const rightRun = useRef(0);

  const refresh = useCallback(async () => {
    setSrs(await getSrsAll());
    setBadges(await getBadges());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grant = useCallback(
    async (badgeId) => {
      const row = await awardBadge(badgeId);
      if (row) {
        setToast(BADGES[badgeId]);
        setTimeout(() => setToast(null), 3200);
        refresh();
      }
    },
    [refresh]
  );

  // بيتنادى بعد كل إجابة في الاختبار
  const recordAnswer = useCallback(
    async (letter, wasRight) => {
      await bumpSrs(letter, wasRight);
      if (wasRight) {
        rightRun.current += 1;
        if (rightRun.current === 1) grant("firstWord");
        if (rightRun.current >= 5) grant("fiveStreak");
      } else {
        rightRun.current = 0;
      }
      refresh();
    },
    [grant, refresh]
  );

  // الحروف اللي غلط فيها وحان وقت مراجعتها — بتتحط في أول الدرس
  const dueLetters = useCallback(
    (limit = 5) =>
      srs
        .filter((r) => r.wrongCount > 0 && (r.nextReview || 0) <= Date.now())
        .sort((a, b) => b.wrongCount - a.wrongCount)
        .slice(0, limit)
        .map((r) => r.letter),
    [srs]
  );

  // ٣ أخطاء أو أكتر = الحرف ده صعب فعلًا
  const hardLetters = useCallback(
    () => srs.filter((r) => r.wrongCount >= 3).map((r) => r.letter),
    [srs]
  );

  return { srs, badges, toast, recordAnswer, dueLetters, hardLetters, grant, refresh };
}

// ---------- اهتزاز ----------
export function buzz(pattern) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}
