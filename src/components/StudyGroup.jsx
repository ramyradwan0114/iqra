import React, { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import {
  createGroup,
  joinGroup,
  myGroups,
  leaveGroup,
  fetchGroup,
  rankMembers,
  inviteUrl,
  readJoinCode,
  clearJoinParam,
  cloudReady,
  LEVEL_LABELS,
} from "../utils/groups.js";
import { copyLink, canWebShare } from "../utils/share.js";
import { viewStreak } from "../utils/streak.js";
import GroupSkeleton from "./GroupSkeleton.jsx";
import EmptyState from "./EmptyState.jsx";

function InviteQR({ code }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, inviteUrl(code), {
      width: 180,
      margin: 2,
      color: { dark: "#1B4D3Eff", light: "#FFFFFFff" },
    }).catch(() => {});
  }, [code]);
  return <canvas ref={ref} width={180} height={180} className="rounded-lg" />;
}

export default function StudyGroup({ student, toArabicDigits, onToast }) {
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [mode, setMode] = useState("list"); // list | create | join
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [goal, setGoal] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setGroups(await myGroups());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // رابط دعوة في الـ URL → انضمام تلقائي
  useEffect(() => {
    const c = readJoinCode();
    if (!c) return;
    setMode("join");
    setCode(c);
    clearJoinParam();
  }, []);

  const me = {
    id: student.id,
    name: student.name || "ضيف",
    level: student.level || 1,
    streak: viewStreak(student.streak).count,
  };

  const doCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const g = await createGroup({ name, level, goal, member: me });
    setBusy(false);
    setName("");
    setGoal("");
    await refresh();
    setActive(g);
    setMode("list");
  };

  const doJoin = async () => {
    const c = code.trim().toLowerCase();
    if (!c || busy) return;
    setBusy(true);
    setErr(null);
    const r = await joinGroup(c, me);
    setBusy(false);
    if (!r.ok) {
      setErr(
        cloudReady()
          ? "مفيش مجموعة بالكود ده."
          : "مش لاقيين المجموعة. المجموعات مش مشتركة بين الأجهزة لحد ما تتظبّط قاعدة بيانات سحابية."
      );
      return;
    }
    setCode("");
    await refresh();
    setActive(r.group);
    setMode("list");
  };

  // ---------- شاشة مجموعة واحدة ----------
  if (active) {
    const ranked = rankMembers(active.members);
    return (
      <div className="flex flex-col gap-5">
        <button
          onClick={() => setActive(null)}
          className="text-sm text-[#5B6B62] dark:text-[#A9BDB2] self-start"
        >
          ← كل المجموعات
        </button>

        <div>
          <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">{active.name}</h2>
          <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
            {LEVEL_LABELS[active.level] || "مستوى " + active.level} ·{" "}
            {toArabicDigits(active.members?.length || 0)} عضو
          </p>
        </div>

        {active.local && (
          <p className="text-xs text-[#6B5A2E] bg-[#FBF3E2] border border-[#D4A853] rounded-xl px-4 py-3 leading-relaxed">
            <strong>المجموعة دي محلية على جهازك.</strong> رابط الدعوة مش هيشتغل
            مع حد تاني لأن مفيش قاعدة بيانات مشتركة لسه. أول ما تتحط مفاتيح
            Firebase، المجموعات الجديدة هتبقى مشتركة فعلًا.
          </p>
        )}

        {active.goal && (
          <div className="bg-[#1B4D3E]/10 rounded-2xl px-4 py-3">
            <div className="text-[11px] text-[#8A7A4E] mb-0.5">هدف المجموعة</div>
            <div className="text-sm font-semibold text-[#1B4D3E] dark:text-[#8FD6C0]">
              🎯 {active.goal}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853] mb-2">
            تصدّر المجموعة
          </h3>
          <div className="flex flex-col gap-1.5">
            {ranked.map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${
                  m.id === me.id
                    ? "bg-[#1B4D3E]/10 border border-[#1B4D3E]/30"
                    : "bg-[#FBF8EF] dark:bg-[#243830]"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 grid place-items-center rounded-full text-xs font-bold bg-[#F1EAD6] dark:bg-[#1E2A24]">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : toArabicDigits(i + 1)}
                  </span>
                  <span className="text-sm font-semibold">
                    {m.name}
                    {m.id === me.id && <span className="text-[11px] text-[#8A7A4E]"> (إنت)</span>}
                  </span>
                </span>
                <span className="text-xs text-[#8A7A4E]">
                  🔥 {toArabicDigits(m.streak || 0)} · مستوى {toArabicDigits(m.level || 1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col items-center gap-3">
          <div className="text-sm font-bold text-[#1B4D3E] dark:text-[#D4A853]">ادعُ أصحابك</div>
          <InviteQR code={active.id} />
          <code className="text-lg font-bold tracking-widest text-[#1B4D3E] dark:text-[#8FD6C0]">
            {active.id}
          </code>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={async () => {
                const link = inviteUrl(active.id);
                if (canWebShare()) {
                  try {
                    await navigator.share({ title: active.name, text: "انضم لمجموعتنا في اقرأ", url: link });
                    return;
                  } catch {}
                }
                const r = await copyLink(link);
                onToast?.(r === "copied" ? "تم نسخ رابط الدعوة!" : "تعذّر النسخ");
              }}
              className="bg-[#1B4D3E] text-[#F5F0E8] px-5 py-2.5 rounded-xl font-bold text-sm"
            >
              شارك الرابط 📤
            </button>
          </div>
        </div>

        <button
          onClick={async () => {
            await leaveGroup(active.id);
            setActive(null);
            refresh();
          }}
          className="text-xs text-[#8A4E4E] underline self-start"
        >
          مغادرة المجموعة
        </button>
      </div>
    );
  }

  // ---------- القائمة ----------
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#1B4D3E] dark:text-[#D4A853]">مجموعات الدراسة</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          اتعلّم مع أهلك وأصحابك — وشوفوا سلاسل بعض
        </p>
      </div>

      {!cloudReady() && (
        <p className="text-xs text-[#6B5A2E] bg-[#FBF3E2] border border-[#D4A853] rounded-xl px-4 py-3 leading-relaxed">
          <strong>المجموعات محلية دلوقتي.</strong> عشان تشتغل بين أجهزة مختلفة
          لازم مفاتيح Firebase تتحط في <code className="font-mono">.env.local</code>.
          الكود جاهز — أول ما تحطها هتشتغل من غير أي تعديل.
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setMode(mode === "create" ? "list" : "create")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm border ${
            mode === "create"
              ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
              : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          }`}
        >
          إنشاء مجموعة
        </button>
        <button
          onClick={() => setMode(mode === "join" ? "list" : "join")}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm border ${
            mode === "join"
              ? "bg-[#1B4D3E] border-[#1B4D3E] text-[#F5F0E8]"
              : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
          }`}
        >
          انضمام بكود
        </button>
      </div>

      {mode === "create" && (
        <div className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم المجموعة (مثلاً: حلقة العيلة)"
            maxLength={50}
            className="bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4D3E]"
          />
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-4 py-2.5 text-sm"
          >
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="هدف المجموعة (اختياري) — مثلاً: نخلص المستوى ٢ في رمضان"
            maxLength={120}
            className="bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B4D3E]"
          />
          <button
            onClick={doCreate}
            disabled={!name.trim() || busy}
            className={`py-2.5 rounded-xl font-bold text-sm ${
              name.trim() && !busy
                ? "bg-[#1B4D3E] text-[#F5F0E8]"
                : "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
            }`}
          >
            {busy ? "…" : "أنشئ"}
          </button>
        </div>
      )}

      {mode === "join" && (
        <div className="bg-[#FBF8EF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-5 flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setErr(null);
            }}
            placeholder="كود المجموعة (٦ حروف)"
            maxLength={6}
            dir="ltr"
            className="bg-[#FFFFFF] dark:bg-[#1E2A24] border border-[#E4DCC3] dark:border-[#3A5148] rounded-xl px-4 py-2.5 text-center text-lg tracking-widest outline-none focus:border-[#1B4D3E]"
          />
          {err && <span className="text-xs text-[#8A4E4E]">{err}</span>}
          <button
            onClick={doJoin}
            disabled={!code.trim() || busy}
            className={`py-2.5 rounded-xl font-bold text-sm ${
              code.trim() && !busy
                ? "bg-[#1B4D3E] text-[#F5F0E8]"
                : "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
            }`}
          >
            {busy ? "…" : "انضم"}
          </button>
        </div>
      )}

      {loading ? (
        <GroupSkeleton count={3} />
      ) : loadError ? (
        <EmptyState
          tone="error"
          icon="⚠️"
          title="مشكلة في الاتصال"
          desc="مقدرناش نجيب مجموعاتك. لو النت واقع، المجموعات المحفوظة على جهازك هتظهر لما تجرّب تاني."
          action={refresh}
          actionLabel="جرّب تاني"
        />
      ) : !groups.length ? (
        <EmptyState
          icon="👥"
          title="مفيش مجموعات لسه"
          desc="أنشئ مجموعة لأهلك وأصحابك، أو انضم لمجموعة بكود الدعوة."
          action={() => setMode("create")}
          actionLabel="إنشاء مجموعة"
          secondary={() => setMode("join")}
          secondaryLabel="انضم بكود"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={async () => setActive((await fetchGroup(g.id)) || g)}
              className="text-right bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-2xl p-4 flex items-center justify-between"
            >
              <span>
                <span className="font-bold block">{g.name}</span>
                <span className="text-xs text-[#5B6B62] dark:text-[#A9BDB2]">
                  {toArabicDigits(g.members?.length || 0)} عضو · كود {g.id}
                  {g.local && <span className="text-[#8A7A4E]"> · محلية</span>}
                </span>
              </span>
              <span className="text-[#1B4D3E] dark:text-[#8FD6C0]">←</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
