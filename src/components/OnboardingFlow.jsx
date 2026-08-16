import React, { useState } from "react";

const QURAN_FONT = "'Amiri Quran', 'Amiri', 'Traditional Arabic', serif";

const LEVELS = [
  { id: "beginner", icon: "🌱", title: "مبتدئ", desc: "مش عارف الحروف — نبدأ من الأول خالص", audience: "child", level: 1 },
  { id: "middle", icon: "🌿", title: "بقرأ شوية", desc: "أعرف الحروف بس بتلخبط في الحركات والكلمات", audience: "child", level: 3 },
  { id: "advanced", icon: "🌳", title: "بقرأ كويس", desc: "بقرأ عادي وعايز أتقن المصحف والتجويد", audience: "adult", level: 1 },
];

const GOALS = [
  { min: 5, label: "٥ دقايق", desc: "خفيف ومستمر" },
  { min: 10, label: "١٠ دقايق", desc: "متوازن" },
  { min: 20, label: "٢٠ دقيقة", desc: "جاد" },
  { min: 30, label: "٣٠ دقيقة", desc: "مكثّف" },
];

export default function OnboardingFlow({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState(null);
  const [goal, setGoal] = useState(10);

  const total = 5;
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    const picked = LEVELS.find((l) => l.id === level) || LEVELS[0];
    onDone({
      name: name.trim(),
      audience: picked.audience,
      levelId: picked.level,
      dailyMinutes: goal,
    });
  };

  const canNext = step === 1 ? name.trim().length > 0 : step === 2 ? !!level : true;

  return (
    <div
      className="fixed inset-0 z-[90] bg-[#F5F0E8] dark:bg-[#1E2A24] flex flex-col overflow-y-auto"
      dir="rtl"
    >
      {/* شريط التقدّم */}
      <div className="px-6 pt-6">
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-[#1B4D3E] dark:bg-[#D4A853]" : "bg-[#E4DCC3] dark:bg-[#3A5148]"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md w-full mx-auto">
        {/* ١ — أهلاً */}
        {step === 0 && (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="text-7xl text-[#1B4D3E] dark:text-[#D4A853]" style={{ fontFamily: QURAN_FONT }}>
              اقرأ
            </div>
            <h2 className="text-2xl font-bold">أهلاً بيك! 👋</h2>
            <p className="text-[#5B6B62] dark:text-[#A9BDB2] leading-relaxed">
              هنتعلّم مع بعض من أول حرف لحد ما تقرأ المصحف بثقة — خطوة خطوة، وعلى
              مهلك.
            </p>
            <div className="flex flex-col gap-2 mt-2 w-full">
              {[
                ["📚", "دروس متدرّجة للقراءة والكتابة"],
                ["📖", "مصحف تفاعلي — تلمس الكلمة فتتنطق"],
                ["🕌", "مواقيت الصلاة والقبلة والتقويم"],
              ].map(([i, t]) => (
                <div key={t} className="iqra-card p-3 flex items-center gap-3 text-right">
                  <span className="text-xl">{i}</span>
                  <span className="text-sm">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ٢ — الاسم */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="text-5xl text-center">✏️</div>
            <h2 className="text-2xl font-bold text-center">اسمك إيه؟</h2>
            <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] text-center">
              عشان نرحّب بيك ونحفظ تقدّمك
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canNext && next()}
              placeholder="اكتب اسمك هنا…"
              maxLength={40}
              className="iqra-card border border-[#E4DCC3] dark:border-[#3A5148] px-4 py-3.5 text-center text-lg outline-none focus:border-[#1B4D3E]"
            />
          </div>
        )}

        {/* ٣ — المستوى */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="text-5xl text-center">📊</div>
            <h2 className="text-2xl font-bold text-center">مستواك إيه دلوقتي؟</h2>
            <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] text-center">
              عشان نبدأ من المكان المناسب — تقدر تغيّره في أي وقت
            </p>
            <div className="flex flex-col gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`p-4 rounded-2xl border-2 text-right transition-colors ${
                    level === l.id
                      ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                      : "iqra-card border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{l.icon}</span>
                    <span className="min-w-0">
                      <span className="block font-bold">{l.title}</span>
                      <span
                        className={`block text-xs mt-0.5 ${
                          level === l.id ? "text-[#F5F0E8]/75" : "text-[#5B6B62] dark:text-[#A9BDB2]"
                        }`}
                      >
                        {l.desc}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ٤ — الهدف اليومي */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="text-5xl text-center">⏱️</div>
            <h2 className="text-2xl font-bold text-center">هدفك اليومي؟</h2>
            <p className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] text-center">
              الاستمرار أهم من الكمّية — يوم ورا يوم أحسن من يوم طويل كل أسبوع
            </p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.min}
                  onClick={() => setGoal(g.min)}
                  className={`p-4 rounded-2xl border-2 transition-colors ${
                    goal === g.min
                      ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
                      : "iqra-card border-transparent"
                  }`}
                >
                  <div className="text-lg font-bold">{g.label}</div>
                  <div
                    className={`text-[11px] ${
                      goal === g.min ? "text-[#F5F0E8]/75" : "text-[#5B6B62] dark:text-[#A9BDB2]"
                    }`}
                  >
                    {g.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ٥ — يلا نبدأ */}
        {step === 4 && (
          <div className="text-center flex flex-col items-center gap-4">
            <div className="text-6xl">🚀</div>
            <h2 className="text-2xl font-bold">يلا نبدأ{name ? ` يا ${name}` : ""}!</h2>
            <p className="text-[#5B6B62] dark:text-[#A9BDB2] leading-relaxed">
              كل حاجة جاهزة. تقدّمك بيتحفظ على جهازك، والتطبيق شغّال من غير نت.
            </p>
            <div className="iqra-card p-4 w-full text-right flex flex-col gap-2">
              {[
                ["👤", name || "—"],
                ["📊", LEVELS.find((l) => l.id === level)?.title || "مبتدئ"],
                ["⏱️", `${goal} دقيقة يوميًا`],
              ].map(([i, t]) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span>{i}</span>
                  <span className="font-semibold">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#8A7A4E]">
              مفيش إعلانات · مفيش اشتراكات · بياناتك على جهازك
            </p>
          </div>
        )}
      </div>

      {/* الأزرار */}
      <div className="px-6 pb-8 max-w-md w-full mx-auto flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={back}
            className="px-5 py-3.5 rounded-xl font-bold text-sm text-[#5B6B62] dark:text-[#A9BDB2]"
          >
            رجوع
          </button>
        )}
        <button
          onClick={step === total - 1 ? finish : next}
          disabled={!canNext}
          className={`flex-1 py-3.5 rounded-xl font-bold ${
            canNext
              ? "bg-[#1B4D3E] text-[#F5F0E8]"
              : "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
          }`}
        >
          {step === total - 1 ? "يلا نبدأ 🚀" : "التالي"}
        </button>
      </div>
    </div>
  );
}
