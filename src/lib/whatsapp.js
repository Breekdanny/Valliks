/* ==========================================================================
   بناء طلب واتساب.

   علاش واتساب وماشي backend: بلا سيرفر، بلا تكلفة شهرية، بلا صيانة، والإشعار
   كيوصل فاللحظة. الحد ديالو أن ماكاينش تتبع تلقائي — إلا وصلتي لـ20+ طلب
   فاليوم، دوز لـGoogle Sheets ولا قاعدة بيانات.
   ========================================================================== */

/**
 * أرقام المغرب: الموبايل كيبدا بـ06 ولا 07، والثابت بـ05 — كلهم 10 أرقام.
 * دوليًا: +212 ثم [5-7] ثم 8 أرقام.
 * كنقبلو المسافات، الشرطات، الأقواس، و00212 كبديل لـ+212.
 */
const MA_PHONE = /^(?:\+?212|0)([5-7]\d{8})$/;

/** كينضف الرقم ويرجعو بصيغة E.164 بلا +، ولا null إلا كان غالط. */
export function normalizePhone(raw) {
  const clean = String(raw ?? '').replace(/[\s\-().]/g, '').replace(/^00/, '+');
  const m = MA_PHONE.exec(clean);
  return m ? `212${m[1]}` : null;
}

export const isValidPhone = (raw) => normalizePhone(raw) !== null;

/** رقم مرجعي قصير للطلب — كيبان للزبون وكيتسجل ف الرسالة. */
export function orderRef() {
  return `VLK-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * كيبني نص الرسالة. كنستعملو أسطر قصيرة وواضحة باش تكون سهلة للقراية ف واتساب
 * وسهلة للنسخ ف أي جدول.
 */
export function buildMessage(o) {
  const ar = o.lang === 'ar';
  const cur = ar ? 'د.م' : 'DH';

  const L = ar
    ? {
        head: 'طلب جديد من الموقع',
        ref: 'رقم الطلب',
        product: 'المنتج',
        color: 'اللون',
        size: 'القياس',
        design: 'الديزاين',
        print: 'حجم الطباعة',
        place: 'الموضع',
        cm: 'سم',
        attachHead: 'مهم',
        attach:
          'لصق الصورة ديال الديزاين ف هاد المحادثة قبل ما تصيفط الرسالة — بلاها ماغاديش نقدرو نطبعو الطلب.',
        attachMany: (n) =>
          `لصق **${n}** صور ديال الديزاين ف هاد المحادثة قبل ما تصيفط الرسالة — وحدة لكل وجه. بلاهم ماغاديش نقدرو نطبعو الطلب.`,
        qty: 'الكمية',
        unit: 'الثمن',
        sub: 'المجموع',
        ship: 'التوصيل',
        total: 'الإجمالي',
        free: 'مجاني',
        who: 'معلومات الزبون',
        name: 'الاسم',
        phone: 'التيليفون',
        city: 'المدينة',
        address: 'العنوان',
        notes: 'ملاحظة',
        pay: 'الأداء: عند الاستلام',
      }
    : {
        head: 'Nouvelle commande du site',
        ref: 'N° commande',
        product: 'Produit',
        color: 'Couleur',
        size: 'Taille',
        design: 'Design',
        print: 'Taille d’impression',
        place: 'Emplacement',
        cm: 'cm',
        attachHead: 'Important',
        attach:
          "Joignez l'image de votre design dans cette conversation avant d'envoyer — sans elle, on ne peut pas lancer l'impression.",
        attachMany: (n) =>
          `Joignez **${n}** images dans cette conversation avant d'envoyer — une par face. Sans elles, on ne peut pas lancer l'impression.`,
        qty: 'Quantité',
        unit: 'Prix',
        sub: 'Sous-total',
        ship: 'Livraison',
        total: 'Total',
        free: 'Offerte',
        who: 'Informations client',
        name: 'Nom',
        phone: 'Téléphone',
        city: 'Ville',
        address: 'Adresse',
        notes: 'Note',
        pay: 'Paiement : à la livraison',
      };

  const money = (n) => `${n} ${cur}`;
  const lines = [
    `*${L.head} — VALLIKS*`,
    `${L.ref}: ${o.ref}`,
    '',
    `*${L.product}:* ${o.product}`,
    `${L.color}: ${o.color}`,
    `${L.size}: ${o.size}`,
  ];

  /* الطلب المخصص كيزيد كتلة **لكل وجه** معمّر. الوجه الخاوي ماكيتذكرش —
     ورشة الطباعة خاصها تعرف بالضبط شنو تطبع وفين، بلا تخمين.
     الطلبات العادية (o.sides خاوي) ماكيتبدل فيهم والو. */
  for (const s of o.sides ?? []) {
    lines.push('', `*${s.side}*`);
    if (s.design) lines.push(`${L.design}: ${s.design}`);
    if (s.printCm) lines.push(`${L.print}: ${s.printCm} ${L.cm}`);
    if (s.placement) lines.push(`${L.place}: ${s.placement}`);
  }
  if (o.sides?.length) lines.push('');

  lines.push(
    `${L.qty}: ${o.qty}`,
    `${L.unit}: ${money(o.unitPrice)}`,
    '',
    `${L.sub}: ${money(o.subtotal)}`,
    `${L.ship}: ${o.shipping === 0 ? L.free : money(o.shipping)}`,
    `*${L.total}: ${money(o.total)}*`,
    '',
    `*${L.who}*`,
    `${L.name}: ${o.name}`,
    `${L.phone}: ${o.phone}`,
    `${L.city}: ${o.city}`,
    `${L.address}: ${o.address}`
  );

  if (o.notes?.trim()) lines.push(`${L.notes}: ${o.notes.trim()}`);
  lines.push('', L.pay);

  // التذكير آخر حاجة ف الرسالة عن قصد — هو آخر شي كيقرا الزبون قبل ما يصيفط.
  // رابط wa.me كيحمل نص فقط، فماكاينش طريقة نلصقو الصورة نيابة عليه.
  // ⚠ العدد مهم: وجهين بديزاين ديال الزبون = **جوج ملفات**، وبلا ما نقولوها
  // الزبون كيلصق وحدة وكيظن أنه سالا.
  if (o.ownDesign) {
    const n = o.ownCount ?? 1;
    lines.push('', `*⚠ ${L.attachHead}*`, n > 1 ? L.attachMany(n) : L.attach);
  }

  return lines.join('\n');
}

/** رابط wa.me بالرسالة معمّرة. */
export function buildLink(shopNumber, message) {
  return `https://wa.me/${shopNumber}?text=${encodeURIComponent(message)}`;
}

/** رابط بسيط للهيدر/الفوتر (بلا طلب محدد). */
export function contactLink(shopNumber, lang) {
  const msg =
    lang === 'ar'
      ? 'سلام، بغيت نسول على التيشيرتات ديال VALLIKS.'
      : 'Bonjour, je voudrais des informations sur les t-shirts VALLIKS.';
  return buildLink(shopNumber, msg);
}
