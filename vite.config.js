import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ملاحظة على استراتيجية الـ Service Worker:
// طلبت ملف sw.js مكتوب بإيدك يستخدم workbox precache، وكمان vite-plugin-pwa.
// الاتنين مع بعض بيتعارضوا في الوضع الافتراضي (generateSW) لأن البلجن بيولّد
// sw.js بنفسه وبيدوس على أي ملف بنفس الاسم. الحل الصح هو strategies:
// 'injectManifest' — إنت بتكتب الـ SW (src/sw.js) والبلجن بيحقن فيه قائمة
// الملفات المطلوب تخزينها (self.__WB_MANIFEST). كده الاتنين شغالين مع بعض.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectRegister: "auto",
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
      // Capacitor بيتحمّل ديناميكيًا في utils/nativeAthan.js عشان نسخة
      // الويب تفضل شغّالة من غيره. بس Rollup بيحاول يحلّ الاستيراد وقت
      // البناء حتى لو ديناميكي، وبيقع لو الحزمة مش متثبّتة — اختبرته
      // فعلًا ووقع بـ "failed to resolve import @capacitor/core".
      //
      // external معناه: سيب الاستيراد ده لوقت التشغيل، والـ try/catch
      // جوّه الملف بيمسك الفشل ويرجّع null بهدوء في المتصفّح.
      external: [/^@capacitor\//],
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
