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
        color: 'اللون',
        size: 'القياس',
        design: 'الديزاين',
        print: 'حجم الطباعة',
        place: 'الموضع',
        cm: 'سم',
        attachHead: 'مهم',
        preview:
          'لصق صورة المعاينة ف هاد المحادثة (كاين زر «حمّل صورة المعاينة» ف صفحة الطلب) — بيها كنشوفو بالضبط فين وشحال من الطبعة.',
        attach:
          'لصق الصورة ديال الديزاين ف هاد المحادثة قبل ما تصيفط الرسالة — بلاها ماغاديش نقدرو نطبعو الطلب.',
        attachMany: (n) =>
          `لصق **${n}** صور ديال الديزاين ف هاد المحادثة قبل ما تصيفط الرسالة — وحدة لكل وجه. بلاهم ماغاديش نقدرو نطبعو الطلب.`,
        qty: 'الكمية',
        sub: 'المجموع',
        ship: 'التوصيل',
        total: 'الإجمالي',
        free: 'مجاني (داخل ف الثمن)',
        printed: (n) => `${n} مطبوع${n > 1 ? 'ين' : ''} — عرض الحزمة`,
        blanks: (n) => `${n} خاوي${n > 1 ? 'ين' : ''}`,
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
        color: 'Couleur',
        size: 'Taille',
        design: 'Design',
        print: 'Taille d’impression',
        place: 'Emplacement',
        cm: 'cm',
        attachHead: 'Important',
        preview:
          "Joignez l'aperçu dans cette conversation (bouton « Enregistrer l'aperçu » sur la page de commande) — il nous montre exactement la taille et l'emplacement.",
        attach:
          "Joignez l'image de votre design dans cette conversation avant d'envoyer — sans elle, on ne peut pas lancer l'impression.",
        attachMany: (n) =>
          `Joignez **${n}** images dans cette conversation avant d'envoyer — une par face. Sans elles, on ne peut pas lancer l'impression.`,
        qty: 'Quantité',
        sub: 'Sous-total',
        ship: 'Livraison',
        total: 'Total',
        free: 'Offerte (incluse dans le prix)',
        printed: (n) => `${n} imprimé${n > 1 ? 's' : ''} — offre lot`,
        blanks: (n) => `${n} uni${n > 1 ? 's' : ''}`,
        who: 'Informations client',
        name: 'Nom',
        phone: 'Téléphone',
        city: 'Ville',
        address: 'Adresse',
        notes: 'Note',
        pay: 'Paiement : à la livraison',
      };

  const money = (n) => `${n} ${cur}`;
  const items = o.items ?? [];
  const many = items.length > 1;

  const lines = [
    `*${L.head} — VALLIKS*`,
    `${L.ref}: ${o.ref}`,
  ];

  /* كل تيشيرت كتلة بوحدو. كنرقموهم غير ملي يكونو أكثر من واحد — الطلب ديال
     تيشيرت واحد خاصو يبقى قصير بحال قبل. */
  items.forEach((it, i) => {
    lines.push('', `*${many ? `${i + 1}. ` : ''}${it.product}*`);
    if (it.color) lines.push(`${L.color}: ${it.color}`);
    lines.push(`${L.size}: ${it.size}`);
    if (it.qty > 1) lines.push(`${L.qty}: ${it.qty}`);

    /* الطلب المخصص كيزيد كتلة **لكل وجه** معمّر. الوجه الخاوي ماكيتذكرش —
       ورشة الطباعة خاصها تعرف بالضبط شنو تطبع وفين، بلا تخمين. */
    for (const s of it.sides ?? []) {
      lines.push(`  *${s.side}*`);
      if (s.design) lines.push(`  ${L.design}: ${s.design}`);
      if (s.printCm) lines.push(`  ${L.print}: ${s.printCm} ${L.cm}`);
      if (s.placement) lines.push(`  ${L.place}: ${s.placement}`);
    }
  });

  /* التفصيل كيوري لصاحب المتجر علاش المجموع هو هاداك: المطبوعين بعرض الحزمة
     والخاويين بالوحدة. بلاه كيبقى يحسب بيدو ف كل طلب. */
  const bd = o.breakdown ?? {};
  lines.push('', `${L.sub}: ${money(o.itemsTotal)}`);
  if (bd.printed) lines.push(`  ${L.printed(bd.printed)}: ${money(bd.printedTotal)}`);
  if (bd.blanks) lines.push(`  ${L.blanks(bd.blanks)}: ${money(bd.blanksTotal)}`);

  lines.push(
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
  // الزبون كيلصق وحدة وكيظن أنه سالا. مع السلة العدد كيتجمع على كل التيشيرتات.
  const withSides = items.filter((it) => it.sides?.length);
  const ownTotal = items.reduce(
    (n, it) => n + (it.ownDesign ? it.ownCount || 1 : 0),
    0
  );
  if (withSides.length) {
    lines.push('', `*⚠ ${L.attachHead}*`);
    // المعاينة أول حاجة: هي اللي كتوري الحجم والموضع بلا تخمين.
    lines.push(L.preview);
    if (ownTotal > 0) {
      lines.push('', ownTotal > 1 ? L.attachMany(ownTotal) : L.attach);
    }
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
