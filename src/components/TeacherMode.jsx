import React, { useState } from "react";
import { useStudents } from "../hooks/useFirebase.js";

// الـ PIN موجود في كود العميل — أي حد يفتح أدوات المطوّر يقدر يقراه.
// ده مانع لفضول الأطفال، مش حماية. الحماية الحقيقية لبيانات الطلاب هي
// Firestore Security Rules على السيرفر.
const TEACHER_PIN = "1234";

const fmtDate = (ts) => {
  if (!ts) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
};

function PinGate({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (pin === TEACHER_PIN) onUnlock();
    else {
      setError(true);
      setPin("");
    }
  };
  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto bg-[#FFFFFF] dark:bg-[#243830] rounded-3xl border border-[#E4DCC3] dark:border-[#3A5148] p-8 flex flex-col gap-5 text-center"
    >
      <div className="text-4xl">🔐</div>
      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">وضع المعلّم</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1.5">اكتب الرقم السري للدخول</p>
      </div>
      <input
        autoFocus
        value={pin}
        onChange={(e) => {
          setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
          setError(false);
        }}
        inputMode="numeric"
        placeholder="••••"
        className={`bg-[#FBF8EF] dark:bg-[#1E2A24] border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none ${
          error ? "border-[#8A4E4E]" : "border-[#E4DCC3] dark:border-[#3A5148] focus:border-[#1B4D3E]"
        }`}
      />
      {error && <span className="text-xs text-[#8A4E4E]">رقم غير صحيح</span>}
      <button type="submit" className="bg-[#1B4D3E] text-[#F5F0E8] py-3 rounded-xl font-bold">
        دخول
      </button>
    </form>
  );
}

function AddStudent({ onAdd }) {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await onAdd(name, num);
    setName("");
    setNum("");
    setBusy(false);
  };
  return (
    <form
      onSubmit={submit}
      className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col sm:flex-row gap-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسم الطالب"
        maxLength={40}
        className="flex-1 bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4D3E]"
      />
      <input
        value={num}
        onChange={(e) => setNum(e.target.value)}
        placeholder="رقم (اختياري)"
        maxLength={12}
        className="sm:w-40 bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4D3E]"
      />
      <button
        type="submit"
        disabled={!name.trim() || busy}
        className={`px-6 py-2.5 rounded-xl font-bold text-sm ${
          name.trim() && !busy
            ? "bg-[#1B4D3E] text-[#F5F0E8]"
            : "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
        }`}
      >
        {busy ? "…" : "إضافة"}
      </button>
    </form>
  );
}

export default function TeacherMode({ toArabicDigits }) {
  const [unlocked, setUnlocked] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const {
    students,
    loading,
    source,
    cloudConfigured,
    addStudent,
    resetStudentProgress,
    deleteStudent,
    resetAll,
  } = useStudents();

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">لوحة المعلّم</h2>
        <span
          className={`text-[11px] px-3 py-1 rounded-full ${
            source === "cloud"
              ? "bg-[#1B4D3E]/10 text-[#1B4D3E] dark:text-[#8FD6C0]"
              : "bg-[#FBF3E2] text-[#6B5A2E]"
          }`}
        >
          {source === "cloud" ? "متصل بالسحابة" : "تخزين محلي"}
        </span>
      </div>

      {!cloudConfigured && (
        <p className="text-xs text-[#6B5A2E] bg-[#FBF3E2] border border-[#D4A853] rounded-xl px-4 py-3">
          مفاتيح Firebase لسه placeholder، فالبيانات محفوظة على الجهاز ده بس.
          املا المفاتيح في <code className="font-mono">src/utils/firebase.js</code> أو في متغيّرات
          البيئة على Vercel، والمزامنة هتشتغل لوحدها.
        </p>
      )}

      <AddStudent onAdd={addStudent} />

      {loading ? (
        <p className="text-sm text-[#5B6B62] py-8 text-center">جاري التحميل…</p>
      ) : !students.length ? (
        <p className="text-sm text-[#5B6B62] py-10 text-center">
          مفيش طلاب لسه — ضيف أول طالب من فوق.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {students.map((s) => {
            const child = s.progress?.child?.length || 0;
            const adult = s.progress?.adult?.length || 0;
            return (
              <div
                key={s.id}
                className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#1E2A24] dark:text-[#F5F0E8] flex items-center gap-2">
                    {s.name}
                    {s.number && (
                      <span className="text-[11px] text-[#8A7A4E] font-normal">#{s.number}</span>
                    )}
                    {s.dirty && (
                      <span className="text-[10px] text-[#8A7A4E]" title="لسه مترفعش للسحابة">
                        ⇡
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
                    آخر نشاط: {fmtDate(s.lastActive)}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-lg bg-[#F1EAD6] dark:bg-[#1E2A24] text-[#5B6B62] dark:text-[#A9BDB2]">
                    أطفال {toArabicDigits(child)}/٤
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-[#F1EAD6] dark:bg-[#1E2A24] text-[#5B6B62] dark:text-[#A9BDB2]">
                    كبار {toArabicDigits(adult)}/٤
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resetStudentProgress(s.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
                  >
                    مسح التقدّم
                  </button>
                  <button
                    onClick={() => deleteStudent(s.id)}
                    className="text-xs px-3 py-1.5 rounded-lg text-[#8A4E4E] border border-[#8A4E4E]/40"
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {students.length > 0 && (
        <div className="border-t border-[#E4DCC3] dark:border-[#3A5148] pt-4 flex justify-end">
          {confirmAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8A4E4E]">متأكد؟ ده هيمسح تقدّم كل الطلاب.</span>
              <button
                onClick={async () => {
                  await resetAll();
                  setConfirmAll(false);
                }}
                className="text-xs px-4 py-2 rounded-lg bg-[#8A4E4E] text-[#F5F0E8] font-semibold"
              >
                نعم امسح
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                className="text-xs px-4 py-2 rounded-lg border border-[#E4DCC3] text-[#5B6B62]"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAll(true)}
              className="text-xs px-4 py-2 rounded-lg border border-[#8A4E4E]/40 text-[#8A4E4E]"
            >
              مسح كل التقدّمات
            </button>
          )}
        </div>
      )}
    </div>
  );
}
