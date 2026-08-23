/* ==========================================================================
   نافذة الطلب.
   خطوة وحدة: المنتج → القياس واللون → المعلومات → واتساب.
   كل خطوة زايدة ف الطريق كتضيع طلبات، خصوصاً على الهاتف.
   ========================================================================== */

import { PRODUCTS, CITIES, SHOP, byId, cityFee } from '../data/products.js';
import { pick, t, money, getLang, applyTo } from '../i18n/index.js';
import {
  normalizePhone,
  isValidPhone,
  orderRef,
  buildMessage,
  buildLink,
} from '../lib/whatsapp.js';

const SAVED = 'valliks:customer';

export function createOrderModal() {
  const el = {
    modal: document.getElementById('modal'),
    close: document.getElementById('modalClose'),
    img: document.getElementById('modalImg'),
    title: document.getElementById('modalTitle'),
    desc: document.getElementById('modalDesc'),
    ref: document.getElementById('modalRef'),
    form: document.getElementById('orderForm'),
    colorChips: document.getElementById('colorChips'),
    sizeChips: document.getElementById('sizeChips'),
    fColor: document.getElementById('fColor'),
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
  };

  let product = PRODUCTS[0];
  let variant = 0;
  let size = null;
  let qty = 1;
  let ref = orderRef();

  /* معطيات زايدة كتجي من قسم "صمم ديالك": اسم الديزاين، حجم الطباعة، وصورة
     المعاينة. فارغة ف الطلبات العادية. */
  let extra = {};

  /* ---------- الفاتورة ---------- */

  function bill() {
    const subtotal = product.price * qty;
    const raw = cityFee(el.city.value);
    const shipping = subtotal >= SHOP.freeShippingAbove ? 0 : raw;
    return { subtotal, shipping, total: subtotal + shipping };
  }

  function paintBill() {
    const b = bill();
    el.billSub.textContent = money(b.subtotal);
    el.billShip.innerHTML =
      b.shipping === 0
        ? `<span class="bill__free">${t('order.free')}</span>`
        : money(b.shipping);
    el.billTotal.textContent = money(b.total);
  }

  /* ---------- الرسم ---------- */

  function paintChips() {
    // الألوان — كنخبيو القسم إلا كان لون واحد
    el.fColor.hidden = product.variants.length < 2;
    el.colorChips.innerHTML = product.variants
      .map(
        (v, i) =>
          `<button class="chip" type="button" data-v="${i}"
                   aria-pressed="${i === variant}">${pick(v)}</button>`
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

  function paintProduct() {
    const v = product.variants[variant];

    // ف الطلب المخصص كنعرضو المعاينة اللي صاوب الزبون بنفسو (الديزاين على
    // التيشيرت) عوض الموكاب الخاوي — هو اللي كيأكد ليه أن الطلب مضبوط.
    if (extra.preview) {
      el.img.removeAttribute('srcset');
      el.img.src = extra.preview;
    } else {
      el.img.src = v.solid;
      el.img.srcset = v.solidSrcset;
    }
    el.img.alt = `${pick(product.name)} — ${pick(v)}`;
    el.title.textContent = pick(product.name);
    el.desc.textContent = pick(product.desc);
    el.ref.textContent = ref;
    el.qtyOut.textContent = qty;
    paintChips();
    paintBill();
  }

  /* ---------- التحقق ---------- */

  function mark(fieldId, invalid) {
    document.getElementById(fieldId).dataset.invalid = invalid ? 'true' : 'false';
    return !invalid;
  }

  function validate() {
    // كنجمعو النتائج كاملة (بلا && القصير) باش كل الأخطاء تبان مرة وحدة
    const checks = [
      mark('fSize', !size),
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
    paintChips();
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

  el.city.addEventListener('change', () => {
    mark('fCity', false);
    paintBill();
  });

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

    saveCustomer();
    const b = bill();
    const msg = buildMessage({
      lang: getLang(),
      ref,
      product: pick(product.name),
      color: pick(product.variants[variant]),
      size,
      qty,
      unitPrice: product.price,
      subtotal: b.subtotal,
      shipping: b.shipping,
      total: b.total,
      name: el.name.value.trim(),
      phone: normalizePhone(el.phone.value),
      city: el.city.value,
      address: el.address.value.trim(),
      notes: el.notes.value,
      design: extra.design,
      printCm: extra.printCm,
      ownDesign: extra.ownDesign,
    });

    const url = buildLink(SHOP.whatsapp, msg);
    const win = window.open(url, '_blank', 'noopener');
    if (!win) location.href = url;        // إلا حجب المتصفح النافذة

    ref = orderRef();                      // رقم جديد للطلب الجاي
    el.ref.textContent = ref;
  });

  loadCustomer();

  return {
    /**
     * كيحل النافذة على منتج محدد.
     * `opts` كتجي معمّرة غير من قسم "صمم ديالك":
     * { design, printCm, ownDesign, preview, size }
     */
    open(id, variantIndex = 0, opts = {}) {
      product = byId(id) ?? PRODUCTS[0];
      variant = Math.min(variantIndex, product.variants.length - 1);
      extra = opts;
      // القياس مختار أصلاً ف قسم التصميم — ماكاينش علاش نطلبوه مرة أخرى
      size = product.sizes.includes(opts.size) ? opts.size : null;
      qty = 1;
      ref = orderRef();
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
