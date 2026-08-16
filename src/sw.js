/// <reference lib="webworker" />
//
// Service Worker — استراتيجية injectManifest
// ------------------------------------------
// vite-plugin-pwa بيحقن قائمة ملفات البناء مكان self.__WB_MANIFEST وقت البناء.
// الملف ده هو الـ SW الفعلي — مش بيتولّد، إنت اللي بتتحكم فيه.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";

// registerType: 'autoUpdate' في الإعدادات بيتوقّع إن الـ SW الجديد ياخد
// المكان فورًا من غير ما يستنى قفل كل التبويبات.
self.skipWaiting();
clientsClaim();

// 1) ملفات التطبيق نفسه (js/css/html/svg) — precache
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 2) التطبيق صفحة واحدة: أي مسار يرجّع index.html
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  })
);

// 3) خطوط جوجل — ورقة الأنماط بتتغيّر، فـ NetworkFirst.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new NetworkFirst({
    cacheName: "google-fonts-stylesheets",
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// ملفات الخط نفسها ثابتة (الرابط فيه هاش) — CacheFirst لسنة كاملة.
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// 4) بيانات التوقيت ونصوص الآيات من Quran.com — ردود صغيرة وثابتة عمليًا.
// تخزينها معناه إن أي سورة فتحتها مرة تفضل شغّالة أوفلاين بعد كده.
registerRoute(
  ({ url }) => url.origin === "https://api.qurancdn.com",
  new NetworkFirst({
    cacheName: "quran-timings",
    networkTimeoutSeconds: 6,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 90 }),
    ],
  })
);

// 5) ملفات التلاوة (mp3) — مش متخزّنة عن قصد.
//
// السبب مهم: القفز لكلمة جوّه السورة بيتم عن طريق HTTP Range requests،
// والسيرفر بيرجّع 206 Partial Content. workbox مابيخزّنش الـ 206 صح من غير
// workbox-range-requests، ولو خزّنته بالغلط بيرجّع نص ملف على إنه كامل
// فالصوت بيتقطع. وكمان ملف زي البقرة ~٩٥ ميجا — مش حاجة تتحط في الكاش من
// غير ما المستخدم يطلب.
//
// لو حبيت تنزيل أوفلاين لسورة معيّنة بعدين، الطريقة الصح هي تنزيل الملف
// كاملًا بـ fetch مرة واحدة وحفظه بنفسك، مش تخزين ردود الـ Range.

// 6) الضغط على الإشعار → يفتح المكان الصح جوّه التطبيق (deep link)
//
// المهم هنا: لو التطبيق مفتوح بالفعل، **مانفتحش تبويب جديد**. بندوّر على
// نافذة شغّالة، نركّز عليها، ونبعتلها رسالة تنقلها للمكان المطلوب.
// من غير الخطوة دي المستخدم بيلاقي نسخة تانية من التطبيق كل مرة يدوس
// على إشعار — وده بيضيّع حالته وبيبوّظ الصوت الشغّال.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const target = new URL(url, self.location.origin);

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        // أي نافذة من نفس الأصل تنفع — بنركّز عليها ونبعتلها الوجهة
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          await client.focus();
          client.postMessage({ type: "IQRA_NAVIGATE", url: target.pathname + target.search });
          return;
        }
      }
      // مفيش نافذة مفتوحة → نفتح واحدة
      if (self.clients.openWindow) await self.clients.openWindow(target.href);
    })()
  );
});

// 7) رسالة من التطبيق لو حبيت تحدّث يدويًا
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
