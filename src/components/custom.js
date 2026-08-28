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
  DESIGNS, DESIGNS_BY_CATEGORY, PRINT, printFor, cmPerFrame, maxPrintCm,
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
    sides: document.getElementById('customSides'),
    order: document.getElementById('customOrder'),
  };

  const ctx = el.canvas.getContext('2d');

  /* ---------- الحالة ---------- */

  /* مشتركة بين الوجهين — التيشيرت واحد. */
  let shirt = 0;                                   // فهرس ف CUSTOM.variants
  let sizeIdx = SIZES.findIndex((s) => s.size === 'L');
  let started = false;

  /* لكل وجه حالتو الكاملة: الزبون كيقدر يطبع قدّام ولور ف نفس الطلب،
     كل وحدة برسمتها وحجمها وموضعها. تبديل الوجه ماخاصوش يمس الآخر.

     designIdx = -1 → ماكاين حتى رسمة. الوجه كيبدا **خاوي** عن قصد: رسمة
     مختارة سلفاً كتوهم أنها جزء من المنتج، وكتخلي اللي بغا يحط الديزاين
     ديالو يظن أنه خاصو يحيدها أولاً.

     `placed` = واش الزبون حرك الطبعة بيدو. إلا ماحركهاش كنعاودو نحسبو
     الموضع الافتراضي ملي يتبدل الحجم ولا الرسمة، وإلا كنحترمو اللي اختار. */
  const makeFace = (f) => ({
    designIdx: -1,
    source: 'gallery',                             // 'gallery' | 'own'
    own: null,                                     // { url, img, name }
    cm: printFor(f).defaultCm,
    cx: PRINT.centerX,
    cy: 0,
    placed: false,
  });

  const faces = { back: makeFace('back'), front: makeFace('front') };
  let side = 'back';                               // الوجه المعروض
  const S = () => faces[side];                     // حالة الوجه الحالي
  const P = () => printFor(side);                  // إعدادات طباعة الوجه

  /** واش هاد اللون عندو موكاب قدّام. بلاه زر "القدّام" كيختافى. */
  const hasFront = () => Boolean(CUSTOM.variants[shirt]?.front);
  const faceHasArt = (f) =>
    faces[f].designIdx >= 0 || (faces[f].source === 'own' && faces[f].own);

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

  /** موكاب الوجه المعروض. الكاش مفتاحو المسار، فكيخدم للجوج بلا تعديل. */
  function faceShot() {
    const v = CUSTOM.variants[shirt];
    return side === 'front' && v.front ? v.front : v;
  }

  async function shirtPixels() {
    const v = faceShot();
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
  function artMeta(f = side) {
    const s = faces[f];
    if (s.source === 'own') {
      return s.own ? { width: s.own.img.naturalWidth, height: s.own.img.naturalHeight } : null;
    }
    return DESIGNS[s.designIdx] ?? null;           // designIdx = -1 → خاوي
  }

  // الوجه داخل ف المفتاح: نفس الرسمة بنفس العرض على وجهين = بافرين مختلفين
  const artKey = () => {
    const s = S();
    return `${side}:${s.source === 'own' ? `own:${s.own?.url}` : DESIGNS[s.designIdx].id}`;
  };

  /* ---------- الحساب ---------- */

  const frameCm = () => cmPerFrame(SIZES[sizeIdx].chest);

  /** أبعاد الطبعة بالبيكسل ف الإطار. */
  function printBox(f = side) {
    const meta = artMeta(f);
    if (!meta) return null;
    const w = Math.round((CANVAS * faces[f].cm) / frameCm());
    return { w, h: Math.round((w * meta.height) / meta.width) };
  }

  function clampCm() {
    const s = S();
    const p = P();
    const meta = artMeta();
    const max = meta ? maxPrintCm(meta, SIZES[sizeIdx].chest, side) : p.maxCm;
    el.cm.min = String(p.minCm);
    el.cm.max = String(max);
    s.cm = Math.min(Math.max(s.cm, p.minCm), max);
    el.cm.value = String(s.cm);
    el.cmOut.textContent = `${s.cm} ${t('custom.cm')}`;
  }

  /** الموضع الافتراضي: وسط الجذع، تحت خياطة الرقبة. */
  function resetPos() {
    const s = S();
    const box = printBox();
    s.cx = PRINT.centerX;
    s.cy = P().top + (box ? box.h / CANVAS / 2 : 0.2);
    s.placed = false;
  }

  function clampPos(sh) {
    const s = S();
    const b = sh.data.bbox;
    const pad = 0.02;
    s.cx = Math.min(Math.max(s.cx, b.minX / CANVAS + pad), b.maxX / CANVAS - pad);
    s.cy = Math.min(Math.max(s.cy, b.minY / CANVAS + pad), b.maxY / CANVAS - pad);
  }

  /** وصف الموضع بالكلام والسنتيمتر — هو اللي كيمشي ف رسالة واتساب. */
  function placement(f = side) {
    const box = printBox(f);
    if (!box) return '';
    const s = faces[f];
    const fr = frameCm();

    // على الجذع كنسميو الوجه (قدّام/لور)؛ برا الجذع الطبعة على الكم.
    const zone =
      s.cx < PRINT.torsoLeft
        ? t('custom.zoneSleeveStart')
        : s.cx > PRINT.torsoRight
          ? t('custom.zoneSleeveEnd')
          : t(f === 'front' ? 'custom.zoneFront' : 'custom.zoneBack');

    const down = Math.round((s.cy - box.h / CANVAS / 2 - PRINT.shirtTop) * fr);
    const offset = Math.round((s.cx - PRINT.centerX) * fr);

    const across =
      Math.abs(offset) < 2
        ? t('custom.centered')
        : `${Math.abs(offset)} ${t('custom.cm')} ${t(
            offset > 0 ? 'custom.towardEnd' : 'custom.towardStart'
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

    const s = S();
    let img = null;
    if (s.source === 'own') {
      img = s.own?.img ?? null;
    } else {
      try {
        img = await load(DESIGNS[s.designIdx].src);
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

    if (!s.placed) resetPos();
    clampPos(sh);

    render(
      ctx,
      sh.data,
      sh.base,
      artCache?.art ?? null,
      Math.round(s.cx * CANVAS - box.w / 2),
      Math.round(s.cy * CANVAS - box.h / 2)
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

  /**
   * أزرار قدّام/لور. كل زر كيبين واش الوجه فيه رسمة — بلا هادشي الزبون
   * ماكيعرفش واش عمّر الوجه الآخر ولا لا، وكيطلب حاجة ناقصة.
   */
  function paintSides() {
    const can = hasFront();
    el.sides.hidden = !can;
    if (!can && side === 'front') side = 'back';   // اللون ماعندوش قدّام

    [...el.sides.querySelectorAll('[data-side]')].forEach((b) => {
      const f = b.dataset.side;
      b.setAttribute('aria-selected', String(f === side));
      b.classList.toggle('has-art', Boolean(faceHasArt(f)));
    });
  }

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
      S().source === 'gallery' ? DESIGNS[S().designIdx]?.category : null;

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
                aria-pressed="${S().source === 'gallery' && i === S().designIdx}">
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
    const picked = S().source === 'own';
    const ownFile = S().own;
    const ownCard = `
      <div class="designs__grid designs__own">
        <button class="design design--own" type="button" data-own
                aria-pressed="${picked}">
          <span class="design__art">
            ${
              ownFile
                ? `<img src="${ownFile.url}" alt="" />`
                : `<span class="design__plus" aria-hidden="true">+</span>`
            }
          </span>
          <span class="design__name">${t(
            ownFile && picked ? 'custom.ownChange' : 'custom.own'
          )}</span>
        </button>
      </div>`;

    el.designs.innerHTML = ownCard + cards;
  }

  function paint() {
    paintSides();
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

    // الملف كيتحط ف **الوجه المعروض** وحدو. كل وجه عندو ملفو.
    const s = S();
    if (s.own) URL.revokeObjectURL(s.own.url);   // كنحررو الملف القديم
    s.own = { url, img, name: file.name };
    s.source = 'own';
    s.placed = false;

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
    const s = S();
    s.placed = true;
    el.canvas.setPointerCapture(e.pointerId);
    el.canvas.dataset.dragging = 'true';
    const p = at(e);
    s.cx = p.x;
    s.cy = p.y;
    schedule();
  });

  el.canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = at(e);
    const s = S();
    s.cx = p.x;
    s.cy = p.y;
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
    const s = S();
    s.placed = true;
    s.cx += step[0] * NUDGE;
    s.cy += step[1] * NUDGE;
    schedule();
  });

  /* ---------- الأحداث ---------- */

  el.sides.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-side]');
    if (!btn || btn.dataset.side === side) return;
    side = btn.dataset.side;
    warn(null);                    // التحذير كان على الوجه اللي فات
    paint();
  });

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
      const s = S();
      if (s.own && s.source !== 'own') {      // الملف موجود — غير رجع ليه
        s.source = 'own';
        s.placed = false;
        warn(null);
        paint();
      } else {
        el.file.click();
      }
      return;
    }

    const s = S();
    s.source = 'gallery';
    s.designIdx = Number(btn.dataset.i);
    s.placed = false;
    warn(null);
    paint();
  });

  el.file.addEventListener('change', () => {
    useFile(el.file.files?.[0]);
    el.file.value = '';        // باش يخدم حتى إلا عاود اختار نفس الملف
  });

  el.cm.addEventListener('input', () => {
    const s = S();
    s.cm = Number(el.cm.value);
    el.cmOut.textContent = `${s.cm} ${t('custom.cm')}`;
    schedule();
  });

  el.reset.addEventListener('click', () => {
    resetPos();
    schedule();
  });

  /**
   * معاينة الطلب. إلا كانو الوجهين معمّرين كنركّبوهم حدا بعضياتهم — صاحب
   * المتجر خاصو يشوف الجوج ف نافذة الطلب، ماشي غير الوجه اللي كان معروض.
   */
  async function orderPreview(filled) {
    if (filled.length < 2) return el.canvas.toDataURL('image/webp', 0.85);

    const shots = [];
    const keep = side;
    for (const f of filled) {
      side = f;
      await draw();                              // كيرسم الوجه ف الكانفاس
      shots.push(el.canvas.toDataURL('image/webp', 0.9));
    }
    side = keep;
    await draw();                                // نرجعو الكانفاس كما كان

    const imgs = await Promise.all(shots.map((src) => load(src)));
    const c = document.createElement('canvas');
    c.width = CANVAS * 2;
    c.height = CANVAS;
    const cx2 = c.getContext('2d');
    imgs.forEach((im, i) => cx2.drawImage(im, i * CANVAS, 0, CANVAS, CANVAS));
    return c.toDataURL('image/webp', 0.85);
  }

  el.order.addEventListener('click', async () => {
    // الطلب كيمشي إلا كان **شي وجه** معمّر، ماشي الوجه المعروض بالضرورة.
    const filled = ['back', 'front'].filter((f) => artMeta(f));
    if (!filled.length) {
      warn(t('custom.warnPick'));
      return;
    }

    const label = { back: t('custom.back'), front: t('custom.front') };
    onOrder(CUSTOM.id, shirt, {
      sides: filled.map((f) => ({
        side: label[f],
        design: faces[f].source === 'own'
          ? t('custom.designOwn')
          : pick(DESIGNS[faces[f].designIdx].name),
        printCm: faces[f].cm,
        placement: placement(f),
      })),
      // التذكير بلصق الصورة كيبان إلا كان **شي وجه** فيه ملف الزبون
      ownDesign: filled.some((f) => faces[f].source === 'own'),
      ownCount: filled.filter((f) => faces[f].source === 'own').length,
      size: SIZES[sizeIdx].size,
      // الصور كلها من نفس الأصل (والobjectURL حتى هو)، فالـcanvas ماشي ملوث
      // وtoDataURL كيخدم بلا مشكل.
      preview: await orderPreview(filled),
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
