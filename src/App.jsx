import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import TeacherMode from "./components/TeacherMode.jsx";
import VocalTrainer from "./components/VocalTrainer.jsx";
import ConfidenceMode from "./components/ConfidenceMode.jsx";
import HifzMode from "./components/HifzMode.jsx";
import TajweedQuiz from "./components/TajweedQuiz.jsx";
import RecitationChecker from "./components/RecitationChecker.jsx";
import DailyChallenge from "./components/DailyChallenge.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import ShareApp from "./components/ShareApp.jsx";
import StreakBadge from "./components/StreakBadge.jsx";
import StudyGroup from "./components/StudyGroup.jsx";
import TasbihCounter from "./components/TasbihCounter.jsx";
import PrayerTimes from "./components/PrayerTimes.jsx";
import QiblaCompass from "./components/QiblaCompass.jsx";
import IslamicCalendar from "./components/IslamicCalendar.jsx";
import Muazzin from "./components/Muazzin.jsx";
import AITajweedCoach from "./components/AITajweedCoach.jsx";
import AyahOfTheDay from "./components/AyahOfTheDay.jsx";
import { bookmarksForSurah, cycleBookmark, catOf, CATEGORIES } from "./utils/bookmarks.js";
import BottomNav from "./components/BottomNav.jsx";
import HomeScreen from "./components/HomeScreen.jsx";
import OnboardingFlow from "./components/OnboardingFlow.jsx";
import DailyGoal from "./components/DailyGoal.jsx";
import {
  DEFAULT_SALAWAT,
  SALAWAT_NOTIF,
  salawatDue,
  dayKey as tasbihDayKey,
} from "./utils/reminders.js";
import QuranSearch from "./components/QuranSearch.jsx";
import { shareApp } from "./utils/share.js";
import { makeTimingLoader, loadTranslations, loadTajweed } from "./hooks/useSurahTimings.js";
import TafsirAccordion from "./components/TafsirAccordion.jsx";
import {
  DEFAULT_NOTIF_SETTINGS,
  NOTIF_KINDS,
  dueReminders,
  showNotification,
  surahOfTheDay,
} from "./utils/notifications.js";
import { dayIndex, dayKey as quizDayKey } from "./utils/dailyQuiz.js";
import { parseLink, clearLinkParams, onServiceWorkerNavigate } from "./utils/deepLink.js";
import { useKhatma } from "./hooks/useQuranJournal.js";
import { TAJWEED_RULES, tajweedWords } from "./utils/tajweedData.js";
import { SHORT_SURAHS, SHORT_SENTENCES } from "./data/shortSurahs.js";
import {
  useProgress,
  useSettings,
  useStreak,
  useLearning,
  buzz,
  BADGES,
} from "./hooks/useProgress.js";
// ============================================================
//  الخطوط
// ------------------------------------------------------------
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&family=Amiri:wght@400;700&family=Amiri+Quran&display=swap";

// المصحف لازم يفضل Amiri Quran — Cairo مابيرسمش الرسم العثماني صح
// (همزة الوصل ٱ، الألف الخنجرية ـٰ، علامات الوقف).
const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";
const UI_FONT = "'Cairo', 'Tajawal', 'Segoe UI', sans-serif";
function useQuranFonts() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    let alive = true;
    const done = () => alive && setReady(true);
    if (document.fonts?.ready) {
      document.fonts.ready.then(done);
      const t = setTimeout(done, 3000);
      return () => {
        alive = false;
        clearTimeout(t);
      };
    }
    done();
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
// ============================================================
//  الصوت العربي (النطق)
// ============================================================
function useArabicVoice() {
  const [voice, setVoice] = useState(null);
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("unsupported");
      return;
    }
    let alive = true;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return false;
      const ar = voices.find((v) => (v.lang || "").toLowerCase().startsWith("ar"));
      if (!alive) return true;
      setVoice(ar || null);
      setStatus(ar ? "ready" : "missing");
      return true;
    };
    if (pick()) return;
    const onChange = () => pick();
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    const t = setTimeout(() => {
      if (alive && !pick()) setStatus("missing");
    }, 1500);
    return () => {
      alive = false;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      clearTimeout(t);
    };
  }, []);
  const speak = useCallback(
    (text) => {
      if (!("speechSynthesis" in window) || status !== "ready") return false;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice?.lang || "ar-SA";
      u.rate = 0.7;
      if (voice) u.voice = voice;
      window.speechSynthesis.speak(u);
      return true;
    },
    [voice, status]
  );
  return { speak, status };
}
// ============================================================
//  اسم الطالب
// ------------------------------------------------------------
//  محفوظ محليًا دلوقتي. لما ننقل للسحابة، ده المكان اللي هيتحوّل لمعرّف
//  الطالب (studentId) بدل الاسم المجرّد.
// ============================================================
const STUDENT_KEY = "iqra.student.v1";

function useStudent() {
  const [name, setNameState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let v = "";
    try {
      v = localStorage.getItem(STUDENT_KEY) || "";
    } catch {}
    setNameState(v);
    setLoaded(true);
  }, []);

  const setName = useCallback((raw) => {
    const clean = (raw || "").trim().replace(/\s+/g, " ").slice(0, 40);
    setNameState(clean);
    try {
      if (clean) localStorage.setItem(STUDENT_KEY, clean);
      else localStorage.removeItem(STUDENT_KEY);
    } catch {}
  }, []);

  return { name, setName, loaded };
}

function NameDialog({ initial = "", onSave, onClose }) {
  const [value, setValue] = useState(initial);
  const ok = value.trim().length > 0;
  const submit = (e) => {
    e.preventDefault();
    if (ok) onSave(value);
  };
  return (
    <div
      className="fixed inset-0 bg-[#1E2A24]/40 z-[60] flex items-center justify-center p-5"
      dir="rtl"
    >
      <form
        onSubmit={submit}
        className="bg-[#FFFFFF] rounded-3xl border border-[#E4DCC3] w-full max-w-sm p-7 flex flex-col gap-5"
      >
        <div className="text-center">
          <div className="text-4xl mb-3" style={{ fontFamily: QURAN_FONT }}>
            اقرأ
          </div>
          <h2 className="text-xl font-bold text-[#1B4D3E]">اسمك إيه؟</h2>
          <p className="text-xs text-[#5B6B62] mt-1.5">
            عشان نحفظ تقدّمك ونرحّب بيك كل مرة
          </p>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="اكتب اسمك هنا…"
          maxLength={40}
          className="bg-[#FBF8EF] border border-[#E4DCC3] rounded-xl px-4 py-3 text-center text-lg outline-none focus:border-[#1B4D3E]"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!ok}
            className={`flex-1 py-3 rounded-xl font-bold ${
              ok
                ? "bg-[#1B4D3E] text-[#F5F0E8]"
                : "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
            }`}
          >
            يلا نبدأ
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl text-sm font-semibold border border-[#E4DCC3] text-[#5B6B62]"
            >
              إلغاء
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// التقدّم اتنقل لـ hooks/useProgress.js (IndexedDB + مزامنة سحابية)
// ============================================================
//  محتوى المستويات
// ============================================================
const LEVELS_CHILD = [
  { id: 1, title: "الحروف الهجائية", desc: "تعلم شكل ونطق كل حرف", icon: "أ‌" },
  { id: 2, title: "الحركات", desc: "فتحة، ضمة، كسرة", icon: "َ" },
  { id: 3, title: "المقاطع", desc: "دمج الحروف والحركات", icon: "بَ" },
  { id: 4, title: "كلمات قصيرة", desc: "أول كلمة مقروءة", icon: "قَطّ" },
  { id: 5, title: "جمل قصيرة", desc: "٥-٦ كلمات في جملة", icon: "…" },
  { id: 6, title: "سور قصيرة", desc: "الإخلاص والفلق والناس", icon: "﴿﴾" },
];
const LEVELS_ADULT = [
  { id: 1, title: "تأسيس سريع", desc: "مراجعة الحروف والحركات", icon: "أ‌ب‌ت" },
  { id: 2, title: "القراءة الطليقة", desc: "جمل كاملة بسرعة أعلى", icon: "≋" },
  { id: 3, title: "الكتابة اليدوية", desc: "تدريب رسم الحروف", icon: "✎" },
  { id: 4, title: "الاستعداد للمصحف", desc: "قواعد نطق أساسية", icon: "﴾﴿" },
  { id: 5, title: "سور متوسطة", desc: "الفيل وقريش والماعون", icon: "۩" },
  { id: 6, title: "الفاتحة كاملة", desc: "السبع المثاني", icon: "١" },
  { id: 7, title: "تجويد أساسي", desc: "المدّ والغنّة والإقلاب", icon: "◌ّ" },
];
const LETTERS = [
  { g: "أ", name: "ألف" }, { g: "ب", name: "باء" }, { g: "ت", name: "تاء" },
  { g: "ث", name: "ثاء" }, { g: "ج", name: "جيم" }, { g: "ح", name: "حاء" },
  { g: "خ", name: "خاء" }, { g: "د", name: "دال" }, { g: "ذ", name: "ذال" },
  { g: "ر", name: "راء" }, { g: "ز", name: "زاي" }, { g: "س", name: "سين" },
  { g: "ش", name: "شين" }, { g: "ص", name: "صاد" }, { g: "ض", name: "ضاد" },
  { g: "ط", name: "طاء" }, { g: "ظ", name: "ظاء" }, { g: "ع", name: "عين" },
  { g: "غ", name: "غين" }, { g: "ف", name: "فاء" }, { g: "ق", name: "قاف" },
  { g: "ك", name: "كاف" }, { g: "ل", name: "لام" }, { g: "م", name: "ميم" },
  { g: "ن", name: "نون" }, { g: "ه", name: "هاء" }, { g: "و", name: "واو" },
  { g: "ي", name: "ياء" },
];
const HARAKAT = [
  { g: "بَ", name: "فتحة" },
  { g: "بُ", name: "ضمّة" },
  { g: "بِ", name: "كسرة" },
  { g: "بْ", name: "سكون" },
  { g: "بّ", name: "شدّة" },
];
const SYLLABLES = ["بَا", "تَا", "كَا", "سَمَا", "قَمَر", "وَرَق", "حَجَر"].map((g) => ({ g }));
const WORDS_CHILD = ["قَطّ", "بَيْت", "شَمْس", "كِتَاب", "بَاب", "وَرْدَة"].map((g) => ({ g }));
// نفس كلمات HUSARY_SURAH_1 مجمّعة كآيات — معرّفة هنا لأن LESSONS بتيجي قبلها
const HUSARY_FATIHA_TEXT = [
  "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
  "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ",
  "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
  "مَـٰلِكِ يَوْمِ ٱلدِّينِ",
  "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
  "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
  "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
];

const LESSONS = {
  child: {
    1: { title: "الحروف الهجائية", items: LETTERS, kind: "grid", quiz: "name" },
    2: { title: "الحركات", items: HARAKAT, kind: "grid", quiz: "name" },
    3: { title: "المقاطع", items: SYLLABLES, kind: "list", quiz: "recall" },
    4: { title: "كلمات قصيرة", items: WORDS_CHILD, kind: "list", quiz: "recall" },
    5: {
      title: "جمل قصيرة",
      items: SHORT_SENTENCES.map((g) => ({ g })),
      kind: "list",
      quiz: "recall",
    },
    6: {
      title: "سور قصيرة",
      items: [112, 113, 114].flatMap((id) =>
        SHORT_SURAHS[id].ayat.map((g, i) => ({ g, surah: id, ayah: i + 1 }))
      ),
      kind: "list",
      quiz: "recall",
    },
  },
  adult: {
    1: { title: "تأسيس سريع", items: [...LETTERS, ...HARAKAT], kind: "grid", quiz: "name" },
    2: {
      title: "القراءة الطليقة",
      items: [
        { g: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
        { g: "فِي الْبَيْتِ كِتَابٌ جَمِيلٌ" },
        { g: "الشَّمْسُ سَاطِعَةٌ الْيَوْمَ" },
      ],
      kind: "list",
      quiz: "recall",
    },
    3: { title: "الكتابة اليدوية", items: LETTERS.slice(0, 10), kind: "trace", quiz: "name" },
    4: {
      title: "الاستعداد للمصحف",
      items: [
        { g: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", ayah: 1 },
        { g: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ", ayah: 2 },
        { g: "ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ", ayah: 3 },
        { g: "مَـٰلِكِ يَوْمِ ٱلدِّينِ", ayah: 4 },
      ],
      kind: "list",
      quiz: "recall",
    },
    5: {
      title: "سور متوسطة",
      items: [105, 106, 107].flatMap((id) =>
        SHORT_SURAHS[id].ayat.map((g, i) => ({ g, surah: id, ayah: i + 1 }))
      ),
      kind: "list",
      quiz: "recall",
    },
    6: {
      // الفاتحة كاملة — بتشتغل بصوت الحصري الحقيقي (التوقيت مدمج)
      title: "الفاتحة كاملة",
      items: HUSARY_FATIHA_TEXT.map((g, i) => ({ g, ayah: i + 1 })),
      kind: "list",
      quiz: "recall",
    },
    7: {
      title: "تجويد أساسي",
      items: [
        { g: "مَدّ", name: "المدّ: تمديد الصوت حركتين أو أكتر" },
        { g: "غُنّة", name: "الغنّة: رنّة من الأنف مع النون والميم المشدّدتين" },
        { g: "إقلاب", name: "الإقلاب: النون الساكنة تبقى ميمًا قبل الباء" },
        { g: "إخفاء", name: "الإخفاء: بين الإظهار والإدغام مع غنّة" },
        { g: "قَلْقَلة", name: "القلقلة: اهتزاز في حروف قُطْبُ جَدٍ الساكنة" },
        { g: "إدغام", name: "الإدغام: دمج حرف في الحرف اللي بعده" },
      ],
      kind: "list",
      quiz: "name",
    },
  },
};
// ============================================================
//  التوقيت الحقيقي بكلمة-بكلمة
// ============================================================
const RECITERS = [
  { id: "husary", name: "الشيخ الحصري", qdcId: 6 },
  { id: "sudais", name: "الشيخ السديس", qdcId: 3 },
];
const segmentsApi = (qdcId, surah) =>
  `https://api.qurancdn.com/api/qdc/audio/reciters/${qdcId}/audio_files?chapter=${surah}&segments=true`;
const versesApi = (surah) =>
  `https://api.qurancdn.com/api/qdc/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani&fields=text_uthmani&per_page=300`;
const SURAHS = [
  [1, "الفاتحة", 7, "م"], [2, "البقرة", 286, "د"], [3, "آل عمران", 200, "د"],
  [4, "النساء", 176, "د"], [5, "المائدة", 120, "د"], [6, "الأنعام", 165, "م"],
  [7, "الأعراف", 206, "م"], [8, "الأنفال", 75, "د"], [9, "التوبة", 129, "د"],
  [10, "يونس", 109, "م"], [11, "هود", 123, "م"], [12, "يوسف", 111, "م"],
  [13, "الرعد", 43, "د"], [14, "إبراهيم", 52, "م"], [15, "الحجر", 99, "م"],
  [16, "النحل", 128, "م"], [17, "الإسراء", 111, "م"], [18, "الكهف", 110, "م"],
  [19, "مريم", 98, "م"], [20, "طه", 135, "م"], [21, "الأنبياء", 112, "م"],
  [22, "الحج", 78, "د"], [23, "المؤمنون", 118, "م"], [24, "النور", 64, "د"],
  [25, "الفرقان", 77, "م"], [26, "الشعراء", 227, "م"], [27, "النمل", 93, "م"],
  [28, "القصص", 88, "م"], [29, "العنكبوت", 69, "م"], [30, "الروم", 60, "م"],
  [31, "لقمان", 34, "م"], [32, "السجدة", 30, "م"], [33, "الأحزاب", 73, "د"],
  [34, "سبأ", 54, "م"], [35, "فاطر", 45, "م"], [36, "يس", 83, "م"],
  [37, "الصافات", 182, "م"], [38, "ص", 88, "م"], [39, "الزمر", 75, "م"],
  [40, "غافر", 85, "م"], [41, "فصلت", 54, "م"], [42, "الشورى", 53, "م"],
  [43, "الزخرف", 89, "م"], [44, "الدخان", 59, "م"], [45, "الجاثية", 37, "م"],
  [46, "الأحقاف", 35, "م"], [47, "محمد", 38, "د"], [48, "الفتح", 29, "د"],
  [49, "الحجرات", 18, "د"], [50, "ق", 45, "م"], [51, "الذاريات", 60, "م"],
  [52, "الطور", 49, "م"], [53, "النجم", 62, "م"], [54, "القمر", 55, "م"],
  [55, "الرحمن", 78, "د"], [56, "الواقعة", 96, "م"], [57, "الحديد", 29, "د"],
  [58, "المجادلة", 22, "د"], [59, "الحشر", 24, "د"], [60, "الممتحنة", 13, "د"],
  [61, "الصف", 14, "د"], [62, "الجمعة", 11, "د"], [63, "المنافقون", 11, "د"],
  [64, "التغابن", 18, "د"], [65, "الطلاق", 12, "د"], [66, "التحريم", 12, "د"],
  [67, "الملك", 30, "م"], [68, "القلم", 52, "م"], [69, "الحاقة", 52, "م"],
  [70, "المعارج", 44, "م"], [71, "نوح", 28, "م"], [72, "الجن", 28, "م"],
  [73, "المزمل", 20, "م"], [74, "المدثر", 56, "م"], [75, "القيامة", 40, "م"],
  [76, "الإنسان", 31, "د"], [77, "المرسلات", 50, "م"], [78, "النبأ", 40, "م"],
  [79, "النازعات", 46, "م"], [80, "عبس", 42, "م"], [81, "التكوير", 29, "م"],
  [82, "الانفطار", 19, "م"], [83, "المطففين", 36, "م"], [84, "الانشقاق", 25, "م"],
  [85, "البروج", 22, "م"], [86, "الطارق", 17, "م"], [87, "الأعلى", 19, "م"],
  [88, "الغاشية", 26, "م"], [89, "الفجر", 30, "م"], [90, "البلد", 20, "م"],
  [91, "الشمس", 15, "م"], [92, "الليل", 21, "م"], [93, "الضحى", 11, "م"],
  [94, "الشرح", 8, "م"], [95, "التين", 8, "م"], [96, "العلق", 19, "م"],
  [97, "القدر", 5, "م"], [98, "البينة", 8, "د"], [99, "الزلزلة", 8, "د"],
  [100, "العاديات", 11, "م"], [101, "القارعة", 11, "م"], [102, "التكاثر", 8, "م"],
  [103, "العصر", 3, "م"], [104, "الهمزة", 9, "م"], [105, "الفيل", 5, "م"],
  [106, "قريش", 4, "م"], [107, "الماعون", 7, "م"], [108, "الكوثر", 3, "م"],
  [109, "الكافرون", 6, "م"], [110, "النصر", 3, "د"], [111, "المسد", 5, "م"],
  [112, "الإخلاص", 4, "م"], [113, "الفلق", 5, "م"], [114, "الناس", 6, "م"],
].map(([id, name, ayat, place]) => ({ id, name, ayat, place }));
const HUSARY_SURAH_1 = {
  audioUrl: "https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/1.mp3",
  durationMs: 48000,
  ayat: [
    {
      ayah: 1,
      words: ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَـٰنِ", "ٱلرَّحِيمِ"],
      segments: [[1, 0, 540], [2, 540, 1350], [3, 1350, 2356], [4, 2356, 4810]],
    },
    {
      ayah: 2,
      words: ["ٱلْحَمْدُ", "لِلَّهِ", "رَبِّ", "ٱلْعَـٰلَمِينَ"],
      segments: [[1, 5220, 6690], [2, 6690, 7570], [3, 7570, 8130], [4, 8130, 10530]],
    },
    {
      ayah: 3,
      words: ["ٱلرَّحْمَـٰنِ", "ٱلرَّحِيمِ"],
      segments: [[1, 11570, 13040], [2, 13040, 15370]],
    },
    {
      ayah: 4,
      words: ["مَـٰلِكِ", "يَوْمِ", "ٱلدِّينِ"],
      segments: [[1, 16140, 17190], [2, 17190, 17840], [3, 17840, 19820]],
    },
    {
      ayah: 5,
      words: ["إِيَّاكَ", "نَعْبُدُ", "وَإِيَّاكَ", "نَسْتَعِينُ"],
      segments: [[1, 20840, 22210], [2, 22210, 23120], [3, 23120, 24390], [4, 24390, 26780]],
    },
    {
      ayah: 6,
      words: ["ٱهْدِنَا", "ٱلصِّرَٰطَ", "ٱلْمُسْتَقِيمَ"],
      segments: [[1, 27760, 28660], [2, 28660, 29670], [3, 29670, 32510]],
    },
    {
      ayah: 7,
      words: [
        "صِرَٰطَ", "ٱلَّذِينَ", "أَنْعَمْتَ", "عَلَيْهِمْ", "غَيْرِ",
        "ٱلْمَغْضُوبِ", "عَلَيْهِمْ", "وَلَا", "ٱلضَّآلِّينَ",
      ],
      segments: [
        [1, 33190, 34400], [2, 34400, 35350], [3, 35350, 36380],
        [4, 36380, 37440], [5, 37440, 38170], [6, 38170, 39500],
        [7, 39500, 40650], [8, 40650, 40970], [9, 40970, 47039],
      ],
    },
  ],
};
const EMBEDDED_TIMINGS = { "6:1": HUSARY_SURAH_1 };

// المُحمِّل اتنقل لـ hooks/useSurahTimings.js عشان يعدّي على IndexedDB:
// مدمج ← كاش ← شبكة ← كاش قديم لو الشبكة وقعت.
const loadSurahTimings = makeTimingLoader(EMBEDDED_TIMINGS);
// ============================================================
//  أدوات صغيرة
// ============================================================
const toArabicDigits = (n) =>
  String(n)
    .split("")
    .map((d) => String.fromCharCode(0x0660 + Number(d)))
    .join("");
const formatDuration = (ms) => {
  if (!ms) return "";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${toArabicDigits(h)}س ${toArabicDigits(m)}د`;
  if (m) return `${toArabicDigits(m)}د ${toArabicDigits(s)}ث`;
  return `${toArabicDigits(s)}ث`;
};
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// ============================================================
//  عناصر الواجهة
// ============================================================
function LevelCard({ level, active, locked, done, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`relative text-right rounded-2xl p-5 border transition-all w-full ${
        locked
          ? "bg-[#F1EDE0] border-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
          : active
          ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8] shadow-lg shadow-[#1B4D3E]/20"
          : "bg-[#FBF8EF] border-[#E4DCC3] text-[#20342C] hover:border-[#1B4D3E]/50"
      }`}
    >
      {done && (
        <span className="absolute top-3 left-3 text-xs bg-[#D4A853] text-[#1E2A24] rounded-full w-6 h-6 grid place-items-center font-bold">
          ✓
        </span>
      )}
      {locked && <span className="absolute top-3 left-3 text-sm">🔒</span>}
      <div
        className={`text-3xl mb-3 ${
          locked ? "text-[#C3BAA0]" : active ? "text-[#D4A853]" : "text-[#1B4D3E]"
        }`}
        style={{ fontFamily: UI_FONT }}
      >
        {level.icon}
      </div>
      <div className="font-bold text-lg mb-1">{level.title}</div>
      <div
        className={`text-sm ${
          locked ? "text-[#A79E86]" : active ? "text-[#F5F0E8]/80" : "text-[#5B6B62]"
        }`}
      >
        {locked ? "أكمل المستوى السابق أولًا" : level.desc}
      </div>
    </button>
  );
}
function VoiceWarning({ status }) {
  if (status === "ready" || status === "checking") return null;
  return (
    <div className="rounded-2xl bg-[#FBF3E2] border border-[#D4A853] px-5 py-4 text-sm text-[#6B5A2E] mb-6">
      <strong className="block mb-1">النطق الآلي غير متاح على هذا الجهاز</strong>
      {status === "unsupported"
        ? "المتصفح لا يدعم النطق الآلي."
        : "لا يوجد صوت عربي مثبّت، فزر النطق لن يُصدر صوتًا."}{" "}
      الدروس والاختبارات تعمل بالكامل بدونه (نعتمد على اسم الحرف مكتوبًا).
      لتفعيل الصوت: ثبّت حزمة اللغة العربية من إعدادات الجهاز (النطق / Text-to-speech).
      <br />
      <span className="text-[#8A7A4E]">
        تبويب المصحف التفاعلي غير متأثر — صوته تلاوة حقيقية مسجّلة، مش نطق آلي.
      </span>
    </div>
  );
}
// ============================================================
//  المصحف التفاعلي
// ============================================================
// activeWord هنا هو الكلمة النشطة *داخل هذه الآية فقط* (أو null). كده الـ memo
// بيشتغل: أثناء التلاوة المستمرة بتتعاد رسم آيتين بس (اللي فقدت التظليل واللي
// أخدته) بدل ٢٨٦ آية في البقرة مع كل كلمة.
// تلوين المدّ — مساعدة بصرية مبسّطة، مش مرجع تجويد (شوف utils/tajweed.js)
// tajweedParts: مصفوفة { text, rule } للكلمة دي، جاية من بيانات Quran.com
// المُدقّقة. لو مش متاحة، بنعرض النص العادي — من غير أي تخمين.
function WordText({ text, tajweedParts, onRule }) {
  if (!tajweedParts) return text;
  return tajweedParts.map((p, i) => {
    const rule = p.rule && TAJWEED_RULES[p.rule];
    if (!rule) return <React.Fragment key={i}>{p.text}</React.Fragment>;
    return (
      <span
        key={i}
        className={`${rule.cls} rounded px-[1px] cursor-help`}
        onClick={(e) => {
          e.stopPropagation(); // الضغط على حرف ملوّن = شرح، مش تشغيل صوت
          onRule?.(p.rule, e);
        }}
        title={rule.name}
      >
        {p.text}
      </span>
    );
  });
}

const AyahLine = React.memo(function AyahLine({
  ayahData,
  activeWord,
  selection,
  onWordTap,
  onWordHold,
  tajweedWordsList,
  onRule,
  activeRef,
  onTafsir,
  tafsirOpen,
  isCurrent,
  currentRef,
  mark,
  onMark,
  onRepeat,
}) {
  const { ayah, words, segments } = ayahData;
  const holdRef = useRef(null);
  const heldRef = useRef(false);

  const posInRange = (pos) => {
    if (!selection) return false;
    const here = ayah * 1000 + pos;
    return here >= selection.from && here <= selection.to;
  };

  // ضغطة طويلة (٨٠٠ms) = ترجمة. بنلغي المؤقّت لو الإصبع اتحرّك أو رفع بدري،
  // وبنعلّم heldRef عشان الضغطة الطويلة ماتشغّلش الصوت كمان.
  const startHold = (pos, e) => {
    heldRef.current = false;
    const x = e.clientX, y = e.clientY;
    holdRef.current = { timer: setTimeout(() => {
      heldRef.current = true;
      onWordHold?.(ayah, pos, { x, y });
    }, 800), x, y };
  };
  const cancelHold = () => {
    if (holdRef.current) clearTimeout(holdRef.current.timer);
    holdRef.current = null;
  };
  const maybeCancelOnMove = (e) => {
    if (!holdRef.current) return;
    if (Math.hypot(e.clientX - holdRef.current.x, e.clientY - holdRef.current.y) > 12) cancelHold();
  };

  return (
    <span
      id={`ayah-${ayah}`}
      ref={isCurrent ? currentRef : undefined}
      // الآية اللي الشيخ بيقرأها دلوقتي: شريط أخضر حواليها.
      // box-decoration-break عشان الإطار يفضل مقفول لو الآية اتقسمت
      // على أكتر من سطر — من غيره بيبان مكسور في النص العربي المتدفّق.
      className={
        isCurrent
          ? "bg-[#2E9E6B]/15 dark:bg-[#2E9E6B]/25 rounded-lg ring-1 ring-[#2E9E6B]/50 px-1 transition-colors"
          : ""
      }
      style={isCurrent ? { boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" } : undefined}
    >
      {isCurrent && <span className="text-[#2E9E6B] text-[0.55em] align-middle ml-1">▶</span>}
      {words.map((w, i) => {
        const pos = i + 1;
        const key = `${ayah}:${pos}`;
        const tappable = segments.some((s) => s[0] === pos);
        const inRange = posInRange(pos);
        const isActive = activeWord === key;
        return (
          <span
            key={key}
            ref={isActive ? activeRef : undefined}
            onPointerDown={(e) => tappable && startHold(pos, e)}
            onPointerMove={maybeCancelOnMove}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
            onClick={() => {
              if (heldRef.current) {
                heldRef.current = false;
                return;
              }
              if (tappable) onWordTap(ayah, pos);
            }}
            // inline-block ضروري: التحويلات (scale) مابتتطبّقش على العناصر
            // السطرية. والـ transform مابيعملش إعادة تخطيط فالنص مابيهتزّش.
            className={`inline-block origin-center transition-all duration-150 rounded-md px-0.5 ${
              tappable ? "cursor-pointer" : "cursor-default opacity-60"
            } ${
              isActive
                ? "bg-[#D4A853] text-[#1E2A24] scale-105"
                : inRange
                ? "bg-[#1B4D3E]/15"
                : tappable
                ? "hover:bg-[#1B4D3E]/10 dark:hover:bg-[#D4A853]/15"
                : ""
            }`}
          >
            <WordText text={w} tajweedParts={tajweedWordsList?.[i]} onRule={onRule} />{" "}
          </span>
        );
      })}
      <span className="text-[#1B4D3E] dark:text-[#8FD6C0] mx-1 select-none">
        ۝{toArabicDigits(ayah)}
      </span>
      {/* زر تفسير الآية دي وحدها */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTafsir?.(ayah);
        }}
        className={`align-middle mx-1 text-[0.5em] leading-none px-1.5 py-1 rounded-md border transition-colors ${
          tafsirOpen
            ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
            : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] hover:border-[#1B4D3E]"
        }`}
        title={`تفسير الآية ${toArabicDigits(ayah)}`}
        aria-label={`تفسير الآية ${toArabicDigits(ayah)}`}
      >
        📖
      </button>
      {/* تكرار الآية */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRepeat?.(ayah);
        }}
        className="align-middle mx-0.5 text-[0.5em] leading-none px-1.5 py-1 rounded-md border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] hover:border-[#1B4D3E]"
        title={`كرّر الآية ${toArabicDigits(ayah)}`}
        aria-label={`كرّر الآية ${toArabicDigits(ayah)}`}
      >
        🔁
      </button>
      {/* علامة مرجعية ملوّنة */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMark?.(ayah);
        }}
        className="align-middle mx-0.5 text-[0.5em] leading-none px-1.5 py-1 rounded-md border transition-colors"
        style={
          mark
            ? { backgroundColor: catOf(mark).color, borderColor: catOf(mark).color, color: "#fff" }
            : undefined
        }
        title={mark ? `علامة: ${catOf(mark).label}` : "أضف علامة"}
        aria-label="علامة مرجعية"
      >
        {mark ? catOf(mark).icon : "🔖"}
      </button>{" "}
    </span>
  );
});
function SurahPicker({ current, onPick, onClose, recents = [] }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim();
    if (!t) return SURAHS;
    return SURAHS.filter(
      (s) => s.name.includes(t) || String(s.id) === t || toArabicDigits(s.id) === t
    );
  }, [q]);
  return (
    <div className="fixed inset-0 bg-[#1E2A24]/40 z-50 flex items-start justify-center p-4 md:p-10" dir="rtl">
      <div className="bg-[#FFFFFF] rounded-3xl border border-[#E4DCC3] w-full max-w-lg max-h-full flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[#E4DCC3] flex items-center gap-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم السورة أو رقمها…"
            className="flex-1 bg-[#FBF8EF] border border-[#E4DCC3] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4D3E]"
          />
          <button onClick={onClose} className="text-[#5B6B62] text-sm font-semibold px-2">
            ✕
          </button>
        </div>
        {!q.trim() && recents.length > 0 && (
          <div className="px-5 py-3 border-b border-[#F1EAD6] dark:border-[#3A5148]">
            <div className="text-[11px] text-[#8A7A4E] mb-2">السور الأخيرة</div>
            <div className="flex flex-wrap gap-2">
              {recents
                .map((id) => SURAHS.find((s) => s.id === id))
                .filter(Boolean)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onPick(s.id)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-[#E4DCC3] dark:border-[#3A5148] text-[#1B4D3E] dark:text-[#8FD6C0]"
                    style={{ fontFamily: UI_FONT }}
                  >
                    {s.name}
                  </button>
                ))}
            </div>
          </div>
        )}
        <div className="overflow-y-auto">
          {list.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s.id)}
              className={`w-full text-right px-5 py-3 flex items-center justify-between border-b border-[#F1EAD6] transition-colors ${
                s.id === current ? "bg-[#1B4D3E] text-[#F5F0E8]" : "hover:bg-[#F5F0E8]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`text-xs w-7 h-7 grid place-items-center rounded-full ${
                    s.id === current ? "bg-[#D4A853] text-[#1E2A24]" : "bg-[#F1EAD6] text-[#5B6B62]"
                  }`}
                >
                  {toArabicDigits(s.id)}
                </span>
                <span className="font-bold text-lg" style={{ fontFamily: UI_FONT }}>
                  {s.name}
                </span>
              </span>
              <span className={`text-xs ${s.id === current ? "text-[#F5F0E8]/70" : "text-[#8A7A4E]"}`}>
                {s.place === "م" ? "مكية" : "مدنية"} · {toArabicDigits(s.ayat)} آية
              </span>
            </button>
          ))}
          {!list.length && (
            <p className="text-center text-sm text-[#5B6B62] py-10">لا نتيجة</p>
          )}
        </div>
      </div>
    </div>
  );
}
const REPEAT_OPTIONS = [
  { value: 1, label: "مرة" },
  { value: 3, label: "٣ مرات" },
  { value: 5, label: "٥ مرات" },
  { value: Infinity, label: "بلا توقف" },
];
function MushafDemo({ settings, updateSettings, pushRecentSurah, khatma, deepSurah, onDeepSurahDone }) {
  const audioRef = useRef(null);
  const rafRef = useRef(null);
  const gapRef = useRef(null);
  const runRef = useRef(null);
  const activeElRef = useRef(null);
  const [surah, setSurah] = useState(() => settings?.lastPosition?.surah || 1);
  const [tajweed, setTajweed] = useState(false);
  const [tajweedData, setTajweedData] = useState(null);
  const [tajweedErr, setTajweedErr] = useState(false);
  const [rulePopup, setRulePopup] = useState(null);
  const [reciteFor, setReciteFor] = useState(null); // { text, ayah }
  const [openTafsir, setOpenTafsir] = useState(null); // رقم الآية المفتوح تفسيرها
  const [ayahRepeat, setAyahRepeat] = useState(1); // تكرار الآية ١-١٠
  const [rate, setRate] = useState(1); // سرعة التلاوة
  const [marks, setMarks] = useState({}); // { رقم الآية: فئة العلامة }
  const [spread, setSpread] = useState(false); // صفحتين جنب بعض
  const [showEn, setShowEn] = useState(false); // ترجمة إنجليزية تحت كل آية
  const [enData, setEnData] = useState(null);
  const [enState, setEnState] = useState("idle"); // idle | loading | ready | failed

  // الوضع الأفقي على شاشة عريضة = المصحف المفتوح. بنكشفه تلقائيًا،
  // والمستخدم يقدر يقفله. الفتح والقفل بيتحفظا لما يلفّ الجهاز.
  const [canSpread, setCanSpread] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (min-width: 700px)");
    const apply = () => {
      setCanSpread(mq.matches);
      setSpread(mq.matches);
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  // الترجمة بتتجاب مرة واحدة للسورة وتتخزّن — بعد كده أوفلاين.
  // بنجيبها بس لما المستخدم يفتح الترجمة، مش مع كل سورة، عشان
  // مانستهلكش باقة حد مش محتاجها.
  useEffect(() => {
    setEnData(null);
    setEnState("idle");
  }, [surah]);
  useEffect(() => {
    if (!showEn || enData || enState === "loading") return;
    let alive = true;
    setEnState("loading");
    loadAyahTranslations(surah).then((r) => {
      if (!alive) return;
      setEnData(r);
      setEnState(r ? "ready" : "failed");
    });
    return () => {
      alive = false;
    };
  }, [showEn, surah, enData, enState]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [voiceSearch, setVoiceSearch] = useState(false);
  const [currentAyah, setCurrentAyah] = useState(null);
  const [following, setFollowing] = useState(false);
  const currentAyahRef = useRef(null);
  const userScrollRef = useRef(0); // آخر مرة مرّر المستخدم بإيده
  const lastScrolledAyah = useRef(null);
  const [pendingAyah, setPendingAyah] = useState(null); // نروح لها بعد ما السورة تحمّل
  const [popup, setPopup] = useState(null); // { word, t, r, x, y }
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reciterId, setReciterId] = useState(RECITERS[0].id);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeWord, setActiveWord] = useState(null);
  const [repeat, setRepeat] = useState(1);
  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [selection, setSelection] = useState(null);
  const [playing, setPlaying] = useState(false);
  const reciter = RECITERS.find((r) => r.id === reciterId);
  const surahMeta = SURAHS.find((s) => s.id === surah);
  const stopAll = useCallback(() => {
    runRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (gapRef.current) clearTimeout(gapRef.current);
    rafRef.current = null;
    gapRef.current = null;
    const audio = audioRef.current;
    if (audio) audio.pause();
    setActiveWord(null);
    setPlaying(false);
  }, []);
  useEffect(() => stopAll, [stopAll]);
  useEffect(() => {
    let cancelled = false;
    stopAll();
    setData(null);
    setError(null);
    setSelection(null);
    setRangeStart(null);
    Promise.resolve(loadSurahTimings(reciter.qdcId, surah))
      .then((d) => !cancelled && setData(d))
      .catch(
        () =>
          !cancelled &&
          setError("تعذّر تحميل التوقيت لهذه السورة بهذا القارئ. جرّب سورة أخرى أو تحقق من الاتصال.")
      );
    return () => {
      cancelled = true;
    };
  }, [reciter.qdcId, surah, stopAll]);
  const flat = useMemo(() => {
    if (!data) return [];
    const out = [];
    for (const a of data.ayat) {
      for (const [pos, start, end] of a.segments) {
        out.push({ id: a.ayah * 1000 + pos, ayah: a.ayah, pos, start, end });
      }
    }
    return out.sort((x, y) => x.start - y.start);
  }, [data]);
  const playSpan = useCallback(
    (startMs, endMs, times, onTick) => {
      const audio = audioRef.current;
      if (!audio || !data) return;
      stopAll();
      const session = {};
      runRef.current = session;
      setPlaying(true);
      if (audio.src !== data.audioUrl) audio.src = data.audioUrl;
      audio.playbackRate = rate; // سرعة التلاوة
      let left = times;
      const begin = () => {
        if (runRef.current !== session) return;
        audio.currentTime = startMs / 1000;
        audio.play().catch(() => {});
        const tick = () => {
          if (runRef.current !== session) return;
          const ms = audio.currentTime * 1000;
          if (ms >= endMs) {
            audio.pause();
            left -= 1;
            if (left > 0) {
              gapRef.current = setTimeout(begin, 450);
            } else {
              stopAll();
            }
            return;
          }
          onTick?.(ms);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      };
      if (audio.readyState >= 1) begin();
      else audio.addEventListener("loadedmetadata", begin, { once: true });
    },
    [data, stopAll, rate]
  );

  // تكرار آية واحدة بالكامل — بيستخدم نفس محرّك التشغيل
  const repeatAyah = useCallback(
    (ayahNo) => {
      const line = data?.ayat.find((a) => a.ayah === ayahNo);
      if (!line?.segments.length) return;
      const start = line.segments[0][1];
      const end = line.segments[line.segments.length - 1][2];
      setSelection(null);
      setCurrentAyah(ayahNo);
      playSpan(start, end, ayahRepeat, (ms) => {
        const w = line.segments.find(([, s, e]) => ms >= s && ms < e);
        setActiveWord(w ? `${ayahNo}:${w[0]}` : null);
      });
    },
    [data, ayahRepeat, playSpan]
  );

  // العلامات المرجعية للسورة الحالية
  useEffect(() => {
    bookmarksForSurah(surah).then(setMarks);
  }, [surah]);

  const toggleMark = useCallback(
    async (ayahNo) => {
      const r = await cycleBookmark(surah, ayahNo);
      setMarks((m) => {
        const next = { ...m };
        if (r) next[ayahNo] = r.category;
        else delete next[ayahNo];
        return next;
      });
      buzz(12);
    },
    [surah]
  );
  // بيبدأ التلاوة المستمرة من كلمة معيّنة لآخر السورة.
  // بنستخدمها في زر التشغيل (من الأول) وفي القفز (seek) للآية اللي المستخدم
  // يدوس عليها أثناء التلاوة.
  const runFrom = useCallback(
    (startMs) => {
      if (!flat.length) return;
      const last = flat[flat.length - 1].end;
      let cursor = Math.max(0, flat.findIndex((w) => w.end > startMs));
      let lastKey = null;
      let lastAyah = null;
      playSpan(startMs, last, 1, (ms) => {
        while (cursor < flat.length - 1 && ms >= flat[cursor].end) cursor++;
        const w = flat[cursor];
        const key = ms >= w.start && ms < w.end ? `${w.ayah}:${w.pos}` : null;
        if (key !== lastKey) {
          lastKey = key;
          setActiveWord(key);
        }
        if (w.ayah !== lastAyah) {
          lastAyah = w.ayah;
          setCurrentAyah(w.ayah);
        }
      });
    },
    [flat, playSpan]
  );

  // تلاوة السورة كاملة مع تتبّع الكلمة الحالية.
  // بنستخدم مؤشّرًا زاحفًا مش بحث في كل إطار — التشغيل تصاعدي، فالمؤشّر
  // بيتقدّم للأمام بس. وبنحدّث الحالة لما الكلمة *تتغيّر* فقط، مش ٦٠ مرة في
  // الثانية، وإلا كان التطبيق هيعيد رسم السورة كلها مع كل إطار.
  const playSurah = useCallback(() => {
    if (!flat.length) return;
    setSelection(null);
    setRangeStart(null);
    setFollowing(true);
    runFrom(flat[0].start);
  }, [flat, runFrom]);

  const handleWordTap = useCallback((ayah, pos) => {
    if (!data) return;
    const id = ayah * 1000 + pos;
    if (rangeMode) {
      if (rangeStart == null) {
        setRangeStart(id);
        setSelection({ from: id, to: id });
        return;
      }
      const from = Math.min(rangeStart, id);
      const to = Math.max(rangeStart, id);
      setSelection({ from, to });
      setRangeStart(null);
      const inRange = flat.filter((w) => w.id >= from && w.id <= to);
      if (!inRange.length) return;
      const startMs = inRange[0].start;
      const endMs = inRange[inRange.length - 1].end;
      playSpan(startMs, endMs, repeat, (ms) => {
        const cur = inRange.find((w) => ms >= w.start && ms < w.end);
        setActiveWord(cur ? `${cur.ayah}:${cur.pos}` : null);
      });
      return;
    }
    const w = flat.find((x) => x.id === id);
    if (!w) return;
    setSelection(null);
    setActiveWord(`${ayah}:${pos}`);
    buzz(15);

    // أثناء التلاوة المستمرة: اللمس بينقل التلاوة للآية دي ويكمّل منها،
    // مش بيشغّل الكلمة لوحدها.
    if (following) {
      setCurrentAyah(ayah);
      userScrollRef.current = 0; // نرجّع المتابعة فورًا بعد قفزة مقصودة
      runFrom(w.start);
      return;
    }
    playSpan(w.start, w.end, repeat);
  }, [data, rangeMode, rangeStart, flat, repeat, playSpan, following, runFrom]);

  // ضغطة طويلة → ترجمة الكلمة (من الكاش أو الشبكة)
  const handleWordHold = useCallback(
    async (ayah, pos, at) => {
      buzz(15);
      const word = data?.ayat.find((a) => a.ayah === ayah)?.words[pos - 1] || "";
      setPopup({ word, t: "…", r: "", x: at.x, y: at.y });
      const tr = await loadTranslations(surah);
      const entry = tr?.[ayah]?.[pos - 1];
      setPopup({
        word,
        t: entry?.t || "الترجمة غير متاحة أوفلاين",
        r: entry?.r || "",
        x: at.x,
        y: at.y,
      });
    },
    [data, surah]
  );

  // لو المستخدم مرّر بإيده، بنوقف المتابعة ٣ ثواني عشان مانخطفش الشاشة منه
  useEffect(() => {
    const mark = () => {
      userScrollRef.current = Date.now();
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    return () => {
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
    };
  }, []);

  // المتابعة أثناء التلاوة. سرعة التمرير بتحدّد إمتى نمرّر:
  //   ayah  = مع كل آية      (الأبطأ، الأدق)
  //   three = كل ٣ آيات
  //   page  = لما الآية تخرج بره الشاشة (الأسرع، الأقل إزعاجًا)
  const followMode = settings?.followMode || "ayah";

  useEffect(() => {
    if (!playing || !currentAyah) return;
    if (Date.now() - userScrollRef.current < 3000) return; // مرّر بإيده لسه

    const el = currentAyahRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const offscreen = r.top < 70 || r.bottom > window.innerHeight - 70;

    let should = false;
    if (followMode === "ayah") should = true;
    else if (followMode === "three") {
      const last = lastScrolledAyah.current;
      should = last === null || currentAyah - last >= 3 || offscreen;
    } else should = offscreen; // page

    if (!should) return;
    lastScrolledAyah.current = currentAyah;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentAyah, playing, followMode]);

  // تنضيف المؤشّر لما التلاوة تقف
  useEffect(() => {
    if (!playing) {
      setCurrentAyah(null);
      setFollowing(false);
      lastScrolledAyah.current = null;
    }
  }, [playing]);

  // بيانات التجويد بتتجاب عند الطلب بس
  useEffect(() => {
    if (!tajweed) return;
    let alive = true;
    setTajweedErr(false);
    loadTajweed(surah).then((d) => {
      if (!alive) return;
      if (d) setTajweedData(d);
      else setTajweedErr(true);
    });
    return () => {
      alive = false;
    };
  }, [tajweed, surah]);

  useEffect(() => {
    setTajweedData(null);
  }, [surah]);

  // بنقسّم آيات التجويد لكلمات، وبنتأكد إن عدد الكلمات مطابق لعدد كلمات
  // التوقيت. لو مش مطابق بنرجع للنص العادي — أحسن من تلوين على الكلمة الغلط.
  const tajweedByAyah = useMemo(() => {
    if (!tajweed || !tajweedData || !data) return null;
    const out = {};
    for (const a of data.ayat) {
      const html = tajweedData[a.ayah];
      if (!html) continue;
      const w = tajweedWords(html);
      if (w.length === a.words.length) out[a.ayah] = w;
    }
    return out;
  }, [tajweed, tajweedData, data]);

  // القفز لنتيجة بحث: بنستنى السورة تحمّل ثم نمرّر للآية ونومّض عليها
  useEffect(() => {
    if (!pendingAyah || !data) return;
    const el = document.getElementById(`ayah-${pendingAyah}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-[#D4A853]", "rounded-lg");
    const t = setTimeout(() => {
      el.classList.remove("ring-2", "ring-[#D4A853]", "rounded-lg");
      setPendingAyah(null);
    }, 2200);
    return () => clearTimeout(t);
  }, [pendingAyah, data]);

  // سورة جاية من رابط عميق (مثلاً إشعار الكهف يوم الجمعة)
  useEffect(() => {
    if (!deepSurah) return;
    stopAll();
    setSurah(deepSurah);
    onDeepSurahDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepSurah]);

  // آخر موضع + السور الأخيرة
  useEffect(() => {
    pushRecentSurah?.(surah);
  }, [surah, pushRecentSurah]);

  useEffect(() => {
    if (!activeWord) return;
    const [a, p] = activeWord.split(":").map(Number);
    updateSettings?.({ lastPosition: { surah, ayah: a, word: p } });
  }, [activeWord, surah, updateSettings]);
  const changeReciter = (id) => {
    stopAll();
    const audio = audioRef.current;
    if (audio) {
      audio.removeAttribute("src");
      audio.load();
    }
    setReciterId(id);
  };
  const isLong = (data?.durationMs || 0) > 20 * 60 * 1000;
  return (
    <div className="rounded-3xl border border-[#E4DCC3] bg-[#FFFFFF] p-6 md:p-10 shadow-sm">
      <audio ref={audioRef} preload="metadata" />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 bg-[#1B4D3E] text-[#F5F0E8] rounded-xl px-4 py-2.5 font-bold"
          >
            <span style={{ fontFamily: UI_FONT }}>سورة {surahMeta.name}</span>
            <span className="text-[#D4A853] text-xs">▾</span>
          </button>
          <button
            onClick={() => {
              setVoiceSearch(false);
              setSearchOpen(true);
            }}
            className="rounded-xl px-3.5 py-2.5 font-bold border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
            title="بحث في القرآن"
          >
            🔍
          </button>
          {/* البحث الصوتي فوق ومباشر — مش مخبّي جوّه الشاشة */}
          <button
            onClick={() => {
              setVoiceSearch(true);
              setSearchOpen(true);
            }}
            className="rounded-xl w-12 h-11 grid place-items-center text-xl bg-[#D4A853] text-[#1E2A24] font-bold"
            title="بحث صوتي"
            aria-label="بحث صوتي"
          >
            🎤
          </button>
        </div>
        <span className="text-xs text-[#8A7A4E]">
          {reciter.name}
          {data?.durationMs ? ` · ${formatDuration(data.durationMs)}` : ""}
        </span>
      </div>
      {RECITERS.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {RECITERS.map((r) => (
            <button
              key={r.id}
              onClick={() => changeReciter(r.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                reciterId === r.id
                  ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                  : "border-[#E4DCC3] text-[#5B6B62] hover:border-[#1B4D3E]/50"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {/* الختمة */}
      {khatma && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#8A7A4E]">
              الختمة: {toArabicDigits(khatma.count)} من ١١٤ سورة
            </span>
            <button
              onClick={() => khatma.markRead(surah)}
              disabled={khatma.ids.has(surah)}
              className={`px-3 py-1 rounded-lg font-semibold ${
                khatma.ids.has(surah)
                  ? "bg-[#1B4D3E]/10 text-[#1B4D3E] dark:text-[#8FD6C0] cursor-default"
                  : "bg-[#D4A853] text-[#1E2A24]"
              }`}
            >
              {khatma.ids.has(surah) ? "✓ اتقرأت" : "علّم كمقروءة"}
            </button>
          </div>
          <div className="h-2 bg-[#E4DCC3] dark:bg-[#3A5148] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B4D3E] transition-all duration-500"
              style={{ width: `${(khatma.count / 114) * 100}%` }}
            />
          </div>
          {khatma.complete && (
            <p className="mt-2 text-center text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853]">
              🎉 مبروك! ختمت القرآن
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={playing ? stopAll : playSurah}
          disabled={!data}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm ${
            !data
              ? "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
              : playing
              ? "bg-[#8A4E4E] text-[#F5F0E8]"
              : "bg-[#1B4D3E] text-[#F5F0E8]"
          }`}
        >
          {playing ? "إيقاف ■" : "شغّل السورة ▶"}
        </button>
        <span className="text-xs text-[#5B6B62]">
          {playing ? "الكلمة الحالية بتتظلّل مع التلاوة" : "تلاوة كاملة مع تتبّع الكلمات"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-[#E4DCC3]">
        <span className="text-xs text-[#8A7A4E] ml-1">التكرار:</span>
        {REPEAT_OPTIONS.map((o) => (
          <button
            key={o.label}
            onClick={() => setRepeat(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              repeat === o.value
                ? "bg-[#D4A853] border-[#D4A853] text-[#1E2A24]"
                : "border-[#E4DCC3] text-[#5B6B62]"
            }`}
          >
            {o.label}
          </button>
        ))}
        <span className="w-px h-6 bg-[#E4DCC3] mx-2" />
        <button
          onClick={() => {
            setRangeMode((v) => !v);
            setRangeStart(null);
            setSelection(null);
            stopAll();
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            rangeMode
              ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
              : "border-[#E4DCC3] text-[#5B6B62]"
          }`}
        >
          تحديد مقطع
        </button>

        {/* تكرار الآية + السرعة */}
        <span className="w-px h-6 bg-[#E4DCC3] dark:bg-[#3A5148] mx-1" />
        <label className="flex items-center gap-1.5 text-xs text-[#8A7A4E]">
          تكرار الآية
          <select
            value={ayahRepeat}
            onChange={(e) => setAyahRepeat(Number(e.target.value))}
            className="bg-white dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-2 py-1 text-xs"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {toArabicDigits(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[#8A7A4E]">
          السرعة
          <select
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="bg-white dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-lg px-2 py-1 text-xs"
          >
            {[0.5, 0.75, 1, 1.25, 1.5].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setTajweed((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            tajweed
              ? "bg-[#2E9E6B] border-[#2E9E6B] text-[#F5F0E8]"
              : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          }`}
          title="تلوين أحكام التجويد من بيانات مُدقّقة"
        >
          تلوين التجويد
        </button>
        <button
          onClick={() => setShowEn((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            showEn
              ? "bg-[#3E6D9E] border-[#3E6D9E] text-[#F5F0E8]"
              : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          }`}
          title={`ترجمة الآيات — ${EN_NAME}`}
        >
          🌐 English
        </button>
        {canSpread && (
          <button
            onClick={() => setSpread((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              spread
                ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
            }`}
            title="صفحتين جنب بعض زي المصحف المفتوح"
          >
            📖 صفحتين
          </button>
        )}
        <button
          onClick={() => {
            const a = data?.ayat?.[0];
            const key = activeWord ? Number(activeWord.split(":")[0]) : a?.ayah;
            const line = data?.ayat.find((x) => x.ayah === key) || a;
            if (line) setReciteFor({ text: line.words.join(" "), ayah: line.ayah });
          }}
          disabled={!data}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] disabled:opacity-40"
        >
          سجّل صوتك 🎤
        </button>
        <span className="text-[11px] text-[#8A7A4E]">
          📖 جنب كل آية = تفسيرها
        </span>
      </div>

      {/* مفتاح ألوان العلامات — بيظهر لما يكون فيه علامات في السورة دي */}
      {Object.keys(marks).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5 text-[11px]">
          <span className="text-[#8A7A4E]">علاماتك:</span>
          {CATEGORIES.filter((c) => Object.values(marks).includes(c.id)).map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.icon} {c.label} (
              {toArabicDigits(Object.values(marks).filter((m) => m === c.id).length)})
            </span>
          ))}
          <span className="text-[#8A7A4E]">— دوس 🔖 لتغيير الفئة</span>
        </div>
      )}

      {/* حجم الخط اتنقل لـ المزيد ← الإعدادات (مصدر تحكّم واحد) */}

      {tajweed && (
        <div className="mb-5">
          {tajweedErr ? (
            <p className="text-[11px] text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-2.5">
              تعذّر تحميل بيانات التجويد لهذه السورة — محتاج اتصال أول مرة.
            </p>
          ) : !tajweedByAyah ? (
            <p className="text-[11px] text-[#8A7A4E]">جاري تحميل بيانات التجويد…</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[...new Set(
                  Object.values(tajweedByAyah)
                    .flat(2)
                    .map((p) => p.rule)
                    .filter((r) => r && TAJWEED_RULES[r])
                )].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRulePopup(r)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg ${TAJWEED_RULES[r].cls}`}
                  >
                    {TAJWEED_RULES[r].name}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#8A7A4E]">
                دوس على أي حرف ملوّن يشرح لك القاعدة. الألوان من بيانات التجويد
                المُدقّقة في Quran.com — مش استنتاجًا من النص.
              </p>
            </>
          )}
        </div>
      )}
      {rangeMode && (
        <p className="text-xs text-[#1B4D3E] bg-[#1B4D3E]/8 rounded-xl px-4 py-2.5 mb-5">
          {rangeStart == null
            ? "المس الكلمة الأولى في المقطع…"
            : "المس الكلمة الأخيرة — ثم يُكرَّر المقطع حسب عدد التكرار."}
        </p>
      )}
      {error && (
        <p className="text-sm text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-3 mb-6">{error}</p>
      )}
      {isLong && (
        <p className="text-xs text-[#8A7A4E] bg-[#FBF3E2] rounded-xl px-4 py-2.5 mb-5">
          سورة طويلة ({formatDuration(data.durationMs)}) — الملف بيُشغَّل بالبثّ والقفز
          للكلمة بيطلب جزء من الملف فقط، فأول لمسة ممكن تتأخر شوية على اتصال بطيء.
        </p>
      )}
      {!data && !error ? (
        <p className="text-sm text-[#5B6B62] py-12 text-center">جاري تحميل التوقيت…</p>
      ) : data ? (
        <div
          dir="rtl"
          className={`text-[#1E2A24] dark:text-[#F5F0E8] text-justify select-none ${
            spread ? "iqra-mushaf-spread" : ""
          }`}
          style={{
            fontFamily: QURAN_FONT,
            fontSize: `${settings?.fontSize ?? 2}rem`,
            lineHeight: 1.7,
          }}
        >
          {data.ayat.map((a) => (
            <React.Fragment key={`${a.ayah}-${reciterId}`}>
              <AyahLine
                ayahData={a}
                activeWord={
                  activeWord && activeWord.startsWith(`${a.ayah}:`) ? activeWord : null
                }
                selection={selection}
                onWordTap={handleWordTap}
                onWordHold={handleWordHold}
                tajweedWordsList={tajweedByAyah?.[a.ayah]}
                onRule={(r) => setRulePopup(r)}
                activeRef={activeElRef}
                onTafsir={(n) => setOpenTafsir((cur) => (cur === n ? null : n))}
                tafsirOpen={openTafsir === a.ayah}
                isCurrent={playing && currentAyah === a.ayah}
                currentRef={currentAyahRef}
                mark={marks[a.ayah]}
                onMark={toggleMark}
                onRepeat={repeatAyah}
              />
              {showEn && enData?.[a.ayah] && (
                <span
                  dir="ltr"
                  lang="en"
                  className="block text-left text-[#5B6B62] dark:text-[#A9BDB2] border-r-2 border-[#3E6D9E]/40 pr-3 my-2"
                  style={{ fontFamily: UI_FONT, fontSize: "0.9rem", lineHeight: 1.6 }}
                >
                  {enData[a.ayah]}
                </span>
              )}
              {openTafsir === a.ayah && (
                <TafsirAccordion
                  surah={surah}
                  ayah={a.ayah}
                  toArabicDigits={toArabicDigits}
                  onClose={() => setOpenTafsir(null)}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      ) : null}
      <div className="mt-8 flex items-start gap-3 text-sm text-[#5B6B62] border-t border-[#E4DCC3] pt-5">
        <span className="text-[#1B4D3E] font-bold">↳</span>
        <p>
          لمس أي كلمة بيقفز لموضعها <strong>الحقيقي</strong> في التلاوة — حدود كل
          كلمة متقاسة بالمللي ثانية بمحاذاة صوتية، مش تقسيم تقريبي. الصوت هو ملف
          السورة كاملة من Quran.com CDN، وهو نفس التسجيل اللي اتقاست عليه
          التوقيتات فمافيش انزياح. توقيت الفاتحة مدمج جوّه التطبيق (أوفلاين
          وفوري)، وباقي السور بتتجاب حيًّا وتتخزّن في الكاش.
        </p>
      </div>
      {/* متحكّم سرعة التمرير — جنب الـ scrollbar، بيظهر أثناء التلاوة بس
          عشان مايزحمش الشاشة وهو مش مستخدَم */}
      {playing && (
        <div
          className="fixed left-1.5 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 bg-[#FFFFFF]/95 dark:bg-[#243830]/95 border border-[#E4DCC3] dark:border-[#3A5148] rounded-full py-3 px-1.5 shadow-lg"
          dir="ltr"
        >
          <span className="text-[9px] text-[#8A7A4E] writing-mode-vertical">بطيء</span>
          {[
            ["ayah", "آية آية", "•"],
            ["three", "٣ آيات", "≡"],
            ["page", "صفحة", "⤓"],
          ].map(([mode, label, icon]) => (
            <button
              key={mode}
              onClick={() => {
                updateSettings?.({ followMode: mode });
                lastScrolledAyah.current = null;
              }}
              className={`w-7 h-7 grid place-items-center rounded-full text-xs font-bold transition-colors ${
                followMode === mode
                  ? "bg-[#1B4D3E] text-[#F5F0E8]"
                  : "text-[#5B6B62] dark:text-[#A9BDB2]"
              }`}
              title={`سرعة التمرير: ${label}`}
              aria-label={`سرعة التمرير: ${label}`}
            >
              {icon}
            </button>
          ))}
          <span className="text-[9px] text-[#8A7A4E]">سريع</span>
        </div>
      )}

      {searchOpen && (
        <QuranSearch
          SURAHS={SURAHS}
          toArabicDigits={toArabicDigits}
          startVoice={voiceSearch}
          onClose={() => setSearchOpen(false)}
          onPick={(sId, aId) => {
            stopAll();
            setSearchOpen(false);
            setSurah(sId);
            setPendingAyah(aId);
          }}
        />
      )}

      {pickerOpen && (
        <SurahPicker
          current={surah}
          recents={settings?.recentSurahs || []}
          onPick={(id) => {
            setSurah(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {rulePopup && TAJWEED_RULES[rulePopup] && (
        <div
          className="fixed inset-0 bg-[#1E2A24]/40 z-[60] flex items-center justify-center p-5"
          onClick={() => setRulePopup(null)}
        >
          <div
            className="bg-[#FFFFFF] dark:bg-[#243830] rounded-3xl border border-[#E4DCC3] dark:border-[#3A5148] max-w-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`inline-block px-4 py-2 rounded-xl mb-3 ${TAJWEED_RULES[rulePopup].cls}`}
            >
              <span className="font-bold text-lg">{TAJWEED_RULES[rulePopup].name}</span>
            </div>
            <div className="text-xs text-[#8A7A4E] mb-2">{TAJWEED_RULES[rulePopup].short}</div>
            <p className="text-sm text-[#1E2A24] dark:text-[#F5F0E8] leading-relaxed">
              {TAJWEED_RULES[rulePopup].desc}
            </p>
            <button
              onClick={() => setRulePopup(null)}
              className="mt-5 bg-[#1B4D3E] text-[#F5F0E8] px-6 py-2.5 rounded-xl font-bold text-sm"
            >
              فهمت
            </button>
          </div>
        </div>
      )}

      {reciteFor && (
        <RecitationChecker
          ayahText={reciteFor.text}
          ayahNumber={toArabicDigits(reciteFor.ayah)}
          onClose={() => setReciteFor(null)}
        />
      )}

      {popup && (
        <div className="fixed inset-0 z-[55]" onClick={() => setPopup(null)}>
          <div
            className="absolute bg-[#1E2A24] text-[#F5F0E8] rounded-2xl px-4 py-3 shadow-xl max-w-[16rem] text-center"
            style={{
              left: Math.min(Math.max(popup.x - 100, 8), (typeof window !== "undefined" ? window.innerWidth : 400) - 208),
              top: Math.max(popup.y - 96, 8),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xl mb-1" style={{ fontFamily: QURAN_FONT }}>
              {popup.word}
            </div>
            <div className="text-sm" dir="ltr">
              {popup.t}
            </div>
            {popup.r && (
              <div className="text-[11px] text-[#D4A853] mt-1" dir="ltr">
                {popup.r}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ============================================================
//  الكتابة اليدوية — الرسم والتصحيح
// ------------------------------------------------------------
//  التصحيح بيتعمل على شبكة ثابتة (ANALYSIS_SIZE) مش على مقاس الكانفاس
//  المعروض، عشان النتيجة تطلع واحدة على الموبايل وعلى الشاشة الكبيرة.
// ============================================================
const ANALYSIS_SIZE = 200;
const STROKE_RATIO = 0.055; // سُمك القلم نسبةً لعرض الكانفاس

// نضبط حجم الخط بحيث النص يدخل جوّه المساحة — لازم لأن مستويات الكبار
// فيها جُمل وآيات كاملة مش حروف مفردة.
function fitFontSize(ctx, text, maxW, maxH) {
  let fs = maxH;
  for (let i = 0; i < 14; i++) {
    ctx.font = `${fs}px ${QURAN_FONT}`;
    const w = ctx.measureText(text).width;
    if (w <= maxW || fs <= 12) break;
    fs = Math.max(12, fs * (maxW / w) * 0.97);
  }
  return fs;
}

function paintGlyph(ctx, text, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fs = fitFontSize(ctx, text, size * 0.84, size * 0.62);
  ctx.font = `${fs}px ${QURAN_FONT}`;
  ctx.fillText(text, size / 2, size / 2);
  ctx.restore();
}

function paintStrokes(ctx, strokes, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * STROKE_RATIO;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x * size, stroke[0].y * size);
    if (stroke.length === 1) ctx.lineTo(stroke[0].x * size + 0.01, stroke[0].y * size);
    else for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x * size, stroke[i].y * size);
    ctx.stroke();
  }
  ctx.restore();
}

function maskFrom(paint, size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  paint(ctx);
  const d = ctx.getImageData(0, 0, size, size).data;
  const m = new Uint8Array(size * size);
  for (let p = 0, i = 3; p < m.length; p++, i += 4) m[p] = d[i] > 40 ? 1 : 0;
  return m;
}

// توسيع (dilation) بمرشّح أقصى قابل للفصل — أفقي ثم رأسي. بيسمح بهامش خطأ
// حوالي ٥٪ من عرض اللوحة، عشان الطفل مش هيرسم على الحرف بالظبط بيكسل ببيكسل.
function dilate(mask, size, r) {
  if (r <= 0) return mask;
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < size; y++) {
    const row = y * size;
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < size && mask[row + xx]) v = 1;
      }
      tmp[row + x] = v;
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < size && tmp[yy * size + x]) v = 1;
      }
      out[y * size + x] = v;
    }
  }
  return out;
}

// مهم: مش بنقيس التغطية لوحدها. لو قِسنا التغطية بس، الطفل اللي بيشخبط على
// اللوحة كلها هياخد ٣ نجوم لأنه "غطّى" الحرف بالكامل. فبنقيس اتنين:
//   الاسترجاع = قد إيه من الحرف اتغطّى برسمه
//   الدقة     = قد إيه من رسمه وقع على الحرف (بيعاقب الشخبطة)
// والنتيجة هي المتوسط التوافقي بينهم (F1).
function scoreDrawing(text, strokes) {
  const size = ANALYSIS_SIZE;
  const target = maskFrom((ctx) => paintGlyph(ctx, text, size, "#000"), size);
  const user = maskFrom((ctx) => paintStrokes(ctx, strokes, size, "#000"), size);

  const tol = Math.max(2, Math.round(size * 0.05));
  const targetPlus = dilate(target, size, tol);
  const userPlus = dilate(user, size, tol);

  let tCount = 0, uCount = 0, hitT = 0, hitU = 0;
  for (let i = 0; i < target.length; i++) {
    if (target[i]) { tCount++; if (userPlus[i]) hitT++; }
    if (user[i]) { uCount++; if (targetPlus[i]) hitU++; }
  }
  if (!tCount || !uCount) return { stars: 0, recall: 0, precision: 0, f1: 0 };

  const recall = hitT / tCount;
  const precision = hitU / uCount;
  const f1 = recall + precision ? (2 * recall * precision) / (recall + precision) : 0;
  const stars = f1 >= 0.7 ? 3 : f1 >= 0.5 ? 2 : f1 >= 0.28 ? 1 : 0;
  return { stars, recall, precision, f1 };
}

function Stars({ count }) {
  return (
    <span className="text-3xl tracking-widest" aria-label={`${count} من ٣ نجوم`}>
      {"⭐".repeat(count)}
      <span className="opacity-25">{"☆".repeat(Math.max(0, 3 - count))}</span>
    </span>
  );
}

function TraceCanvas({ text, guide = true, fontsReady, onResult, resetKey }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(false);
  const [box, setBox] = useState(320);
  const [strokeCount, setStrokeCount] = useState(0);
  const [result, setResult] = useState(null);

  // اللوحة بتتمدّد مع عرض الحاوية. الخطوط متخزّنة بإحداثيات نسبية (٠..١)
  // فتغيير المقاس أو تدوير الجهاز مابيضيّعش الرسم.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setBox(Math.max(200, Math.round(el.clientWidth)));
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(box * dpr)) {
      canvas.width = Math.round(box * dpr);
      canvas.height = Math.round(box * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box, box);
    if (guide) paintGlyph(ctx, text, box, "#E4DCC3");
    paintStrokes(ctx, strokesRef.current, box, "#1B4D3E");
  }, [box, guide, text]);

  useEffect(() => {
    redraw();
  }, [redraw, fontsReady]);

  // تغيّر الحرف أو إعادة المحاولة = لوحة نضيفة
  useEffect(() => {
    strokesRef.current = [];
    setStrokeCount(0);
    setResult(null);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, resetKey]);

  const pointOf = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    strokesRef.current.push([pointOf(e)]);
    redraw();
  };
  const onMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const s = strokesRef.current[strokesRef.current.length - 1];
    const p = pointOf(e);
    const last = s[s.length - 1];
    // تجاهل النقط شديدة القرب — بيقلّل حجم المسار من غير ما يبان فرق
    if (Math.hypot(p.x - last.x, p.y - last.y) < 0.004) return;
    s.push(p);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#1B4D3E";
    ctx.lineWidth = box * STROKE_RATIO;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x * box, last.y * box);
    ctx.lineTo(p.x * box, p.y * box);
    ctx.stroke();
  };
  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setStrokeCount(strokesRef.current.length);
  };

  const clear = () => {
    strokesRef.current = [];
    setStrokeCount(0);
    setResult(null);
    redraw();
  };
  const undo = () => {
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    setResult(null);
    redraw();
  };
  const check = () => {
    const r = scoreDrawing(text, strokesRef.current);
    setResult(r);
    onResult?.(r);
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div ref={wrapRef} className="w-full max-w-[min(92vw,34rem)]">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: box, touchAction: "none" }}
          className="rounded-3xl border border-[#E4DCC3] bg-[#FFFFFF] touch-none block"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={check}
          disabled={!strokeCount}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm ${
            strokeCount
              ? "bg-[#1B4D3E] text-[#F5F0E8]"
              : "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
          }`}
        >
          صحّح
        </button>
        <button
          onClick={undo}
          disabled={!strokeCount}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E4DCC3] text-[#5B6B62] disabled:opacity-40"
        >
          تراجع
        </button>
        <button
          onClick={clear}
          disabled={!strokeCount}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#E4DCC3] text-[#5B6B62] disabled:opacity-40"
        >
          مسح
        </button>
      </div>

      {result ? (
        <div className="flex flex-col items-center gap-1.5 text-center">
          <Stars count={result.stars} />
          <span className="text-sm text-[#5B6B62]">
            {result.stars === 3
              ? "ممتاز! رسمك مطابق."
              : result.stars === 2
              ? "كويس — قرّب أكتر من خطوط الحرف."
              : result.stars === 1
              ? "لسه فيه شغل — اتبع الحرف الباهت."
              : "الرسم بعيد عن الحرف — جرّب تاني."}
          </span>
          <span className="text-[11px] text-[#8A7A4E]">
            تغطية {Math.round(result.recall * 100)}٪ · دقة {Math.round(result.precision * 100)}٪
          </span>
        </div>
      ) : (
        <span className="text-xs text-[#5B6B62]">
          {guide ? "اتبع خطوط الحرف الباهت بإصبعك" : "ارسم من الذاكرة — مفيش حرف يتبعه"}
        </span>
      )}
    </div>
  );
}
// ============================================================
//  الاختبار القصير
// ============================================================
function buildQuiz(lesson, count = 3) {
  const pool = lesson.items.filter((i) => i.g);
  if (pool.length < 4) return [];
  return shuffle(pool)
    .slice(0, Math.min(count, pool.length))
    .map((answer) => {
      const decoys = shuffle(pool.filter((i) => i.g !== answer.g)).slice(0, 3);
      return { answer, options: shuffle([answer, ...decoys]) };
    });
}
function Quiz({ lesson, onPass, onRetry, speak, voiceReady, fontsReady, onAnswer }) {
  const [questions] = useState(() => buildQuiz(lesson));
  // سؤال الكتابة: نفس فكرة الاختبار بس بالعكس — نقوله الحرف ويرسمه من غير
  // ما يشوفه (اللوحة من غير حرف باهت يتبعه).
  const [writeTarget] = useState(() => {
    const pool = lesson.items.filter((i) => i.g);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  });
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [peek, setPeek] = useState(lesson.quiz === "recall");
  const [writeResult, setWriteResult] = useState(null);
  const [writeAttempt, setWriteAttempt] = useState(0);
  const q = questions[idx];
  const inWritePhase = questions.length > 0 && idx >= questions.length && !!writeTarget;
  useEffect(() => {
    if (lesson.quiz !== "recall" || !q) return;
    setPeek(true);
    const t = setTimeout(() => setPeek(false), 1600);
    return () => clearTimeout(t);
  }, [idx, lesson.quiz, q]);
  if (!questions.length) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm text-[#5B6B62] max-w-xs">
          هذا الدرس قصير جدًا لبناء اختبار — راجعه ثم أكمِل.
        </p>
        <button
          onClick={onPass}
          className="bg-[#1B4D3E] text-[#F5F0E8] px-8 py-3 rounded-xl font-bold"
        >
          إنهاء الدرس
        </button>
      </div>
    );
  }
  if (inWritePhase) {
    const writePassed = (writeResult?.stars || 0) >= 2;
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="text-xs text-[#8A7A4E]">سؤال الكتابة — الأخير</div>
        <div className="text-center">
          <p className="text-sm text-[#5B6B62] mb-2">ارسم بإصبعك:</p>
          <div className="text-3xl font-bold text-[#1B4D3E]">
            {writeTarget.name || writeTarget.g}
          </div>
          {!writeTarget.name && (
            <p className="text-[11px] text-[#8A7A4E] mt-1">حاول ترسمه زي ما شفته فوق</p>
          )}
        </div>
        <TraceCanvas
          text={writeTarget.g}
          guide={false}
          fontsReady={fontsReady}
          onResult={setWriteResult}
          resetKey={writeAttempt}
        />
        {writeResult && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setWriteResult(null);
                setWriteAttempt((n) => n + 1);
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-[#E4DCC3] text-[#5B6B62]"
            >
              حاول تاني
            </button>
            <button
              onClick={() => setIdx((i) => i + 1)}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm ${
                writePassed ? "bg-[#D4A853] text-[#1E2A24]" : "bg-[#1B4D3E] text-[#F5F0E8]"
              }`}
            >
              {writePassed ? "إنهاء الاختبار" : "تخطّي وإنهاء"}
            </button>
          </div>
        )}
      </div>
    );
  }
  const totalQuestions = questions.length + (writeTarget ? 1 : 0);
  const done = idx > questions.length || (idx >= questions.length && !writeTarget);
  if (done) {
    const writePoint = (writeResult?.stars || 0) >= 2 ? 1 : 0;
    const finalScore = score + (writeTarget ? writePoint : 0);
    const passed = finalScore >= Math.ceil(totalQuestions * 0.67);
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="text-5xl">{passed ? "✓" : "↺"}</div>
        <h2 className="text-xl font-bold text-[#1B4D3E]">
          {toArabicDigits(finalScore)} من {toArabicDigits(totalQuestions)}
        </h2>
        {writeTarget && writeResult && (
          <div className="flex flex-col items-center gap-1">
            <Stars count={writeResult.stars} />
            <span className="text-xs text-[#8A7A4E]">درجة الكتابة</span>
          </div>
        )}
        <p className="text-sm text-[#5B6B62] max-w-xs">
          {passed ? "ممتاز! المستوى التالي اتفتح." : "قريّب — راجع الدرس وجرّب تاني."}
        </p>
        <button
          onClick={passed ? onPass : onRetry}
          className={`px-8 py-3 rounded-xl font-bold ${
            passed ? "bg-[#D4A853] text-[#1E2A24]" : "bg-[#1B4D3E] text-[#F5F0E8]"
          }`}
        >
          {passed ? "رجوع للمستويات" : "إعادة الدرس"}
        </button>
      </div>
    );
  }
  const prompt =
    lesson.quiz === "name" && q.answer.name ? (
      <span className="text-3xl font-bold text-[#1B4D3E]">{q.answer.name}</span>
    ) : peek ? (
      <span className="text-[4rem] leading-none" style={{ fontFamily: QURAN_FONT }}>
        {q.answer.g}
      </span>
    ) : (
      <span className="text-3xl text-[#5B6B62]">أيّهم شُفت؟</span>
    );
  const choose = (opt) => {
    if (picked) return;
    setPicked(opt);
    const right = opt.g === q.answer.g;
    if (right) setScore((s) => s + 1);
    buzz(right ? 15 : [20, 40, 20]);
    // بنسجّل على *الإجابة الصحيحة* مش اللي اختارها — عشان التكرار المتباعد
    // يعرف أي حرف اللي الطفل تعثّر فيه
    onAnswer?.(q.answer.g, right);
    setTimeout(() => {
      setPicked(null);
      setIdx((i) => i + 1);
    }, 900);
  };
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-md">
      <div className="text-xs text-[#8A7A4E]">
        سؤال {toArabicDigits(idx + 1)} من {toArabicDigits(totalQuestions)}
      </div>
      <div className="min-h-[6rem] flex items-center gap-4">
        {prompt}
        {voiceReady && (
          <button
            onClick={() => speak(q.answer.g)}
            className="text-2xl text-[#1B4D3E]"
            aria-label="استمع"
          >
            🔊
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        {q.options.map((opt, i) => {
          const isAnswer = opt.g === q.answer.g;
          const state = !picked
            ? "idle"
            : opt.g === picked.g
            ? isAnswer
              ? "right"
              : "wrong"
            : isAnswer
            ? "right"
            : "idle";
          return (
            <button
              key={`${opt.g}-${i}`}
              onClick={() => choose(opt)}
              disabled={!!picked}
              className={`rounded-2xl border py-6 px-3 text-[2.5rem] leading-none transition-colors ${
                state === "right"
                  ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                  : state === "wrong"
                  ? "bg-[#FBEDED] border-[#8A4E4E] text-[#8A4E4E]"
                  : "bg-[#FBF8EF] border-[#E4DCC3] text-[#1E2A24]"
              }`}
              style={{ fontFamily: QURAN_FONT }}
            >
              {opt.g}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// ============================================================
//  شاشة الدرس
// ============================================================
function LessonView({ audience, levelId, onClose, onComplete, fontsReady, learning }) {
  const baseLesson = LESSONS[audience][levelId];
  const { speak, status } = useArabicVoice();

  // التكرار المتباعد: الحروف اللي غلط فيها وحان وقت مراجعتها تتقدّم لأول
  // الدرس. الترتيب بيتحسب مرة واحدة عند فتح الدرس عشان مايتغيّرش تحت إيده.
  const lesson = useMemo(() => {
    const due = learning?.dueLetters?.() || [];
    if (!due.length) return baseLesson;
    const dueSet = new Set(due);
    const first = baseLesson.items.filter((i) => dueSet.has(i.g));
    if (!first.length) return baseLesson;
    const rest = baseLesson.items.filter((i) => !dueSet.has(i.g));
    return { ...baseLesson, items: [...first, ...rest] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLesson]);

  const hard = learning?.hardLetters?.() || [];
  // كل مستوى بقى: قراءة ← كتابة ← اختبار
  const [phase, setPhase] = useState("read");
  const [step, setStep] = useState(0);
  const [writeStars, setWriteStars] = useState({});
  const ayahAudioRef = useRef(null);
  const total = lesson.items.length;
  const current = lesson.items[step];
  const PHASES = [
    { id: "read", label: "قراءة" },
    { id: "write", label: "كتابة" },
    { id: "quiz", label: "اختبار" },
  ];
  const phaseIndex = PHASES.findIndex((p) => p.id === phase);
  const playItem = (item) => {
    if (item.ayah) {
      const line = HUSARY_SURAH_1.ayat.find((a) => a.ayah === item.ayah);
      const audio = ayahAudioRef.current;
      if (!line || !audio) return;
      const startMs = line.segments[0][1];
      const endMs = line.segments[line.segments.length - 1][2];
      if (audio.src !== HUSARY_SURAH_1.audioUrl) audio.src = HUSARY_SURAH_1.audioUrl;
      const begin = () => {
        audio.currentTime = startMs / 1000;
        audio.play().catch(() => {});
        const stop = () => {
          if (audio.currentTime * 1000 >= endMs) {
            audio.pause();
            audio.removeEventListener("timeupdate", stop);
          }
        };
        audio.addEventListener("timeupdate", stop);
      };
      if (audio.readyState >= 1) begin();
      else audio.addEventListener("loadedmetadata", begin, { once: true });
      return;
    }
    speak(item.g);
  };
  const restart = () => {
    setPhase("read");
    setStep(0);
    setWriteStars({});
  };
  const finish = () => {
    onComplete(audience, levelId);
    onClose();
  };
  // القفز للكتابة فورًا من غير ما يكمل القراءة
  const skipToWrite = () => {
    setStep(0);
    setPhase("write");
  };
  // نهاية القراءة → الكتابة (من أول عنصر تاني)، ونهاية الكتابة → الاختبار
  const advance = () => {
    if (step + 1 < total) {
      setStep((s) => s + 1);
      return;
    }
    if (phase === "read") {
      setStep(0);
      setPhase("write");
    } else if (phase === "write") {
      setPhase("quiz");
    }
  };
  const nextLabel =
    step + 1 < total
      ? `التالي (${toArabicDigits(step + 1)}/${toArabicDigits(total)})`
      : phase === "read"
      ? "انتقل للكتابة"
      : "ابدأ الاختبار";
  return (
    <div className="fixed inset-0 bg-[#F5F0E8] z-50 flex flex-col overflow-y-auto" dir="rtl">
      <audio ref={ayahAudioRef} preload="none" />
      <div className="max-w-3xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <button onClick={onClose} className="text-[#5B6B62] text-sm font-semibold">
          إغلاق ✕
        </button>
        <span className="text-sm font-bold text-[#1B4D3E]">{lesson.title}</span>
      </div>

      {/* مؤشر المراحل الثلاث */}
      <div className="max-w-3xl w-full mx-auto px-6 flex items-center gap-2 mb-3">
        {PHASES.map((p, i) => (
          <div key={p.id} className="flex-1 flex flex-col gap-1.5">
            <div className="h-1.5 bg-[#E4DCC3] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1B4D3E] transition-all duration-300"
                style={{
                  width:
                    i < phaseIndex
                      ? "100%"
                      : i > phaseIndex
                      ? "0%"
                      : phase === "quiz"
                      ? "100%"
                      : `${Math.min((step / total) * 100, 100)}%`,
                }}
              />
            </div>
            <span
              className={`text-[11px] text-center ${
                i === phaseIndex ? "text-[#1B4D3E] font-bold" : "text-[#A79E86]"
              }`}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {phase === "read" && (
        <div className="max-w-3xl w-full mx-auto px-6 pt-3">
          <VoiceWarning status={status} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-4 md:px-6 py-6">
        {phase === "read" ? (
          <div className="flex flex-col items-center gap-8">
            <button
              onClick={() => playItem(current)}
              className="text-[5rem] md:text-[6rem] leading-none text-[#1E2A24] bg-[#FBF8EF] border border-[#E4DCC3] rounded-3xl px-10 md:px-16 py-10 md:py-12 active:scale-95 transition-transform max-w-full"
              style={{ fontFamily: QURAN_FONT }}
            >
              {current.g}
            </button>
            {current.name && (
              <div className="text-2xl font-bold text-[#1B4D3E]">{current.name}</div>
            )}
            {hard.includes(current.g) && (
              <div className="flex items-center gap-2 text-xs bg-[#FBF3E2] border border-[#D4A853] text-[#6B5A2E] rounded-xl px-4 py-2.5">
                <span>📌 الحرف ده صعب عليك — ادرسه تاني بالراحة</span>
                <button
                  onClick={() => setStep(0)}
                  className="font-bold underline underline-offset-2"
                >
                  من الأول
                </button>
              </div>
            )}
            <p className="text-sm text-[#5B6B62] text-center">
              {current.ayah
                ? "المس لسماع التلاوة بصوت الشيخ الحصري"
                : status === "ready"
                ? "المس لسماع النطق"
                : "الاسم مكتوب تحت الشكل — الصوت غير متاح على هذا الجهاز"}
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={advance}
                className="bg-[#1B4D3E] text-[#F5F0E8] px-8 py-3 rounded-xl font-bold"
              >
                {nextLabel}
              </button>
              <button
                onClick={skipToWrite}
                className="text-sm text-[#1B4D3E] font-semibold underline underline-offset-4"
              >
                تخطّى القراءة ← اكتب على طول
              </button>
            </div>
          </div>
        ) : phase === "write" ? (
          <div className="w-full flex flex-col items-center gap-5">
            <div className="text-center">
              <p className="text-xs text-[#8A7A4E] mb-1">
                {toArabicDigits(step + 1)} من {toArabicDigits(total)}
              </p>
              {current.name && (
                <div className="text-2xl font-bold text-[#1B4D3E]">{current.name}</div>
              )}
            </div>
            <TraceCanvas
              text={current.g}
              guide
              fontsReady={fontsReady}
              onResult={(r) => setWriteStars((prev) => ({ ...prev, [step]: r.stars }))}
              resetKey={step}
            />
            {step + 1 < total ? (
              <button
                onClick={advance}
                className="bg-[#1B4D3E] text-[#F5F0E8] px-8 py-3 rounded-xl font-bold"
              >
                {nextLabel}
              </button>
            ) : (
              // الاختبار بقى اختياري — يقدر ينهي الدرس من غيره
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={finish}
                    className="bg-[#D4A853] text-[#1E2A24] px-7 py-3 rounded-xl font-bold"
                  >
                    إنهاء الدرس
                  </button>
                  <button
                    onClick={() => setPhase("quiz")}
                    className="border border-[#1B4D3E] text-[#1B4D3E] px-7 py-3 rounded-xl font-bold"
                  >
                    ابدأ الاختبار
                  </button>
                </div>
                <span className="text-xs text-[#8A7A4E]">الاختبار اختياري</span>
              </div>
            )}
          </div>
        ) : (
          <Quiz
            lesson={lesson}
            onPass={finish}
            onRetry={restart}
            speak={speak}
            voiceReady={status === "ready"}
            fontsReady={fontsReady}
            onAnswer={learning?.recordAnswer}
          />
        )}
      </div>
    </div>
  );
}
// ============================================================
//  التطبيق
// ============================================================
export default function App() {
  const fontsReady = useQuranFonts();
  const { progress, complete, reset } = useProgress();
  const { name, setName, loaded: nameLoaded } = useStudent();
  const { settings, update: updateSettings, pushRecentSurah, loaded: settingsLoaded } = useSettings();
  const { streak, markLessonOpened, celebrate } = useStreak(
    settingsLoaded,
    settings,
    updateSettings
  );
  const learning = useLearning();
  const khatma = useKhatma();
  const [tasbih, setTasbih] = useState(null);
  const lessonDoneToday = settings?.lastLessonDay === tasbihDayKey();

  // ---------- تذكير الصلاة على النبي ﷺ ----------
  // بيشتغل جنب محرّك التذكيرات العام. لو الإشعارات مش مسموحة أو المتصفح
  // مش داعم، بنعرض تنبيهًا جوّه التطبيق بدل ما نسكت.
  const salawat = { ...DEFAULT_SALAWAT, ...(settings?.salawat || {}) };
  const salawatRef = useRef(salawat);
  salawatRef.current = salawat;

  useEffect(() => {
    if (!settingsLoaded || !salawat.enabled) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      const live = salawatRef.current;
      if (!salawatDue(live)) return;
      const shown = await showNotification(SALAWAT_NOTIF.title, {
        body: SALAWAT_NOTIF.body,
        tag: "iqra-salawat",
      });
      if (!shown) showToast("ﷺ " + SALAWAT_NOTIF.body); // بديل جوّه التطبيق
      const next = { ...live, lastShown: Date.now() };
      salawatRef.current = next;
      updateSettings({ salawat: next });
    };

    tick();
    const iv = setInterval(tick, 60000);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, salawat.enabled, salawat.intervalHours]);

  // ---------- محرّك التذكيرات ----------
  // بيفحص عند الفتح وكل دقيقة والتطبيق شغّال. مش بديل عن Web Push:
  // لو التطبيق مقفول، التذكير بيتأخّر لحد ما يتفتح (شوف utils/notifications.js).
  const notif = { ...DEFAULT_NOTIF_SETTINGS, ...(settings?.notifications || {}) };

  // مراجع حيّة: الـ interval بيفضل شغّال بنفس الإغلاق (closure) طول ما الإعدادات
  // الأساسية ماتغيّرتش. من غير المراجع دي كان بيقرا lastShown قديمة، فيفتكر
  // إن التذكير لسه ماظهرش ويعيده كل دقيقة — ويكتب على IndexedDB كل دقيقة كمان.
  const notifRef = useRef(notif);
  notifRef.current = notif;
  const streakDayRef = useRef(settings?.streak?.lastDay);
  streakDayRef.current = settings?.streak?.lastDay;

  useEffect(() => {
    if (!settingsLoaded || !notif.enabled) return;
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      const live = notifRef.current; // أحدث إعدادات مش المحفوظة في الإغلاق
      const due = dueReminders(live, { lastActiveDay: streakDayRef.current });
      if (!due.length) return;

      const today = quizDayKey();
      const shown = { ...(live.lastShown || {}) };
      let changed = false;

      for (const kind of due) {
        const k = NOTIF_KINDS[kind];
        let body = k.body;
        if (kind === "surah") {
          const sId = surahOfTheDay(dayIndex());
          const s = SURAHS.find((x) => x.id === sId);
          if (s) body = `سورة ${s.name} — ${toArabicDigits(s.ayat)} آية. افتحها واقرأها.`;
        }
        const ok = await showNotification(k.title, {
          body,
          tag: `iqra-${kind}-${today}`,
          data: { url: k.link || "/" }, // الوجهة عند الضغط
        });
        if (ok) {
          shown[kind] = today;
          changed = true;
        }
      }

      // بنكتب بس لو فعلًا اتعرض تذكير جديد
      if (changed) {
        const next = { ...live, lastShown: shown };
        notifRef.current = next; // نحدّث المرجع فورًا قبل التيك الجاي
        updateSettings({ notifications: next });
      }
    };

    check();
    const iv = setInterval(check, 60000);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, notif.enabled, notif.lesson, notif.streak, notif.surah, notif.hour, notif.minute]);
  const dark = settings?.theme === "dark";

  // الوضع الليلي بيتطبّق على <html> عشان Tailwind darkMode:"class" يشتغل
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  const [audience, setAudience] = useState("child");
  const [levelId, setLevelId] = useState(1);
  // ٥ تبويبات في شريط سفلي: الرئيسية / قرآن / تعلم / قبلة / المزيد
  const [tab, setTab] = useState("home");
  // «المزيد» بقى بيضم كل الأقسام الفرعية بعد ما التبويبات اتقلّت لـ٥
  const [subMore, setSubMore] = useState("prayer");
  const [onboardDone, setOnboardDone] = useState(null); // null = لسه بنقرا
  const [deepSurah, setDeepSurah] = useState(null);

  // ---------- تنفيذ الروابط العميقة ----------
  // مصدرين: (١) التطبيق كان مقفول والرابط في العنوان،
  //         (٢) التطبيق مفتوح والـ Service Worker باعت رسالة.
  const applyLink = useCallback(
    (l) => {
      if (!l) return;
      setTab(l.tab || "learn");
      if (l.sub) setSubMore(l.sub);
      if (l.surah) setDeepSurah(l.surah);
      if (l.openLesson) {
        if (l.audience) setAudience(l.audience);
        if (l.level) setLevelId(l.level);
        setTimeout(() => {
          markLessonOpened();
          setLessonOpen(true);
        }, 300);
      }
      clearLinkParams();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    applyLink(parseLink());
    return onServiceWorkerNavigate(applyLink);
  }, [applyLink]);
  const [toast, setToast] = useState(null);

  // معرّف ثابت للجهاز — بيميّز العضو داخل المجموعة
  const [deviceId] = useState(() => {
    try {
      let v = localStorage.getItem("iqra.deviceId");
      if (!v) {
        v = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        localStorage.setItem("iqra.deviceId", v);
      }
      return v;
    } catch {
      return `u_${Math.random().toString(36).slice(2, 9)}`;
    }
  });

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  // نستنى القراءة من التخزين الأول عشان الحوار مايلمعش لمن عنده اسم محفوظ
  const askName = nameLoaded && !name;
  const levels = audience === "child" ? LEVELS_CHILD : LEVELS_ADULT;
  const doneIds = progress[audience];
  const isLocked = (id) => id !== 1 && !doneIds.includes(id - 1);
  const currentLocked = isLocked(levelId);
  useEffect(() => {
    if (isLocked(levelId)) {
      const firstOpen = levels.find((l) => !isLocked(l.id));
      if (firstOpen) setLevelId(firstOpen.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience]);
  // شاشة البداية لحد ما الخطوط والإعدادات تجهز
  if (!fontsReady || !settingsLoaded) {
    return (
      <div
        className="min-h-screen bg-[#F5F0E8] flex flex-col items-center justify-center gap-6"
        dir="rtl"
      >
        <div className="text-6xl text-[#1B4D3E]" style={{ fontFamily: QURAN_FONT }}>
          اقرأ
        </div>
        <div className="w-10 h-10 rounded-full border-4 border-[#E4DCC3] border-t-[#1B4D3E] animate-spin" />
        <p className="text-xs text-[#8A7A4E]">جاري التحضير…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F5F0E8] text-[#1E2A24] dark:bg-[#1E2A24] dark:text-[#F5F0E8] transition-colors"
      dir="rtl"
      style={{ fontFamily: UI_FONT }}
    >
      <header className="border-b border-[#E4DCC3] dark:border-[#3A5148] bg-[#FBF8EF] dark:bg-[#243830]">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1B4D3E] dark:text-[#D4A853] flex items-center gap-2">
              اقرأ
              <StreakBadge streak={streak} toArabicDigits={toArabicDigits} />
            </h1>
            {name ? (
              <span className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] hover:text-[#1B4D3E] transition-colors"
                  title="اضغط لتغيير الاسم"
                >
                  مرحباً يا {name} ✎
                </button>
                <button
                  onClick={async () => {
                    const r = await shareApp();
                    if (r === "copied") showToast("تم النسخ!");
                    else if (r === "failed") showToast("تعذّرت المشاركة");
                  }}
                  className="text-xs text-[#1B4D3E] dark:text-[#8FD6C0] hover:opacity-70"
                  title="شارك التطبيق"
                >
                  شارك 📤
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[#5B6B62] dark:text-[#A9BDB2]">
                  من أول حرف إلى ورد المصحف
                </span>
                <button
                  onClick={async () => {
                    const r = await shareApp();
                    if (r === "copied") showToast("تم النسخ!");
                    else if (r === "failed") showToast("تعذّرت المشاركة");
                  }}
                  className="text-xs text-[#1B4D3E] dark:text-[#8FD6C0] hover:opacity-70"
                  title="شارك التطبيق"
                >
                  شارك 📤
                </button>
              </span>
            )}
            {learning.badges.length > 0 && (
              <div className="flex gap-1 mt-1 text-sm">
                {learning.badges.map((b) => (
                  <span key={b.id} title={BADGES[b.id]?.label || b.id}>
                    {BADGES[b.id]?.icon || "🏅"}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* التنقّل اتنقل للشريط السفلي — الهيدر بقى للهوية والسلسلة بس */}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-6 iqra-page">
        {/* تبويبات فرعية للمجموعات المركّبة */}
        {tab === "more" && (
          <div className="flex flex-wrap gap-2 mb-7">
            {[
              ["prayer", "المواقيت", "🕌"],
              ["muazzin", "الموذّن", "🔊"],
              ["hijri", "التقويم", "🗓️"],
              ["coach", "مدرّب التلاوة", "🎙️"],
              ["vocal", "تدريب الصوت", "🫁"],
              ["confidence", "اقرأ بثقة", "🪞"],
              ["hifz", "الحفظ", "🧠"],
              ["tajweed", "التجويد", "◌ّ"],
              ["daily", "المسابقة", "🏅"],
              ["groups", "مجموعاتي", "👥"],
              ["teacher", "المعلّم", "🔐"],
              ["share", "شارك", "📤"],
              ["settings", "الإعدادات", "⚙️"],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setSubMore(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-1.5 ${
                  subMore === key
                    ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                    : "iqra-card border-transparent text-[#5B6B62] dark:text-[#A9BDB2]"
                }`}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}

        {tab === "home" && (
          <HomeScreen
            name={name}
            streak={streak}
            progress={progress}
            audience={audience}
            levels={levels}
            levelId={levelId}
            settings={settings}
            toArabicDigits={toArabicDigits}
            onStartLesson={() => {
              if (currentLocked) return setTab("learn");
              markLessonOpened();
              setLessonOpen(true);
            }}
            onGo={(t, sub, opts) => {
              setTab(t);
              if (sub) setSubMore(sub);
              if (opts?.surah) setDeepSurah(opts.surah);
            }}
          />
        )}

        {tab === "qibla" && <QiblaCompass toArabicDigits={toArabicDigits} />}

        {/* هدف اليوم + عدّاد التسبيح — تحت الهيدر في الشاشة الرئيسية */}
        {tab === "learn" && (
          <>
            <DailyGoal
              tasbih={tasbih}
              lessonDoneToday={lessonDoneToday}
              toArabicDigits={toArabicDigits}
              onToast={showToast}
              onGoLesson={() => {
                if (!currentLocked) {
                  markLessonOpened();
                  setLessonOpen(true);
                }
              }}
            />
            <TasbihCounter
              toArabicDigits={toArabicDigits}
              onChange={setTasbih}
              onToast={showToast}
            />
          </>
        )}

        {tab === "learn" && (
          <>
            <div className="flex gap-2 mb-8">
              {[
                ["child", "للأطفال"],
                ["adult", "للكبار"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setAudience(key)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm border ${
                    audience === key
                      ? "bg-[#D4A853] border-[#D4A853] text-[#1E2A24]"
                      : "border-[#E4DCC3] text-[#5B6B62]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[#8A7A4E]">
                أكملت {toArabicDigits(doneIds.length)} من {toArabicDigits(levels.length)} مستويات
              </span>
              {doneIds.length > 0 && (
                <button onClick={reset} className="text-xs text-[#8A4E4E] underline">
                  إعادة ضبط التقدّم
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {levels.map((lv) => (
                <LevelCard
                  key={lv.id}
                  level={lv}
                  active={levelId === lv.id}
                  locked={isLocked(lv.id)}
                  done={doneIds.includes(lv.id)}
                  onClick={() => setLevelId(lv.id)}
                />
              ))}
            </div>
            <div className="rounded-2xl bg-[#1B4D3E] text-[#F5F0E8] p-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[#F5F0E8]/70 mb-1">المستوى الحالي</div>
                <div className="font-bold text-lg">
                  {levels.find((l) => l.id === levelId)?.title}
                </div>
              </div>
              <button
                onClick={() => {
                  markLessonOpened(); // فتح الدرس = يوم تعلّم
                  setLessonOpen(true);
                }}
                disabled={currentLocked}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm ${
                  currentLocked
                    ? "bg-[#F5F0E8]/20 text-[#F5F0E8]/50 cursor-not-allowed"
                    : "bg-[#D4A853] text-[#1E2A24]"
                }`}
              >
                {currentLocked ? "مقفول" : "ابدأ الدرس"}
              </button>
            </div>
          </>
        )}
        {tab === "quran" && (
          <MushafDemo
            settings={settings}
            updateSettings={updateSettings}
            pushRecentSurah={pushRecentSurah}
            khatma={khatma}
            deepSurah={deepSurah}
            onDeepSurahDone={() => setDeepSurah(null)}
          />
        )}

        {tab === "more" && subMore === "prayer" && (
          <PrayerTimes
            settings={settings}
            onChange={updateSettings}
            toArabicDigits={toArabicDigits}
          />
        )}
                {tab === "more" && subMore === "muazzin" && (
          <Muazzin
            settings={settings}
            onChange={updateSettings}
            toArabicDigits={toArabicDigits}
            onToast={showToast}
          />
        )}

        {tab === "more" && subMore === "hijri" && (
          <IslamicCalendar toArabicDigits={toArabicDigits} />
        )}

        {tab === "more" && subMore === "coach" && (
          <AITajweedCoach
            loadTimings={loadSurahTimings}
            toArabicDigits={toArabicDigits}
            onToast={showToast}
          />
        )}

        {tab === "more" && subMore === "vocal" && <VocalTrainer />}
        {tab === "more" && subMore === "confidence" && (
          <ConfidenceMode toArabicDigits={toArabicDigits} />
        )}
        {tab === "more" && subMore === "hifz" && <HifzMode toArabicDigits={toArabicDigits} />}

        {tab === "more" && subMore === "tajweed" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">
                اختبار التجويد
              </h2>
              <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
                ٢٠ سؤال في الأساسيات — المدّ والغنّة والإقلاب والقلقلة
              </p>
            </div>
            <TajweedQuiz toArabicDigits={toArabicDigits} />
          </div>
        )}

        {tab === "more" && subMore === "daily" && (
          <DailyChallenge
            SURAHS={SURAHS}
            SHORT={SHORT_SURAHS}
            studentName={name}
            toArabicDigits={toArabicDigits}
          />
        )}

        {tab === "more" && subMore === "settings" && (
          <SettingsPanel
            settings={settings}
            onChange={updateSettings}
            toArabicDigits={toArabicDigits}
          />
        )}

        {tab === "more" && subMore === "groups" && (
          <StudyGroup
            student={{
              id: deviceId,
              name,
              level: Math.max(...(progress[audience] || [0]), 0) + 1,
              streak,
            }}
            toArabicDigits={toArabicDigits}
            onToast={showToast}
          />
        )}

        {tab === "more" && subMore === "share" && <ShareApp onToast={showToast} />}

        {tab === "more" && subMore === "teacher" && (
          <TeacherMode toArabicDigits={toArabicDigits} />
        )}
      </main>

      {celebrate && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-[#1B4D3E] text-[#F5F0E8] rounded-3xl px-8 py-6 shadow-2xl text-center">
            <div className="text-6xl mb-2">{celebrate.icon}</div>
            <div className="font-bold text-lg">{celebrate.label}!</div>
            <div className="text-sm opacity-80 mt-1">
              {toArabicDigits(celebrate.days)} يوم تعلّم متتالي 🔥
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-[75] px-4 pointer-events-none">
          <div className="bg-[#1E2A24] text-[#F5F0E8] rounded-2xl px-5 py-3 shadow-xl text-sm font-semibold">
            {toast}
          </div>
        </div>
      )}

      {learning.toast && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-[70] px-4">
          <div className="bg-[#1B4D3E] text-[#F5F0E8] rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3">
            <span className="text-2xl">{learning.toast.icon}</span>
            <div>
              <div className="text-xs opacity-75">شارة جديدة</div>
              <div className="font-bold text-sm">{learning.toast.label}</div>
            </div>
          </div>
        </div>
      )}
      {lessonOpen && (
        <LessonView
          audience={audience}
          levelId={levelId}
          fontsReady={fontsReady}
          learning={learning}
          onComplete={(a, l) => {
            buzz([30, 50, 30]);
            complete(a, l);
            // ذِكْر بعد الدرس + تعليم هدف "اقرأ درس" كمكتمل
            updateSettings({ lastLessonDay: tasbihDayKey() });
            showToast("اللهم بارك لي فيما تعلّمت 🤲");
          }}
          onClose={() => setLessonOpen(false)}
        />
      )}

      <BottomNav tab={tab} onChange={setTab} />

      {/* الترحيب الأول بقى onboarding كامل بدل حوار الاسم لوحده.
          حوار الاسم فضل موجود للتعديل بعد كده من الهيدر. */}
      {askName && (
        <OnboardingFlow
          onDone={({ name: n, audience: a, levelId: lv, dailyMinutes }) => {
            setName(n);
            setAudience(a);
            setLevelId(lv);
            updateSettings({ dailyMinutes, onboardedAt: Date.now() });
            setTab("home");
          }}
        />
      )}

      {editingName && (
        <NameDialog
          initial={name}
          onSave={(v) => {
            setName(v);
            setEditingName(false);
          }}
          onClose={() => setEditingName(false)}
        />
      )}
    </div>
  );
}
