/* ==========================================================================
   قسم "صمم ديالك".

   الزبون كيختار تيشيرت خاوي + رسمة من المعرض (ولا يحط الديزاين ديالو)،
   كيحرك الطبعة فين ما بغا بالسحب، كيبدل الحجم، وكيشوف النتيجة فاللحظة.

   ⚠ ملف الزبون **ماكيتصيفطش لأي مكان**. كيتقرا محلياً بـobjectURL وكيتلصق
   ف الـcanvas وصافي. رابط wa.me كيحمل نص فقط، فالزبون هو اللي كيلصق الصورة
   ف المحادثة — والرسالة كتجي فيها تذكير بارز بهادشي (شوف whatsapp.js).

   التركيب على القماش (الظل والطيات والقص على حدود التيشيرت) ف lib/mockup.js.
   ========================================================================== */

import { CUSTOM, SIZES } from '../data/products.js';
import {
  DESIGNS, DESIGNS_BY_CATEGORY, PRINT, cmPerFrame, maxPrintCm,
} from '../data/designs.js';
import { loadShirt, scaleArt, render } from '../lib/mockup.js';
import { pick, t } from '../i18n/index.js';

const CANVAS = 1080;

/* تحت 1500px الطبعة كتبان مبكسلة على تيشيرت. الرقم جاي من العرض الحقيقي:
   طبعة 38 سم على 100 dpi = 1496px. تحتيه كيبان الفرق بالعين. */
const MIN_PRINT_PX = 1500;
const MAX_FILE_MB = 10;
const NUDGE = 0.006;        // خطوة الأسهم ف لوحة المفاتيح

export function createCustomSection({ onOrder }) {
  const el = {
    section: document.getElementById('custom'),
    canvas: document.getElementById('customCanvas'),
    warn: document.getElementById('customWarn'),
    shirt: document.getElementById('customShirt'),
    fShirt: document.getElementById('fCustomShirt'),
    size: document.getElementById('customSize'),
    designs: document.getElementById('customDesigns'),
    file: document.getElementById('customFile'),
    cm: document.getElementById('customCm'),
    cmOut: document.getElementById('customCmOut'),
    reset: document.getElementById('customReset'),
    place: document.getElementById('customPlace'),
    order: document.getElementById('customOrder'),
  };

  const ctx = el.canvas.getContext('2d');

  /* ---------- الحالة ---------- */

  let shirt = 0;                                   // فهرس ف CUSTOM.variants
  let sizeIdx = SIZES.findIndex((s) => s.size === 'L');
  let designIdx = 0;                               // فهرس ف DESIGNS
  let source = 'gallery';                          // 'gallery' | 'own'
  let own = null;                                  // { url, img, name }
  let cm = PRINT.defaultCm;
  let started = false;

  // مركز الطبعة كنسبة من الإطار. `placed` = واش الزبون حركها بيدو: إلا ماحركهاش
  // كنعاودو نحسبو الموضع الافتراضي ملي يتبدل الحجم ولا الديزاين، وإلا كنحترمو
  // اللي اختار.
  let cx = PRINT.centerX;
  let cy = 0;
  let placed = false;

  /* ---------- تحميل الصور ---------- */

  // كنخزنو الوعد ماشي الصورة: جوج نداءات متتاليين على نفس المسار كيتشاركو
  // نفس التحميل عوض ما يبداو جوج طلبات.
  const imgCache = new Map();
  const shirtCache = new Map();   // بيكسلات الموكاب — القراءة مكلفة، مرة وحدة
  let artCache = null;            // { key, w, art } — كيتعاود غير ملي يتبدل الحجم

  function load(src) {
    if (!imgCache.has(src)) {
      imgCache.set(
        src,
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        })
      );
    }
    return imgCache.get(src);
  }

  async function shirtPixels() {
    const v = CUSTOM.variants[shirt];
    if (!shirtCache.has(v.solidFull)) {
      const [solid, cut] = await Promise.all([load(v.solidFull), load(v.cutFull)]);
      shirtCache.set(v.solidFull, {
        base: solid,
        data: await loadShirt(solid, cut, CANVAS),
      });
    }
    return shirtCache.get(v.solidFull);
  }

  /** أبعاد الرسمة المختارة — كافية باش نحسبو الحدود بلا ما نتسناو التحميل. */
  function artMeta() {
    if (source === 'own') {
      return own ? { width: own.img.naturalWidth, height: own.img.naturalHeight } : null;
    }
    return DESIGNS[designIdx];
  }

  const artKey = () => (source === 'own' ? `own:${own?.url}` : DESIGNS[designIdx].id);

  /* ---------- الحساب ---------- */

  const frameCm = () => cmPerFrame(SIZES[sizeIdx].chest);

  /** أبعاد الطبعة بالبيكسل ف الإطار. */
  function printBox() {
    const meta = artMeta();
    if (!meta) return null;
    const w = Math.round((CANVAS * cm) / frameCm());
    return { w, h: Math.round((w * meta.height) / meta.width) };
  }

  function clampCm() {
    const meta = artMeta();
    const max = meta ? maxPrintCm(meta, SIZES[sizeIdx].chest) : PRINT.maxCm;
    el.cm.min = String(PRINT.minCm);
    el.cm.max = String(max);
    cm = Math.min(Math.max(cm, PRINT.minCm), max);
    el.cm.value = String(cm);
    el.cmOut.textContent = `${cm} ${t('custom.cm')}`;
  }

  /** الموضع الافتراضي: وسط الظهر، تحت خياطة الرقبة. */
  function resetPos() {
    const box = printBox();
    cx = PRINT.centerX;
    cy = PRINT.top + (box ? box.h / CANVAS / 2 : 0.2);
    placed = false;
  }

  function clampPos(sh) {
    const b = sh.data.bbox;
    const pad = 0.02;
    cx = Math.min(Math.max(cx, b.minX / CANVAS + pad), b.maxX / CANVAS - pad);
    cy = Math.min(Math.max(cy, b.minY / CANVAS + pad), b.maxY / CANVAS - pad);
  }

  /** وصف الموضع بالكلام والسنتيمتر — هو اللي كيمشي ف رسالة واتساب. */
  function placement() {
    const box = printBox();
    if (!box) return '';
    const f = frameCm();

    const zone =
      cx < PRINT.torsoLeft
        ? t('custom.zoneSleeveStart')
        : cx > PRINT.torsoRight
          ? t('custom.zoneSleeveEnd')
          : t('custom.zoneBack');

    const down = Math.round((cy - box.h / CANVAS / 2 - PRINT.shirtTop) * f);
    const side = Math.round((cx - PRINT.centerX) * f);

    const across =
      Math.abs(side) < 2
        ? t('custom.centered')
        : `${Math.abs(side)} ${t('custom.cm')} ${t(
            side > 0 ? 'custom.towardEnd' : 'custom.towardStart'
          )}`;

    return `${zone} · ${down} ${t('custom.cm')} ${t('custom.belowCollar')} · ${across}`;
  }

  /* ---------- الرسم ---------- */

  let token = 0;
  let queued = false;

  async function draw() {
    const mine = ++token;

    let sh;
    try {
      sh = await shirtPixels();
    } catch {
      return;                       // الصورة ماوصلاتش — كنخليو الـcanvas كما هو
    }
    if (mine !== token) return;

    const box = printBox();
    if (!box) {
      ctx.drawImage(sh.base, 0, 0, CANVAS, CANVAS);
      return;
    }

    let img = null;
    if (source === 'own') {
      img = own?.img ?? null;
    } else {
      try {
        img = await load(DESIGNS[designIdx].src);
      } catch {
        img = null;
      }
      if (mine !== token) return;
    }

    if (img) {
      const key = `${artKey()}@${box.w}`;
      if (artCache?.key !== key) artCache = { key, art: scaleArt(img, box.w, box.h) };
    } else {
      artCache = null;
    }

    if (!placed) resetPos();
    clampPos(sh);

    render(
      ctx,
      sh.data,
      sh.base,
      artCache?.art ?? null,
      Math.round(cx * CANVAS - box.w / 2),
      Math.round(cy * CANVAS - box.h / 2)
    );

    el.place.textContent = placement();
  }

  /** كيجمع النداءات ف إطار واحد — السحب كينادي عشرات المرات ف الثانية. */
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      draw();
    });
  }

  /* ---------- التنبيهات ---------- */

  function warn(msg) {
    el.warn.textContent = msg ?? '';
    el.warn.hidden = !msg;
  }

  /* ---------- الرسم ديال الأزرار ---------- */

  function paintShirt() {
    // لون واحد → ماكاينش شي حاجة تختار. نفس السلوك ديال نافذة الطلب.
    el.fShirt.hidden = CUSTOM.variants.length < 2;
    el.shirt.innerHTML = CUSTOM.variants
      .map(
        (v, i) => `
        <button class="chip chip--swatch" type="button" data-i="${i}"
                aria-pressed="${i === shirt}">
          <span class="chip__dot" style="--sw:${v.hex}" aria-hidden="true"></span>
          ${pick(v)}
        </button>`
      )
      .join('');
  }

  function paintSize() {
    el.size.innerHTML = SIZES.map(
      (s, i) => `
      <button class="chip" type="button" data-i="${i}"
              aria-pressed="${i === sizeIdx}">${s.size}</button>`
    ).join('');
  }

  /** فهرس الرسمة ف DESIGNS — الشبكة مجمّعة، فالفهرس ماشي هو ترتيب العرض. */
  const indexOf = (d) => DESIGNS.indexOf(d);

  function paintDesigns() {
    // أي فئة كانت محلولة كتبقى محلولة. paintDesigns كيتنادى ملي تتبدل اللغة
    // ولا اللون، وبلا هادشي كل تبديل كان غادي يسد الأقسام تحت رجلين الزبون.
    const open = new Set(
      [...el.designs.querySelectorAll('details[data-cat]')]
        .filter((x) => x.open)
        .map((x) => x.dataset.cat)
    );
    const activeCat =
      source === 'gallery' ? DESIGNS[designIdx]?.category : null;

    const cards = DESIGNS_BY_CATEGORY.map((cat, ci) => {
      // أول مرة: نحلو الفئة اللي فيها المختار، وإلا الأولى.
      const isOpen = open.size
        ? open.has(cat.id)
        : cat.id === (activeCat ?? DESIGNS_BY_CATEGORY[0]?.id);
      const items = cat.items
        .map((d) => {
          const i = indexOf(d);
          return `
        <button class="design" type="button" data-i="${i}"
                aria-pressed="${source === 'gallery' && i === designIdx}">
          <span class="design__art">
            <img src="${d.src}" srcset="${d.srcset}" sizes="140px"
                 alt="" width="${d.width}" height="${d.height}" loading="lazy" />
          </span>
          <span class="design__name">${pick(d.name)}</span>
        </button>`;
        })
        .join('');
      return `
      <details class="cat" data-cat="${cat.id}"${isOpen ? ' open' : ''}>
        <summary class="cat__head">
          <span class="cat__name">${pick(cat.name)}</span>
          <span class="cat__count">${cat.items.length}</span>
        </summary>
        <div class="designs__grid">${items}</div>
      </details>`;
    }).join('');

    // ثلاث حالات للبطاقة ديال الزبون:
    //   ماكاينش ملف        → علامة + ، الكليك كيحل اختيار الملف
    //   كاين وماشي مختار   → الصورة، الكليك كيرجع ليها (بلا ما يعاود يختار)
    //   كاين ومختار        → الصورة، الكليك كيبدل الملف
    // بطاقة الزبون **برا** الفئات وفوقهم: هي ماشي فئة، وخاصها تبقى باينة
    // مهما كانت الأقسام مسدودة.
    const picked = source === 'own';
    const ownCard = `
      <div class="designs__grid designs__own">
        <button class="design design--own" type="button" data-own
                aria-pressed="${picked}">
          <span class="design__art">
            ${
              own
                ? `<img src="${own.url}" alt="" />`
                : `<span class="design__plus" aria-hidden="true">+</span>`
            }
          </span>
          <span class="design__name">${t(
            own && picked ? 'custom.ownChange' : 'custom.own'
          )}</span>
        </button>
      </div>`;

    el.designs.innerHTML = ownCard + cards;
  }

  function paint() {
    paintShirt();
    paintSize();
    paintDesigns();
    clampCm();
    draw();
  }

  /* ---------- ملف الزبون ---------- */

  async function useFile(file) {
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      warn(t('custom.warnBig'));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;

    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      warn(t('custom.warnFile'));
      return;
    }

    if (own) URL.revokeObjectURL(own.url);       // كنحررو الملف القديم
    own = { url, img, name: file.name };
    source = 'own';
    placed = false;

    // تحذير ماشي منع: الزبون ممكن يكون عارف وباغي يكمل.
    warn(
      Math.max(img.naturalWidth, img.naturalHeight) < MIN_PRINT_PX
        ? t('custom.warnLow')
        : null
    );

    paint();
  }

  /* ---------- السحب ---------- */

  let dragging = false;

  /** إحداثيات الحدث كنسبة من الإطار. */
  function at(e) {
    const r = el.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  el.canvas.addEventListener('pointerdown', (e) => {
    if (!artMeta()) return;
    dragging = true;
    placed = true;
    el.canvas.setPointerCapture(e.pointerId);
    el.canvas.dataset.dragging = 'true';
    const p = at(e);
    cx = p.x;
    cy = p.y;
    schedule();
  });

  el.canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = at(e);
    cx = p.x;
    cy = p.y;
    schedule();
  });

  const endDrag = () => {
    dragging = false;
    el.canvas.dataset.dragging = 'false';
  };
  el.canvas.addEventListener('pointerup', endDrag);
  el.canvas.addEventListener('pointercancel', endDrag);

  // بلا هادشي الطبعة ماتقدرش تتحرك بلا فارة
  el.canvas.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      e.key
    ];
    if (!step || !artMeta()) return;
    e.preventDefault();
    placed = true;
    cx += step[0] * NUDGE;
    cy += step[1] * NUDGE;
    schedule();
  });

  /* ---------- الأحداث ---------- */

  el.shirt.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    shirt = Number(btn.dataset.i);
    paint();
  });

  el.size.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    sizeIdx = Number(btn.dataset.i);
    paint();
  });

  el.designs.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.hasAttribute('data-own')) {
      if (own && source !== 'own') {          // الملف موجود — غير رجع ليه
        source = 'own';
        placed = false;
        warn(null);
        paint();
      } else {
        el.file.click();
      }
      return;
    }

    source = 'gallery';
    designIdx = Number(btn.dataset.i);
    placed = false;
    warn(null);
    paint();
  });

  el.file.addEventListener('change', () => {
    useFile(el.file.files?.[0]);
    el.file.value = '';        // باش يخدم حتى إلا عاود اختار نفس الملف
  });

  el.cm.addEventListener('input', () => {
    cm = Number(el.cm.value);
    el.cmOut.textContent = `${cm} ${t('custom.cm')}`;
    schedule();
  });

  el.reset.addEventListener('click', () => {
    resetPos();
    schedule();
  });

  el.order.addEventListener('click', () => {
    if (!artMeta()) {
      warn(t('custom.warnPick'));
      return;
    }

    onOrder(CUSTOM.id, shirt, {
      design: source === 'own' ? t('custom.designOwn') : pick(DESIGNS[designIdx].name),
      printCm: cm,
      placement: placement(),
      ownDesign: source === 'own',
      size: SIZES[sizeIdx].size,
      // الصور كلها من نفس الأصل (والobjectURL حتى هو)، فالـcanvas ماشي ملوث
      // وtoDataURL كيخدم بلا مشكل.
      preview: el.canvas.toDataURL('image/webp', 0.85),
    });
  });

  /* ---------- التشغيل الكسول ---------- */

  // ماكنحملوش الموكاب ديال 1080px حتى يقرب القسم من الشاشة. القسم تحت ف
  // الصفحة، وأغلب الزوار على 4G — كل طلب ماشي ضروري ف البداية كيتحسب.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((x) => x.isIntersecting) || started) return;
      started = true;
      io.disconnect();
      paint();
    },
    { rootMargin: '400px' }
  );
  io.observe(el.section);

  return {
    /** كيعاود الرسم ملي تتبدل اللغة */
    refresh() {
      if (started) paint();
    },
  };
}
