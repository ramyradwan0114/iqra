# قائمة الرفع على Google Play

كل مهمة وإجابتها. امشي بالترتيب.

---

## ١. مفتاح التوقيع 🔴 أهم خطوة

```powershell
cd C:\iqra
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
& "$env:JAVA_HOME\bin\keytool" -genkeypair -v -keystore iqra-release.jks -alias iqra -keyalg RSA -keysize 2048 -validity 10000
```

هيسألك:

| السؤال | تكتب |
|---|---|
| Enter keystore password | كلمة سرّ (مرتين) |
| first and last name | `Ramy Radwan` |
| organizational unit | `Iqra` |
| organization | `Iqra` |
| City / State | مدينتك ومحافظتك |
| country code | `EG` |
| Is CN=... correct? | `yes` |

بعدها اعمل `C:\iqra\android\keystore.properties`:

```
storeFile=C:\\iqra\\iqra-release.jks
storePassword=اللي كتبته
keyAlias=iqra
keyPassword=اللي كتبته
```

**🔴 خد نسخة من `iqra-release.jks` على جوجل درايف فورًا مع كلمة السرّ.**
لو ضاع، مفيش تحديث للتطبيق تاني أبدًا.

---

## ٢. لقطات الشاشة (٤ على الأقل)

من موبايلك: **زر الطاقة + خفض الصوت**.

| # | الشاشة | ليه |
|---|---|---|
| ١ | المصحف وصفحة مفتوحة | أول صورة في نتائج البحث |
| ٢ | تمرين كتابة حرف | بتوضّح إنه تعليمي |
| ٣ | المؤذّن والمواقيت | أقوى ميزة |
| ٤ | شاشة الدرس | التدرّج |

اتأكد إن الوضع الليلي **مقفول** وإن مفيش إشعارات في الشريط.

---

## ٣. الرسم المميّز ✅ جاهز

`C:\iqra\store-feature-graphic.png` — ١٠٢٤×٥٠٠

---

## ٤. استبيان تصنيف المحتوى

| السؤال | الإجابة |
|---|---|
| فئة التطبيق | **مرجع / تعليم** |
| عنف | لا |
| محتوى جنسي | لا |
| ألفاظ نابية | لا |
| مخدرات أو كحول أو تبغ | لا |
| قمار | لا |
| تفاعل بين المستخدمين | **لا** (المجموعات محلية على الجهاز) |
| مشاركة الموقع | **لا** (الموقع بيتحسب محليًا ومابيتبعتش) |
| شراء داخل التطبيق | لا |

النتيجة المتوقّعة: **الجميع (Everyone)**

---

## ٥. الجمهور المستهدف

- الفئة العمرية: **١٣ فأكثر** ✅
- هل التطبيق موجّه للأطفال؟ **لا**

> ⚠️ اختار «١٣ فأكثر» **مش** «أقل من ١٣». لو قلت إنه للأطفال، هتدخل في
> Families Policy — متطلبات أصعب بكتير ومراجعة أطول. التطبيق مناسب
> للأطفال لكنه **مش موجّه ليهم حصريًا**، وده الفرق اللي جوجل بيسأل عنه.

---

## ٦. أمان البيانات (Data safety)

| السؤال | الإجابة |
|---|---|
| هل يجمع التطبيق بيانات؟ | **لا** |
| هل يشارك بيانات؟ | **لا** |
| تشفير أثناء النقل | لا ينطبق |
| طلب حذف البيانات | لا ينطبق |

⚠️ ده صحيح **طالما قواعد Firestore مقفولة** — وهي مقفولة. لو فعّلنا
المزامنة السحابية بعدين، لازم نعدّل الاستبيان ده قبل التحديث.

**الأذونات — جوجل بيسأل عن سبب كل واحد:**

| الإذن | السبب |
|---|---|
| POST_NOTIFICATIONS | إشعار الأذان والأذكار |
| USE_EXACT_ALARM | الأذان لازم يجي في وقته بالثانية |
| FOREGROUND_SERVICE_MEDIA_PLAYBACK | تشغيل الأذان كاملًا |
| RECEIVE_BOOT_COMPLETED | إعادة جدولة الأذان بعد إعادة التشغيل |
| RECORD_AUDIO | التسميع — الصوت يُحلَّل على الجهاز ولا يُرفع |
| ACCESS_COARSE_LOCATION | مواقيت الصلاة والقبلة — اختياري |

---

## ٧. سياسة الخصوصية ✅ جاهزة

`https://iqra-beta.vercel.app/privacy.html`

---

## ٨. نصوص المتجر ✅ جاهزة

كلها في `PLAY_LISTING.md` — الاسم والوصف القصير والكامل.

---

## ٩. بناء ملف الإصدار

```powershell
cd C:\iqra
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npm run build
npx cap sync android
cd android
.\gradlew bundleRelease
```

الملف هيطلع هنا:

```
C:\iqra\android\app\build\outputs\bundle\release\app-release.aab
```

> `bundleRelease` مش `assembleDebug`. جوجل بيقبل `.aab` بس، والنسخة
> لازم تكون موقَّعة — عشان كده مفتاح التوقيع أول خطوة.

---

## ١٠. الاختبار المغلق

Play Console ← **Testing** ← **Closed testing** ← Create new release

1. ارفع الـ`.aab`
2. اعمل قائمة مختبرين وضيف **١٢ إيميل على الأقل** (جوجل بيقول ٢٠ للأمان)
3. ابعت رابط الانضمام لكل واحد
4. تأكد إن **١٢ قبلوا الدعوة فعلًا** — مش مجرد إنك ضفتهم
5. ابعتلهم `TESTERS.md`

**العدّاد بيبدأ من يوم ما ١٢ يبقوا منضمّين** — مش من يوم الرفع.
وأي يوم يقلّ فيه العدد عن ١٢ ممكن يصفّر العدّاد.

---

## ١١. بعد الـ١٤ يوم

Play Console ← **Apply for production** ← جاوب أسئلة الاختبار ← إرسال

---

## ١٢. قبل النشر العام

- [ ] غيّر `TESTER_UNTIL` في `src/utils/testerMode.js` أو شيل تذكيرات الاختبار
- [ ] بدّل ملفات الأذان بجودة ١٢٨ بدل ١٦ (شوف الملاحظة تحت)
- [ ] `versionCode` و `versionName` في `android/app/build.gradle`

**ملفات الأذان:** تلاتة منهم ١٦ kbps — جودة مكالمة تليفون. نزّلهم بجودة ١٢٨:

```
https://cdn.islamic.network/adhans/128/adhan-makkah.mp3       → haram_normal.mp3
https://cdn.islamic.network/adhans/128/adhan-fajr-makkah.mp3  → haram_fajr.mp3
https://cdn.islamic.network/adhans/128/adhan-madinah.mp3      → basit_normal.mp3
https://cdn.islamic.network/adhans/128/adhan-fajr-madinah.mp3 → basit_fajr.mp3
```

وحطّهم في `C:\iqra\android\app\src\main\res\raw\` و `C:\iqra\public\audio\athan\`.
