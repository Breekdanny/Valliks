/* ==========================================================================
   التتبع — GA4 · Meta Pixel · سجل الطلبات ف Google Sheet.

   ⚠ اقرا هادشي قبل ما تثق ف أي رقم كيخرج من هنا:

   الطلب كيسالي ف **واتساب**، برا الموقع. الموقع كيقدر غير يعرف أن الزبون
   ضغط على زر الإرسال — واش صيفط بصح ف واتساب حاجة ماكيقدرش يعرفها. وزيد
   عليها الأداء عند الاستلام: حتى الطلب اللي وصل يقدر يترفض عند الباب.

   إذن `purchase` هنا معناه **نية** ماشي مبيعة. الأرقام ف GA وف Meta غادي
   تكون متفائلة. السجل ف Sheet + الطلبات اللي وصلاتك بصح هوما الحقيقة،
   و`ref` (VLK-XXXXXX) هو مفتاح الربط بيناتهم.

   علاش `purchase` رغم هادشي: بيه كتخدم تقارير التجارة ف GA، وMeta كتحتاجو
   باش تفاوت الإعلانات على القيمة. حدث مخصص ماكيديرش لا هادي لا هادي.

   كلشي هنا **اختياري**: المعرّف الخاوي = السكريبت ماكيتحملش أصلاً.
   ========================================================================== */

import { SHOP } from '../data/products.js';

const CFG = SHOP.analytics ?? {};

/* التطوير المحلي ماشي معطيات. غادي تحل الموقع ديالك عشرات المرات فاليوم،
   وبلا هاد الحارس كل رقم ف GA كيولي فيه نتا.

   للاختبار المحلي: `?analytics=1` كيتخطى الحارس. بلاه ماكاينش كيفاش تتأكد
   أن الأحداث كتتصيفط بصح قبل ما تنشر. */
const isLocal =
  typeof location !== 'undefined' &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) &&
  new URLSearchParams(location.search).get('analytics') !== '1';

const on = (id) => Boolean(id) && !isLocal;

/* --------------------------------------------------------------------------
   تحميل السكريبتات — **من بعد `load`**.

   GA (~35 KB مضغوطة) والبيكسل (~30 KB) بجوجهم أكبر من الموقع كامل (26 KB).
   تحميلهم ف الـ<head> كيأخر أول رسم على جمهور ف 4G. من بعد `load` الفرق ف
   دقة المعطيات شبه معدوم لمتجر بهاد الحجم، والربح ف السرعة حقيقي.
   -------------------------------------------------------------------------- */

function inject(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.append(s);
}

function startGA() {
  window.dataLayer = window.dataLayer || [];
  // ⚠ خاصها `function` عادية: gtag كيعتمد على `arguments`، والسهم ماعندوش
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', CFG.ga);
  inject(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(CFG.ga)}`);
}

function startPixel() {
  /* نسخة مختصرة من السنيبت الرسمي ديال Meta: طابور كيجمع النداءات حتى
     يوصل fbevents.js ومن بعد كيفرغهم. */
  const fbq = function (...args) {
    fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  // ⚠ `push` خاصها تشير لـfbq راسها. fbevents.js كيقرا `fbq.push` ملي كيوصل
  // باش يفرغ الطابور — بلاها الأحداث اللي تصيفطو قبل التحميل كيضيعو ف صمت.
  fbq.push = fbq;
  window.fbq = window._fbq = fbq;
  inject('https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', String(CFG.pixel));
  fbq('track', 'PageView');
}

export function initAnalytics() {
  if (!on(CFG.ga) && !on(CFG.pixel)) return;   // ماكاين حتى معرّف — بلا والو
  const boot = () => {
    if (on(CFG.ga)) startGA();
    if (on(CFG.pixel)) startPixel();
  };
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot, { once: true });
}

/* --------------------------------------------------------------------------
   الأحداث

   ⚠ صفر معطيات شخصية هنا. السمية، التيليفون والعنوان كيمشيو **غير للـSheet
   ديالك** ف `logOrder`. GA وMeta كياخدو غير المنتوجات والأثمنة والـref.
   -------------------------------------------------------------------------- */

const ga = (name, params) => on(CFG.ga) && window.gtag?.('event', name, params);
const fb = (name, params) => on(CFG.pixel) && window.fbq?.('track', name, params);

/** كل سطر ف السلة بالصيغة ديال GA4. */
const gaItems = (items) =>
  items.map((it) => ({
    item_id: it.id,
    item_name: it.name,
    item_variant: it.variant,
    price: it.price,
    quantity: it.qty,
  }));

export function trackView({ id, name, price }) {
  ga('view_item', {
    currency: 'MAD',
    value: price,
    items: [{ item_id: id, item_name: name, price, quantity: 1 }],
  });
  fb('ViewContent', {
    content_ids: [id],
    content_name: name,
    content_type: 'product',
    value: price,
    currency: 'MAD',
  });
}

export function trackAddToCart({ items, value }) {
  ga('add_to_cart', { currency: 'MAD', value, items: gaItems(items) });
  fb('AddToCart', {
    content_ids: items.map((i) => i.id),
    content_type: 'product',
    value,
    currency: 'MAD',
  });
}

/** واتساب على وشك ما يتحل. هادا أبعد إشارة عند الموقع — شوف الملاحظة ف الفوق. */
export function trackOrderSent({ ref, items, value }) {
  ga('purchase', {
    transaction_id: ref,
    currency: 'MAD',
    value,
    shipping: 0,              // التوصيل داخل ف الثمن
    items: gaItems(items),
  });
  fb('Purchase', {
    content_ids: items.map((i) => i.id),
    content_type: 'product',
    num_items: items.reduce((n, i) => n + i.qty, 0),
    value,
    currency: 'MAD',
  });
}

/* --------------------------------------------------------------------------
   سجل الطلبات
   -------------------------------------------------------------------------- */

/**
 * كيكتب الطلب ف الـSheet ديالك. **fire-and-forget** — ماكيتسناش وماكيرميش.
 *
 * `sendBeacon` ماشي `fetch` عن قصد:
 *   · كينجح حتى إلا تسدات الصفحة ولا تحل واتساب فنفس اللحظة
 *   · بـtext/plain كيبقى "طلب بسيط"، فماكاينش preflight ديال CORS —
 *     وApps Script ماكيرجعش هيدرز CORS بشكل موثوق
 *
 * ⚠ ماكيبلوكيش الطلب أبداً. إلا طاح الشبكة، واتساب كيتحل عادي.
 * ضياع سطر ف Sheet أهون بزاف من ضياع طلب.
 */
export function logOrder(payload) {
  if (!CFG.sheet || isLocal) return false;
  try {
    const body = JSON.stringify({ ...payload, key: CFG.sheetKey });
    return navigator.sendBeacon(
      CFG.sheet,
      new Blob([body], { type: 'text/plain;charset=UTF-8' })
    );
  } catch {
    return false;                 // ماكاين علاش نوقفو الطلب على سطر ف جدول
  }
}
