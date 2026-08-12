// ============================================================
//  تلوين المدّ — مساعدة بصرية مبسّطة
// ------------------------------------------------------------
//  تحذير مهم: ده *ليس* مرجعًا في التجويد.
//
//  أحكام التجويد الكاملة (المدّ بأنواعه، الغنّة، الإقلاب، الإخفاء…)
//  تعتمد على السياق وعلى ما بعد الكلمة وعلى الوقف والوصل، ومش ممكن
//  تتحدّد بدقة من نص الكلمة لوحدها. اللي هنا هو كشف *حروف المدّ
//  الطبيعي* بس: ألف ساكنة قبلها فتحة، واو ساكنة قبلها ضمّة، ياء ساكنة
//  قبلها كسرة — وده أوضح وأأمن نوع.
//
//  الغنّة والإقلاب مقصودين مش متعملين: تنفيذهم بشكل ساذج هيلوّن حروفًا
//  غلط ويعلّم الطفل حاجة خاطئة، وده أسوأ من إنه مايشوفش تلوين أصلًا.
//  لو عايزهم صح، لازم بيانات تجويد مُدقَّقة (QUL بتوفّر نصًّا ملوّنًا
//  بالتجويد جاهزًا — ده الطريق الصحيح).
// ============================================================

const FATHA = "َ";
const DAMMA = "ُ";
const KASRA = "ِ";
const SUKUN = "ْ";
const SHADDA = "ّ";
const DAGGER_ALIF = "ٰ"; // ألف خنجرية
const MADDAH = "ٓ"; // علامة المدّ ~

const ALIF = ["ا", "آ"]; // ا آ
const WAW = "و";
const YA = ["ي", "ى"]; // ي ى

const HARAKAT = new Set([FATHA, DAMMA, KASRA, SUKUN, SHADDA, "ً", "ٌ", "ٍ"]);
const isMark = (ch) => HARAKAT.has(ch) || ch === DAGGER_ALIF || ch === MADDAH || ch === "ـ";

// بيرجّع مصفوفة بنفس طول النص: true = الحرف ده جزء من مدّ
export function maddMask(word) {
  const n = word.length;
  const mask = new Array(n).fill(false);

  // آخر حركة ظهرت قبل الموضع الحالي
  let lastHaraka = null;
  let lastHarakaIdx = -1;

  for (let i = 0; i < n; i++) {
    const ch = word[i];

    if (HARAKAT.has(ch)) {
      if (ch !== SUKUN && ch !== SHADDA) {
        lastHaraka = ch;
        lastHarakaIdx = i;
      }
      continue;
    }

    // الألف الخنجرية والمدّة = مدّ دائمًا
    if (ch === DAGGER_ALIF || ch === MADDAH) {
      mask[i] = true;
      continue;
    }

    const next = word[i + 1];
    const nextIsMark = next !== undefined && HARAKAT.has(next) && next !== SUKUN;

    let isMadd = false;
    if (ALIF.includes(ch)) {
      // الألف بعد فتحة (والألف مابتتحرّكش أصلًا)
      isMadd = lastHaraka === FATHA && !nextIsMark;
    } else if (ch === WAW) {
      isMadd = lastHaraka === DAMMA && !nextIsMark;
    } else if (YA.includes(ch)) {
      isMadd = lastHaraka === KASRA && !nextIsMark;
    }

    if (isMadd) {
      mask[i] = true;
      // نلوّن الحركة اللي قبله كمان عشان يبان المقطع كامل
      if (lastHarakaIdx >= 0) mask[lastHarakaIdx] = true;
    }

    if (!isMark(ch)) {
      lastHaraka = null;
      lastHarakaIdx = -1;
    }
  }
  return mask;
}

// بيقسّم الكلمة لمقاطع متتالية { text, madd } عشان الرسم في React
export function splitMadd(word) {
  const mask = maddMask(word);
  const out = [];
  let buf = "";
  let cur = mask[0] || false;
  for (let i = 0; i < word.length; i++) {
    if (mask[i] === cur) buf += word[i];
    else {
      if (buf) out.push({ text: buf, madd: cur });
      buf = word[i];
      cur = mask[i];
    }
  }
  if (buf) out.push({ text: buf, madd: cur });
  return out;
}

export function hasMadd(word) {
  return maddMask(word).some(Boolean);
}
