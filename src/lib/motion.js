/* ==========================================================================
   حركات صغيرة مشتركة: الظهور عند التمرير + ميلان البطاقات.
   بجوج كيحترمو prefers-reduced-motion.
   ========================================================================== */

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** كيخلي العناصر [data-reveal] تطلع ملي توصل للشاشة. */
export function initReveal(root = document) {
  const items = root.querySelectorAll('[data-reveal]:not(.is-in)');
  if (!items.length) return;

  if (reduced() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);        // مرة وحدة وصافي
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  items.forEach((el) => io.observe(el));
}

/**
 * ميلان ثلاثي الأبعاد خفيف على البطاقة حسب موقع الفأرة.
 * ماكيتفعلش ف اللمس — على الهاتف كيبان مزعج وكيمنع التمرير.
 */
export function attachTilt(card, max = 5) {
  if (reduced() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let frame = null;

  function onMove(e) {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
    });
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = null;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerleave', reset);
}

/** كيبدل حالة الهيدر ملي الزائر يمرر، وكيبين الشريط السفلي. */
export function initScrollState({ header, sticky }) {
  let ticking = false;

  function update() {
    ticking = false;
    const y = window.scrollY;
    header.dataset.stuck = y > 12 ? 'true' : 'false';
    if (sticky) {
      // كيبان بعد ما يفوت الزائر أول شاشة — ماشي فوراً باش مايقطعش الـhero
      sticky.dataset.show = y > window.innerHeight * 0.75 ? 'true' : 'false';
    }
  }

  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();
}
