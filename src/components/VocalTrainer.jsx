import React, { useState, useRef, useEffect, useCallback } from "react";

const EXERCISES = [
  {
    id: "breath",
    icon: "🫁",
    title: "التنفّس من البطن",
    prompt: "خد نفس عميق من بطنك مع الدايرة وهي بتكبر، واطلعه وهي بتصغر",
    inhale: 4,
    hold: 2,
    exhale: 6,
    kind: "breath",
    tip: "حطّ إيدك على بطنك — لازم تحسّها بتطلع وتنزل، مش صدرك.",
  },
  {
    id: "sustain",
    icon: "〰️",
    title: "تمديد الصوت",
    prompt: "قول «أااااا» على نَفَس واحد لمدة ٥ ثواني",
    seconds: 5,
    kind: "timer",
    tip: "خلّي الصوت ثابت من غير ما يهتز أو يقطع — ده أساس المدّ.",
  },
  {
    id: "ghunnah",
    icon: "👃",
    title: "الغنّة",
    prompt: "قول «مممم» وخلّي صوتك يرنّ في مناخيرك لمدة ٣ ثواني",
    seconds: 3,
    kind: "timer",
    tip: "اقفل مناخيرك بصوابعك وإنت بتقول — لو الصوت اتغيّر، يبقى الغنّة صح.",
  },
];

function BreathCircle({ ex, running }) {
  const [phase, setPhase] = useState("idle");
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!running) {
      setPhase("idle");
      return;
    }
    let cancelled = false;
    const seq = [
      ["inhale", ex.inhale, "خد نفس"],
      ["hold", ex.hold, "امسك"],
      ["exhale", ex.exhale, "اطلع"],
    ];
    let i = 0;
    const run = () => {
      if (cancelled) return;
      const [name, secs] = seq[i % seq.length];
      setPhase(name);
      setLeft(secs);
      let t = secs;
      const iv = setInterval(() => {
        t -= 1;
        if (cancelled) return clearInterval(iv);
        setLeft(t);
        if (t <= 0) {
          clearInterval(iv);
          i++;
          run();
        }
      }, 1000);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [running, ex]);

  const scale = phase === "inhale" ? 1 : phase === "hold" ? 1 : 0.55;
  const dur = phase === "inhale" ? ex.inhale : phase === "exhale" ? ex.exhale : 0.3;
  const label =
    phase === "inhale" ? "خد نفس" : phase === "hold" ? "امسك" : phase === "exhale" ? "اطلع" : "جاهز";

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative w-48 h-48 grid place-items-center">
        <div
          className="absolute w-48 h-48 rounded-full bg-[#0F5C4C]/15"
          style={{
            transform: `scale(${scale})`,
            transition: `transform ${dur}s ease-in-out`,
          }}
        />
        <div
          className="absolute w-36 h-36 rounded-full bg-[#0F5C4C]/25"
          style={{
            transform: `scale(${scale})`,
            transition: `transform ${dur}s ease-in-out`,
          }}
        />
        <div className="relative text-center">
          <div className="text-xl font-bold text-[#0F5C4C] dark:text-[#8FD6C0]">{label}</div>
          {running && <div className="text-3xl font-bold text-[#0F5C4C]">{left}</div>}
        </div>
      </div>
    </div>
  );
}

function Timer({ seconds, running, onDone }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!running) {
      setLeft(seconds);
      return;
    }
    let t = seconds;
    setLeft(t);
    const iv = setInterval(() => {
      t -= 1;
      setLeft(t);
      if (t <= 0) {
        clearInterval(iv);
        onDone?.();
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [running, seconds, onDone]);
  const pct = ((seconds - left) / seconds) * 100;
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="text-6xl font-bold text-[#0F5C4C] dark:text-[#8FD6C0]">{Math.max(left, 0)}</div>
      <div className="w-full max-w-xs h-2 bg-[#E4DCC3] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#0F5C4C] transition-all duration-1000 ease-linear"
          style={{ width: `${running ? pct : 0}%` }}
        />
      </div>
    </div>
  );
}

// تسجيل وإعادة + رسم موجة بسيطة من بيانات الوقت الحقيقي
function Recorder() {
  const [state, setState] = useState("idle"); // idle | recording | ready | denied
  const [url, setUrl] = useState(null);
  const [peaks, setPeaks] = useState([]);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("denied");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      const collected = [];

      // تحليل مستوى الصوت لرسم الموجة
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
        collected.push(peak);
        setPeaks([...collected].slice(-120));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        cleanup();
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUrl(URL.createObjectURL(blob));
        setState("ready");
      };
      mr.start();
      setState("recording");
    } catch {
      setState("denied");
    }
  };

  const stop = () => {
    try {
      mediaRef.current?.stop();
    } catch {}
  };

  return (
    <div className="flex flex-col items-center gap-3 border-t border-[#E4DCC3] dark:border-[#3A5148] pt-5 mt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={state === "recording" ? stop : start}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm ${
            state === "recording"
              ? "bg-[#8A4E4E] text-[#F6F1E4] animate-pulse"
              : "bg-[#0F5C4C] text-[#F6F1E4]"
          }`}
        >
          {state === "recording" ? "إيقاف ■" : "سجّل 🎙️"}
        </button>
        {url && (
          <audio src={url} controls className="h-9" />
        )}
      </div>

      {peaks.length > 0 && (
        <div className="w-full max-w-md h-16 flex items-center gap-[2px]" dir="ltr">
          {peaks.map((p, i) => (
            <div
              key={i}
              className="flex-1 bg-[#0F5C4C]/70 rounded-full"
              style={{ height: `${Math.max(4, p * 100)}%` }}
            />
          ))}
        </div>
      )}

      {state === "denied" && (
        <p className="text-xs text-[#8A4E4E]">
          التسجيل مش متاح — اسمح باستخدام الميكروفون أو جرّب متصفح تاني.
        </p>
      )}
    </div>
  );
}

export default function VocalTrainer() {
  const [active, setActive] = useState(EXERCISES[0].id);
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const ex = EXERCISES.find((e) => e.id === active);

  const onDone = useCallback(() => {
    setRunning(false);
    setDoneCount((n) => n + 1);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#0F5C4C] dark:text-[#E7C873]">تدريب الصوت</h2>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          تمارين تحضيرية للنَفَس والصوت — تساعد على المدّ الطويل والغنّة الواضحة
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXERCISES.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              setActive(e.id);
              setRunning(false);
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              active === e.id
                ? "bg-[#0F5C4C] border-[#0F5C4C] text-[#F6F1E4]"
                : "border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2]"
            }`}
          >
            {e.icon} {e.title}
          </button>
        ))}
      </div>

      <div className="bg-[#FFFDF6] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-3xl p-6">
        <p className="text-center text-[#1E2A24] dark:text-[#F6F1E4] font-semibold mb-1">
          {ex.prompt}
        </p>
        <p className="text-center text-xs text-[#8A7A4E] mb-2">💡 {ex.tip}</p>

        {ex.kind === "breath" ? (
          <BreathCircle ex={ex} running={running} />
        ) : (
          <Timer seconds={ex.seconds} running={running} onDone={onDone} />
        )}

        <div className="flex justify-center gap-2">
          <button
            onClick={() => setRunning((v) => !v)}
            className={`px-7 py-2.5 rounded-xl font-bold text-sm ${
              running ? "bg-[#8A4E4E] text-[#F6F1E4]" : "bg-[#0F5C4C] text-[#F6F1E4]"
            }`}
          >
            {running ? "إيقاف" : "ابدأ"}
          </button>
        </div>

        <Recorder />
      </div>

      {doneCount > 0 && (
        <p className="text-center text-sm text-[#0F5C4C] dark:text-[#8FD6C0]">
          خلّصت {doneCount} تمرين النهاردة — كمّل 👏
        </p>
      )}
    </div>
  );
}
