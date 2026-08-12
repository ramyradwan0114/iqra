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
      includeAssets: ["icon-192.svg", "icon-512.svg", "favicon.svg"],

      manifest: {
        name: "اقرأ",
        short_name: "اقرأ",
        description: "تعليم القراءة والكتابة العربية والمصحف التفاعلي",
        lang: "ar",
        dir: "rtl",
        theme_color: "#0F5C4C",
        background_color: "#F6F1E4",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
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
