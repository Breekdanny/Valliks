/* ==========================================================================
   تركيب الطبعة على الموكاب.

   المشكل اللي كيحل هاد الملف: ملي كتلصق الصورة مسطحة فوق التيشيرت، كتبان
   **لصقة** ماشي طبعة. القماش تحتها فيه طيات وظل، والطبعة الحقيقية كتمشي معاهم.

   الطريقة: لكل بيكسل ف الطبعة كناخدو الإضاءة ديال القماش اللي تحتو، منسوبة
   للمتوسط ديال المنطقة، وكنضربو بيها لون الطبعة. النتيجة: الطيات كتمر من
   الطبعة والظل كيبقى ظل.

   علاش بالبيكسل وماشي blend mode ديال canvas: `overlay` و`soft-light` مضبوطين
   على وسيط 50% رمادي. القماش الكحل إضاءتو ~19 من 255، فأي map مبني عليه
   كيخرج بعيد على الوسيط وكيفجر الألوان. الضرب بالنسبة (ratio) كيخدم مع أي
   لون قماش بلا معايرة.
   ========================================================================== */

/** قوة أثر القماش. 1 = الظل كامل بحال ما هو، 0 = بلا أثر. */
const SHADE = 0.85;
const SHADE_MIN = 0.45;
const SHADE_MAX = 1.7;

const lumOf = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

/**
 * كيقرا الموكاب مرة وحدة وكيحتافظ بالبيكسلات.
 *
 * `solid` = الموكاب بخلفيتو (هو اللي كيتعرض)، `cut` = نفس الصورة بخلفية شفافة
 * وكناخدو منها غير قناة alpha: هي اللي كتحدد فين كاين التيشيرت، وبيها كنقصو
 * الطبعة باش ماتخرجش على الكتف ولا على الخلفية.
 */
export async function loadShirt(solidImg, cutImg, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const cx = c.getContext('2d', { willReadFrequently: true });

  cx.drawImage(solidImg, 0, 0, size, size);
  const rgba = cx.getImageData(0, 0, size, size).data;

  cx.clearRect(0, 0, size, size);
  cx.drawImage(cutImg, 0, 0, size, size);
  const cutData = cx.getImageData(0, 0, size, size).data;

  const alpha = new Uint8Array(size * size);
  let minX = size, maxX = 0, minY = size, maxY = 0;

  for (let i = 0, p = 0; p < alpha.length; i += 4, p++) {
    const a = cutData[i + 3];
    alpha[p] = a;
    if (a > 128) {
      const x = p % size;
      const y = (p / size) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return { rgba, alpha, size, bbox: { minX, maxX, minY, maxY } };
}

/**
 * كيرجع بيكسلات الرسمة بقياس محدد. مكلف (رسم + قراءة)، إذن كيتنادى غير ملي
 * يتبدل الديزاين ولا الحجم — ماشي ف كل حركة ديال السحب.
 */
export function scaleArt(img, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, 0, 0, c.width, c.height);
  return { data: cx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
}

let buf = null;

function reuse(ctx, w, h) {
  if (!buf || buf.width !== w || buf.height !== h) buf = ctx.createImageData(w, h);
  return buf;
}

/**
 * كيرسم الموكاب + الطبعة ف بلاصتها.
 *
 * `x`/`y` = الركن الأيسر الأعلى ديال الطبعة بالبيكسل ف الـcanvas. كنسمحو ليهم
 * يخرجو على الإطار — كنقصو الجزء البارز عوض ما نمنعو الحركة.
 */
export function render(ctx, shirt, base, art, x, y) {
  const { size, rgba, alpha } = shirt;

  ctx.drawImage(base, 0, 0, size, size);
  if (!art) return;

  // التقاطع بين مستطيل الطبعة والإطار
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(size, x + art.w);
  const y1 = Math.min(size, y + art.h);
  if (x1 <= x0 || y1 <= y0) return;

  const w = x1 - x0;
  const h = y1 - y0;

  // السحب كينادي هاد الدالة ~60 مرة ف الثانية، والمنطقة ممكن توصل لميغا كامل.
  // تخصيص ImageData جديدة ف كل إطار كيخلق ضغط على جامع القمامة وكيقطع الحركة،
  // فكنعاودو نستعملو نفس البافر ملي يكون نفس القياس.
  const out = reuse(ctx, w, h);
  const o = out.data;
  const a = art.data;

  // متوسط إضاءة القماش تحت الطبعة — هو المرجع اللي كتتنسب ليه الطيات.
  // كنحسبوه على البيكسلات المعتمة ديال الطبعة فقط: الهوامش الشفافة ماعندهاش
  // علاقة، ودخولها كيحرك المتوسط وكيخلي الطبعة كلها فاتحة ولا غامقة.
  let sum = 0;
  let n = 0;
  for (let yy = y0; yy < y1; yy++) {
    const ar = (yy - y) * art.w;
    const sr = yy * size;
    for (let xx = x0; xx < x1; xx++) {
      if (a[((ar + (xx - x)) << 2) + 3] > 128) {
        const s = (sr + xx) << 2;
        sum += lumOf(rgba[s], rgba[s + 1], rgba[s + 2]);
        n++;
      }
    }
  }
  if (!n) return;
  const ref = Math.max(sum / n, 1);

  for (let yy = y0; yy < y1; yy++) {
    const ar = (yy - y) * art.w;
    const sr = yy * size;
    const or_ = (yy - y0) * w;

    for (let xx = x0; xx < x1; xx++) {
      const ai = (ar + (xx - x)) << 2;
      const si = (sr + xx) << 2;
      const oi = (or_ + (xx - x0)) << 2;

      const sr_ = rgba[si];
      const sg = rgba[si + 1];
      const sb = rgba[si + 2];

      // ألفا الطبعة × ألفا التيشيرت = الطبعة كتقص على حدود القماش
      const cov = (a[ai + 3] / 255) * (alpha[sr + xx] / 255);
      if (cov <= 0) {
        o[oi] = sr_; o[oi + 1] = sg; o[oi + 2] = sb; o[oi + 3] = 255;
        continue;
      }

      let k = 1 + SHADE * (lumOf(sr_, sg, sb) / ref - 1);
      if (k < SHADE_MIN) k = SHADE_MIN;
      else if (k > SHADE_MAX) k = SHADE_MAX;

      o[oi] = a[ai] * k * cov + sr_ * (1 - cov);
      o[oi + 1] = a[ai + 1] * k * cov + sg * (1 - cov);
      o[oi + 2] = a[ai + 2] * k * cov + sb * (1 - cov);
      o[oi + 3] = 255;
    }
  }

  ctx.putImageData(out, x0, y0);
}
