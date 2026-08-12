// ============================================================
//  المسابقة اليومية
// ------------------------------------------------------------
//  الأسئلة *مولَّدة من بيانات متحقَّق منها* (أسماء السور، عدد آياتها،
//  ترتيبها، مكية/مدنية) مش مكتوبة بالإيد. السبب: أي سؤال تراث مكتوب
//  يدويًا في تطبيق قرآني ممكن يطلع فيه خطأ، والخطأ هنا مش هيّن.
//  كل إجابة هنا مشتقّة حسابيًا من نفس مصفوفة SURAHS اللي التطبيق
//  بيستخدمها، والمجموع اتحقّق منه (١١٤ سورة / ٦٢٣٦ آية).
// ============================================================

// مولّد عشوائي بذرة ثابتة — نفس اليوم = نفس السؤال، وبيتغيّر كل ٢٤ ساعة
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const dayIndex = (d = new Date()) =>
  Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5
  );

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const pick = (rnd, arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
};

const shuffleWith = (rnd, arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const toAr = (n) =>
  String(n)
    .split("")
    .map((d) => String.fromCharCode(0x0660 + Number(d)))
    .join("");

// SURAHS: [{ id, name, ayat, place }]  |  SHORT: { id: { name, ayat[] } }
export function buildDailyQuestion(SURAHS, SHORT, day = dayIndex()) {
  const rnd = seeded(day * 2654435761);
  const kinds = ["count", "place", "order", "longest", "shortest", "number", "whichSurah"];
  const kind = kinds[Math.floor(rnd() * kinds.length)];

  const makeOptions = (correct, others) =>
    shuffleWith(rnd, [correct, ...others]).map((v) => String(v));

  switch (kind) {
    case "count": {
      const s = SURAHS[Math.floor(rnd() * SURAHS.length)];
      const wrong = new Set();
      while (wrong.size < 3) {
        const delta = Math.floor(rnd() * 20) + 1;
        const v = rnd() > 0.5 ? s.ayat + delta : Math.max(1, s.ayat - delta);
        if (v !== s.ayat) wrong.add(v);
      }
      const opts = makeOptions(toAr(s.ayat), [...wrong].map(toAr));
      return {
        q: `كام آية في سورة ${s.name}؟`,
        options: opts,
        answer: opts.indexOf(toAr(s.ayat)),
      };
    }
    case "place": {
      const madani = SURAHS.filter((s) => s.place === "د");
      const makki = SURAHS.filter((s) => s.place === "م");
      const askMadani = rnd() > 0.5;
      const correct = (askMadani ? madani : makki)[
        Math.floor(rnd() * (askMadani ? madani : makki).length)
      ];
      const others = pick(rnd, askMadani ? makki : madani, 3);
      const opts = makeOptions(correct.name, others.map((o) => o.name));
      return {
        q: `أي سورة من دول ${askMadani ? "مدنية" : "مكية"}؟`,
        options: opts,
        answer: opts.indexOf(correct.name),
      };
    }
    case "order": {
      const s = SURAHS[Math.floor(rnd() * SURAHS.length)];
      const wrong = pick(
        rnd,
        SURAHS.filter((x) => x.id !== s.id),
        3
      );
      const opts = makeOptions(s.name, wrong.map((w) => w.name));
      return {
        q: `السورة رقم ${toAr(s.id)} في المصحف هي؟`,
        options: opts,
        answer: opts.indexOf(s.name),
      };
    }
    case "longest":
    case "shortest": {
      const four = pick(rnd, SURAHS, 4);
      const target =
        kind === "longest"
          ? four.reduce((a, b) => (b.ayat > a.ayat ? b : a))
          : four.reduce((a, b) => (b.ayat < a.ayat ? b : a));
      const opts = four.map((s) => s.name);
      return {
        q: `أي سورة فيها ${kind === "longest" ? "أكتر" : "أقل"} عدد آيات؟`,
        options: opts,
        answer: opts.indexOf(target.name),
      };
    }
    case "number": {
      const s = SURAHS[Math.floor(rnd() * SURAHS.length)];
      const wrong = new Set();
      while (wrong.size < 3) {
        const v = Math.max(1, Math.min(114, s.id + Math.floor(rnd() * 20) - 10));
        if (v !== s.id) wrong.add(v);
      }
      const opts = makeOptions(toAr(s.id), [...wrong].map(toAr));
      return {
        q: `سورة ${s.name} رقمها كام في المصحف؟`,
        options: opts,
        answer: opts.indexOf(toAr(s.id)),
      };
    }
    case "whichSurah":
    default: {
      const ids = Object.keys(SHORT || {});
      if (!ids.length) return buildDailyQuestion(SURAHS, SHORT, day + 1);
      const id = ids[Math.floor(rnd() * ids.length)];
      const s = SHORT[id];
      const ayah = s.ayat[Math.floor(rnd() * s.ayat.length)];
      const wrong = pick(
        rnd,
        SURAHS.filter((x) => x.name !== s.name),
        3
      );
      const opts = makeOptions(s.name, wrong.map((w) => w.name));
      return {
        q: `الآية دي من أي سورة؟\n«${ayah}»`,
        options: opts,
        answer: opts.indexOf(s.name),
      };
    }
  }
}

export const POINTS_PER_CORRECT = 10;
