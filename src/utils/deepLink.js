// ============================================================
//  الروابط العميقة (Deep Links)
// ------------------------------------------------------------
//  التطبيق مافيهوش راوتر، وVercel هيدّي 404 لأي مسار زي /lesson/123
//  من غير قاعدة rewrite. فبنستخدم query params — بتشتغل فورًا، ومن غير
//  أي إعداد، وبتفضل شغّالة أوفلاين من الـ Service Worker.
//
//  الشكل: /?go=lesson&audience=child&level=2
//         /?go=quran&surah=18
//         /?go=worship&sub=prayer
//         /?go=home
// ============================================================

export const ROUTES = {
  home: { tab: "learn" },
  lesson: { tab: "learn", openLesson: true },
  quran: { tab: "quran" },
  worship: { tab: "worship" },
  train: { tab: "train" },
  more: { tab: "more" },
};

export function buildLink(go, params = {}) {
  const q = new URLSearchParams({ go, ...params });
  return `/?${q.toString()}`;
}

// بيقرا الوجهة من رابط (أو من العنوان الحالي)
export function parseLink(href) {
  try {
    const url = href ? new URL(href, window.location.origin) : new URL(window.location.href);
    const p = url.searchParams;
    const go = p.get("go");
    if (!go || !ROUTES[go]) return null;
    return {
      go,
      ...ROUTES[go],
      audience: p.get("audience") || null,
      level: p.get("level") ? Number(p.get("level")) : null,
      surah: p.get("surah") ? Number(p.get("surah")) : null,
      sub: p.get("sub") || null,
      // focus: معرّف عنصر في الصفحة ننزل عليه بعد ما نفتحها.
      // من غيره، إشعار زي «صلِّ على النبي» بيفتح التبويب من فوق
      // والعدّاد اللي المفروض يوصّله ليه يفضل تحت برّه الشاشة.
      focus: p.get("focus") || null,
    };
  } catch {
    return null;
  }
}

export function clearLinkParams() {
  try {
    const url = new URL(window.location.href);
    ["go", "audience", "level", "surah", "sub", "focus"].forEach((k) =>
      url.searchParams.delete(k)
    );
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  } catch {}
}

// الاستماع لرسائل الـ Service Worker (لما التطبيق يكون مفتوح بالفعل)
export function onServiceWorkerNavigate(handler) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return () => {};
  const listener = (event) => {
    if (event.data?.type === "IQRA_NAVIGATE" && event.data.url) {
      const parsed = parseLink(event.data.url);
      if (parsed) handler(parsed);
    }
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
