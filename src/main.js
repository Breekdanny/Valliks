/* ==========================================================================
   VALLIKS — نقطة الدخول. كتربط كلشي.
   ========================================================================== */

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components/hero.css';
import './styles/components/shop.css';
import './styles/components/custom.css';
import './styles/components/info.css';
import './styles/components/order.css';

import { PRODUCTS, CITIES, SIZES, SHOP, LOOKBOOK } from './data/products.js';
import { initI18n, toggleLang, onLangChange, t, pick, money, getLang } from './i18n/index.js';
import { createCarousel } from './lib/carousel.js';
import { initReveal, initScrollState } from './lib/motion.js';
import { contactLink } from './lib/whatsapp.js';
import { initAnalytics } from './lib/analytics.js';
import { createOrderModal } from './components/order.js';
import { createCustomSection } from './components/custom.js';
import { inject } from '@vercel/analytics';
import {
  renderGrid,
  renderSizeTable,
  renderLookbook,
  renderCitySelect,
  renderFooterCities,
  renderMarquee,
} from './components/grid.js';

const $ = (id) => document.getElementById(id);

/* ---------- 1. اللغة والاتجاه ---------- */
initI18n();

/* ---------- 2. الأقسام الثابتة ---------- */
renderSizeTable($('sizeRows'), SIZES);
// القسم والرابط ف الـnav كيبقاو مخبيين إلا raw/lookbook/ خاوي
const renderWorn = () => renderLookbook($('worn'), $('wornTrack'), $('navWorn'), LOOKBOOK);
renderWorn();
renderCitySelect($('iCity'), CITIES);
renderFooterCities($('footerCities'), CITIES);
renderMarquee($('marquee1'), $('marquee2'));
$('year').textContent = new Date().getFullYear();

/* ---------- 3. نافذة الطلب (بعد ما تتعمر المدن) ---------- */
const modal = createOrderModal();

/* ---------- 4. الكاروسيل ثلاثي الأبعاد ---------- */
const stage = $('stage');
const ring = $('ring');
const dots = $('dots');
const hint = $('stageHint');

renderSlides(ring, dots);

let activeIndex = 0;

function paintHero(i) {
  activeIndex = i;
  const p = PRODUCTS[i];

  $('heroTag').textContent = pick(p.tag);
  $('heroName').textContent = pick(p.name);
  $('heroPrice').innerHTML =
    money(p.price) +
    (p.was ? `<span class="hero__was">${money(p.was)}</span>` : '');

  $('stickyPrice').innerHTML = `${money(p.price)}<small>${pick(p.name)}</small>`;
  stage.setAttribute('aria-label', pick(p.name));
}

const carousel = createCarousel({
  stage,
  ring,
  dots,
  count: PRODUCTS.length,
  onChange: (i) => {
    paintHero(i);
    hint.dataset.used = 'true';      // الزائر فهم كيفاش كتخدم — كنخبيو التلميح
  },
});

paintHero(0);

dots.addEventListener('click', (e) => {
  const btn = e.target.closest('.stage__dot');
  if (btn) carousel.goTo([...dots.children].indexOf(btn));
});

/* ---------- 4b. زر اللور/القدّام ----------
   كنبدلو `src` ديال الصور ف بلاصتهم عوض ما نعاودو بناء الكاروسيل — بلا
   هادشي الزاوية الحالية والدوران كيتصفرو تحت رجلين الزائر.

   الزر كيبان غير إلا كان عند شي منتج موكاب قدّام. ماكاين علاش يبان زر
   كيبدل لنفس الصورة. */
const face = $('stageFace');
let side = 'back';

function paintFace() {
  [...ring.children].forEach((slide, i) => {
    const v = PRODUCTS[i].variants[0];
    // اللون اللي ماعندوش قدّام كيبقى على اللور — ماشي صورة خاوية
    const view = side === 'front' && v.front ? v.front : v;
    const img = slide.querySelector('img');
    img.src = view.cut;
    img.srcset = view.cutSrcset;
  });
  [...face.children].forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.side === side))
  );
}

face.hidden = !PRODUCTS.some((p) => p.variants[0].front);

face.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-side]');
  if (!btn || btn.dataset.side === side) return;
  side = btn.dataset.side;
  paintFace();
});

/* التلميح كيتبدل حسب الجهاز: "سحب" ف الحاسوب، "سويب" ف الهاتف */
if (matchMedia('(hover: none)').matches) {
  hint.querySelector('span').dataset.i18n = 'hero.swipe';
  hint.querySelector('span').textContent = t('hero.swipe');
}

/* ---------- 5. شبكة المنتوجات ---------- */
renderGrid($('grid'), { onOrder: (id, v) => modal.open(id, v) });

/* ---------- 5b. قسم "صمم ديالك" ---------- */
const custom = createCustomSection({
  onOrder: (id, v, opts) => modal.open(id, v, opts),
});

/* ---------- 6. أزرار الطلب ---------- */
$('heroOrder').addEventListener('click', () => modal.open(PRODUCTS[activeIndex].id));
$('stickyBtn').addEventListener('click', () => modal.open(PRODUCTS[activeIndex].id));

/* ---------- 7. روابط واتساب والسوشيال ---------- */
function paintLinks() {
  const url = contactLink(SHOP.whatsapp, getLang());
  $('waHeader').href = url;
  $('waFooter').href = url;

  // نفس الأيقونات ف الهيدر وف الفوتر — مصدر واحد، فماكاينش خطر أن وحدة
  // تتحدث والأخرى لا.
  const boxes = [$('socialsHeader'), $('socials')].filter(Boolean);
  boxes.forEach((b) => (b.innerHTML = ''));

  /* تدرج إنستغرام الرسمي. الأيقونة كتاخدو بـfill="url(#igGrad)" عوض
     currentColor — CSS ماكيقدرش يحط تدرج على مسار SVG، خاص يكون جوا الملف.
     المعرّف كيتعاود مع كل نداء، ولكن socials.innerHTML='' فوق كيمسح القديم
     أولاً، فماكاينش خطر تكرار id. */
  const IG_GRAD = `<defs><linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#f9ce34"/>
      <stop offset=".5" stop-color="#ee2a7b"/>
      <stop offset="1" stop-color="#6228d7"/>
    </linearGradient></defs>`;

  const nets = [
    ['instagram', SHOP.instagram,
      'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm8.4-11.2a1.5 1.5 0 1 1-3.1 0 1.5 1.5 0 0 1 3.1 0z'],
    ['tiktok', SHOP.tiktok,
      'M16.6 5.8a4.8 4.8 0 0 1-1-2.8h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.2a7.8 7.8 0 0 0 4.5 1.4V7.5a4.7 4.7 0 0 1-3.5-1.7z'],
  ];

  nets.forEach(([name, href, path]) => {
    if (!href) return;                 // ماكاينش الرابط → ماكايناش الأيقونة
    const ig = name === 'instagram';
    boxes.forEach((box, i) => {
      const a = document.createElement('a');
      a.className = `icon-btn icon-btn--brand icon-btn--${ig ? 'ig' : name}`;
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', name);
      // ⚠ معرّف التدرج خاصو يكون فريد ف كل نسخة. لو تكرر نفس الـid ف
      // الصفحة، المتصفح كياخد الأول وحدو — والثاني كيبقى بلا لون.
      const gid = `igGrad${i}`;
      a.innerHTML =
        `<svg viewBox="0 0 24 24" aria-hidden="true">` +
        `${ig ? IG_GRAD.replaceAll('igGrad', gid) : ''}` +
        `<path fill="${ig ? `url(#${gid})` : 'currentColor'}" d="${path}"/></svg>`;
      box.append(a);
    });
  });
}
paintLinks();

/* ---------- 8. الحركة ---------- */
initScrollState({ header: $('header'), sticky: $('sticky') });
initReveal();

/* ---------- 9. تبديل اللغة ---------- */
$('langBtn').addEventListener('click', toggleLang);

onLangChange(() => {
  // كل حاجة معمّرة من الداتا خاصها تتعاود. النصوص المعلّمة بـdata-i18n
  // كيتكلف بيها applyTo داخل initI18n → paint().
  renderSizeTable($('sizeRows'), SIZES);
  renderWorn();                      // النص البديل ديال الصور كيتبدل مع اللغة
  renderFooterCities($('footerCities'), CITIES);
  renderMarquee($('marquee1'), $('marquee2'));
  renderGrid($('grid'), { onOrder: (id, v) => modal.open(id, v) });
  custom.refresh();
  modal.refresh();
  paintHero(activeIndex);
  paintLinks();

  // السلايدات كنحدثو غير النصوص البديلة — ماكنعاودوش نبنيو الكاروسيل
  // باش الزاوية الحالية والدوران مايتصفروش تحت رجلين الزائر.
  [...ring.children].forEach((slide, i) => {
    slide.querySelector('img').alt = pick(PRODUCTS[i].name);
    dots.children[i]?.setAttribute('aria-label', pick(PRODUCTS[i].name));
  });

  initReveal();
});

/* التتبع آخر حاجة عن قصد: كيتسنى حدث `load`، والمعرّف الخاوي = ماكيتحمل
   حتى سكريبت. شوف lib/analytics.js وSHOP.analytics ف data/products.js */
initAnalytics();
inject();