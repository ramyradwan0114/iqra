// ============================================================
//  Firebase / Firestore
// ------------------------------------------------------------
//  المفاتيح دلوقتي placeholder. لو ناديت initializeApp بمفاتيح وهمية،
//  أول استدعاء لـ Firestore هيرمي خطأ ويكسر وضع المعلّم في الإنتاج.
//  عشان كده كل حاجة هنا محميّة بـ isFirebaseConfigured(): طول ما المفاتيح
//  لسه placeholder، التطبيق بيشتغل محليًا بالكامل ومابيلمسش السحابة أصلًا.
//
//  وكمان: firebase مكتبة كبيرة. بنستوردها ديناميكيًا (import ديناميكي)
//  عشان متتحمّلش في الباندل الأساسي لحد ما تكون متظبّطة وتُستخدم فعلًا.
//
//  الأفضل تحطّ المفاتيح في متغيّرات بيئة على Vercel بدل ما تكتبها هنا:
//    VITE_FB_API_KEY, VITE_FB_PROJECT_ID, VITE_FB_SENDER_ID, VITE_FB_APP_ID
//  المفاتيح دي مش أسرار (بتتشاف في المتصفح) — الحماية الحقيقية هي
//  Firestore Security Rules. من غير قواعد، أي حد يقدر يقرا ويمسح
//  بيانات طلابك.
// ============================================================
const env = (k, fallback) =>
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[k]) || fallback;

export const firebaseConfig = {
  apiKey: env("VITE_FB_API_KEY", "YOUR_API_KEY"),
  authDomain: env("VITE_FB_AUTH_DOMAIN", "YOUR_PROJECT_ID.firebaseapp.com"),
  projectId: env("VITE_FB_PROJECT_ID", "YOUR_PROJECT_ID"),
  storageBucket: env("VITE_FB_STORAGE_BUCKET", "YOUR_PROJECT_ID.appspot.com"),
  messagingSenderId: env("VITE_FB_SENDER_ID", "YOUR_SENDER_ID"),
  appId: env("VITE_FB_APP_ID", "YOUR_APP_ID"),
};

export function isFirebaseConfigured() {
  return !Object.values(firebaseConfig).some(
    (v) => !v || String(v).startsWith("YOUR_") || String(v).includes("YOUR_PROJECT_ID")
  );
}

const COLLECTION = "students";
let cached = null;

// بيرجّع { db, fns } أو null لو المفاتيح لسه مش متظبّطة أو التحميل فشل
async function firestore() {
  if (!isFirebaseConfigured()) return null;
  if (cached) return cached;
  try {
    const [{ initializeApp, getApps }, fns] = await Promise.all([
      import("firebase/app"),
      import("firebase/firestore"),
    ]);
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    cached = { db: fns.getFirestore(app), fns };
    return cached;
  } catch (e) {
    console.warn("[iqra] Firebase غير متاح — التشغيل محليًا:", e?.message);
    return null;
  }
}

// كل استدعاء للسحابة لازم يفشل بهدوء. مع قواعد الأمان المقفولة
// (firestore.rules) Firestore بيرمي permission-denied، ومن غير المصيدة
// دي وضع المعلّم كان هيقع بشاشة بيضا بدل ما يرجع للتخزين المحلي.
async function safely(label, fn, fallback = null) {
  try {
    return await fn();
  } catch (e) {
    console.warn(`[iqra] ${label} فشل — بنكمّل محليًا:`, e?.code || e?.message);
    return fallback;
  }
}

export async function saveStudent(student) {
  const f = await firestore();
  if (!f) return null;
  const { db, fns } = f;
  return safely("حفظ الطالب", async () => {
    await fns.setDoc(
      fns.doc(db, COLLECTION, student.id),
      { ...student, lastActive: Date.now() },
      { merge: true }
    );
    return student;
  });
}

export async function getStudent(id) {
  const f = await firestore();
  if (!f) return null;
  const { db, fns } = f;
  return safely("قراءة الطالب", async () => {
    const snap = await fns.getDoc(fns.doc(db, COLLECTION, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  });
}

export async function getAllStudents() {
  const f = await firestore();
  if (!f) return null;
  const { db, fns } = f;
  return safely("قراءة الطلبة", async () => {
    const snap = await fns.getDocs(fns.collection(db, COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

export async function deleteStudent(id) {
  const f = await firestore();
  if (!f) return false;
  const { db, fns } = f;
  return safely("حذف الطالب", async () => {
    await fns.deleteDoc(fns.doc(db, COLLECTION, id));
    return true;
  }, false);
}

export async function updateProgress(id, progress, extra = {}) {
  const f = await firestore();
  if (!f) return false;
  const { db, fns } = f;
  return safely("تحديث التقدّم", async () => {
    await fns.setDoc(
      fns.doc(db, COLLECTION, id),
      { progress, lastActive: Date.now(), ...extra },
      { merge: true }
    );
    return true;
  }, false);
}
