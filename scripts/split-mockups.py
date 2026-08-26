"""
VALLIKS — تقطيع موكابات التيشيرت الخاوي لقدّام/لور.

موكابات المورد كتجي **جوج تيشيرتات ف صورة وحدة** (قدّام على اليسار، لور على
اليمين) بخلفية شفافة. `prep-images.py` كيتسنى تيشيرت واحد ف كل ملف، إذن هاد
السكريبت هو الخطوة اللي قبل.

الاستعمال:
    1. حط الملفات ف raw/incoming/  (السمية خاصها تحتوي على اللون)
    2. npm run mockups
    3. npm run images

كيخرج:  raw/products/blank-<key>.png         ← اللور (هو اللي كيتستعمل)
        raw/products/blank-<key>-front.png   ← القدّام (محفوظ للمعرض)

كيفاش كنعرفو القدّام من اللور
-----------------------------
**بعلامة الرقبة البيضا**، ماشي بترتيب الصور. قياس على موكاب الرمادي:
القدّام فيه 7786 بيكسل فاتح قرب الياقة، اللور 673 — نسبة 11×.

جربت شكل الياقة أولاً وفشل: العمق ديالها ‑0.0500 ف القدّام و‑0.0511 ف
اللور. الفرق ضايع ف الضجيج.

⚠ على قماش **أبيض** العلامة البيضا ماكتبانش. ف هاد الحالة السكريبت
كيطيح بخطأ واضح وكيطلب منك تسمي الملفات بيدك، عوض ما يخمن ويقلب القدّام
مع اللور ف صمت.
"""

import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
INCOMING = ROOT / "raw" / "incoming"
OUT = ROOT / "raw" / "products"

# سميات الملفات (عربية/فرنسية/إنجليزية) → مفتاح اللون ف products.js.
# ⚠ bleu → ink و green → sage عن قصد: NAVY و GREEN ف products.js مربوطين
# بموكابات **مطبوعة** بألوان مختلفة (#003366 و #2f5b32). إعادة استعمالهم
# غادي تخلي النقطة الملونة ف الشيب تكذب على القماش الحقيقي.
NAME_TO_KEY = {
    "black": "black", "noir": "black", "kahl": "black",
    "white": "white", "blanc": "white", "byad": "white",
    "grey": "grey", "gray": "grey", "gris": "grey",
    "bleu": "ink", "blue": "ink", "navy": "ink", "indigo": "ink",
    "green": "sage", "vert": "sage", "sage": "sage",
    "pink": "pink", "rose": "pink",
    "mint": "mint", "menthe": "mint",
}

MIN_GAP = 20          # أقل عرض لفجوة شفافة كتفصل التيشيرتين
LABEL_RATIO = 3.0     # نسبة البيكسلات الفاتحة اللي بيها نقرر — تحتها كنطيحو
MARGIN = 1.30         # الهامش حول التيشيرت ف الإطار المربع
TARGET_CY = 0.55      # نفس القيمة ف prep-images.py — مركز التيشيرت العمودي
MAX_SIDE = 2200       # كفاية: أكبر مخرج ديال prep-images هو 1080


def key_from_name(stem):
    words = re.split(r"[\s_\-]+", stem.lower())
    for w in reversed(words):                 # اللون عادة آخر كلمة
        if w in NAME_TO_KEY:
            return NAME_TO_KEY[w]
    raise SystemExit(
        f"ماعرفتش اللون ف السمية '{stem}'.\n"
        f"الألوان المعروفة: {', '.join(sorted(set(NAME_TO_KEY)))}\n"
        f"عاود سمّي الملف باش يكون فيه وحدة منهم."
    )


def split_columns(alpha):
    """كيرجع مجالات x ديال الكتل، مفصولة بفجوات شفافة."""
    cols = alpha.any(axis=0)
    xs = np.where(cols)[0]
    if not len(xs):
        raise SystemExit("الصورة خاوية — ماكاين حتى بيكسل معتم.")

    gaps, run = [], None
    for x in range(xs[0], xs[-1] + 1):
        if not cols[x]:
            if run is None:
                run = x
        elif run is not None:
            if x - run >= MIN_GAP:
                gaps.append((run, x - 1))
            run = None

    if not gaps:
        raise SystemExit(
            "ماكاينش فجوة بين تيشيرتين — واش هاد الملف فيه تيشيرت واحد؟\n"
            "إلا كان واحد، حطو مباشرة ف raw/products/ بسمية blank-<لون>.png"
        )

    gap = max(gaps, key=lambda g: g[1] - g[0])
    return (xs[0], gap[0] - 1), (gap[1] + 1, xs[-1])


def label_score(rgb, alpha, x0, x1):
    """
    شحال من بيكسل فاتح كاين قرب الياقة. القدّام فيه علامة رقبة بيضا،
    اللور لا.
    """
    sub_a = alpha[:, x0:x1 + 1]
    sub_c = rgb[:, x0:x1 + 1].astype(np.float32)
    rows = np.where(sub_a.any(axis=1))[0]
    h, w = rows[-1] - rows[0] + 1, x1 - x0 + 1
    cx = w // 2

    band = sub_a[:, max(0, cx - int(w * 0.06)):cx + int(w * 0.06)]
    top = np.where(band.any(axis=1))[0][0]

    zone = np.zeros_like(sub_a)
    zone[top:top + int(h * 0.10), cx - int(w * 0.10):cx + int(w * 0.10)] = True
    sel = zone & sub_a

    fabric = np.median(sub_c[sub_a], axis=0)
    return int(((np.linalg.norm(sub_c - fabric, axis=2) > 60) & sel).sum())


def square(rgba, x0, x1):
    """كيقص التيشيرت وكيحطو ف إطار مربع شفاف، مركّز بحال باقي الموكابات."""
    sub = rgba[:, x0:x1 + 1]
    a = sub[..., 3] > 128
    rows, cols = np.where(a.any(axis=1))[0], np.where(a.any(axis=0))[0]
    sub = sub[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]

    h, w = sub.shape[:2]
    side = min(MAX_SIDE, round(max(h, w) * MARGIN))
    scale = min(1.0, side / (max(h, w) * MARGIN))
    if scale < 1.0:
        im = Image.fromarray(sub, "RGBA").resize(
            (max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS
        )
        sub = np.asarray(im)
        h, w = sub.shape[:2]

    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(Image.fromarray(sub, "RGBA"),
                 ((side - w) // 2, round(side * TARGET_CY - h / 2)))
    return canvas


def main():
    if not INCOMING.exists():
        raise SystemExit(f"ماكاينش {INCOMING.relative_to(ROOT).as_posix()}/ — صاوبو وحط الملفات فيه.")
    files = sorted([*INCOMING.glob("*.png"), *INCOMING.glob("*.webp")])
    if not files:
        raise SystemExit(f"{INCOMING.relative_to(ROOT).as_posix()}/ خاوي.")

    OUT.mkdir(parents=True, exist_ok=True)
    for src in files:
        key = key_from_name(src.stem)
        rgba = np.asarray(Image.open(src).convert("RGBA"))
        alpha = rgba[..., 3] > 128
        left, right = split_columns(alpha)

        sl = label_score(rgba[..., :3], alpha, *left)
        sr = label_score(rgba[..., :3], alpha, *right)
        hi, lo = max(sl, sr), max(min(sl, sr), 1)
        if hi / lo < LABEL_RATIO:
            raise SystemExit(
                f"'{src.name}': ماقدرتش نفرق القدّام على اللور "
                f"(يسار={sl} يمين={sr}, نسبة {hi/lo:.1f}× < {LABEL_RATIO}).\n"
                f"غالباً القماش أبيض فعلامة الرقبة ماكتبانش. قص الصورة بيدك "
                f"وسجّل blank-{key}.png (اللور) و blank-{key}-front.png."
            )

        front, back = (left, right) if sl > sr else (right, left)
        square(rgba, *back).save(OUT / f"blank-{key}.png")
        square(rgba, *front).save(OUT / f"blank-{key}-front.png")
        side = square(rgba, *back).width
        print(f"  {src.name:38s} → blank-{key}  {side}×{side}  "
              f"(قدّام {'يسار' if sl > sr else 'يمين'}, نسبة {hi/lo:.0f}×)")

    print("\nدابا شغّل: npm run images")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass
    main()
