"""
VALLIKS — استخراج رسمات المعرض من موكابات التيشيرت الكحل.

علاش هاد الأداة كاينة
---------------------
الرسمات ف raw/designs/ كانو مستخرجين من موكابات **ملونة** (أخضر، نايفي)،
وكل وحدة من colorway مختلف. النتيجة: لون القماش تخبز فيهم كلون معتم عوض ما
يولي شفاف، والغرافيتي جا بلون القماش ديال ذاك الـcolorway.

قياس على الملفات القديمة:
  total-strike   86% من الأخضر ديالها = #2f5b32 (هيكس التيشيرت الأخضر)
  high-roller    91% نفس الشي
  speed-demon    الغرافيتي أزرق — من موكاب النايفي

والموكابات ماشي متفقين بيناتهم: نفس الغرافيتي كيبان أبيض ف الكحل، أزرق ف
النايفي، أخضر ف الأخضر. إذن **الكحل هو المرجع**: هو variants[0] ديال كل
منتج وهو اللي كيبان ف الشبكة، وعليه الطبعة كتبان بألوانها الحقيقية.

الطريقة
-------
1. سيلويت التيشيرت من نسخة `-cut` (قناة alpha).
2. لون القماش = وسيط البيكسلات الغامقة داخل السيلويت.
3. الطباعة = كل ما بعد على لون القماش، محصور ف منطقة الجذع (BOX) باش
   خياطة الرقبة والأكمام ماتدخلش.
4. flood fill من حواف المنطقة: القماش متصل بالحافة، أما **الخطوط الكحلة
   اللي جوا الرسم فمحاصرة بالألوان** فماكتوصلش ليها التعبئة — وهادشي هو
   اللي كيحافظ على الكونتور ملي تتعرض الرسمة على تيشيرت بيض.
5. فتح/غلق مورفولوجي خفيف: كيقتل خيوط الخياطة الرقيقة بلا ما يمس الرسم.

⚠⚠ هاد الأداة حل مؤقت — الطريقة عندها حد ماكيتحلش
--------------------------------------------------
باش تفصل الطبعة على القماش، خاص لون القماش يكون مختلف على **كل** لون ف
الرسم. وهادشي ماكاينش ف حتى colorway:

  كحل   → الرسم فيه أسود = لون القماش
  نايفي → العباءة ديال high-roller زرقا = لون القماش
  أخضر  → الجاكيط ديال speed-demon أخضر = لون القماش
  بيض   → الغرافيتي أبيض = لون القماش

جربنا الأربعة. ماشي مسألة ضبط عتبة — **المعلومة ماكايناش أصلاً**.

النتيجة العملية ديال هاد السكريبت: على تيشيرت **كحل** المخرجات صحيحة
(الجيوب الكحلة المحاصرة مختافية ف القماش). على تيشيرت **بيض** كتبان بقع
كحلة — خصوصاً ف outlaw. جربنا نحيدو الجيوب بالتآكل المورفولوجي وكان
كيقب جوا الرسم نفسو (الظلال السودا ديال الرسم = نفس لون القماش).

**ماتشغلش هاد السكريبت إلا ملي ماتكونش عندك الأصليات.**

⚠ حدود إضافية
-------------
الموكابات 1080×1080 والطبعة كتاخد ~40% منها، إذن الاستخراج الحقيقي
~430px. الملفات القديمة كانو ~1000px — يعني **كانو مكبّرين اصطناعياً**،
ماكانش فيهم تفصيل زايد. كنكبرو هنا حتى احنا باش المعاينة تبقى بنفس
النعومة، ولكن هادشي **ماكيزيدش دقة**.

الحل الحقيقي: الملفات الأصلية ديال الرسام. الموقع نفسو كيحذر الزبون تحت
1500px (MIN_PRINT_PX ف components/custom.js) — وحتى وحدة هنا ماتوصل.

الاستعمال:  python scripts/extract-designs.py
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "public" / "products"
OUT = ROOT / "raw" / "designs"
ARCHIVE = OUT / "_old-contaminated"

STEMS = ["total-strike", "high-roller", "speed-demon", "outlaw"]

# منطقة الطبعة على الجذع، نسب من الإطار. مقيسة على الموكابات بعد توحيد
# التأطير ديال prep-images.py. الهدف: نخرجو الرقبة والأكمام من الحساب.
BOX = (0.250, 0.205, 0.762, 0.885)

INK_THRESHOLD = 52.0     # بعد أدنى على لون القماش باش البيكسل يتحسب طباعة
UPSCALE = 2.0            # للحفاظ على نعومة المعاينة — ماكيزيدش تفصيل


def shirt_and_fabric(stem):
    solid = np.asarray(
        Image.open(PRODUCTS / f"{stem}-black-solid-1080.webp").convert("RGB")
    ).astype(np.float32)
    cut = np.asarray(Image.open(PRODUCTS / f"{stem}-black-cut-1080.webp").convert("RGBA"))
    shirt = cut[..., 3] > 140
    px = solid[shirt]
    dark = px[px.max(axis=1) < 70]
    fabric = np.median(dark, axis=0) if len(dark) > 500 else np.array([19, 19, 21], np.float32)
    return solid, shirt, fabric


def print_alpha(solid, shirt, fabric):
    h, w = solid.shape[:2]
    region = np.zeros((h, w), bool)
    region[int(h * BOX[1]):int(h * BOX[3]), int(w * BOX[0]):int(w * BOX[2])] = True
    work = shirt & region

    dist = np.linalg.norm(solid - fabric, axis=2)
    candidate = work & ~(dist > INK_THRESHOLD)      # قماش (ولا خط كحل داخلي)

    # الاتصال كيتحسب ف دقة صغيرة — floodfill ديال PIL بطيء على 1080.
    sc = max(1, round(max(h, w) / 700))
    h2, w2 = h // sc, w // sc
    small = lambda m: np.asarray(
        Image.fromarray((m * 255).astype(np.uint8)).resize((w2, h2), Image.BOX)
    ) > 140

    flat = Image.fromarray((small(candidate) * 255).astype(np.uint8), "L").copy()
    ys, xs = np.where(small(work))
    if not len(ys):
        raise RuntimeError("منطقة الطبعة خاوية — واش BOX مضبوط؟")
    corners = [
        (int(xs.min()) + 1, int(ys.min()) + 1), (int(xs.max()) - 1, int(ys.min()) + 1),
        (int(xs.min()) + 1, int(ys.max()) - 1), (int(xs.max()) - 1, int(ys.max()) - 1),
        (int((xs.min() + xs.max()) // 2), int(ys.min()) + 1),
    ]
    for xy in corners:
        try:
            if flat.getpixel(xy) == 255:
                ImageDraw.floodfill(flat, xy, 128, thresh=0)
        except (ValueError, IndexError):
            pass

    conn = np.asarray(flat) == 128
    conn = np.asarray(
        Image.fromarray((conn * 255).astype(np.uint8), "L").resize((w, h), Image.BILINEAR)
    ) > 110

    mask = Image.fromarray(((work & ~conn) * 255).astype(np.uint8), "L")
    # فتح ثم غلق: الخيط الرقيق ديال الخياطة كيموت، والرسم كيبقى
    mask = (mask.filter(ImageFilter.MinFilter(3))
                .filter(ImageFilter.MaxFilter(5))
                .filter(ImageFilter.MinFilter(3)))
    return np.asarray(mask.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ARCHIVE.mkdir(parents=True, exist_ok=True)

    for stem in STEMS:
        old = OUT / f"{stem}.png"
        if old.exists():
            old.replace(ARCHIVE / f"{stem}.png")

        solid, shirt, fabric = shirt_and_fabric(stem)
        alpha = print_alpha(solid, shirt, fabric)
        img = Image.fromarray(np.dstack([solid, alpha]).astype(np.uint8), "RGBA")
        box = img.getbbox()
        if box:
            img = img.crop(box)
        native = img.size
        if UPSCALE != 1.0:
            img = img.resize(
                (round(img.width * UPSCALE), round(img.height * UPSCALE)), Image.LANCZOS
            )
        img.save(OUT / f"{stem}.png")
        print(f"  {stem:14s} أصلي {native[0]}×{native[1]} → محفوظ {img.width}×{img.height}")

    print(f"\nالقديمة محفوظة ف {ARCHIVE.relative_to(ROOT).as_posix()}/")
    print("دابا شغّل: npm run designs")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass
    main()
