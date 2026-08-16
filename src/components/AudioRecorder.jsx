import React, { useState, useRef, useCallback, useEffect } from "react";

// مسجّل بموجة حيّة. بيرجّع الـ Blob للأب عشان يحلّله.
export default function AudioRecorder({ onRecorded, disabled, maxSeconds = 120 }) {
  const [state, setState] = useState("idle"); // idle | rec | done | denied
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState(null);
  const [peaks, setPeaks] = useState([]);

  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const tickRef = useRef(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    try {
      ctxRef.current?.close();
    } catch {}
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback(() => {
    try {
      mrRef.current?.stop();
    } catch {}
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("denied");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunksRef.current = [];
      setPeaks([]);
      setSeconds(0);
      setUrl(null);

      // موجة حيّة
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const collected = [];
      const draw = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
        collected.push(peak);
        setPeaks([...collected].slice(-90));
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();

      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        cleanup();
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setUrl(URL.createObjectURL(blob));
        setState("done");
        onRecorded?.(blob);
      };
      mr.start();
      setState("rec");

      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= maxSeconds) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setState("denied");
    }
  }, [cleanup, onRecorded, maxSeconds, stop]);

  const two = (n) => String(n).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-3">
      {/* الموجة */}
      <div className="w-full h-16 flex items-center justify-center gap-[2px]" dir="ltr">
        {peaks.length ? (
          peaks.map((p, i) => (
            <div
              key={i}
              className="flex-1 bg-[#1B4D3E] dark:bg-[#D4A853] rounded-full transition-all"
              style={{ height: `${Math.max(6, p * 100)}%`, opacity: 0.5 + p * 0.5 }}
            />
          ))
        ) : (
          <div className="text-xs text-[#8A7A4E]">
            {state === "done" ? "اسمع تسجيلك تحت" : "الموجة هتظهر هنا وإنت بتقرأ"}
          </div>
        )}
      </div>

      {state === "rec" && (
        <div className="flex items-center gap-2 text-[#8A4E4E] font-bold tabular-nums">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8A4E4E] animate-pulse" />
          {two(Math.floor(seconds / 60))}:{two(seconds % 60)}
        </div>
      )}

      <button
        onClick={state === "rec" ? stop : start}
        disabled={disabled}
        className={`px-8 py-3.5 rounded-2xl font-bold ${
          state === "rec"
            ? "bg-[#8A4E4E] text-[#F5F0E8]"
            : disabled
            ? "bg-[#E4DCC3] text-[#A79E86] cursor-not-allowed"
            : "bg-[#1B4D3E] text-[#F5F0E8]"
        }`}
      >
        {state === "rec" ? "إيقاف ■" : state === "done" ? "سجّل تاني 🎤" : "سجّل 🎤"}
      </button>

      {url && <audio src={url} controls className="w-full max-w-sm" />}

      {state === "denied" && (
        <p className="text-xs text-[#8A4E4E] bg-[#FBEDED] rounded-xl px-4 py-2.5 text-center">
          محتاجين إذن الميكروفون. اسمح بيه من إعدادات الموقع وجرّب تاني.
        </p>
      )}
    </div>
  );
}
