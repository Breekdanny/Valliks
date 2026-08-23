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

export const DESIGNS = [
  {
    id: 'total-strike',
    name: { ar: 'TOTAL STRIKE', fr: 'TOTAL STRIKE' },
    tag: { ar: 'بولينغ · كوميك', fr: 'Bowling · Comic' },
    ...art('total-strike'),
  },
  {
    id: 'high-roller',
    name: { ar: 'HIGH ROLLER', fr: 'HIGH ROLLER' },
    tag: { ar: 'كارطة · غرافيتي', fr: 'Cartes · Graffiti' },
    ...art('high-roller'),
  },
  {
    id: 'speed-demon',
    name: { ar: 'SPEED DEMON', fr: 'SPEED DEMON' },
    tag: { ar: 'طوموبيل · سرعة', fr: 'Scooter · Vitesse' },
    ...art('speed-demon'),
  },
  {
    id: 'outlaw',
    name: { ar: 'OUTLAW', fr: 'OUTLAW' },
    tag: { ar: 'ويسترن · فردين', fr: 'Western · Revolvers' },
    ...art('outlaw'),
  },
];

/* --------------------------------------------------------------------------
   هندسة منطقة الطباعة على الموكاب الخاوي.

   الأرقام مقيسة من قناة alpha ديال blank-black-cut-1080 و blank-white-cut-1080
   (الجوج متطابقين ف حدود 0.01، فرقم واحد كيخدم للجوج). كلها نسب من عرض/طول
   الصورة باش يخدمو ف أي قياس ديال الـcanvas.

   إلا بدلتي الموكابات الخاوية، عاود قيسهم — الأرقام هادي مربوطة بالصور.
   -------------------------------------------------------------------------- */
export const PRINT = {
  centerX: 0.503,    // وسط الجذع أفقياً
  torsoWidth: 0.512, // عرض الجذع (تحت الأكمام) — الجسر بين البيكسل والسنتيمتر

  // حدود الجذع وأعلى التيشيرت — كنستعملوهم باش نعرفو واش الطبعة على الظهر
  // ولا على الكم، وباش نحسبو المسافة من الرقبة ف الرسالة.
  torsoLeft: 0.247,
  torsoRight: 0.759,
  shirtTop: 0.212,

  // ⚠ هاد الأرقام معايرة على الطبعات الحقيقية ف المنتوجات ديالنا، ماشي
  // مخمّنة. قياس الطبعة ف الموكابات (total-strike · high-roller · speed-demon
  // · outlaw): العرض 0.30→0.37 من عرض الصورة (= 34→42 سم على قياس L)،
  // والامتداد العمودي من 0.31→0.36 فوق حتى 0.76→0.84 تحت.
  //
  // أول نسخة كانت top=0.300 وmaxCm=34: الطبعة كانت كتخرج أصغر وأعلى من
  // المنتوجات الجاهزة، فالمعاينة ماكانتش كتشبه اللي كيشري الزبون.
  top: 0.335,
  bottom: 0.840,
  minCm: 20,
  maxCm: 42,
  defaultCm: 38,   // وسط المدى ديال الطبعات الحقيقية (34→42)
};

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
export function maxPrintCm(design, chest) {
  const frame = cmPerFrame(chest);
  const roomCm = (PRINT.bottom - PRINT.top) * frame;
  const byHeight = roomCm * (design.width / design.height);
  return Math.floor(Math.min(PRINT.maxCm, byHeight));
}
