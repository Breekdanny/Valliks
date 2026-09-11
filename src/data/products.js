/* ==========================================================================
   VALLIKS — مصدر الحقيقة الوحيد للمنتوجات والإعدادات.
   كل تغيير ف الأثمنة، المنتوجات، المدن، أو رقم الواتساب كيتدار من هنا فقط.
   ========================================================================== */

import images from './images.json';
import lookbook from './lookbook.json';

/* --------------------------------------------------------------------------
   إعدادات المتجر — بدل هادو بالمعطيات الحقيقية ديالك
   -------------------------------------------------------------------------- */
export const SHOP = {
  // 0675957090 بصيغة دولية (كود الدولة + الرقم بلا الصفر وبلا +)
  whatsapp: '212675957090',

  instagram: 'https://www.instagram.com/valliks_shop',
  // الرابط اللي جا من المشاركة كان فيه `?_r=1&_t=ZN-...` — هادو رموز
  // جلسة مؤقتة كينتهي مفعولها. رابط البروفايل النظيف كيخدم للأبد.
  tiktok: 'https://www.tiktok.com/@valliks.com',

  currency: { ar: 'د.م', fr: 'DH' },

  /* ------------------------------------------------------------------
     التتبع. **كل واحد فيهم اختياري**: الخاوي كيبقى مطفي بالكامل —
     السكريبت ماكيتحملش وماكيتصيفط حتى طلب. عمّر اللي بغيتي وصافي.

     ⚠ ماكيتصيفط والو من localhost. كتزور الموقع ديالك عشرات المرات
     فاليوم، وبلا هاد الحارس المعطيات كتولي زبل.
     ------------------------------------------------------------------ */
  analytics: {
    // analytics.google.com → Admin → Data Streams → Web
    ga: '',            // 'G-XXXXXXXXXX'

    // business.facebook.com → Events Manager → Data Sources
    pixel: '',         // رقم

    /* Google Apps Script منشور كـWeb App. الكود ف scripts/orders-sheet.gs
       ⚠ هاد الرابط كيمشي ف كود المتصفح، إذن أي واحد يقدر يكتب ف الـSheet.
       `sheetKey` كيوقف العبث العادي ماشي واحد جاد — هو تاهو ف الكود. */
    sheet: '',         // https://script.google.com/macros/s/.../exec
    sheetKey: '',      // نفس القيمة اللي ف السكريبت
  },
};

/* --------------------------------------------------------------------------
   الأثمنة — **التوصيل داخل ف كل ثمن**. ماكاينش سطر توصيل كيتزاد للزبون.

   الحزمة كتتحسب على عدد التيشيرتات **المطبوعة** (الجاهزين + المخصص):
     1 → 224 · 2 → 400 · 3 → 550 · وكل واحد زايد فوق 3 → +200

   الخاوي خارج الحزمة وعندو ثمنو ديالو — هو المنتج الرخيص اللي كيدخل الناس.
   طلب فيه 2 مطبوعين + خاوي = 400 + 129 = 529.
   -------------------------------------------------------------------------- */
export const PRICING = {
  tiers: [224, 400, 550],
  extra: 200,
  blank: 129,
};

/** ثمن n تيشيرت مطبوع. الخاويين ماكيدخلوش هنا — كيتزادو بثمنهم لبرا. */
export function bundlePrice(n) {
  if (n <= 0) return 0;
  const { tiers, extra } = PRICING;
  const last = tiers.length;
  return n <= last ? tiers[n - 1] : tiers[last - 1] + (n - last) * extra;
}

/** الخاوي كيتحاسب بالوحدة، ماشي بالحزمة. */
export const isBlank = (p) => p?.id === 'blank';

/* --------------------------------------------------------------------------
   المدن — كتستعمل غير للعنوان.

   `fee` بقا كمعلومة **ديال التكلفة ديالك** ماشي كثمن كيتحاسب للزبون: التوصيل
   داخل ف الثمن دابا. مفيد باش تعرف الهامش — الداخلة (70) كتخليك تربح 45 درهم
   أقل من كازا (25) على نفس الطلب.
   TODO: راجع الأرقام مع شركة التوصيل ديالك — هادو تقديرات السوق
   -------------------------------------------------------------------------- */
export const CITIES = [
  { ar: 'الدار البيضاء', fr: 'Casablanca', fee: 25 },
  { ar: 'الرباط', fr: 'Rabat', fee: 30 },
  { ar: 'سلا', fr: 'Salé', fee: 30 },
  { ar: 'تمارة', fr: 'Témara', fee: 30 },
  { ar: 'القنيطرة', fr: 'Kénitra', fee: 30 },
  { ar: 'المحمدية', fr: 'Mohammedia', fee: 25 },
  { ar: 'الجديدة', fr: 'El Jadida', fee: 30 },
  { ar: 'مراكش', fr: 'Marrakech', fee: 35 },
  { ar: 'فاس', fr: 'Fès', fee: 35 },
  { ar: 'مكناس', fr: 'Meknès', fee: 35 },
  { ar: 'طنجة', fr: 'Tanger', fee: 35 },
  { ar: 'تطوان', fr: 'Tétouan', fee: 35 },
  { ar: 'أسفي', fr: 'Safi', fee: 35 },
  { ar: 'بني ملال', fr: 'Béni Mellal', fee: 35 },
  { ar: 'أكادير', fr: 'Agadir', fee: 40 },
  { ar: 'وجدة', fr: 'Oujda', fee: 40 },
  { ar: 'الناظور', fr: 'Nador', fee: 40 },
  { ar: 'العيون', fr: 'Laâyoune', fee: 60 },
  { ar: 'الداخلة', fr: 'Dakhla', fee: 70 },
];

/* --------------------------------------------------------------------------
   جدول القياسات — بالسنتيمتر، قياس مسطح (التيشيرت مبسوط على الطاولة)

   `chest` = العرض المسطح من تحت الإبط للإبط، ماشي محيط الصدر. هو نفسو اللي
   كيتحسب منو حجم الطبعة ف المعاينة (`cmPerFrame` ف designs.js) — رقم غالط
   هنا كيعطي الزبون طبعة بحجم ماشي هو اللي غادي يوصلو.

   S→XL جايين من جدول المورد (Podmex): العرض = "Width"، الطول = "Length".
   TODO: XXL باقي تقدير — جدول المورد واقف ف XL، فعرضو (62) هو نفسو ديال XL.
         وعمود `sleeve` كامل تقدير: الجدول ماعندوش قياس الكم. قيس تيشيرت
         حقيقي وصحح الاثنين.
   -------------------------------------------------------------------------- */
export const SIZES = [
  { size: 'S', chest: 54, length: 65, sleeve: 22 },
  { size: 'M', chest: 58, length: 71, sleeve: 23 },
  { size: 'L', chest: 60, length: 73, sleeve: 24 },
  { size: 'XL', chest: 62, length: 75, sleeve: 25 },
  { size: 'XXL', chest: 62, length: 77, sleeve: 26 },  // ⚠ نفس عرض XL
];

const SIZE_LIST = SIZES.map((s) => s.size);

/* --------------------------------------------------------------------------
   بناء مسارات الصور من المانيفست اللي مولدو prep-images.py
   -------------------------------------------------------------------------- */
/** نفس البناء ديال `shot` ولكن كيرجع undefined عوض ما يطيح — للموكابات
    الاختيارية اللي الموقع كيخدم بلاهم. */
function maybeShot(stem) {
  const m = images[stem];
  if (!m) return undefined;
  return {
    // solid = خلفية داكنة مخبوزة (بطاقات الشبكة)
    solid: m.solid[720],
    solidSrcset: `${m.solid[480]} 480w, ${m.solid[720]} 720w, ${m.solid[1080]} 1080w`,
    // النسخة الكاملة — كتستعمل ف canvas ديال قسم "صمم ديالك"، تما srcset
    // ماكيخدمش حيت كنرسمو الصورة بيدنا ماشي كنعرضوها ف <img>.
    solidFull: m.solid[1080],
    // cut = خلفية شفافة (الكاروسيل ثلاثي الأبعاد — التيشيرت كيطوف)
    cut: m.cut[720],
    cutSrcset: `${m.cut[480]} 480w, ${m.cut[720]} 720w, ${m.cut[1080]} 1080w`,
    cutFull: m.cut[1080],
    lqip: m.lqip,
  };
}

/** الموكاب إجباري: إلا ماكانش، خطأ صريح دابا خير من صورة مهرّسة ف الإنتاج. */
function shot(stem) {
  const s = maybeShot(stem);
  if (!s) throw new Error(`ماكايناش صورة اسمها "${stem}" — شغّل: npm run images`);
  return s;
}

/* الألوان. قيم hex مقيسة من بيكسل القماش الحقيقي ف كل موكاب — ماشي بالعين —
   باش النقطة الملونة ف البطاقة تطابق التيشيرت بالضبط. */
const BLACK = { key: 'black', ar: 'كحل', fr: 'Noir', hex: '#131313' };
const WHITE = { key: 'white', ar: 'بيض', fr: 'Blanc', hex: '#e2e3e3' };

/* ألوان التيشيرت الخاوي (قسم "صمم ديالك"). الهيكس مقيس من وسط الجذع ف
   كل موكاب — ماشي بالعين.

   ملاحظة على السميات: كانو ثوابت `NAVY` و `GREEN` وتحيدو مع الموكابات
   الفيكتور. هادو ألوان **مختلفة** جايين من موكابات فوتوغرافية حقيقية
   (#161258 و #406044 عوض #003366 و #2f5b32)، لهادشي عندهم سميات جداد. */
const GREY = { key: 'grey', ar: 'رمادي', fr: 'Gris', hex: '#6a6a6a' };
const INK = { key: 'ink', ar: 'نيلي', fr: 'Indigo', hex: '#161258' };
const SAGE = { key: 'sage', ar: 'أخضر فاتح', fr: 'Vert', hex: '#406044' };

/* --------------------------------------------------------------------------
   المنتوجات
   TODO: الأثمنة تحت هي أثمنة سوق تقديرية — بدلها بديالك.
         price = الثمن الحالي · was = الثمن قبل التخفيض (حيدو إلا ماكانش تخفيض)
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   الدروب — اسم المجموعة كيبان ف شارة الـhero وف عنوان قسم المنتوجات
   -------------------------------------------------------------------------- */
export const DROP = { name: 'NOCTURNAL CHAOS', number: 'DROP 01' };

/* --------------------------------------------------------------------------
   ألوان التيشيرت الخاوي — كتتبنى من الموكابات الموجودة فعلاً.

   أي `blank-<key>` كاين ف images.json وسميتو ف COLOR_BY_KEY كيدخل لقسم
   "صمم ديالك" وحدو. الترتيب صريح ماشي حسب مفاتيح JSON، باش الكحل يبقى
   الأول (هو الافتراضي) وترتيب الشيبات مايتبدلش من بناء لآخر.
   -------------------------------------------------------------------------- */
const COLOR_BY_KEY = { black: BLACK, white: WHITE, grey: GREY, ink: INK, sage: SAGE };
const BLANK_ORDER = ['black', 'white', 'grey', 'ink', 'sage'];

/* موكاب خاوي موجود ولكن بلا ثابت لون → خطأ صريح.
   الفلترة الصامتة كانت غادي تخلي لون تصور وتعالج ولكن ماكيبانش ف الموقع،
   وماتعرف علاش. */
for (const key of Object.keys(images)) {
  if (!key.startsWith('blank-') || key.endsWith('-front')) continue;
  const k = key.slice(6);
  if (!COLOR_BY_KEY[k]) {
    throw new Error(
      `لقينا ${key} ف images.json ولكن ماكاينش ثابت لون اسمو "${k}".\n` +
      `زيدو فوق مع الهيكس المقيس من وسط الجذع ديال الموكاب، ` +
      `وزيد "${k}" ف COLOR_BY_KEY و BLANK_ORDER.`
    );
  }
}

/* صورة القدّام كتتعرض **غير ف كانفاس المعاينة**، فماكتحتاجش srcset —
   عندها نسخة 1080 وحدها. `front` كيبقى undefined إلا ماكانش الموكاب،
   و custom.js كيخبي زر "القدّام" على داك اللون. */
function frontShot(stem) {
  const m = images[stem];
  return m ? { solidFull: m.solid[1080], cutFull: m.cut[1080] } : undefined;
}

const BLANK_VARIANTS = BLANK_ORDER
  .filter((k) => images[`blank-${k}`])
  .map((k) => ({
    ...COLOR_BY_KEY[k],
    ...shot(`blank-${k}`),
    front: frontShot(`blank-${k}-front`),
  }));

if (!BLANK_VARIANTS.length) {
  throw new Error('ماكاين حتى موكاب خاوي — شغّل: npm run mockups && npm run images');
}

/* --------------------------------------------------------------------------
   وجه المطبوعين — **ملف واحد لكل لون قماش، ماشي واحد لكل منتج**.

   الأربعة كلهم عندهم نفس الوجه: الغرافيتي الصغير ديال VALLIKS ف الصدر.
   ماشي ديزاين خاص لكل واحد، فماكاينش علاش نكرروا نفس الصورة 4 مرات — ملف
   واحد كيخدم للأربعة، وإلا تبدل الغرافيتي كيتبدل ف بلاصة وحدة.

   كيبقى `undefined` حتى يوصل الموكاب، وزر "القدّام" ف الفيترينة كيختافى
   وحدو بلاه. نفس منطق ألوان الخاوي: حط الملف وشغّل `npm run images`
   وكيبان بوحدو — بلا ما تمس هاد الملف.
     raw/products/front-black.png   ← بخلفية شفافة، بحال blank-black-front.png
     raw/products/front-white.png
   -------------------------------------------------------------------------- */
const PRINTED_FRONT = {
  black: maybeShot('front-black'),
  white: maybeShot('front-white'),
};

export const PRODUCTS = [
  {
    id: 'total-strike',
    price: bundlePrice(1),
    was: 249,
    // `badge` خاوي عن قصد. كان فيه "الأكثر مبيعاً" وهو ادعاء كاذب على أول
    // دروب — ماكاينش منتج مبيع باش يكون الأكثر مبيعاً. زيدو منين تكون عندك
    // مبيعات حقيقية: badge: { ar: 'الأكثر مبيعاً', fr: 'Best-seller' }
    name: { ar: 'TOTAL STRIKE', fr: 'TOTAL STRIKE' },
    tag: { ar: 'بولينغ · كوميك', fr: 'Bowling · Comic' },
    desc: {
      ar: 'قنينات بولينغ كتصرخ وبولة جمجمة محترقة كتهرسهم. طباعة كبيرة على الظهر كامل بالأحمر والأبيض — كتبان من بعيد. قماش ثقيل.',
      fr: "Des quilles de bowling qui hurlent, pulvérisées par une boule-crâne en flammes. Grande impression dos complet en rouge et blanc — ça se voit de loin. Coton lourd.",
    },
    sizes: SIZE_LIST,
    // ⚠ variants[0] هو اللي كيمشي للكاروسيل ثلاثي الأبعاد (grid.js).
    //   الموكاب الفوتوغرافي (كحل) خاصو يبقى أول واحد — فيه نسيج وطيات وظل حقيقي.
    variants: [
      { ...BLACK, ...shot('total-strike-black'), front: PRINTED_FRONT.black },
      { ...WHITE, ...shot('total-strike-white'), front: PRINTED_FRONT.white },
    ],
  },
  {
    id: 'high-roller',
    price: bundlePrice(1),
    was: 249,
    name: { ar: 'HIGH ROLLER', fr: 'HIGH ROLLER' },
    tag: { ar: 'كارطة · غرافيتي', fr: 'Cartes · Graffiti' },
    desc: {
      ar: 'هيكل بشابو وعباءة زرقا كيوزع الكارطة — القدر ماشي غير كارطة وزاريّة. تحتيه سمية VALLIKS بالغرافيتي العربي. أزرق قوي على كحل، كيبان حتى ف الضو الواطي.',
      fr: "Un squelette en haut-de-forme et cape bleue qui distribue les cartes — le destin n'est qu'un jeu de cartes et deux dés. En bas, la signature VALLIKS en graffiti arabe. Bleu franc sur noir, lisible même en lumière basse.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('high-roller-black'), front: PRINTED_FRONT.black },
    ],
  },
  {
    id: 'speed-demon',
    price: bundlePrice(1),
    was: 249,
    name: { ar: 'SPEED DEMON', fr: 'SPEED DEMON' },
    tag: { ar: 'طوموبيل · سرعة', fr: 'Scooter · Vitesse' },
    desc: {
      ar: 'راكب مهبول كيقطع المدينة على طوموبيل وف يدو منادة. الديزاين الأكثر لوناً ف الدروب — هو اللي كيطلع مزيان ف الصور. كتف واطي وقصة واسعة.',
      fr: "Un pilote déchaîné qui traverse la ville en scooter, canette en main. Le design le plus coloré du drop — celui qui rend le mieux en photo. Épaules tombantes, coupe ample.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('speed-demon-black'), front: PRINTED_FRONT.black },
      { ...WHITE, ...shot('speed-demon-white'), front: PRINTED_FRONT.white },
    ],
  },
  {
    id: 'outlaw',
    price: bundlePrice(1),
    was: 249,
    name: { ar: 'OUTLAW', fr: 'OUTLAW' },
    tag: { ar: 'ويسترن · فردين', fr: 'Western · Revolvers' },
    desc: {
      ar: 'كاوبوي هيكل بجوج فردين وقارو ف فمو، واجد للمواجهة. أزرق ووردي على كحل، والغرافيتي ديال VALLIKS تحت — هو نفسو اللي ف اللوغو. قماش ثقيل كيحافظ على القصة المربعة.',
      fr: "Un cowboy squelette, deux revolvers et une cigarette au bec, prêt pour le duel. Bleu et rose sur noir, avec le graffiti VALLIKS en bas — le même que sur le logo. Coton lourd qui garde la coupe carrée.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('outlaw-black'), front: PRINTED_FRONT.black },
    ],
  },
  {
    id: 'blank',
    price: PRICING.blank,
    name: { ar: 'أوفرسايز خاوي', fr: 'Oversized Uni' },
    tag: { ar: 'بلا طباعة', fr: 'Sans impression' },
    desc: {
      ar: 'نفس القماش ونفس القصة ديال المطبوعين، بلا طباعة. إلا بغيتي تجرب المقاس قبل ما تاخد شي ديزاين، بدا من هنا.',
      fr: "Le même tissu et la même coupe que les modèles imprimés, sans impression. Si vous voulez tester la taille avant un design, commencez ici.",
    },
    sizes: SIZE_LIST,
    variants: [
      /* الوجه هنا **نقي بلا غرافيتي** — هادا تيشيرت "بلا طباعة"، فوجهو
         خاصو يكون خاوي بحال لورو. غير الكحل عندو `front` حيت هو
         `variants[0]`، يعني هو وحدو اللي كيبان ف الفيترينة. */
      { ...BLACK, ...shot('blank-black'), front: maybeShot('blank-black-front') },
      { ...WHITE, ...shot('blank-white') },
    ],
  },
];

/* --------------------------------------------------------------------------
   التيشيرت المخصص — قسم "صمم ديالك".

   ⚠ ماشي داخل PRODUCTS عن قصد: الكاروسيل ثلاثي الأبعاد مضبوط على 5 منتوجات
   (`--step: 72deg` ف hero.css)، وشبكة المنتوجات كتعرض المجموعة الجاهزة.
   هاد الكائن كيتستعمل غير باش تتحل نافذة الطلب على طلب مخصص.

   الألوان **كتتولد أوتوماتيكياً** من الموكابات الخاوية اللي كاينين ف
   images.json. باش تزيد لون: حط الموكاب ف raw/incoming/، شغّل
   `npm run mockups` ومن بعد `npm run images`. اللون كيبان بوحدو — بلا
   ما تمس هاد الملف، غير إلا كان لون جديد بالكامل فخاصو ثابت فوق.

   ⚠ الثمن **واحد للوجه وللوجهين**. الزبون كيقدر يطبع قدّام ولور ف نفس
   الطلب وكيخلص نفس الثمن. هادا قرار مقصود ماشي غلطة — إلا بغيتي زيادة على
   الوجه الثاني، خاص يتزاد حقل هنا وتتحسب ف order.js (billing).

   المخصص كيدخل ف نفس حزمة المطبوعين: 2 مخصص = 400، ولا مخصص + جاهز = 400.
   TODO: إلا كانت الطباعة المخصصة (وحدة بوحدة، بلا كمية) كتكلفك أكثر من
         الجاهزين، خاصها سلّم أثمنة ديالها بوحدها ف PRICING.
   -------------------------------------------------------------------------- */
export const CUSTOM = {
  id: 'custom',
  price: bundlePrice(1),
  name: { ar: 'تيشيرت بالديزاين ديالك', fr: 'T-shirt personnalisé' },
  tag: { ar: 'صمم ديالك', fr: 'Personnalisé' },
  desc: {
    ar: 'نفس القماش الثقيل ونفس القصة الأوفرسايز، بالديزاين اللي اختاريتي — من المعرض ديالنا ولا ديزاين ديالك.',
    fr: "Le même coton lourd et la même coupe oversize, avec le design que vous avez choisi — dans notre galerie ou le vôtre.",
  },
  sizes: SIZE_LIST,
  variants: BLANK_VARIANTS,
};

export const byId = (id) =>
  id === CUSTOM.id ? CUSTOM : PRODUCTS.find((p) => p.id === id);

/* --------------------------------------------------------------------------
   اللبسة — صور حقيقية على الجسم (قسم "كيفاش كيجي ف اللبسة").

   كتتبنى **أوتوماتيكياً** من raw/lookbook/: زيد صورة ← `npm run images` ←
   كتبان. بلا ما تمس هاد الملف. الترتيب = ترتيب السميات (01، 02، ...).

   المصفوفة الخاوية = القسم كيختافى بوحدو، بحال زر الوجه.

   الصور كتوري **القصة والمقاس** — النصوص ف القسم كتهضر على اللبسة ماشي
   على ديزاين معين، حيت التصوير الكامل غادي يخلط المنتوجات.
   (الصور الأولى هوما TOTAL STRIKE — "AAAARGH" هو نص مرسوم ف الديزاين
   راسو، ماشي سمية منتوج. خاص تقلب بالصورة ماشي بالسمية.)
   -------------------------------------------------------------------------- */
export const LOOKBOOK = Object.entries(lookbook)
  // ترتيب رقمي صريح: "10" خاصها تجي من بعد "9" ماشي من بعد "1"
  .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
  .map(([id, m]) => {
    const widths = Object.keys(m.src).map(Number).sort((a, b) => a - b);
    return {
      id,
      src: m.src[widths.find((w) => w >= 640) ?? widths[widths.length - 1]],
      srcset: widths.map((w) => `${m.src[w]} ${w}w`).join(', '),
      width: m.width,
      height: m.height,
    };
  });
