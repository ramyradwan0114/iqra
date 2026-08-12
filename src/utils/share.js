// ============================================================
//  المشاركة
// ============================================================
export const APP_URL = "https://iqra-beta.vercel.app";
export const SHARE_TEXT = "تعلّم القراءة والقرآن مع تطبيق اقرأ! 📖✨";

export function canWebShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

// بيرجّع "shared" | "copied" | "failed"
// ملاحظة: navigator.share لازم يتنادى من حدث مباشر من المستخدم (user gesture)،
// وبيرمي AbortError لو المستخدم قفل شيت المشاركة — وده مش خطأ، بنعامله كإلغاء.
export async function shareApp() {
  if (canWebShare()) {
    try {
      await navigator.share({ title: "اقرأ", text: SHARE_TEXT, url: APP_URL });
      return "shared";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelled";
      // بعض المتصفحات بترمي لو المشاركة مش مدعومة فعليًا — نكمّل للنسخ
    }
  }
  return copyLink();
}

export async function copyLink(text = `${SHARE_TEXT}\n${APP_URL}`) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
  } catch {}
  // بديل للمتصفحات القديمة أو السياقات غير الآمنة (http)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? "copied" : "failed";
  } catch {
    return "failed";
  }
}
