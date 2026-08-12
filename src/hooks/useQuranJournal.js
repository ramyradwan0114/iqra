import { useState, useEffect, useCallback } from "react";
import {
  getKhatma,
  markSurahRead,
  resetKhatma,
  getHifz,
  addHifz,
  reviewHifz,
  removeHifz,
  getJournal,
  addJournalEntry,
} from "../utils/db.js";

// ---------- الختمة ----------
export function useKhatma() {
  const [read, setRead] = useState([]);
  const refresh = useCallback(async () => setRead(await getKhatma()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (surah) => {
      await markSurahRead(surah);
      refresh();
    },
    [refresh]
  );
  const reset = useCallback(async () => {
    await resetKhatma();
    refresh();
  }, [refresh]);

  const ids = new Set(read.map((r) => r.surah));
  return { read, ids, count: ids.size, markRead, reset, complete: ids.size >= 114 };
}

// ---------- الحفظ ----------
export function useHifz() {
  const [items, setItems] = useState([]);
  const refresh = useCallback(async () => setItems(await getHifz()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (surah, from, to) => {
      await addHifz(surah, from, to);
      refresh();
    },
    [refresh]
  );
  const review = useCallback(
    async (id, passed) => {
      await reviewHifz(id, passed);
      refresh();
    },
    [refresh]
  );
  const remove = useCallback(
    async (id) => {
      await removeHifz(id);
      refresh();
    },
    [refresh]
  );

  const due = items.filter((i) => (i.nextReview || 0) <= Date.now());
  return { items, due, add, review, remove, refresh };
}

// ---------- يوميات القراءة + سلسلة "اقرأ بثقة" ----------
const dayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export function useReadingJournal() {
  const [entries, setEntries] = useState([]);
  const refresh = useCallback(async () => setEntries(await getJournal()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const log = useCallback(
    async (entry) => {
      await addJournalEntry({ ...entry, day: dayKey() });
      refresh();
    },
    [refresh]
  );

  // سلسلة الأيام المتتالية: بنعدّ لورا من النهاردة (أو من إمبارح لو لسه
  // ماقراش النهاردة — عشان السلسلة ماتتكسرش قبل ما اليوم يخلص)
  const days = [...new Set(entries.map((e) => e.day))].sort().reverse();
  let streak = 0;
  if (days.length) {
    const today = dayKey();
    const yesterday = dayKey(Date.now() - 864e5);
    let cursor = days[0] === today ? today : days[0] === yesterday ? yesterday : null;
    if (cursor) {
      for (const d of days) {
        if (d === cursor) {
          streak++;
          const prev = new Date(cursor + "T00:00:00");
          prev.setDate(prev.getDate() - 1);
          cursor = dayKey(prev.getTime());
        } else if (d < cursor) break;
      }
    }
  }

  return { entries, log, streak, refresh };
}

export const CONFIDENCE_LEVELS = [
  { level: 1, title: "اقرأ لوحدك", desc: "في مكان هادي، من غير حد يسمعك", icon: "🧘" },
  { level: 2, title: "اقرأ قدام المرايا", desc: "شوف نفسك وإنت بتقرأ — بيقلّل رهبة النظر", icon: "🪞" },
  { level: 3, title: "اقرأ لأخوك أو صاحبك", desc: "شخص واحد بس تثق فيه", icon: "👥" },
  { level: 4, title: "اقرأ في المسجد أو المجلس", desc: "قدام مجموعة — الهدف النهائي", icon: "🕌" },
];
