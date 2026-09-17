import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

// ============================================================
//  تسجيل الـ Service Worker — للويب بس
// ------------------------------------------------------------
//  في التطبيق الأصلي، الملفات بتتحمّل من جوّه الـAPK فالعمل
//  أوفلاين مضمون من غير SW. ولو سجّلناه هناك، بيكاش نسخة
//  الجافاسكربت وبيفضل يعرضها بعد تحديث التطبيق — فكل إصلاح
//  بيبان كأنه مانفعش، وندوّر على مشكلة مش موجودة.
//
//  Capacitor بيحقن window.Capacitor في الـWebView قبل كود
//  التطبيق، فالفحص ده متاح فورًا من غير انتظار.
// ============================================================
const isNativeApp = () => {
  try {
    return window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

if (!isNativeApp() && "serviceWorker" in navigator) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
} else if (isNativeApp() && "serviceWorker" in navigator) {
  // نظافة: لو نسخة قديمة من التطبيق سجّلت SW، بنشيله —
  // وإلا هيفضل يخدم كود قديم للأبد حتى بعد الإصلاح ده.
  navigator.serviceWorker
    .getRegistrations()
    .then((rs) => rs.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches?.keys) {
    caches
      .keys()
      .then((ks) => ks.forEach((k) => caches.delete(k)))
      .catch(() => {});
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
