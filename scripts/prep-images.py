"""
VALLIKS — معالجة صور المنتوجات واللوغو.

المشكل: كل صور المنتوجات عندها خلفية رمادية مسطحة (~#868686). الموقع كحل.
لو خليناها بحالها غادي تبان كل صورة مربع رمادي فوسط صفحة سودا.

الحل — كنولدو نسختين لكل صورة:
  1. *-solid.webp  الخلفية الرمادية كتولي #111116 (سطح الموقع) مع الحفاظ على الظل
                   الطبيعي تحت التيشيرت (كنضربو الظل ف نفس النسبة عوض ما نمسحوه).
                   كتستعمل ف بطاقات الشبكة — سريعة ومضمونة.
  2. *-cut.webp    خلفية شفافة تماماً. كتستعمل ف الـhero باش التيشيرت يطوف ف الفضاء
                   ويدور بالـ3D transform ويكون عندو ظل CSS حقيقي.

الطريقة: كنبنيو ماسك للخلفية (رمادي محايد + لومينانس ف نطاق الخلفية)، ومن بعد
كنحتافظو غير بالجزء المتصل بحافة الصورة (flood fill) باش ماناخدوش شي جزء من داخل
التيشيرت بالغلط.

الاستعمال:  python scripts/prep-images.py
"""

import base64
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent

# ⚠ المصادر **خارج** public/ عن قصد. Vite كينسخ كلشي اللي ف public/ لـdist/،
# يعني أي حاجة تحطها تما كتولي محملة من أي واحد. الرسمات بوحدها بخلفية شفافة
# = المنتج ديالك. خليهم هنا ف raw/ — السكريبت كيقراهم، والموقع ماكينشرهمش.
RAW = ROOT / "raw" / "products"
DESIGNS_RAW = ROOT / "raw" / "designs"
BRAND_RAW = ROOT / "raw" / "brand"

# المخرجات — هادو وحدهم اللي كينشرو
OUT = ROOT / "public" / "products"
DESIGNS_OUT = ROOT / "public" / "designs"
BRAND = ROOT / "public" / "brand"

DATA = ROOT / "src" / "data"

# --------------------------------------------------------------------------
# بقعة الضوء ورا التيشيرت.
#
# قبل: خلفية مسطحة #111116. المشكل أن القماش الكحل هو #131315 — نفس اللون.
# التباين المقيس كان 1.02:1، يعني التيشيرت الكحل كان مختافي تماماً.
#
# رياضيات التباين ف الظلام قاسية: باش قماش بلومينانس 20 يبان، الخلفية وراه
# خاصها توصل لومينانس ~87 على الأقل. حل واحد كيعطي هادشي بلا ما يخسر الطابع
# الداكن: بقعة ضوء — مضوية ورا التيشيرت وكتغمق تدريجياً حتى توصل لون البطاقة
# ف الحواف. هادشي هو بالضبط اللي كيدير التصوير الاحترافي.
# --------------------------------------------------------------------------

# الهضبة المضوية — خاصو يطابق --studio ف tokens.css.
# لومينانس ~100: كيعطي التيشيرت الكحل (18) تباين ~3.1:1 بلا ما نمسو لونو.
STUDIO_CENTER = np.array([100, 100, 110], dtype=np.float32)  # #64646E
# الحواف — رمادي داكن متوسط، ماشي أسود.
# كان #111116 (نفس --surface) بفكرة أن الصورة تلتحم مع البطاقة. ولكن الصورة
# كتغطي البطاقة كاملة بـobject-fit: cover — ماكاينش شي حاجة تلتحم معاها.
# النتيجة كانت هبوط 81 درجة ف 12% من العرض = **إطار داكن** واضح حول كل صورة.
# قيمة متوسطة كتعطي فينيت استوديو ناعم بلا إطار، وكتخلي هامش أفتح ورا
# التيشيرت الكحل (تباين ~2.5:1 عوض 1.0:1).
STUDIO_EDGE = np.array([42, 42, 50], dtype=np.float32)      # #2A2A32

# الذهبي ديال العلامة — خاصو يطابق --gold ف tokens.css
GOLD = (212, 166, 42)

# لون كلمة VALLIKS ف اللوغو. ف الملف الأصلي بيضا — الطلب أنها تكون ذهبية.
# دابا نفس أصفر الشعار (#ffc727) باش اللوغو يبقى بلونين ماشي تلاتة.
# إلا بغيتيها بذهب الموقع الهادئ، بدلها لـGOLD.
WORD_COLOR = (255, 199, 39)

WIDTHS = [1080, 720, 480]
# الرسمة كتبان أصغر من التيشيرت (بطاقة ف المعرض + طبعة ف المعاينة)، فماكاينش
# داعي لـ1080. أكبر استعمال هو المعاينة على canvas ~900px.
DESIGN_WIDTHS = [900, 600, 300]
QUALITY = 82


def luminance(arr):
    return arr[..., 0] * 0.299 + arr[..., 1] * 0.587 + arr[..., 2] * 0.114


# تأطير موحّد. المرجع مقيس من الموكابات الفوتوغرافية: التيشيرت كياخد 74% من
# العرض و67.5% من الطول، ومركزو العمودي ف 55%.
#
# علاش المتوسط الهندسي وماشي العرض بوحدو:
# الموكابات الفيكتور مرسومين أعرض — نسبة عرض/طول ديالهم 1.36 مقابل 1.10 ف
# الفوتوغرافية. يعني ماكاينش شي تكبير كيوحّد الجوج المحاور بلا ما يشوه الرسم.
# التوحيد بالعرض وحدو كيهبط الطول ديالهم لـ55% مقابل 67% — فيبانو صغار ف
# الشبكة، وهادشي بالضبط اللي كنا باغين نصلحو. المتوسط الهندسي كيقسم الفرق:
# عرض 82% (هامش 9% كافي) وطول 60% — والحجم المحسوس كيولي موحّد.
TARGET_W = 0.740
TARGET_H = 0.675
TARGET_GEO = (TARGET_W * TARGET_H) ** 0.5
TARGET_CY = 0.55


def shirt_bbox(arr, alpha=None):
    """حدود التيشيرت: كل اللي ماشي بلون الخلفية المحايد."""
    if alpha is not None:
        shirt = alpha > 0.15
    else:
        h, w = arr.shape[:2]
        lum = luminance(arr)
        chroma = arr.max(axis=2) - arr.min(axis=2)
        corner = float(np.median(lum[: max(2, h // 24), : max(2, w // 24)]))
        shirt = (chroma > 14) | (np.abs(lum - corner) > 14)
    cols = np.where(shirt.any(axis=0))[0]
    rows = np.where(shirt.any(axis=1))[0]
    return (cols, rows) if len(cols) > 1 and len(rows) > 1 else (None, None)


def resample_rgba(arr, alpha, size, box, canvas_size):
    """
    تصغير صورة عندها شفافية، بالضرب المسبق (premultiply).

    بلا الضرب المسبق: RGB اللي تحت المنطقة الشفافة أبيض، وLANCZOS كيخلط
    القنوات كل وحدة بوحدها — فالأبيض كيسرب لبيكسلات الحافة وكيعطي هالة فاتحة
    حوالين التيشيرت ملي كيتلصق فوق خلفية داكنة. الضرب المسبق كيخلي الخلط
    كيوقع ف الفضاء الصحيح: المنطقة الشفافة كتساهم بصفر ماشي بأبيض.
    """
    w, h = canvas_size
    pm = arr * alpha[..., None]

    def scaled(a, mode):
        return Image.fromarray(a.astype(np.uint8), mode).resize(size, Image.LANCZOS)

    rgb_s = scaled(pm, "RGB")
    a_s = scaled(alpha * 255.0, "L")

    pm_canvas = Image.new("RGB", (w, h), (0, 0, 0))
    a_canvas = Image.new("L", (w, h), 0)
    pm_canvas.paste(rgb_s, box)
    a_canvas.paste(a_s, box)

    out_a = np.asarray(a_canvas).astype(np.float32) / 255.0
    out_pm = np.asarray(pm_canvas).astype(np.float32)

    # رجوع لـRGB عادي (un-premultiply). ف البيكسلات شبه الشفافة القسمة كتضخم
    # الضجيج، فكنحطو أبيض تماماً — هي أصلاً خلفية وto_solid كيعوضها.
    safe = np.maximum(out_a, 1.0 / 255.0)[..., None]
    out_rgb = np.where(out_a[..., None] > 0.004, out_pm / safe, 255.0)
    return np.clip(out_rgb, 0, 255), out_a


def normalize_framing(arr, alpha=None):
    """
    كنوحدو الحجم المحسوس ديال التيشيرت داخل الإطار عبر كل الموكابات.

    بلا هادشي الشبكة كتبان غير متناسقة: شي تيشيرتات مخنوقين ف الحواف (هامش
    5%) وشي آخرين فيهم هامش واسع.

    كنقيسو المساحة عبر المتوسط الهندسي √(عرض×طول) وكنطابقوها مع المرجع
    الفوتوغرافي، ماشي العرض بوحدو — التفاصيل ف التعليق فوق TARGET_GEO.

    كنصغّرو الصورة كاملة وكنلصقوها على لوحة بلون الخلفية الأصلي — إذن
    background_mask كيبقى يخدم عادي (الأركان باقي لون الخلفية).
    """
    cols, rows = shirt_bbox(arr, alpha)
    if cols is None:
        return arr, alpha

    h, w = arr.shape[:2]
    frac_w = (cols[-1] - cols[0]) / w
    frac_h = (rows[-1] - rows[0]) / h
    scale = TARGET_GEO / ((frac_w * frac_h) ** 0.5)
    if abs(scale - 1.0) < 0.03:          # قريب بزاف — ماكاينش داعي
        return arr, alpha

    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    box = (round(w * 0.50 - (cols[0] + cols[-1]) / 2 * scale),
           round(h * TARGET_CY - (rows[0] + rows[-1]) / 2 * scale))

    if alpha is not None:
        return resample_rgba(arr, alpha, size, box, (w, h))

    edge = max(2, h // 24)
    bg = np.median(
        np.concatenate([arr[:edge].reshape(-1, 3), arr[-edge:].reshape(-1, 3)]),
        axis=0,
    )
    resized = Image.fromarray(arr.astype(np.uint8)).resize(size, Image.LANCZOS)
    canvas = Image.new("RGB", (w, h), tuple(int(c) for c in bg))
    canvas.paste(resized, box)
    return np.asarray(canvas).astype(np.float32), None


def border_connected(candidate):
    """
    كنحتافظو غير بالخلفية المتصلة بحافة الصورة. هادي هي اللي كتحمي الأبيض
    ديال الطباعة **داخل** التيشيرت من أنه يتحسب خلفية.

    جوج حوايج خاص الانتباه ليهم هنا:

    1. `.copy()` بعد `Image.fromarray` — ImageDraw.floodfill ماكيديرش والو
       على صورة جاية من fromarray (بافر للقراءة فقط) وكيفشل **بصمت**. هاد
       الباگ خلا الحماية معطلة كلياً وكل أبيض ف الطباعة ولّى رمادي.

    2. الاتصال كيتحسب ف دقة صغيرة (~640px). floodfill ديال PIL كياخد دقائق
       على صورة 2251px. الاتصال ماكيحتاجش دقة كاملة: كنحددو المناطق ف
       الصغير ومن بعد كنقاطعو مع الماسك الكامل باش الحواف تبقى حادة.

    كنصغّرو **الحاجز** (التيشيرت) ماشي الخلفية، بعتبة واطية بزاف: هادشي
    كيغلّظ الحواجز الرقيقة عوض ما يمحيها، فالخلفية ماتقدرش تسرب من برا
    للطباعة البيضا عبر حافة مسننة.
    """
    h, w = candidate.shape
    scale = max(1, round(max(h, w) / 640))
    sh, sw = max(2, h // scale), max(2, w // scale)

    shirt = Image.fromarray(((~candidate) * 255).astype(np.uint8), mode="L")
    small = np.asarray(shirt.resize((sw, sh), Image.BOX)).astype(np.float32) / 255.0
    cand_small = small <= 0.02

    flat = Image.fromarray((cand_small * 255).astype(np.uint8), mode="L").copy()
    for xy in [(0, 0), (sw - 1, 0), (0, sh - 1), (sw - 1, sh - 1)]:
        if flat.getpixel(xy) == 255:
            ImageDraw.floodfill(flat, xy, 128, thresh=0)

    conn = np.asarray(flat) == 128
    if not conn.any():
        # كان هنا احتياط صامت (connected = candidate) وهو اللي خبّا باگ
        # الـ.copy() سنين: كيعطي نتيجة "معقولة" ف الصور اللي ماعندهاش أبيض
        # داخل التيشيرت. الفشل الصريح أحسن من نتيجة غالطة صامتة.
        raise RuntimeError("flood fill ماوصل لحتى بيكسل — الأركان ماشي خلفية؟")

    up = Image.fromarray((conn * 255).astype(np.uint8), mode="L")
    up = np.asarray(up.resize((w, h), Image.BILINEAR)) > 100
    return candidate & up


def load_alpha(img):
    """
    قناة الشفافية — غير إلا كانت خلفية الصورة شفافة بصح.

    الموكابات الفيكتور كتجي PNG بخلفية شفافة (وRGB أبيض تحتها)، والفوتوغرافية
    كتجي JPG بلا قناة. كنشوفو الأركان: إلا كانو شفافين، القناة عندها معنى
    وهي المصدر الصحيح للماسك. إلا كانت القناة موجودة ولكن معمرة، كنتجاهلوها.
    """
    if img.mode not in ("RGBA", "LA", "PA"):
        return None
    a = np.asarray(img.convert("RGBA"))[..., 3].astype(np.float32)
    h, w = a.shape
    p = max(8, min(h, w) // 24)
    corners = (a[:p, :p], a[:p, -p:], a[-p:, :p], a[-p:, -p:])
    if max(float(c.mean()) for c in corners) > 8.0:
        return None
    return a / 255.0


def background_mask(arr, alpha=None):
    """ماسك ناعم [0..1] — 1 = خلفية، 0 = تيشيرت."""
    if alpha is not None:
        # عندنا الماسك الحقيقي ف قناة alpha — ماكاينش علاش نخمنوه.
        # التخمين باللومينانس كان كيخسر بيكسلات الحافة (alpha جزئي بلون
        # التيشيرت، ماشي أبيض) وكيخليهم فاتحين فوق الخلفية الداكنة = الخط
        # اللي كيبان ف جنب التيشيرت.
        # كنرجعو lum=255 باش ratio ف to_solid يولي 1 ف كل مكان: الخلفية
        # كتاخد بقعة الضوء كاملة، والظل كيجي من synthetic_shadow وحدو.
        return 1.0 - alpha, np.full(arr.shape[:2], 255.0, dtype=np.float32), 255.0

    h, w = arr.shape[:2]
    patch = max(8, min(h, w) // 24)

    corners = np.concatenate([
        arr[:patch, :patch].reshape(-1, 3),
        arr[:patch, -patch:].reshape(-1, 3),
        arr[-patch:, :patch].reshape(-1, 3),
        arr[-patch:, -patch:].reshape(-1, 3),
    ])
    bg = np.median(corners, axis=0)
    bg_lum = float(luminance(bg[None, None, :])[0, 0])

    lum = luminance(arr)
    chroma = arr.max(axis=2) - arr.min(axis=2)

    if bg_lum > 200:
        # موكابات فيكتور على خلفية بيضا (#FFFFFF).
        # هنا خاصنا نطاق ضيق بزاف: التيشيرت النعناعي (lum 218) والوردي (216)
        # قريبين بزاف من الأبيض. بالمعادلة ديال الخلفية الرمادية كانو غادي
        # يتحسبو خلفية، والـflood fill كان غادي **ياكل التيشيرت** كامل.
        # الخلفية البيضا دايماً أفتح من أي تيشيرت، إذن عتبة وحدة من فوق كافية.
        candidate = (chroma < 14) & (lum > bg_lum - 14)
    else:
        # موكابات فوتوغرافية على خلفية رمادية (~#868686).
        # الحد السفلي كيسمح بالظل تحت التيشيرت، والعلوي كيمنع التيشيرت الأبيض.
        candidate = (chroma < 20) & (lum > bg_lum * 0.32) & (lum < bg_lum * 1.14)

    # نحتافظو غير بالمنطقة المتصلة بالحافة — هادي هي اللي كتحمينا من أن شي جزء
    # كحل من داخل التيشيرت يتحسب خلفية.
    connected = border_connected(candidate)

    # تنعيم الحواف باش مايبقاش درج مسنن
    soft = Image.fromarray((connected * 255).astype(np.uint8), mode="L")
    soft = soft.filter(ImageFilter.GaussianBlur(1.1))
    mask = np.asarray(soft).astype(np.float32) / 255.0

    return mask, lum, bg_lum


def studio_backdrop(h, w):
    """
    خلفية استوديو: هضبة مضوية كتغطي المنطقة اللي حدا التيشيرت، وڤينيت
    كيغمق غير ف الحواف الخارجية حتى يوصل بالضبط لـ--surface.

    علاش هضبة وماشي تدرج دائري بسيط:
    التيشيرت كياخد 74% من عرض الصورة (x من 13% لـ87%). تدرج دائري عادي
    كيكون مضوي ف الوسط — والوسط مخبّي ورا التيشيرت — وكيكون مطفي بالضبط
    ف الهامش الرقيق اللي بان حدا الكتاف والأكمام. جربتها: التباين بقا 1.03:1.
    الهضبة كتضمن أن **الهامش الملاصق للتيشيرت** هو اللي مضوي.

    النتيجة: تيشيرت كحل حقيقي (18) على هامش (~100) = تباين ~3.1:1 —
    سيلويت واضح بحال الموكابات الأصلية، والأركان كتبقى داكنة فالبطاقة
    كتلتحم مع الصفحة بلا مربع بارز.
    """
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    # مسافة تشيبيشيف مطبّعة: 0 ف الوسط، 1 ف حافة الإطار. كتعطي هضبة مستطيلة
    # كتتبع شكل الإطار عوض دائرة كتقص الزوايا.
    d = np.maximum(np.abs(xx / w - 0.5), np.abs(yy / h - 0.5)) * 2.0

    # مضوي حتى 0.62، ومن بعد انحدار طويل وناعم حتى الحافة.
    # منطقة انحدار واسعة (38% من نصف العرض) = فينيت استوديو طبيعي.
    # منطقة ضيقة (12%) كانت كتبان حد حاد بحال إطار صورة.
    t = np.clip((1.0 - d) / (1.0 - 0.62), 0.0, 1.0)
    t = (t * t * (3.0 - 2.0 * t))[..., None]        # smoothstep

    return STUDIO_CENTER * t + STUDIO_EDGE * (1.0 - t)


def synthetic_shadow(mask):
    """
    ظل أرضي مصنوع للموكابات اللي ماعندهاش وحد.

    الموكابات الفوتوغرافية عندها ظل حقيقي تحت التيشيرت. الموكابات الفيكتور
    الجديدة مسطحة تماماً — بلا ظل. ف بطاقة وحدة فيها الجوج، اللي بلا ظل كيبان
    ملصوق فوق الخلفية. هاد الدالة كتقرب الستايلين لبعضياتهم.

    الطريقة: كناخدو شكل التيشيرت، كنزحوه للتحت، كنموهوه، وكنضغطوه عمودياً باش
    يبان ملقي على الأرض ماشي واقف ورا التيشيرت.
    """
    h, w = mask.shape
    shirt = Image.fromarray(((1.0 - mask) * 255).astype(np.uint8), mode="L")

    # ضغط عمودي قوي + تضييق العرض لـ72% = بقعة بيضوية تحت التيشيرت.
    # بلا تضييق العرض كيخرج شريط داكن كيعبر الصورة كاملة وكيبان خط أرضي.
    sw, sh = int(w * 0.72), max(1, int(h * 0.11))
    flat = shirt.resize((sw, sh), Image.LANCZOS)

    canvas = Image.new("L", (w, h), 0)
    canvas.paste(flat, ((w - sw) // 2, int(h * 0.82)))
    canvas = canvas.filter(ImageFilter.GaussianBlur(w * 0.03))

    return np.asarray(canvas).astype(np.float32) / 255.0


def to_solid(arr, mask, lum, bg_lum):
    """كنعوضو الخلفية ببقعة الضوء، والظل كيبقى ظل (أغمق من الخلفية)."""
    ratio = np.clip(lum / max(bg_lum, 1.0), 0.0, 1.0)

    # الموكابات الفيكتور خلفيتها مسطحة تماماً → ratio = 1.0 ف كل الخلفية.
    # ملي نلقاو هادشي، كنعرفو أن الصورة ماعندهاش ظل وكنصنعو ليها واحد.
    bg_only = ratio[mask > 0.5]
    if bg_only.size and float(bg_only.std()) < 0.012:
        ratio = np.clip(ratio - synthetic_shadow(mask) * 0.38, 0.0, 1.0)

    replacement = studio_backdrop(*arr.shape[:2]) * ratio[..., None]
    m = mask[..., None]
    return np.clip(arr * (1 - m) + replacement * m, 0, 255).astype(np.uint8)


def to_cutout(arr, mask):
    alpha = ((1.0 - mask) * 255).astype(np.uint8)
    return np.dstack([arr.astype(np.uint8), alpha])


def save_sizes(img, stem, suffix, *, out=OUT, widths=WIDTHS, url_base="/products"):
    """
    كنسجلو نسخ WebP بعدة عروض وكنرجعو قاموس {العرض: المسار}.

    كنتجاهلو أي عرض أكبر من الصورة الأصلية: تكبير ماكيزيدش تفاصيل، غير كيثقل
    الملف. الموكابات ديال المنتوجات دايماً أكبر من 1080 فماكيتبدل والو ليهم،
    ولكن الرسمات ف المعرض ممكن تجي صغيرة.
    """
    usable = [w for w in widths if w <= img.width] or [min(widths)]
    paths = {}
    for w in usable:
        resized = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
        name = f"{stem}-{suffix}-{w}.webp" if suffix else f"{stem}-{w}.webp"
        resized.save(out / name, "WEBP", quality=QUALITY, method=6)
        paths[w] = f"{url_base}/{name}"
    return paths


def lqip(img):
    """نسخة 24px مموهة كـ base64 — كتبان فوراً قبل ما تحمل الصورة الحقيقية."""
    tiny = img.convert("RGB").resize((24, 24), Image.LANCZOS)
    tiny = tiny.filter(ImageFilter.GaussianBlur(1.2))
    buf = io.BytesIO()
    tiny.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def process_products():
    manifest = {}
    # JPG (الموكابات الفوتوغرافية) + PNG (الفيكتور الجداد). بلا زيادة PNG
    # الصور الجديدة كيتقفزو ف صمت و`shot()` ف products.js كترمي خطأ.
    # صور القدّام (`-front`) محفوظة ف raw/ للمعرض من بعد، ولكن ماكيتعالجوش
    # دابا: الموقع كيعرض غير اللور، وكل صورة معالجة كتزيد ~350KB ف dist/.
    sources = [p for p in sorted([*RAW.glob("*.jpg"), *RAW.glob("*.png")])
               if not p.stem.endswith("-front")]
    for src in sources:
        stem = src.stem
        img = Image.open(src)
        alpha = load_alpha(img)
        img = img.convert("RGB")
        arr = np.asarray(img).astype(np.float32)

        # توحيد التأطير قبل أي معالجة — باش كل التيشيرتات ياخدو نفس الحجم
        # داخل الإطار مهما كان الموكاب اللي جاو منو.
        before = shirt_bbox(arr, alpha)
        arr, alpha = normalize_framing(arr, alpha)
        after = shirt_bbox(arr, alpha)

        mask, lum, bg_lum = background_mask(arr, alpha)

        # القماش ماكيتمسش نهائياً — لا رفع ولا تصحيح لون. التيشيرت الكحل كيبقى
        # كحل حقيقي (لومينانس 18) باش اللي كيشوف الزبون هو اللي كيوصلو.
        # الظهور كيتحل من جهة الخلفية وحدها.
        solid = Image.fromarray(to_solid(arr, mask, lum, bg_lum))
        cut = Image.fromarray(to_cutout(arr, mask), mode="RGBA")

        manifest[stem] = {
            "solid": save_sizes(solid, stem, "solid"),
            "cut": save_sizes(cut, stem, "cut"),
            "lqip": lqip(solid),
            "width": img.width,
            "height": img.height,
        }
        def wh(bb):
            cols, rows = bb
            return ((cols[-1] - cols[0]) / img.width * 100,
                    (rows[-1] - rows[0]) / img.height * 100)

        (bw, bh), (aw, ah) = wh(before), wh(after)
        print(f"  {stem:18s} ماسك={'alpha' if alpha is not None else ' lum ':5s}"
              f"  خلفية={mask.mean()*100:5.1f}%"
              f"  التيشيرت: {bw:3.0f}×{bh:3.0f}% → {aw:3.0f}×{ah:3.0f}%")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "images.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return manifest


def check_blank_geometry():
    """
    كيتحقق أن كل الموكابات الخاوية عندهم نفس هندسة الجذع.

    علاش هادشي مهم: PRINT ف src/data/designs.js (centerX · torsoWidth ·
    torsoLeft · torsoRight · shirtTop) هي **نسب مقيسة من موكاب خاوي**.
    المعاينة كتحسب بلاصة الطبعة وحجمها بالسنتيمتر من هاد الأرقام. إلا كان
    شي موكاب جديد مؤطر بشكل مختلف، الطبعة غادي تتحط ف بلاصة غالطة **على
    ذاك اللون وحدو** — والزبون غادي يطلب حاجة ماشي هي اللي شاف.

    normalize_framing() كيوحّد الحجم، ولكن شكل التيشيرت نفسو (عرض الجذع
    نسبة للكتاف) كيتبدل من موكاب لموكاب. هاد الفحص كيبين الفرق.
    """
    rows = []
    for p in sorted(OUT.glob("blank-*-cut-1080.webp")):
        key = p.stem.replace("blank-", "").replace("-cut-1080", "")
        a = np.asarray(Image.open(p).convert("RGBA"))[..., 3]
        h, w = a.shape
        m = a > 40
        ys = np.where(m.any(axis=1))[0]
        # الجذع: تحت الأكمام — كنقيسو ف شريط عند 70% من علو التيشيرت
        top = ys[0]
        band = m[int(top + (ys[-1] - top) * 0.70)]
        xs = np.where(band)[0]
        rows.append({
            "key": key,
            "shirtTop": top / h,
            "torsoLeft": xs[0] / w,
            "torsoRight": xs[-1] / w,
            "centerX": (xs[0] + xs[-1]) / 2 / w,
            "torsoWidth": (xs[-1] - xs[0]) / w,
        })

    if not rows:
        return
    print("\nهندسة الموكابات الخاوية (نسب من الإطار):")
    keys = ["centerX", "torsoWidth", "torsoLeft", "torsoRight", "shirtTop"]
    print(f"  {'':8s}" + "".join(f"{k:>12s}" for k in keys))
    for r in rows:
        print(f"  {r['key']:8s}" + "".join(f"{r[k]:12.3f}" for k in keys))

    worst = max((max(r[k] for r in rows) - min(r[k] for r in rows), k) for k in keys)
    spread, field = worst
    print(f"\n  أكبر تشتت: {field} = {spread:.3f}", end="  ")
    if spread <= 0.01:
        print("✓ كلهم متفقين — PRINT ف designs.js صالح للجميع")
    else:
        print("⚠ فوق التسامح 0.01")
        avg = {k: sum(r[k] for r in rows) / len(rows) for k in keys}
        print("  المعاينة غادي تكون غالطة على شي ألوان. إما تعاود تأطير")
        print("  الموكاب الشاذ، ولا تحدّث PRINT ف src/data/designs.js بهادو:")
        for k in keys:
            print(f"      {k}: {avg[k]:.3f},")


def process_designs():
    """
    الرسمات بوحدها — معرض قسم "صمم ديالك".

    هنا ماكاينش استخراج خلفية ولا توحيد تأطير: الملف جاي PNG بشفافية والرسمة
    هي كلشي فيه. الوحيد اللي كنديرو هو قص الهوامش الشفافة، وهادشي ضروري ماشي
    تجميل: المعاينة كتحسب حجم الطباعة على عرض الرسمة، فهامش خاوي كيخلي الطبعة
    تبان أصغر من الحجم اللي طلب الزبون.
    """
    manifest = {}
    if not DESIGNS_RAW.exists():
        print("  ماكاينش raw/designs/ — تجاوزنا")
        return manifest

    DESIGNS_OUT.mkdir(parents=True, exist_ok=True)
    sources = sorted([*DESIGNS_RAW.glob("*.png"), *DESIGNS_RAW.glob("*.webp")])
    if not sources:
        print("  المجلد خاوي — حط الرسمات ف raw/designs/")
        return manifest

    for src in sources:
        img = Image.open(src).convert("RGBA")
        raw_size = img.size

        box = img.getbbox()           # حدود البيكسلات اللي alpha ديالها > 0
        if box:
            img = img.crop(box)

        manifest[src.stem] = {
            "src": save_sizes(
                img, src.stem, "", out=DESIGNS_OUT,
                widths=DESIGN_WIDTHS, url_base="/designs",
            ),
            "width": img.width,
            "height": img.height,
        }
        print(f"  {src.stem:18s} {raw_size[0]}×{raw_size[1]} → "
              f"{img.width}×{img.height} بعد القص")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "designs.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return manifest


def logo_alpha(arr):
    """
    كنحيدو الخلفية ونرجعو ألوان حقيقية.

    اللوغو مرسوم على خلفية شبه سودا (#050606) — يعني كل بيكسل ف الحافة هو
    أصلاً `اللون × alpha` (حيت الخلفية ≈ صفر). هادي بالضبط صيغة الـpremultiplied
    alpha، فالاسترجاع هو قسمة على alpha.

    ⚠ علاش max(R,G,B) وماشي اللومينانس: اللومينانس ديال الأصفر #ffc727 هو 197
    ماشي 255، فلو استعملناه الأصفر كامل كيولي 77% شفاف — الشعار كيبان باهت
    والأبيض قوي حداه. أما أكبر قناة فهي 255 ف الجوج (أبيض وأصفر)، فكتعطي
    alpha = 1 للاثنين وكتنزل لصفر غير ف الخلفية.
    """
    bg = float(arr.reshape(-1, 3).max(axis=1).min())          # ≈ 6
    a = np.clip((arr.max(axis=2) - bg) / (255.0 - bg), 0.0, 1.0)

    # un-premultiply: تحت عتبة رقيقة القسمة كتضخم الضجيج، فكنخليو اللون كما هو
    safe = np.maximum(a, 1.0 / 255.0)[..., None]
    rgb = np.where(a[..., None] > 0.02, np.clip(arr / safe, 0, 255), arr)
    return np.dstack([rgb.astype(np.uint8), (a * 255).astype(np.uint8)])


def row_bands(alpha, gap=8):
    """حدود الكتل العمودية: كل مجموعة أسطر فيها حبر، مفصولة بأسطر خاوية."""
    rows = (alpha > 24).sum(axis=1)
    bands, run, blank = [], None, 0
    for y, v in enumerate(rows):
        if v:
            if run is None:
                run = y
            blank = 0
        elif run is not None:
            blank += 1
            if blank >= gap:
                bands.append((run, y - blank))
                run = None
    if run is not None:
        bands.append((run, len(rows) - 1))
    return bands


def process_logo():
    """
    اللوغو (نسخة غشت 2026) — lockup فيه 3 كتل فوق بعضياتها:
        0. الشعار V   (أبيض + أصفر)
        1. VALLIKS    (أبيض)
        2. wear your mind (أصفر)

    الفرق الجوهري على النسخة القديمة: هاديك كانت لون واحد مع وهج، فكان
    خاصها threshold وإعادة تلوين. هادي **مسطحة وملونة** — أي إعادة تلوين
    كتهرسها (الـV نصو أبيض ونصو أصفر). إذن كنحتافظو بالألوان كما هي
    وكنحيدو غير الخلفية.

    الأسود اللي داخل الـV كيولي شفاف — وهادشي مقصود: على خلفية الموقع
    الداكنة كيبان بحال الأصلي بالضبط.
    """
    img = Image.open(BRAND_RAW / "logo-raw.png").convert("RGB")
    arr = np.asarray(img).astype(np.float32)
    rgba = logo_alpha(arr)

    bands = row_bands(rgba[..., 3])
    if len(bands) != 3:
        raise RuntimeError(
            f"كنتسناو 3 كتل (شعار · كلمة · tagline)، لقينا {len(bands)}. "
            "واش تبدل اللوغو؟ شوف row_bands()."
        )

    # الكلمة بيضا ف الملف الأصلي — كنعاودو نلونوها ذهبية.
    # كنمسو غير RGB وكنخليو alpha كما هي، إذن الحواف الناعمة كتبقى ناعمة
    # وماكاينش درج مسنن.
    wy0, wy1 = bands[1]
    rgba[wy0:wy1 + 1, :, 0:3] = WORD_COLOR

    full = Image.fromarray(rgba, "RGBA")

    def piece(y0, y1):
        c = full.crop((0, y0, full.width, y1 + 1))
        return c.crop(c.getbbox())

    mark = piece(*bands[0])
    word = piece(*bands[1])
    tag = piece(*bands[2])

    # الفوتر كيعرض 52px علو. الـlockup كامل مربع تقريباً، إذن الـtagline كيجي
    # ~4px = غير مقروء. لهادشي logo-full = الشعار + الكلمة بلا tagline.
    lock = full.crop((0, bands[0][0], full.width, bands[1][1] + 1))
    lock = lock.crop(lock.getbbox())

    for im, name in ((mark, "logo-mark"), (word, "logo-word"),
                     (tag, "logo-tag"), (lock, "logo-full")):
        im.save(BRAND_RAW / f"{name}.png")

    # ---- favicon ----
    # الملف اللي جا مع اللوغو (favicon-supplied.png) أجزاؤه السودا **معتمة**،
    # يعني مرسوم لخلفية بيضا. ف تبويب داكن هاديك الأجزاء كتختافى وكيبقى غير
    # الأصفر مكسّر. لهادشي كنخبزو الخلفية الداكنة ف مربع: كيخدم ف أي تبويب،
    # فاتح ولا داكن.
    def on_dark(im, pad=0.12, out=180):
        side = round(max(im.width, im.height) * (1 + pad * 2))
        c = Image.new("RGBA", (side, side), (5, 6, 6, 255))
        c.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
        return c.resize((out, out), Image.LANCZOS)

    # تبويب المتصفح = 16px. على هاد الحجم الكلمة والـtagline كيوليو لطخة —
    # قسناها: "VALLIKS" كتجي أقل من 2px علو. إذن التبويب كياخد الشعار وحدو.
    on_dark(mark).save(BRAND / "favicon.png")

    # أيقونة الشاشة الرئيسية ديال iOS كتبان ف 180px — تما الـlockup كامل
    # مقروء بصح. هنا كيتعرض الاسم والـtagline كما بغيتي.
    on_dark(full.crop(full.getbbox()), pad=0.06).save(BRAND / "apple-touch-icon.png")

    # ---- نسخ WebP بالقياس اللي كيتعرض بيه فعلاً (×3 لشاشات عالية الكثافة) ----
    out = {}
    for im, name, target_h in ((mark, "logo-mark", 102),   # الهيدر: 34px × 3
                               (word, "logo-word", 45),    # الهيدر: 15px × 3
                               (lock, "logo-full", 156)):  # الفوتر: 52px × 3
        w = round(im.width * target_h / im.height)
        im.resize((w, target_h), Image.LANCZOS).save(
            BRAND / f"{name}.webp", "WEBP", quality=90, method=6
        )
        out[name] = (w, target_h)

    for i, (y0, y1) in enumerate(bands):
        print(f"  كتلة {i}: y {y0}→{y1}")
    print(f"  الشعار  {mark.width}×{mark.height}")
    print(f"  الكلمة  {word.width}×{word.height}")
    print(f"  tagline {tag.width}×{tag.height}")
    print(f"  lockup  {lock.width}×{lock.height}")
    for n, (w, h) in out.items():
        kb = (BRAND / f"{n}.webp").stat().st_size / 1024
        print(f"  {n}.webp: {w}×{h}  {kb:.1f} KB   ← width=\"{w}\" height=\"{h}\"")

if __name__ == "__main__":
    import sys

    # كونصول ويندوز افتراضياً cp1252 — وكل الرسائل هنا بالعربية. بلا هادشي
    # السكريبت كيطيح بـUnicodeEncodeError من أول print، وماشي من شي خطأ حقيقي.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    only = sys.argv[1] if len(sys.argv) > 1 else "all"
    OUT.mkdir(parents=True, exist_ok=True)
    BRAND_RAW.mkdir(parents=True, exist_ok=True)
    if only in ("all", "products"):
        print("المنتوجات:")
        process_products()
        check_blank_geometry()
    if only in ("all", "designs"):
        print("الرسمات:")
        process_designs()
    if only in ("all", "logo"):
        print("اللوغو:")
        process_logo()
    print("تم.")
