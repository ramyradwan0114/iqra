import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ملاحظة على استراتيجية الـ Service Worker:
// طلبت ملف sw.js مكتوب بإيدك يستخدم workbox precache، وكمان vite-plugin-pwa.
// الاتنين مع بعض بيتعارضوا في الوضع الافتراضي (generateSW) لأن البلجن بيولّد
// sw.js بنفسه وبيدوس على أي ملف بنفس الاسم. الحل الصح هو strategies:
// 'injectManifest' — إنت بتكتب الـ SW (src/sw.js) والبلجن بيحقن فيه قائمة
// الملفات المطلوب تخزينها (self.__WB_MANIFEST). كده الاتنين شغالين مع بعض.
// ختم البناء: بيتحقن وقت البناء ويتعرض في «المزيد ← الإعدادات».
// الفايدة العملية: لما نصلّح حاجة وتفضل ظاهرة على الموبايل، الرقم ده
// بيقول فورًا هل الجهاز شغّال الكود الجديد ولا القديم — بدل ما
// ندوّر على مشكلة في كود مش متثبّت أصلًا.
// ⚠️ بالتوقيت المحلي مش UTC.
// toISOString() بترجّع UTC، ومصر UTC+3 — فالختم كان بيقول ١٢:١٨
// والساعة على الموبايل ١٥:٣٣. المستخدم يبص يلاقي فرق ٣ ساعات
// فيفتكر إنه شغّال نسخة قديمة، والنسخة أحدث نسخة أصلًا.
// الختم المفروض يطابق ساعة الحيطة عشان المقارنة تبقى فورية.
const pad = (n) => String(n).padStart(2, "0");
const d = new Date();
const BUILD_ID =
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default defineConfig({
  define: {
    __IQRA_BUILD__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      // ⚠️ "auto" بيحقن تسجيل الـ Service Worker في index.html من غير
      // أي شرط — يعني بيشتغل جوّه التطبيق الأصلي كمان. وده ضرر خالص:
      // التطبيق الأصلي أصلًا بيحمّل ملفاته من جوّه الـAPK (شغّال
      // أوفلاين بطبيعته)، فالـSW مابيضيفش حاجة — لكنه **بيكاش نسخة
      // الجافاسكربت**. فلما نبني APK جديد، الـWebView ممكن تفضل
      // تعرض الكود القديم، وتبان كأن الإصلاح مانفعش.
      //
      // null = مافيش حقن، والتسجيل بقى يدوي في main.jsx للويب بس.
      injectRegister: null,
      includeAssets: [
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-512.png",
        "apple-touch-icon.png",
        "favicon.svg",
      ],

      manifest: {
        name: "اقرأ",
        short_name: "اقرأ",
        description: "تعليم القراءة والكتابة العربية والمصحف التفاعلي",
        lang: "ar",
        dir: "rtl",
        // لازم يطابقوا <meta name="theme-color"> و --iqra-bg في index.css،
        // وإلا شاشة البداية بتومض بلون مختلف عن التطبيق.
        theme_color: "#1B4D3E",
        background_color: "#F5F0E8",
        display: "standalone",
        // "portrait" كان بيقفل الوضع الأفقي تمامًا على النسخة المثبَّتة —
        // يعني ميزة الصفحتين في المصحف ماكانتش تشتغل أصلًا لأي حد مثبّت
        // التطبيق. "any" بيسيب الجهاز يقرّر.
        orientation: "any",
        start_url: "/",
        scope: "/",
        // PNG مش SVG: متجر جوجل بلاي بيطلب PNG، وأيقونة الـ maskable لازم
        // تبقى نقطية عشان أندرويد يقصّها صح. والأيقونة القديمة كانت نص
        // عربي داخل SVG — أي جهاز مافيهوش خط Amiri كان هيرسمها غلط.
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"],
        globIgnores: [
          // ملفات الصوت مش داخلة عمدًا — شوف التعليق في src/sw.js
          "**/*.mp3",
          // Firebase ~٦٦٠ كيلوبايت وبيتحمّل عند الطلب فقط (وضع المعلّم مع
          // مفاتيح متظبّطة). تخزينه مسبقًا معناه إن كل طفل هينزّله على بيانات
          // الموبايل من غير ما يستعمله أبدًا.
          "**/firebase-*.js",
        ],
      },

      devOptions: {
        enabled: false, // خلّيه false: الـ SW في التطوير بيخبّي تغييراتك
        type: "module",
      },
    }),
  ],

  server: {
    port: 5173,
    open: true,
  },

  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      // ملاحظة على Capacitor: كانت هنا external: [/^@capacitor\//]
      // وكانت **غلط**. external بتسيب الاستيراد نصًّا مجرّدًا
      // ("@capacitor/core") في الملف الناتج، والمتصفّح — وWebView بتاع
      // التطبيق الأصلي كمان — مابيقدرش يحلّ اسم زي ده، فبيرمي خطأ.
      // النتيجة إن الـ try/catch في nativeAthan.js كان بيبلع الخطأ
      // ويرجّع null، فالتطبيق الأصلي كان بيبان كأنه نسخة متصفّح
      // والأذان مابيتجدولش.
      //
      // الصح إننا نسيب Vite يحزم الحزمة عادي: في الويب
      // Capacitor.isNativePlatform() بترجّع false لوحدها، وده اللي
      // بيخلّي الكود يعرف إنه مش على تطبيق أصلي — من غير أي حيلة.
      output: {
        // اسم ثابت لجزء Firebase عشان نقدر نستثنيه من الـ precache
        manualChunks(id) {
          if (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase"))
            return "firebase";
        },
        chunkFileNames: (chunk) =>
          chunk.name === "firebase" ? "assets/firebase-[hash].js" : "assets/[name]-[hash].js",
      },
    },
  },
});
