/* ==========================================================================
   نافذة الطلب.
   خطوة وحدة: المنتج → القياس واللون → المعلومات → واتساب.
   كل خطوة زايدة ف الطريق كتضيع طلبات، خصوصاً على الهاتف.

   السلة كتخدم بمبدأ واحد: **الزبون اللي باغي تيشيرت واحد ماخاصو يعرف أن
   كاينة سلة**. التيشيرت اللي معمّر ف النافذة كيتحسب ف الفاتورة وكيتزاد
   وحدو ملي يتصيفط الطلب. زر "زيد وكمل" هو غير للي باغي أكثر من واحد.
   ========================================================================== */

import {
  PRODUCTS, CITIES, SHOP, PRICING,
  byId, bundlePrice, isBlank,
} from '../data/products.js';
import { pick, t, money, getLang, applyTo } from '../i18n/index.js';
import {
  normalizePhone,
  isValidPhone,
  orderRef,
  buildMessage,
  buildLink,
} from '../lib/whatsapp.js';

const SAVED = 'valliks:customer';

/** كيمنع HTML جاي من سمية ملف ديال الزبون باش ماينحقنش ف اللائحة. */
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

export function createOrderModal() {
  const el = {
    modal: document.getElementById('modal'),
    close: document.getElementById('modalClose'),
    img: document.getElementById('modalImg'),
    title: document.getElementById('modalTitle'),
    desc: document.getElementById('modalDesc'),
    ref: document.getElementById('modalRef'),
    form: document.getElementById('orderForm'),
    save: document.getElementById('modalSave'),
    productChips: document.getElementById('productChips'),
    colorChips: document.getElementById('colorChips'),
    sizeChips: document.getElementById('sizeChips'),
    fColor: document.getElementById('fColor'),
    fCart: document.getElementById('fCart'),
    cartList: document.getElementById('cartList'),
    cartAdd: document.getElementById('cartAdd'),
    qtyOut: document.getElementById('qtyOut'),
    qtyMinus: document.getElementById('qtyMinus'),
    qtyPlus: document.getElementById('qtyPlus'),
    name: document.getElementById('iName'),
    phone: document.getElementById('iPhone'),
    city: document.getElementById('iCity'),
    address: document.getElementById('iAddress'),
    notes: document.getElementById('iNotes'),
    billSub: document.getElementById('billSub'),
    billShip: document.getElementById('billShip'),
    billTotal: document.getElementById('billTotal'),
    billNudge: document.getElementById('billNudge'),
  };

  let product = PRODUCTS[0];
  let variant = 0;
  let size = null;
  let qty = 1;
  let ref = orderRef();

  /* معطيات زايدة كتجي من قسم "صمم ديالك": اسم الديزاين، حجم الطباعة، وصورة
     المعاينة. فارغة ف الطلبات العادية. */
  let extra = {};

  /* السلة. كل سطر: { product, variant, size, qty, extra, saveUrl }
     كتبقى معمّرة ملي تتسد النافذة — الزبون كيقدر يرجع لقسم "صمم ديالك"
     ويزيد ديزاين آخر. كتتفرغ غير من بعد ما يتصيفط الطلب. */
  let cart = [];

  /* ---------- السطور ---------- */

  /** التيشيرت المعمّر دابا — صالح غير ملي يكون القياس مختار. */
  const pending = () => (size ? { product, variant, size, qty, extra } : null);

  /** كلشي اللي غادي يتحاسب: السلة + اللي معمّر دابا. */
  function lines() {
    const p = pending();
    return p ? [...cart, p] : [...cart];
  }

  /* ---------- الفاتورة ---------- */

  /**
   * الحزمة كتتحسب على التيشيرتات **المطبوعة** وحدهم (جاهزين + مخصص).
   * الخاويين كيتزادو بثمنهم بالوحدة. التوصيل داخل ف الثمن — ديما مجاني.
   */
  function bill(ls = lines()) {
    let printed = 0;
    let blanks = 0;
    for (const l of ls) {
      if (isBlank(l.product)) blanks += l.qty;
      else printed += l.qty;
    }
    const items = bundlePrice(printed) + blanks * PRICING.blank;
    return { printed, blanks, items, shipping: 0, total: items };
  }

  function paintBill() {
    const b = bill();
    el.billSub.textContent = money(b.items);
    el.billShip.innerHTML = `<span class="bill__free">${t('order.free')}</span>`;
    el.billTotal.textContent = money(b.total);

    /* التحفيز: كنبينو ثمن التيشيرت الجاي غير ملي يكون أرخص من واحد بوحدو.
       فوق السلّم (3) الزايد كيخلص 200 — نفس ثمن الحزمة، فماكاين علاش. */
    const n = b.printed;
    const step = n >= 1 && n < PRICING.tiers.length
      ? bundlePrice(n + 1) - bundlePrice(n)
      : null;

    if (step !== null && step < PRICING.tiers[0]) {
      el.billNudge.textContent = t('order.nudge')
        .replace('{price}', money(step))
        .replace('{total}', money(bundlePrice(n + 1)));
      el.billNudge.hidden = false;
    } else {
      el.billNudge.hidden = true;
    }
  }

  /* ---------- الرسم ---------- */

  function paintProductChips() {
    el.productChips.innerHTML = PRODUCTS.map(
      (p) =>
        `<button class="chip" type="button" data-p="${p.id}"
                 aria-pressed="${p.id === product.id}">${esc(pick(p.name))}</button>`
    ).join('');
  }

  function paintChips() {
    // الألوان — كنخبيو القسم إلا كان لون واحد
    el.fColor.hidden = product.variants.length < 2;
    el.colorChips.innerHTML = product.variants
      .map(
        (v, i) =>
          `<button class="chip" type="button" data-v="${i}"
                   aria-pressed="${i === variant}">${esc(pick(v))}</button>`
      )
      .join('');

    el.sizeChips.innerHTML = product.sizes
      .map(
        (s) =>
          `<button class="chip" type="button" data-s="${s}"
                   aria-pressed="${s === size}">${s}</button>`
      )
      .join('');
  }

  function paintCart() {
    el.fCart.hidden = cart.length === 0;
    el.cartList.innerHTML = cart
      .map((l, i) => {
        const bits = [
          l.product.variants.length > 1 ? pick(l.product.variants[l.variant]) : null,
          l.size,
          l.qty > 1 ? `×${l.qty}` : null,
        ].filter(Boolean).join(' · ');

        /* كل سطر مخصص عندو رابط التحميل ديالو: المعاينة ديال هاد السطر هو،
           ماشي ديال اللي معمّر ف النافذة دابا. */
        const save = l.saveUrl
          ? `<a class="cart__save" href="${l.saveUrl}" download="${esc(ref)}-${i + 1}.webp"
                >${esc(t('order.savePreviewShort'))}</a>`
          : '';

        return `<li class="cart__item">
            <span class="cart__name">${esc(pick(l.product.name))}</span>
            <span class="cart__meta">${esc(bits)}</span>
            ${save}
            <button class="cart__rm" type="button" data-rm="${i}"
                    aria-label="${esc(t('order.remove'))}">&times;</button>
          </li>`;
      })
      .join('');
  }

  /**
   * رابط تحميل المعاينة.
   *
   * ⚠ Blob وماشي الـdata URL مباشرة: المعاينة ديال وجهين كتوصل ~2 MB،
   * و`href` بهاد الطول كيفشل ف تحميل Safari وكيثقل الـDOM.
   */
  function makeBlobUrl(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const mime = head.match(/:(.*?);/)?.[1] ?? 'image/webp';
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return { url: URL.createObjectURL(new Blob([buf], { type: mime })), mime };
  }

  // رابط اللي معمّر دابا. كنحررو القديم — بلاها كل فتح كيسرب ذاكرة.
  let saveUrl = null;
  function setSaveLink(dataUrl) {
    if (saveUrl) URL.revokeObjectURL(saveUrl);
    saveUrl = null;
    if (!dataUrl) {
      el.save.hidden = true;
      el.save.removeAttribute('href');
      return;
    }
    const { url, mime } = makeBlobUrl(dataUrl);
    saveUrl = url;
    el.save.href = url;
    el.save.download = `${ref}.${mime.split('/')[1] || 'webp'}`;
    el.save.hidden = false;
  }

  function paintProduct() {
    const v = product.variants[variant];

    // ف الطلب المخصص كنعرضو المعاينة اللي صاوب الزبون بنفسو (الديزاين على
    // التيشيرت) عوض الموكاب الخاوي — هو اللي كيأكد ليه أن الطلب مضبوط.
    if (extra.preview) {
      el.img.removeAttribute('srcset');
      el.img.src = extra.preview;
      setSaveLink(extra.preview);
    } else {
      el.img.src = v.solid;
      el.img.srcset = v.solidSrcset;
      setSaveLink(null);
    }
    el.img.alt = `${pick(product.name)} — ${pick(v)}`;
    el.title.textContent = pick(product.name);
    el.desc.textContent = pick(product.desc);
    el.ref.textContent = ref;
    el.qtyOut.textContent = qty;

    // ماكاينش علاش نزيدو تيشيرت بلا قياس
    el.cartAdd.disabled = !size;

    paintProductChips();
    paintChips();
    paintCart();
    paintBill();
  }

  /* ---------- السلة ---------- */

  /** كيدخل اللي معمّر دابا للسلة وكيوجد النافذة لتيشيرت جديد. */
  function addPending() {
    const p = pending();
    if (!p) return false;

    /* المعاينة كتولي ملك السطر: كنصاوبو ليه blob ديالو باش يبقى محمّل حتى
       من بعد ما يبدل الزبون التيشيرت ف النافذة. */
    cart.push({ ...p, saveUrl: p.extra?.preview ? makeBlobUrl(p.extra.preview).url : null });

    size = null;
    qty = 1;
    extra = {};
    return true;
  }

  function clearCart() {
    cart.forEach((l) => l.saveUrl && URL.revokeObjectURL(l.saveUrl));
    cart = [];
  }

  /* ---------- التحقق ---------- */

  function mark(fieldId, invalid) {
    document.getElementById(fieldId).dataset.invalid = invalid ? 'true' : 'false';
    return !invalid;
  }

  function validate() {
    // كنجمعو النتائج كاملة (بلا && القصير) باش كل الأخطاء تبان مرة وحدة.
    // القياس مطلوب غير إلا كانت السلة خاوية — إلا كان فيها شي حاجة، الزبون
    // كيقدر يصيفط بلا ما يعمّر تيشيرت جديد.
    const checks = [
      mark('fSize', !size && cart.length === 0),
      mark('fName', el.name.value.trim().length < 2),
      mark('fPhone', !isValidPhone(el.phone.value)),
      mark('fCity', !el.city.value),
      mark('fAddress', el.address.value.trim().length < 8),
    ];
    return checks.every(Boolean);
  }

  /* ---------- الحفظ المحلي ---------- */

  function loadCustomer() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVED) || '{}');
      if (s.name) el.name.value = s.name;
      if (s.phone) el.phone.value = s.phone;
      if (s.city) el.city.value = s.city;
      if (s.address) el.address.value = s.address;
    } catch { /* تجاهل */ }
  }

  function saveCustomer() {
    try {
      localStorage.setItem(
        SAVED,
        JSON.stringify({
          name: el.name.value.trim(),
          phone: el.phone.value.trim(),
          city: el.city.value,
          address: el.address.value.trim(),
        })
      );
    } catch { /* تجاهل */ }
  }

  /* ---------- الأحداث ---------- */

  el.productChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-p]');
    if (!btn) return;
    const next = byId(btn.dataset.p);
    if (!next || next === product) return;
    product = next;
    variant = 0;
    size = null;
    extra = {};        // الديزاين المخصص ماكيتنقلش لتيشيرت آخر
    paintProduct();
  });

  el.colorChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-v]');
    if (!btn) return;
    variant = Number(btn.dataset.v);
    paintProduct();
  });

  el.sizeChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-s]');
    if (!btn) return;
    size = btn.dataset.s;
    mark('fSize', false);
    el.cartAdd.disabled = false;
    paintChips();
    paintBill();
  });

  el.cartAdd.addEventListener('click', () => {
    if (!addPending()) {
      mark('fSize', true);
      return;
    }
    paintProduct();
    el.productChips.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  el.cartList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rm]');
    if (!btn) return;
    const [gone] = cart.splice(Number(btn.dataset.rm), 1);
    if (gone?.saveUrl) URL.revokeObjectURL(gone.saveUrl);
    paintCart();
    paintBill();
  });

  el.qtyMinus.addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    el.qtyOut.textContent = qty;
    paintBill();
  });
  el.qtyPlus.addEventListener('click', () => {
    qty = Math.min(10, qty + 1);
    el.qtyOut.textContent = qty;
    paintBill();
  });

  el.city.addEventListener('change', () => mark('fCity', false));

  // كنمسحو علامة الخطأ بمجرد ما يبدا الزائر يصلح
  [el.name, el.phone, el.address].forEach((input) => {
    input.addEventListener('input', () => {
      input.closest('.field').dataset.invalid = 'false';
    });
  });

  el.close.addEventListener('click', () => el.modal.close());
  el.modal.addEventListener('click', (e) => {
    if (e.target === el.modal) el.modal.close();   // الكليك على الخلفية كيسد
  });

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      el.form.querySelector('[data-invalid="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    // اللي معمّر ف النافذة كيدخل وحدو — الزبون ديال تيشيرت واحد ماكيكليكيش
    // على "زيد" أبداً، وماخاصوش يعرف أن كاينة سلة.
    addPending();

    saveCustomer();
    const b = bill(cart);
    const msg = buildMessage({
      lang: getLang(),
      ref,
      items: cart.map((l) => ({
        product: pick(l.product.name),
        color: l.product.variants.length > 1 ? pick(l.product.variants[l.variant]) : null,
        size: l.size,
        qty: l.qty,
        // كتلة لكل وجه معمّر — قدّام و/ولا لور
        sides: l.extra?.sides,
        ownDesign: Boolean(l.extra?.ownDesign),
        ownCount: l.extra?.ownCount ?? 0,
      })),
      itemsTotal: b.items,
      // التفصيل باش صاحب المتجر يشوف علاش المجموع هو هاداك، بلا ما يحسب بيدو
      breakdown: {
        printed: b.printed,
        printedTotal: bundlePrice(b.printed),
        blanks: b.blanks,
        blanksTotal: b.blanks * PRICING.blank,
      },
      shipping: b.shipping,
      total: b.total,
      name: el.name.value.trim(),
      phone: normalizePhone(el.phone.value),
      city: el.city.value,
      address: el.address.value.trim(),
      notes: el.notes.value,
    });

    const url = buildLink(SHOP.whatsapp, msg);
    const win = window.open(url, '_blank', 'noopener');
    if (!win) location.href = url;        // إلا حجب المتصفح النافذة

    clearCart();                           // الطلب مشى — السلة كتخوى
    ref = orderRef();                      // رقم جديد للطلب الجاي
    el.ref.textContent = ref;
    paintProduct();
  });

  loadCustomer();

  return {
    /**
     * كيحل النافذة على منتج محدد.
     * `opts` كتجي معمّرة غير من قسم "صمم ديالك":
     * { sides: [{ side, design, printCm, placement }], ownDesign,
     *   ownCount, preview, size }
     *
     * ⚠ السلة ماكتتفرغش هنا: الزبون اللي زاد تيشيرت ومشى يختار ديزاين آخر
     * من قسم "صمم ديالك" كيرجع ويلقى الأول باقي تما.
     */
    open(id, variantIndex = 0, opts = {}) {
      product = byId(id) ?? PRODUCTS[0];
      variant = Math.min(variantIndex, product.variants.length - 1);
      extra = opts;
      // القياس مختار أصلاً ف قسم التصميم — ماكاينش علاش نطلبوه مرة أخرى
      size = product.sizes.includes(opts.size) ? opts.size : null;
      qty = 1;
      el.form.querySelectorAll('.field').forEach((f) => (f.dataset.invalid = 'false'));
      paintProduct();
      el.modal.showModal();
    },
    /** كيعاود الرسم ملي تتبدل اللغة */
    refresh() {
      applyTo(el.modal);

      // المدينة مسجلة بسميتها ف اللغة القديمة — كنلقاو الكائن ديالها الأول
      // ومن بعد كنعاودو نختاروها بسميتها ف اللغة الجديدة.
      const previous = el.city.value;
      const chosen = CITIES.find((c) => c.ar === previous || c.fr === previous);
      const lang = getLang();

      el.city.innerHTML =
        `<option value="" disabled ${chosen ? '' : 'selected'}>${t('order.cityPh')}</option>` +
        CITIES.map(
          (c) =>
            `<option value="${c[lang]}" ${c === chosen ? 'selected' : ''}>${c[lang]}</option>`
        ).join('');

      paintProduct();
    },
  };
}
