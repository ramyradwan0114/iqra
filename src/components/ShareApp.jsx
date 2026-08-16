import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { APP_URL, SHARE_TEXT, shareApp, copyLink, canWebShare } from "../utils/share.js";

export default function ShareApp({ onToast }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // الكود بيتولّد محليًا على الكانفاس — من غير أي خدمة خارجية،
  // فبيشتغل أوفلاين وماحدّش بيتتبّع اللينك بتاعك.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    QRCode.toCanvas(
      c,
      APP_URL,
      {
        width: 260,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#1B4D3Eff", light: "#FFFFFFff" },
      },
      (err) => {
        if (err) setError(true);
        else setReady(true);
      }
    );
  }, []);

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const a = document.createElement("a");
      a.href = c.toDataURL("image/png");
      a.download = "iqra-qr.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onToast?.("تم تحميل الصورة");
    } catch {
      onToast?.("تعذّر تحميل الصورة");
    }
  };

  const doShare = async () => {
    const r = await shareApp();
    if (r === "copied") onToast?.("تم النسخ!");
    else if (r === "failed") onToast?.("تعذّرت المشاركة");
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-bold text-[#1B4D3E] dark:text-[#D4A853]">شارك التطبيق</h3>
        <p className="text-xs text-[#5B6B62] dark:text-[#A9BDB2] mt-1">
          التطبيق مجاني بالكامل — شاركه مع أهلك وأصحابك
        </p>
      </div>

      <div className="bg-[#FFFFFF] dark:bg-[#243830] border border-[#E4DCC3] dark:border-[#3A5148] rounded-3xl p-6 flex flex-col items-center gap-4">
        <div className="bg-[#FFFFFF] rounded-2xl p-3">
          <canvas ref={canvasRef} className="block rounded-lg" width={260} height={260} />
        </div>

        {error ? (
          <p className="text-sm text-[#8A4E4E]">تعذّر توليد الكود</p>
        ) : (
          <p className="text-sm font-semibold text-[#1E2A24] dark:text-[#F5F0E8]">
            امسح الكود وافتح التطبيق
          </p>
        )}

        <code className="text-[11px] text-[#8A7A4E] break-all text-center" dir="ltr">
          {APP_URL}
        </code>

        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            onClick={doShare}
            className="bg-[#1B4D3E] text-[#F5F0E8] px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            {canWebShare() ? "شارك 📤" : "انسخ الرابط 📋"}
          </button>
          <button
            onClick={download}
            disabled={!ready}
            className="border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
          >
            حمّل الصورة ⬇️
          </button>
          <button
            onClick={async () => {
              const r = await copyLink();
              onToast?.(r === "copied" ? "تم النسخ!" : "تعذّر النسخ");
            }}
            className="border border-[#E4DCC3] dark:border-[#3A5148] text-[#5B6B62] dark:text-[#A9BDB2] px-5 py-2.5 rounded-xl font-bold text-sm"
          >
            انسخ 📋
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[#8A7A4E] text-center">{SHARE_TEXT}</p>
    </div>
  );
}
