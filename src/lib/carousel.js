/* ==========================================================================
   الكاروسيل ثلاثي الأبعاد.

   الرياضيات: كل عنصر i محطوط بـ rotateY(i × step) ثم translateZ(radius).
   هادشي كيوزعهم على دائرة حقيقية حوالين نقطة الأصل. باش العنصر i يجي قدام
   الزائر، كندورو الحلقة كاملة بـ rotateY(−i × step).

   المسافة الدائرية (dist) كتحدد شحال العنصر بعيد على الواجهة — كنستعملوها ف
   CSS باش نضببو ونموهو البعاد. هادي هي اللي كتخلق الإحساس بالعمق.
   ========================================================================== */

const SENSITIVITY = 0.34;   // درجة لكل بيكسل ديال السحب
const IDLE_SPIN_MS = 5200;  // دوران تلقائي ملي الزائر ماكيديرش والو
const TILT_MAX = 5;         // ميلان عمودي بالفأرة (درجات)

export function createCarousel({ stage, ring, dots, count, onChange }) {
  const step = 360 / count;
  const slides = [...ring.children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  let angle = 0;          // زاوية الحلقة الحالية (درجات، مستمرة)
  let dragging = false;
  let startX = 0;
  let startAngle = 0;
  let moved = 0;
  let idleTimer = null;

  /* ---------- الرسم ---------- */

  function render() {
    ring.style.setProperty('--angle', `${angle}deg`);

    slides.forEach((slide, i) => {
      // المسافة الدائرية بين العنصر والواجهة: 0,1,2,2,1 ف حالة 5 عناصر
      const raw = Math.abs(((i - index) % count + count) % count);
      const dist = Math.min(raw, count - raw);
      slide.style.setProperty('--dist', dist);
      slide.dataset.active = dist === 0 ? 'true' : 'false';
      slide.setAttribute('aria-hidden', dist === 0 ? 'false' : 'true');
      // العناصر اللي ف اللور ماخاصهاش تلقف الكليك
      slide.style.pointerEvents = dist === 0 ? 'auto' : 'none';
    });

    if (dots) {
      [...dots.children].forEach((d, i) =>
        d.setAttribute('aria-current', i === index ? 'true' : 'false')
      );
    }
  }

  /* ---------- التنقل ---------- */

  function goTo(next, { silent = false } = {}) {
    index = ((next % count) + count) % count;
    angle = -index * step;
    render();
    if (!silent) onChange?.(index);
  }

  /** كيدور للعنصر i من أقرب طريق بدل ما يلف الدورة كاملة */
  function goToShortest(next) {
    const target = ((next % count) + count) % count;
    let delta = target - index;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    index = target;
    angle -= delta * step;
    render();
    onChange?.(index);
  }

  const next = () => goToShortest(index + 1);
  const prev = () => goToShortest(index - 1);

  /* ---------- السحب ---------- */

  function onDown(e) {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startAngle = angle;
    ring.dataset.dragging = 'true';
    stage.dataset.dragging = 'true';
    stage.setPointerCapture?.(e.pointerId);
    pauseIdle();
  }

  function onMove(e) {
    if (!dragging) {
      tilt(e);
      return;
    }
    const dx = e.clientX - startX;
    moved = Math.abs(dx);
    angle = startAngle + dx * SENSITIVITY;
    ring.style.setProperty('--angle', `${angle}deg`);
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    ring.dataset.dragging = 'false';
    stage.dataset.dragging = 'false';
    stage.releasePointerCapture?.(e.pointerId);

    // نلزقو لأقرب عنصر
    const nearest = Math.round(-angle / step);
    index = ((nearest % count) + count) % count;
    angle = -nearest * step;      // كنخليو الزاوية المتراكمة باش الدوران يكمل طبيعي
    render();
    onChange?.(index);
    resumeIdle();
  }

  /* ---------- الميلان بالفأرة (عمق زايد) ---------- */

  function tilt(e) {
    if (reduced) return;
    const r = stage.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height - 0.5;
    ring.style.setProperty('--tilt-x', `${(-y * TILT_MAX).toFixed(2)}deg`);
  }

  function resetTilt() {
    ring.style.setProperty('--tilt-x', '0deg');
  }

  /* ---------- الدوران التلقائي ---------- */

  function pauseIdle() {
    clearInterval(idleTimer);
    idleTimer = null;
  }

  function resumeIdle() {
    if (reduced || idleTimer) return;
    idleTimer = setInterval(() => {
      if (document.hidden || dragging) return;
      next();
    }, IDLE_SPIN_MS);
  }

  /* ---------- الربط ---------- */

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', () => {
    resetTilt();
    if (dragging) onUp({ pointerId: undefined });
  });

  stage.addEventListener('mouseenter', pauseIdle);
  stage.addEventListener('mouseleave', resumeIdle);

  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); pauseIdle(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); pauseIdle(); }
  });

  // الكليك على تيشيرت غير نشط كيجيبو للواجهة. كنتأكدو أن ماشي نهاية سحب.
  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (moved > 6) return;
      if (i !== index) { goToShortest(i); pauseIdle(); }
    });
  });

  document.addEventListener('visibilitychange', () => {
    document.hidden ? pauseIdle() : resumeIdle();
  });

  goTo(0, { silent: true });
  resumeIdle();

  return {
    get index() { return index; },
    goTo: goToShortest,
    next,
    prev,
    /** كيرجع true إلا كان الزائر سحب فعلاً — باش نخبيو التلميح */
    get interacted() { return moved > 6; },
    destroy() { pauseIdle(); },
  };
}
