import React, { useState } from "react";
import {
  FEEDBACK_KINDS,
  whatsappLink,
  emailLink,
  kindLabel,
  EMAIL,
} from "../utils/feedback.js";

// ============================================================
//  دليل الاستخدام + الملاحظات
// ------------------------------------------------------------
//  الدليل مقسّم لأقسام مطويّة (accordion) مش صفحة واحدة طويلة.
//  السبب: دليل بيشرح ١٦ ميزة في صفحة واحدة محدش بيقراه — بينزل
//  لتحت، يحس إنه كتير، ويقفل. المطويّ بيخلّي المستخدم يفتح اللي
//  محتاجه هو بس.
//
//  الملاحظات فوق مش تحت: اللي فتح الصفحة دي غالبًا واقف في حاجة،
//  ولو حطّينا زر الشكوى في الآخر هيسيب الصفحة قبل ما يوصله.
// ============================================================

const GUIDE = [
  {
    icon: "📚",
    title: "تعلّم القراءة والكتابة",
    body: [
      "افتح تبويب «تعلم» واختار المستوى، وبعدين «ابدأ الدرس».",
      "كل درس بيمشي في ٣ مراحل: قراءة ← كتابة ← اختبار.",
      "في القراءة: المس الحرف عشان تسمع نطقه (لو جهازك فيه صوت عربي).",
      "في الكتابة: ارسم الحرف بإصبعك على الخطوط الباهتة، ودوس «صحّح».",
      "مستعجل؟ فيه «تخطّى القراءة» و«تخطّى الكتابة» تحت الأزرار.",
      "المستوى الجديد بيتفتح بعد ما تخلّص اللي قبله.",
    ],
  },
  {
    icon: "📖",
    title: "المصحف",
    body: [
      "تبويب «قرآن» بيفتح مصحف المدينة بنفس تخطيط الصفحة المطبوعة.",
      "التنقّل من فوق: بالسورة، أو بالجزء، أو بكتابة رقم الصفحة.",
      "دوس على أي كلمة عشان التلاوة تبدأ منها.",
      "الكلمة بتتلوّن وهي بتتقري — فتقدر تتابع بعينك.",
      "تقدر تغيّر القارئ من فوق. «المنشاوي — كرّر ورايا» بيسيب لك مساحة تعيد وراه، وده الأنسب للأطفال والمبتدئين.",
      "حجم الخط بيتظبّط من «الإعدادات».",
    ],
  },
  {
    icon: "🔖",
    title: "العلامات",
    body: [
      "عايز توقف عند آية وترجعلها؟ اضغط **ضغطة طويلة** على رقم الآية.",
      "هيطلعلك اختيار «سجّل علامة هنا».",
      "علاماتك كلها في: قرآن ← علاماتي.",
      "دوس على أي علامة تروح للصفحة بتاعتها على طول.",
    ],
  },
  {
    icon: "🕌",
    title: "مواقيت الصلاة والأذان",
    body: [
      "المزيد ← المواقيت: اسمح بالموقع، أو اختار مدينتك يدويًا.",
      "الحساب كله بيتم على جهازك — مفيش إنترنت ولا إرسال لموقعك لأي مكان.",
      "المزيد ← المؤذّن: فعّل الأذان واختار المؤذّن، وتقدر تقفل أذان صلاة معيّنة لو حبيت.",
      "⚠️ مهم: لو جهازك شاومي أو هونر أو أوبو، لازم تعفي التطبيق من تقييد البطارية — الإرشادات ظاهرة في نفس الشاشة. من غير كده النظام بيوقف الأذان وهو نايم.",
      "فيه زرار تجربة عشان تتأكد إن الصوت شغّال قبل ما تعتمد عليه.",
    ],
  },
  {
    icon: "📿",
    title: "الأذكار والتسبيح",
    body: [
      "المزيد ← الأذكار: أذكار الصباح والمساء، مكتوبة ومسموعة بصوت قارئ حقيقي.",
      "عدّاد التسبيح في الصفحة الرئيسية — دوس على الدائرة تزوّد واحد.",
      "العدّاد بيفتكر أرقامك حتى لو قفلت التطبيق.",
      "التذكيرات: الإعدادات ← التذكيرات. الذِّكر نفسه بيتكتب في الإشعار، فتقراه من شاشة القفل من غير ما تفتح التطبيق.",
    ],
  },
  {
    icon: "🎤",
    title: "الحفظ والتسميع",
    body: [
      "تعلم ← الحفظ: اختار أي سورة واحفظها بالتكرار المتدرّج.",
      "تعلم ← المسمّع: اقرأ من حفظك والتطبيق يقارن كلامك بالنص.",
      "الكلمات بتتلوّن: صح / قريّبة / مختلفة.",
      "⚠️ المسمّع بيتأكد إنك **قلت الكلمات صح** — مابيحكمش على التجويد. التجويد محتاج شيخ.",
    ],
  },
  {
    icon: "🧭",
    title: "القبلة",
    body: [
      "تبويب «قبلة» بيوريك الاتجاه من موقعك.",
      "لو السهم بيرقص، لف الجهاز على شكل رقم ٨ مرتين لمعايرة البوصلة.",
      "بوصلة الموبايل بتتأثر بالمعادن والمغناطيس — بُعد عن أي حاجة حديد.",
    ],
  },
  {
    icon: "🔒",
    title: "الخصوصية",
    body: [
      "التطبيق **مابيجمعش أي بيانات**.",
      "كل تقدّمك وعلاماتك وعدّادك محفوظين على جهازك وحده.",
      "مفيش تسجيل دخول، ومفيش إيميل مطلوب، ومفيش حاجة بتتبعت لأي خادم.",
      "لو مسحت التطبيق، البيانات بتتمسح معاه — فمفيش نسخة عند حد.",
    ],
  },
];

function Section({ item, open, onToggle }) {
  return (
    <div className="iqra-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
      >
        <span className="text-xl w-7 shrink-0" aria-hidden="true">
          {item.icon}
        </span>
        <span className="flex-1 font-bold text-sm text-[#1B4D3E] dark:text-[#D4A853]">
          {item.title}
        </span>
        <span className="text-[#8A7A4E] text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
          {item.body.map((line, i) => (
            <p
              key={i}
              className="text-[13px] leading-relaxed text-[#5B6B62] dark:text-[#A9BDB2] flex gap-2"
            >
              <span className="text-[#D4A853] shrink-0">•</span>
              <span>{line}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpScreen() {
  const [openIdx, setOpenIdx] = useState(null);
  const [kind, setKind] = useState(null);

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      {/* ---------- الملاحظات ---------- */}
      <section className="rounded-2xl bg-[#1B4D3E] text-[#F5F0E8] px-5 py-5">
        <h2 className="font-bold text-base mb-1">رأيك بيفرق</h2>
        <p className="text-[12px] opacity-80 leading-relaxed mb-4">
          لو لقيت حاجة باظت، أو عندك فكرة، أو لاحظت غلطة في نص — ابعتلي.
          التطبيق ده بيتحسّن بملاحظات الناس اللي بتستعمله.
        </p>

        <div className="flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(kind === k.id ? null : k.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                kind === k.id
                  ? "bg-[#D4A853] text-[#1E2A24]"
                  : "bg-[#F5F0E8]/15 text-[#F5F0E8]"
              }`}
            >
              <span aria-hidden="true">{k.icon}</span>
              {k.label}
            </button>
          ))}
        </div>

        {kind && (
          <div className="mt-4 flex flex-wrap gap-2">
            {/* الروابط دي بتفتح واتساب أو البريد برسالة جاهزة —
                المستخدم بيشوفها ويعدّلها قبل ما يبعت. مفيش إرسال
                تلقائي ومفيش أي حاجة بتتبعت من غير علمه. */}
            <a
              href={whatsappLink(kindLabel(kind))}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#25D366] text-[#0B3B22] text-sm font-bold"
            >
              واتساب
            </a>
            <a
              href={emailLink(kindLabel(kind))}
              className="px-5 py-2.5 rounded-xl bg-[#F5F0E8] text-[#1B4D3E] text-sm font-bold"
            >
              إيميل
            </a>
          </div>
        )}

        <p className="text-[10px] opacity-60 mt-3 leading-relaxed">
          الرسالة بتتبعت ومعاها نسخة التطبيق ونوع الجهاز بس — عشان أقدر أوصل
          للمشكلة. مفيش أي بيانات شخصية.
        </p>
      </section>

      {/* ---------- الدليل ---------- */}
      <div>
        <h2 className="font-bold text-base text-[#1B4D3E] dark:text-[#D4A853] mb-1">
          كيف تستخدم التطبيق
        </h2>
        <p className="text-[11px] text-[#8A7A4E] mb-3">
          دوس على أي قسم عشان يفتح
        </p>
        <div className="flex flex-col gap-2">
          {GUIDE.map((item, i) => (
            <Section
              key={item.title}
              item={item}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-[#8A7A4E] text-center leading-relaxed">
        لسه محتاج مساعدة؟{" "}
        <a href={emailLink("سؤال")} className="underline font-semibold">
          {EMAIL}
        </a>
      </p>
    </div>
  );
}
