/* ==========================================================================
   VALLIKS — الرسمات ديال قسم "صمم ديالك".

   هادو الرسمات بوحدهم (بلا تيشيرت)، الزبون كيختار وحدة وكيشوفها ف المعاينة
   على التيشيرت الخاوي. منفصلين على PRODUCTS عن قصد: المنتوجات هي قطع جاهزة
   بأثمنة وألوان محددة، والرسمات هنا هي غير محتوى للطباعة.

   باش تزيد رسمة: حط PNG بخلفية شفافة ف raw/designs/، شغّل
   `npm run designs`، ومن بعد زيد الكائن ديالها ف DESIGNS تحت.
   ========================================================================== */

import manifest from './designs.json';

function art(stem) {
  const m = manifest[stem];
  if (!m) throw new Error(`ماكايناش رسمة اسمها "${stem}" — شغّل: npm run designs`);

  // السكريبت كيتجاهل العروض اللي أكبر من الملف الأصلي، إذن عدد النسخ كيتبدل
  // من رسمة لأخرى. كناخدو أكبر وحدة موجودة عوض رقم مكتوب باليد.
  const widths = Object.keys(m.src).map(Number).sort((a, b) => b - a);

  return {
    src: m.src[widths[0]],
    srcset: widths.map((w) => `${m.src[w]} ${w}w`).join(', '),
    width: m.width,
    height: m.height,
  };
}

/* --------------------------------------------------------------------------
   الفئات — كل وحدة كتولي قسم مطوي ف المعرض.

   الترتيب هنا هو الترتيب ف الواجهة. أول وحدة فيها ديزاينات كتتحل وحدها،
   والباقي مسدودين — بلا هادشي الزبون كيلقى حائط ديال 30+ رسمة.

   باش تزيد فئة: زيد كائن هنا، ومن بعد حط `category: '<id>'` ف الرسمات.
   فئة خاوية ماكتبانش أصلاً — إذن تقدر تزيدها قبل ما تكون عندك الرسمات.
   -------------------------------------------------------------------------- */
export const CATEGORIES = [
  { id: 'streetwear', name: { ar: 'ستريتوير', fr: 'Streetwear' } },
  { id: 'anime', name: { ar: 'أنيمي', fr: 'Anime' } },
  { id: 'quotes', name: { ar: 'مقولات', fr: 'Citations' } },
  { id: 'simple', name: { ar: 'بسيط', fr: 'Minimaliste' } },
  { id: 'girls', name: { ar: 'بنات', fr: 'Filles' } },
  { id: 'boys', name: { ar: 'دراري', fr: 'Garçons' } },
];

export const DESIGNS = [
  {
    id: 'total-strike',
    category: 'streetwear',
    name: { ar: 'TOTAL STRIKE', fr: 'TOTAL STRIKE' },
    tag: { ar: 'بولينغ · كوميك', fr: 'Bowling · Comic' },
    ...art('total-strike'),
  },
  {
    id: 'high-roller',
    category: 'streetwear',
    name: { ar: 'HIGH ROLLER', fr: 'HIGH ROLLER' },
    tag: { ar: 'كارطة · غرافيتي', fr: 'Cartes · Graffiti' },
    ...art('high-roller'),
  },
  {
    id: 'speed-demon',
    category: 'streetwear',
    name: { ar: 'SPEED DEMON', fr: 'SPEED DEMON' },
    tag: { ar: 'طوموبيل · سرعة', fr: 'Scooter · Vitesse' },
    ...art('speed-demon'),
  },
  {
    id: 'outlaw',
    category: 'streetwear',
    name: { ar: 'OUTLAW', fr: 'OUTLAW' },
    tag: { ar: 'ويسترن · فردين', fr: 'Western · Revolvers' },
    ...art('outlaw'),
  },

  /* ⚠ هاد الجوج مولّدين بالذكاء الاصطناعي ف 1024×1536 — حوالي 100 DPI على
     طبعة 38 سم، مقابل 243→280 ف رسمات الستريتوير. الطباعة على القماش
     كتحتاج 150 DPI على الأقل. عوّضهم بنسخ 3000px+ ملي تكون عندك. */
  {
    id: 'big-dreams',
    category: 'girls',
    name: { ar: 'BIG DREAMS', fr: 'BIG DREAMS' },
    tag: { ar: 'شريطة · فراشات', fr: 'Nœud · Papillons' },
    ...art('big-dreams'),
  },
  {
    id: 'unstoppable',
    category: 'girls',
    name: { ar: 'UNSTOPPABLE', fr: 'UNSTOPPABLE' },
    tag: { ar: 'خط · تاج', fr: 'Lettrage · Couronne' },
    ...art('unstoppable'),
  },

  /* ⚠ الدفعة ديال 28 غشت — مولّدين بالذكاء الاصطناعي ف ~1024×1536.
     84→103 DPI على طبعة 38 سم، مقابل 243→280 ف رسمات الستريتوير.
     الطباعة كتحتاج 150 على الأقل. عوّضهم بنسخ 3000px+ ملي تكون عندك.

     ⚠⚠ `dream-plan-do` فيها ساك بشعار YSL و `discipline` فيها طوموبيل
     بشعار Mercedes. هادو علامات تجارية مسجلة. نبهنا صاحب المتجر مرتين
     وقرر يمشي بيهم — القرار ديالو، والخطر القانوني عليه. */
  {
    id: 'blue-butterfly',
    category: 'girls',
    name: { ar: 'DREAM BIG', fr: 'DREAM BIG' },
    tag: { ar: 'فراشة · نار زرقا', fr: 'Papillon · Flamme bleue' },
    ...art('blue-butterfly'),
  },
  {
    id: 'dark-queen',
    category: 'girls',
    name: { ar: 'DARK QUEEN', fr: 'DARK QUEEN' },
    tag: { ar: 'تاج · ورود', fr: 'Couronne · Roses' },
    ...art('dark-queen'),
  },
  {
    id: 'stay-positive',
    category: 'girls',
    name: { ar: 'STAY POSITIVE', fr: 'STAY POSITIVE' },
    tag: { ar: 'ورود · ذهبي', fr: 'Lys · Or' },
    ...art('stay-positive'),
  },
  {
    id: 'dream-plan-do',
    category: 'girls',
    name: { ar: 'DREAM PLAN DO', fr: 'DREAM PLAN DO' },
    tag: { ar: 'خط · ذهبي', fr: 'Lettrage · Or' },
    ...art('dream-plan-do'),
  },
  {
    id: 'blue-crown',
    category: 'boys',
    name: { ar: 'BLUE CROWN', fr: 'BLUE CROWN' },
    tag: { ar: 'هودي · نار زرقا', fr: 'Hoodie · Flamme bleue' },
    ...art('blue-crown'),
  },
  {
    id: 'discipline',
    category: 'boys',
    name: { ar: 'DISCIPLINE', fr: 'DISCIPLINE' },
    tag: { ar: 'أسد · تحفيز', fr: 'Lion · Motivation' },
    ...art('discipline'),
  },
  {
    id: 'venom',
    category: 'anime',
    name: { ar: 'VENOM', fr: 'VENOM' },
    tag: { ar: 'حنش · أنيمي', fr: 'Serpent · Anime' },
    ...art('venom'),
  },
  {
    id: 'peaks',
    category: 'quotes',
    name: { ar: 'STAY REAL', fr: 'STAY REAL' },
    tag: { ar: 'جبال · خط', fr: 'Montagnes · Ligne' },
    ...art('peaks'),
  },
];

/* رسمة بلا فئة معروفة كتضيع ف صمت — الزبون ماكيشوفهاش وماتعرفش علاش.
   خطأ صريح عند البناء أحسن. */
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
for (const d of DESIGNS) {
  if (!CATEGORY_IDS.has(d.category)) {
    throw new Error(
      `الرسمة "${d.id}" عندها فئة "${d.category}" ماكايناش ف CATEGORIES. ` +
      `الفئات المتاحة: ${[...CATEGORY_IDS].join(' · ')}`
    );
  }
}

/** الرسمات مجمّعة حسب الفئة، بترتيب CATEGORIES، بلا الفئات الخاوية. */
export const DESIGNS_BY_CATEGORY = CATEGORIES
  .map((c) => ({ ...c, items: DESIGNS.filter((d) => d.category === c.id) }))
  .filter((c) => c.items.length);

/* --------------------------------------------------------------------------
   هندسة منطقة الطباعة على الموكاب الخاوي.

   الأرقام مقيسة من قناة alpha ديال blank-black-cut-1080 و blank-white-cut-1080
   (الجوج متطابقين ف حدود 0.01، فرقم واحد كيخدم للجوج). كلها نسب من عرض/طول
   الصورة باش يخدمو ف أي قياس ديال الـcanvas.

   إلا بدلتي الموكابات الخاوية، عاود قيسهم — الأرقام هادي مربوطة بالصور.
   -------------------------------------------------------------------------- */
export const PRINT = {
  /* ---- مشتركة بين الوجهين ----
     قسنا القدّام واللور ف كل الموكابات: الفرق ف هاد النسب **≤0.001**.
     يعني الجذع ف نفس البلاصة، واللي كيتبدل هو المجال العمودي وحدو. */
  centerX: 0.503,    // وسط الجذع أفقياً
  torsoWidth: 0.512, // عرض الجذع (تحت الأكمام) — الجسر بين البيكسل والسنتيمتر

  // حدود الجذع وأعلى التيشيرت — كنستعملوهم باش نعرفو واش الطبعة على الجذع
  // ولا على الكم، وباش نحسبو المسافة من الرقبة ف الرسالة.
  torsoLeft: 0.247,
  torsoRight: 0.759,
  shirtTop: 0.212,

  /* ---- اللور ----
     ⚠ هاد الأرقام معايرة على الطبعات الحقيقية ف المنتوجات ديالنا، ماشي
     مخمّنة. قياس الطبعة ف الموكابات (total-strike · high-roller ·
     speed-demon · outlaw): العرض 0.30→0.37 من عرض الصورة (= 34→42 سم على
     قياس L)، والامتداد العمودي من 0.31→0.36 فوق حتى 0.76→0.84 تحت.

     أول نسخة كانت top=0.300 وmaxCm=34: الطبعة كانت كتخرج أصغر وأعلى من
     المنتوجات الجاهزة، فالمعاينة ماكانتش كتشبه اللي كيشري الزبون. */
  back: {
    top: 0.335,
    bottom: 0.840,
    // المدى واسع عن قصد: من شارة صغيرة حتى طبعة ظهر كاملة.
    // ⚠ عرض الجذع الحقيقي 58 سم على قياس L (62 على XXL). فوق هادشي
    // الطبعة كتخرج على حدود التيشيرت وكتقص — المعاينة كتوريها مقصوصة
    // بصدق، ولكن ورشة الطباعة ماتقدرش تطبعها كاملة.
    minCm: 8,
    maxCm: 70,
    defaultCm: 38,   // وسط المدى ديال الطبعات الحقيقية (34→42)
  },

  /* ---- القدّام ----
     الياقة كتحد من فوق. مسح العمود الأوسط ف blank-grey-front:
       0.216→0.222  حافة الياقة
       0.244→0.265  علامة الرقبة البيضا
       0.28 وتحت    قماش نقي
     بدينا من 0.320 = ~5 سم تحت الياقة على قياس L.

     والطبعة الصدرية عادة **أصغر** من طبعة الظهر — لهادشي maxCm أقل. */
  front: {
    top: 0.320,
    bottom: 0.780,
    minCm: 8,
    maxCm: 60,
    defaultCm: 26,
  },
};

/* أقل كثافة مقبولة للطباعة على القماش. تحتها الحواف كتبان مسننة والحروف
   الرقيقة كتتهرس. 150 هو المعيار الصناعي؛ 100 هو الحد اللي تحتو الفرق
   كيبان بالعين — وهو نفس الحد اللي كان مخبي ف MIN_PRINT_PX = 1500
   (1500px على 38 سم = 100 DPI بالضبط). */
export const MIN_DPI = 100;

/** كثافة الطبعة بالنقطة/بوصة: أكبر بُعد ديال الملف على الحجم المطلوب. */
export const printDpi = (px, cm) => (cm > 0 ? (px / cm) * 2.54 : Infinity);

/** إعدادات الوجه الحالي. `side` = 'back' | 'front'. */
export const printFor = (side) => PRINT[side] ?? PRINT.back;

/**
 * كم سنتيمتر كيقابل عرض الصورة كامل، حسب القياس المختار.
 * عرض الجذع ف الصورة (torsoWidth) كيقابل `chest` ديال القياس — إذن المعاينة
 * كتبدل ملي يبدل الزبون القياس، وهادشي هو اللي كيخلي "30 سم" تعني 30 سم بصح.
 */
export const cmPerFrame = (chest) => chest / PRINT.torsoWidth;

/**
 * أكبر حجم طباعة ممكن لرسمة معينة: محدود بالعرض (maxCm) وبالطول المتاح ف
 * الظهر. الرسمات الطوال كيحدهم الطول قبل العرض.
 */
export function maxPrintCm(side = 'back') {
  /* الحد هو maxCm وحدو.
     كان كاين حد ثاني: `roomCm * (w/h)` — يعني الرسمة ماتخرجش على المساحة
     بين top وbottom. كيخدم مزيان للطبعة العادية، ولكن كيمنع **الطبعة على
     التيشيرت كامل**: رسمة طويلة (نسبة 0.65) كانت كتوقف ف 36 سم مهما رفعنا
     maxCm. وطبعة all-over خاصها تخرج على الحواف — هادا هو الشكل ديالها.
     الخروج ماشي عيب: render() كيقص على قناة alpha ديال التيشيرت، فالمعاينة
     كتوري بالضبط شنو غادي يتطبع. */
  return Math.floor(printFor(side).maxCm);
}
