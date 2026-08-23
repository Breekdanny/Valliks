/* ==========================================================================
   VALLIKS — مصدر الحقيقة الوحيد للمنتوجات والإعدادات.
   كل تغيير ف الأثمنة، المنتوجات، المدن، أو رقم الواتساب كيتدار من هنا فقط.
   ========================================================================== */

import images from './images.json';

/* --------------------------------------------------------------------------
   إعدادات المتجر — بدل هادو بالمعطيات الحقيقية ديالك
   -------------------------------------------------------------------------- */
export const SHOP = {
  // 0675957090 بصيغة دولية (كود الدولة + الرقم بلا الصفر وبلا +)
  whatsapp: '212675957090',

  instagram: 'https://www.instagram.com/valliks_shop',
  // TODO: زيد رابط تيكتوك إلا كان عندك — خليه فارغ والأيقونة كتختافى وحدها
  tiktok: '',

  currency: { ar: 'د.م', fr: 'DH' },

  // TODO: تحقق من ثمن التوصيل الحقيقي مع الشركة اللي كتخدم معاها
  freeShippingAbove: 400,
};

/* --------------------------------------------------------------------------
   المدن وأثمنة التوصيل
   TODO: راجع الأثمنة مع شركة التوصيل ديالك — هادو تقديرات السوق
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
   TODO: قيس تيشيرت حقيقي من المخزون ديالك وصحح هاد الأرقام. هادي أهم جدول
         ف الموقع كامل: كيقلل الإرجاع وكيرفع الثقة أكثر من أي نص تسويقي.
   -------------------------------------------------------------------------- */
export const SIZES = [
  { size: 'S', chest: 54, length: 69, sleeve: 22 },
  { size: 'M', chest: 56, length: 71, sleeve: 23 },
  { size: 'L', chest: 58, length: 73, sleeve: 24 },
  { size: 'XL', chest: 60, length: 75, sleeve: 25 },
  { size: 'XXL', chest: 62, length: 77, sleeve: 26 },
];

const SIZE_LIST = SIZES.map((s) => s.size);

/* --------------------------------------------------------------------------
   بناء مسارات الصور من المانيفست اللي مولدو prep-images.py
   -------------------------------------------------------------------------- */
function shot(stem) {
  const m = images[stem];
  if (!m) throw new Error(`ماكايناش صورة اسمها "${stem}" — شغّل: npm run images`);
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

/* الألوان. قيم hex مقيسة من بيكسل القماش الحقيقي ف كل موكاب — ماشي بالعين —
   باش النقطة الملونة ف البطاقة تطابق التيشيرت بالضبط. */
const BLACK = { key: 'black', ar: 'كحل', fr: 'Noir', hex: '#131315' };
const WHITE = { key: 'white', ar: 'بيض', fr: 'Blanc', hex: '#eeece5' };
const NAVY = { key: 'navy', ar: 'أزرق كحل', fr: 'Bleu marine', hex: '#003366' };
const GREEN = { key: 'green', ar: 'أخضر غامق', fr: 'Vert foncé', hex: '#2f5b32' };
const PINK = { key: 'pink', ar: 'وردي', fr: 'Rose', hex: '#fcc3e2' };
const MINT = { key: 'mint', ar: 'نعناعي', fr: 'Menthe', hex: '#b7eae6' };

/* --------------------------------------------------------------------------
   المنتوجات
   TODO: الأثمنة تحت هي أثمنة سوق تقديرية — بدلها بديالك.
         price = الثمن الحالي · was = الثمن قبل التخفيض (حيدو إلا ماكانش تخفيض)
   -------------------------------------------------------------------------- */
/* --------------------------------------------------------------------------
   الدروب — اسم المجموعة كيبان ف شارة الـhero وف عنوان قسم المنتوجات
   -------------------------------------------------------------------------- */
export const DROP = { name: 'NOCTURNAL CHAOS', number: 'DROP 01' };

export const PRODUCTS = [
  {
    id: 'total-strike',
    price: 189,
    was: 249,
    // `badge` خاوي عن قصد. كان فيه "الأكثر مبيعاً" وهو ادعاء كاذب على أول
    // دروب — ماكاينش منتج مبيع باش يكون الأكثر مبيعاً. زيدو منين تكون عندك
    // مبيعات حقيقية: badge: { ar: 'الأكثر مبيعاً', fr: 'Best-seller' }
    name: { ar: 'TOTAL STRIKE', fr: 'TOTAL STRIKE' },
    tag: { ar: 'بولينغ · كوميك', fr: 'Bowling · Comic' },
    desc: {
      ar: 'قنينات بولينغ كتصرخ وبولة جمجمة محترقة كتهرسهم. طباعة كبيرة على الظهر كامل بالأحمر والأبيض — كتبان من بعيد. قماش ثقيل والطبعة كتبقى بعد الغسيل.',
      fr: "Des quilles de bowling qui hurlent, pulvérisées par une boule-crâne en flammes. Grande impression dos complet en rouge et blanc — ça se voit de loin. Coton lourd, et l'impression tient au lavage.",
    },
    sizes: SIZE_LIST,
    // ⚠ variants[0] هو اللي كيمشي للكاروسيل ثلاثي الأبعاد (grid.js).
    //   الموكاب الفوتوغرافي (كحل) خاصو يبقى أول واحد — فيه نسيج وطيات وظل حقيقي.
    variants: [
      { ...BLACK, ...shot('total-strike-black') },
      { ...WHITE, ...shot('total-strike-white') },
      { ...NAVY, ...shot('total-strike-navy') },
      { ...GREEN, ...shot('total-strike-green') },
      { ...PINK, ...shot('total-strike-pink') },
      { ...MINT, ...shot('total-strike-mint') },
    ],
  },
  {
    id: 'high-roller',
    price: 189,
    was: 249,
    name: { ar: 'HIGH ROLLER', fr: 'HIGH ROLLER' },
    tag: { ar: 'كارطة · غرافيتي', fr: 'Cartes · Graffiti' },
    desc: {
      ar: 'هيكل بشابو وعباءة زرقا كيوزع الكارطة — القدر ماشي غير كارطة وزاريّة. تحتيه سمية VALLIKS بالغرافيتي العربي. أزرق قوي على كحل، كيبان حتى ف الضو الواطي.',
      fr: "Un squelette en haut-de-forme et cape bleue qui distribue les cartes — le destin n'est qu'un jeu de cartes et deux dés. En bas, la signature VALLIKS en graffiti arabe. Bleu franc sur noir, lisible même en lumière basse.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('high-roller-black') },
      { ...NAVY, ...shot('high-roller-navy') },
      { ...GREEN, ...shot('high-roller-green') },
    ],
  },
  {
    id: 'speed-demon',
    price: 189,
    was: 249,
    name: { ar: 'SPEED DEMON', fr: 'SPEED DEMON' },
    tag: { ar: 'طوموبيل · سرعة', fr: 'Scooter · Vitesse' },
    desc: {
      ar: 'راكب مهبول كيقطع المدينة على طوموبيل وف يدو منادة. الديزاين الأكثر لوناً ف الدروب — هو اللي كيطلع مزيان ف الصور. كتف واطي وقصة واسعة.',
      fr: "Un pilote déchaîné qui traverse la ville en scooter, canette en main. Le design le plus coloré du drop — celui qui rend le mieux en photo. Épaules tombantes, coupe ample.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('speed-demon-black') },
      { ...WHITE, ...shot('speed-demon-white') },
      { ...NAVY, ...shot('speed-demon-navy') },
      { ...GREEN, ...shot('speed-demon-green') },
      { ...MINT, ...shot('speed-demon-mint') },
    ],
  },
  {
    id: 'outlaw',
    price: 189,
    was: 249,
    name: { ar: 'OUTLAW', fr: 'OUTLAW' },
    tag: { ar: 'ويسترن · فردين', fr: 'Western · Revolvers' },
    desc: {
      ar: 'كاوبوي هيكل بجوج فردين وقارو ف فمو، واجد للمواجهة. أزرق ووردي على كحل، والغرافيتي ديال VALLIKS تحت — هو نفسو اللي ف اللوغو. قماش ثقيل كيحافظ على القصة المربعة.',
      fr: "Un cowboy squelette, deux revolvers et une cigarette au bec, prêt pour le duel. Bleu et rose sur noir, avec le graffiti VALLIKS en bas — le même que sur le logo. Coton lourd qui garde la coupe carrée.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('outlaw-black') },
      { ...NAVY, ...shot('outlaw-navy') },
    ],
  },
  {
    id: 'blank',
    price: 129,
    name: { ar: 'أوفرسايز خاوي', fr: 'Oversized Uni' },
    tag: { ar: 'بلا طباعة', fr: 'Sans impression' },
    desc: {
      ar: 'نفس القماش ونفس القصة ديال المطبوعين، بلا طباعة. إلا بغيتي تجرب المقاس قبل ما تاخد شي ديزاين، بدا من هنا.',
      fr: "Le même tissu et la même coupe que les modèles imprimés, sans impression. Si vous voulez tester la taille avant un design, commencez ici.",
    },
    sizes: SIZE_LIST,
    variants: [
      { ...BLACK, ...shot('blank-black') },
      { ...WHITE, ...shot('blank-white') },
    ],
  },
];

/* --------------------------------------------------------------------------
   التيشيرت المخصص — قسم "صمم ديالك".

   ⚠ ماشي داخل PRODUCTS عن قصد: الكاروسيل ثلاثي الأبعاد مضبوط على 5 منتوجات
   (`--step: 72deg` ف hero.css)، وشبكة المنتوجات كتعرض المجموعة الجاهزة.
   هاد الكائن كيتستعمل غير باش تتحل نافذة الطلب على طلب مخصص.

   الألوان محدودة ف الكحل والبيض حيت هادو هوما الموكابات الخاوية الوحيدة
   اللي عندنا. باش تزيد لون، خاصك موكاب خاوي جديد ف raw/products/.

   TODO: 189 هو نفس ثمن المطبوعين الجاهزين. إلا كانت الطباعة المخصصة
         (وحدة بوحدة، بلا كمية) كتكلفك أكثر، رفع هاد الرقم.
   -------------------------------------------------------------------------- */
export const CUSTOM = {
  id: 'custom',
  price: 189,
  name: { ar: 'تيشيرت بالديزاين ديالك', fr: 'T-shirt personnalisé' },
  tag: { ar: 'صمم ديالك', fr: 'Personnalisé' },
  desc: {
    ar: 'نفس القماش الثقيل ونفس القصة الأوفرسايز، بالديزاين اللي اختاريتي — من المعرض ديالنا ولا ديزاين ديالك.',
    fr: "Le même coton lourd et la même coupe oversize, avec le design que vous avez choisi — dans notre galerie ou le vôtre.",
  },
  sizes: SIZE_LIST,
  variants: [
    { ...BLACK, ...shot('blank-black') },
    { ...WHITE, ...shot('blank-white') },
  ],
};

export const byId = (id) =>
  id === CUSTOM.id ? CUSTOM : PRODUCTS.find((p) => p.id === id);

export const cityFee = (name) =>
  CITIES.find((c) => c.ar === name || c.fr === name)?.fee ?? 0;
