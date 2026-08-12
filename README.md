# اقرأ

تطبيق تعليم القراءة والكتابة العربية + مصحف تفاعلي بتوقيت حقيقي بكلمة-بكلمة.
Vite + React 18 + Tailwind 3 + PWA.

## التشغيل

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # مخرجات في dist/
npm run preview  # معاينة نسخة الإنتاج — لازم لاختبار الـ PWA
```

الـ Service Worker **معطّل في وضع التطوير** عن قصد (`devOptions.enabled: false`)،
لأنه بيخبّي تغييراتك خلف الكاش. لاختبار الـ PWA استخدم `npm run build && npm run preview`.

## بنية الملفات

```
index.html              نقطة الدخول — meta, theme-color, preconnect, رابط الخطوط
package.json            الاعتماديات والأوامر
vite.config.js          إعدادات Vite + vite-plugin-pwa (الـ manifest متعرّف هنا)
tailwind.config.js      المسارات، الألوان، وامتداد الشفافية (مهم — شوف تحت)
postcss.config.js       tailwindcss + autoprefixer
.gitignore

public/
  icon-192.svg          أيقونة مؤقتة
  icon-512.svg          أيقونة مؤقتة (any + maskable)
  favicon.svg

src/
  main.jsx              ReactDOM.createRoot + StrictMode
  App.jsx               التطبيق كامل — منسوخ بالبايت من QuranLiteracyApp.jsx
  index.css             توجيهات Tailwind + أنماط الأساس
  sw.js                 الـ Service Worker (استراتيجية injectManifest)
```

## قرارات لازم تعرفها

**١. `strategies: 'injectManifest'` بدل `public/sw.js`**
`vite-plugin-pwa` في وضعه الافتراضي (`generateSW`) بيولّد `sw.js` بنفسه وبيدوس
على أي ملف بنفس الاسم في `public/`. عشان تفضل مالك الـ SW فعليًا، الملف
اتحطّ في `src/sw.js` والبلجن بيحقن فيه قائمة الـ precache (`self.__WB_MANIFEST`).
ده بيدّيك اللي طلبته — SW مكتوب بإيدك يستخدم workbox precache — من غير تصادم.

**٢. مفيش `public/manifest.json`**
الـ manifest متعرّف في `vite.config.js` وبيتولّد كـ `dist/manifest.webmanifest`،
والبلجن بيحقن `<link rel="manifest">` بنفسه. لو حطّينا `public/manifest.json`
كمان يبقى عندنا اتنين manifest ولينكين — سلوك غير محدَّد. مصدر واحد أفضل.

**٣. Tailwind مثبّت على الإصدار ٣ مش ٤**
Tailwind 4 غيّر كل حاجة: مفيش `tailwind.config.js` افتراضيًا، والـ postcss
plugin بقى `@tailwindcss/postcss`، وتوجيهات `@tailwind` اتشالت. الإعداد اللي
طلبته هو إعداد الإصدار ٣، فمثبّت على `^3.4`.

**٤. امتداد الشفافية في `tailwind.config.js` — مش تجميل**
الكود بيستخدم `bg-[#0F5C4C]/8` و `/15`، والقيمتين مش في سلّم الشفافية
الافتراضي (0, 5, 10, 20, 25, 40, 50, …). من غير `theme.extend.opacity`
الكلاسات دي **مابتطلّعش أي خلفية وتختفي في صمت**. متشيلش السطرين دول.

**٥. ملفات الصوت مش متخزّنة في الكاش — عن قصد**
القفز لكلمة جوّه السورة بيستخدم HTTP Range requests والسيرفر بيرد `206
Partial Content`. workbox مابيتعاملش مع الـ 206 صح من غير `workbox-range-requests`،
ولو خزّنته بالغلط بيرجّع نص ملف على إنه كامل فالصوت يتقطّع. وكمان سورة زي
البقرة ~٩٥ ميجا. اللي **متخزَّن** هو ردود `api.qurancdn.com` (توقيت + نص
الآيات) — صغيرة وثابتة، فأي سورة فتحتها مرة تفضل تفتح أوفلاين بعد كده.

**٦. الخطوط بتيجي من Google Fonts CDN**
`src/index.css` فيه شرح ليه ماكتبتش `@font-face` بروابط `.woff2` مباشرة:
جوجل بتدوّر الروابط دي من غير إشعار، والـ `@font-face` المكتوب بإيدك بيقع
بعد شهور في صمت. الـ SW بيخزّن الخطوط بعد أول زيارة، **لكن أول تحميل محتاج
إنترنت**. لو عايز أوفلاين ١٠٠٪ من أول لحظة: نزّل ملفات Amiri و Amiri Quran،
حطّها في `public/fonts/`، اكتب `@font-face` في `index.css`، وشيل اللينك من
`index.html`.

## نقاط مفتوحة

- **الأيقونات SVG مؤقتة.** كروم على أندرويد ساعات بيطلب PNG ّ192 و 512 عشان
  يعرض زر التثبيت. لما تعمل أيقونات حقيقية، صدّرها PNG وغيّر `type` في
  `vite.config.js` لـ `image/png`.
- **`start_url` و `scope` على `/`.** لو هتنشر على مسار فرعي (مثلًا GitHub Pages
  تحت `/iqra/`)، لازم تظبط `base` في `vite.config.js` و `start_url`/`scope`
  مع بعض، وإلا الـ PWA مش هيثبّت.
- **`QuranLiteracyApp.jsx` في الجذر بقى نسخة مكرّرة** من `src/App.jsx`
  (متطابقين بالبايت). Tailwind مش بيقراه، وVite مش بيبنيه. امسحه لما تتأكد.
