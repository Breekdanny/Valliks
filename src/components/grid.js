/* ==========================================================================
   شبكة المنتوجات + سلايدات الكاروسيل.
   بجوجهم كيتبنيو من نفس المصدر: PRODUCTS ف src/data/products.js
   ========================================================================== */

import { PRODUCTS } from '../data/products.js';
import { pick, t, money, getLang } from '../i18n/index.js';
import { attachTilt } from '../lib/motion.js';

/* --------------------------------------------------------------------------
   سلايدات الكاروسيل — كنستعملو النسخة الشفافة (cut) باش التيشيرت يطوف
   -------------------------------------------------------------------------- */
export function renderSlides(ring, dots) {
  ring.innerHTML = '';
  dots.innerHTML = '';

  PRODUCTS.forEach((p, i) => {
    const v = p.variants[0];

    const slide = document.createElement('article');
    slide.className = 'slide';
    slide.style.setProperty('--i', i);
    slide.innerHTML = `
      <div class="slide__halo" aria-hidden="true"></div>
      <img src="${v.cut}" srcset="${v.cutSrcset}"
           sizes="(max-width: 860px) 66vw, 27vw"
           alt="${pick(p.name)}" width="720" height="720"
           ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} />
      <div class="slide__floor" aria-hidden="true"></div>
    `;
    ring.append(slide);

    const dot = document.createElement('button');
    dot.className = 'stage__dot';
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', pick(p.name));
    dots.append(dot);
  });
}

/* --------------------------------------------------------------------------
   بطاقات الشبكة — كنستعملو النسخة بالخلفية الداكنة (solid)
   -------------------------------------------------------------------------- */
export function renderGrid(root, { onOrder }) {
  root.innerHTML = '';

  PRODUCTS.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.reveal = '';
    card.dataset.id = p.id;

    const v0 = p.variants[0];
    const badge = p.badge
      ? `<span class="card__badge">${pick(p.badge)}</span>`
      : '';

    const swatches = p.variants
      .map(
        (v, i) => `
        <button class="swatch" type="button" data-v="${i}"
                style="--sw:${v.hex}" aria-pressed="${i === 0}"
                aria-label="${pick(v)}" title="${pick(v)}"></button>`
      )
      .join('');

    const was = p.was
      ? `<s class="card__was">${money(p.was)}</s>`
      : '';

    card.innerHTML = `
      <div class="card__media">
        ${badge}
        <img src="${v0.solid}" srcset="${v0.solidSrcset}"
             sizes="(max-width: 600px) 92vw, (max-width: 900px) 46vw, 30vw"
             alt="${pick(p.name)} — ${pick(v0)}"
             width="720" height="720" loading="lazy" decoding="async" />
      </div>
      <div class="card__body">
        <p class="card__tag">${pick(p.tag)}</p>
        <h3 class="card__name">${pick(p.name)}</h3>
        <p class="card__desc">${pick(p.desc)}</p>
      </div>
      ${p.variants.length > 1 ? `<div class="swatches">${swatches}</div>` : ''}
      <div class="card__foot">
        <p class="card__price">${money(p.price)}${was}</p>
        <button class="btn" type="button" data-order>${t('shop.order')}</button>
      </div>
    `;

    /* --- تبديل اللون: كنبدلو الصورة بتلاشي خفيف بدل قفزة مباشرة --- */
    let active = 0;
    const img = card.querySelector('.card__media img');

    card.querySelectorAll('.swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.v);
        if (i === active) return;
        active = i;
        const v = p.variants[i];

        card.querySelectorAll('.swatch').forEach((b) =>
          b.setAttribute('aria-pressed', String(Number(b.dataset.v) === i))
        );

        img.dataset.swapping = 'true';

        const swap = async () => {
          img.removeEventListener('transitionend', swap);
          if (img.dataset.swapping !== 'true') return;   // تسبقنا شي نداء آخر

          // كنحمّلو ونفكّو الصورة الجديدة **قبل** ما نظهروها. بلا هادشي
          // كنرجعو الشفافية على صورة مازال ماوصلاتش، فكيبان مربع خاوي.
          // بجوج ألوان ماكانش كيبان؛ بستة ألوان على 4G كيبان ف كل تبديل جديد.
          const next = new Image();
          next.sizes = img.sizes;
          next.srcset = v.solidSrcset;
          next.src = v.solid;
          try {
            await next.decode();
          } catch {
            /* الشبكة قاطعة ولا الصورة خايبة — كنكملو باش ماتبقاش البطاقة مخفية */
          }

          if (active !== i) return;      // الزائر بدل لون آخر ملي كنتسناو
          img.src = v.solid;
          img.srcset = v.solidSrcset;
          img.alt = `${pick(p.name)} — ${pick(v)}`;
          img.dataset.swapping = 'false';
        };

        img.addEventListener('transitionend', swap, { once: true });
        // احتياط إلا ماوقعش transitionend (تقليل الحركة مثلاً)
        setTimeout(swap, 300);
      });
    });

    card.querySelector('[data-order]').addEventListener('click', () =>
      onOrder(p.id, active)
    );

    attachTilt(card);
    root.append(card);
  });
}

/* --------------------------------------------------------------------------
   جدول القياسات · المدن · الشريط المتحرك · الروابط الاجتماعية
   -------------------------------------------------------------------------- */

export function renderSizeTable(tbody, sizes) {
  tbody.innerHTML = sizes
    .map(
      (s) => `
      <tr>
        <th scope="row">${s.size}</th>
        <td>${s.chest}</td>
        <td>${s.length}</td>
        <td>${s.sleeve}</td>
      </tr>`
    )
    .join('');
}

export function renderCitySelect(select, cities) {
  const lang = getLang();
  select.innerHTML =
    `<option value="" disabled selected>${t('order.cityPh')}</option>` +
    cities
      .map((c) => `<option value="${c[lang]}" data-fee="${c.fee}">${c[lang]}</option>`)
      .join('');
}

export function renderFooterCities(ul, cities) {
  const lang = getLang();
  ul.innerHTML =
    cities
      .slice(0, 7)
      .map((c) => `<li>${c[lang]}</li>`)
      .join('') + `<li style="color:var(--text-faint)">${t('footer.citiesMore')}</li>`;
}

export function renderMarquee(...tracks) {
  const items = t('marquee.items').split('·').map((s) => s.trim());
  // كنكررو المحتوى مرتين ف كل مسار باش الحلقة تبان متواصلة بلا فراغ
  const html = [...items, ...items].map((s) => `<span>${s}</span>`).join('');
  tracks.forEach((track) => {
    if (track) track.innerHTML = html;
  });
}
