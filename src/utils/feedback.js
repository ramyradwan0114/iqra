// ============================================================
//  قناة الملاحظات
// ------------------------------------------------------------
//  ليه بنرفق بيانات الجهاز تلقائيًا: أكتر ملاحظة عديمة الفايدة هي
//  «التطبيق مش شغال». من غير نسخة التطبيق ونوع الجهاز، الرد الوحيد
//  الممكن هو سؤال المستخدم أسئلة كتير — وأغلب الناس مابترجعش.
//
//  ⚠️ خصوصية: البيانات المرفقة **عامة ومش شخصية** — موديل الجهاز،
//  نسخة أندرويد، ونسخة التطبيق. مفيش اسم ولا موقع ولا أي تقدّم
//  للمستخدم. والمستخدم بيشوف الرسالة كاملة قبل ما يبعتها، لأن
//  اللي بيتفتح هو تطبيق واتساب أو البريد عنده مش إرسال تلقائي.
// ============================================================

export const WHATSAPP = "201145728202";
export const EMAIL = "ramyradwan0114@gmail.com";

const BUILD = typeof __IQRA_BUILD__ !== "undefined" ? __IQRA_BUILD__ : "dev";

// موديل الجهاز من الـ user agent. مش دقيق ١٠٠٪ بس كفاية للتمييز
// بين شاومي وسامسونج وهونر — وده اللي بيفرق في مشاكل الإشعارات.
function deviceLine() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const android = ua.match(/Android\s+([\d.]+)/)?.[1];
  // الموديل بين آخر فاصلة منقوطة وبين "Build/" أو قوس الإغلاق.
  // الكمّية كسولة (+?) عن قصد: الجشعة كانت بتبلع "Build/UKQ1"
  // كمان وتطلّع "23021RAA2Y Build/UKQ1" بدل "23021RAA2Y".
  const model = ua.match(/;\s*([^;)]+?)\s*(?:Build\/|\))/)?.[1]?.trim();
  const bits = [];
  if (model) bits.push(model);
  if (android) bits.push("أندرويد " + android);
  return bits.length ? bits.join(" · ") : "جهاز غير معروف";
}

// نص الرسالة الجاهزة. سايبين سطر فاضي فوق عشان المستخدم يكتب
// كلامه من غير ما يمسح حاجة.
export function feedbackBody(kind = "ملاحظة") {
  return (
    `\n\n` +
    `— — — — — — — — — —\n` +
    `النوع: ${kind}\n` +
    `النسخة: ${BUILD}\n` +
    `الجهاز: ${deviceLine()}`
  );
}

export function whatsappLink(kind) {
  const text = encodeURIComponent(`السلام عليكم، عندي ${kind} على تطبيق «اقرأ»:` + feedbackBody(kind));
  // wa.me بيشتغل في المتصفّح وفي التطبيق الأصلي على السواء
  return `https://wa.me/${WHATSAPP}?text=${text}`;
}

export function emailLink(kind) {
  const subject = encodeURIComponent(`تطبيق اقرأ — ${kind}`);
  const body = encodeURIComponent(`السلام عليكم،` + feedbackBody(kind));
  return `mailto:${EMAIL}?subject=${subject}&body=${body}`;
}

export const FEEDBACK_KINDS = [
  { id: "bug", label: "فيه حاجة باظت", icon: "🐞" },
  { id: "idea", label: "عندي اقتراح", icon: "💡" },
  { id: "content", label: "غلطة في نص أو آية", icon: "📖" },
];

export const kindLabel = (id) =>
  FEEDBACK_KINDS.find((k) => k.id === id)?.label || "ملاحظة";
