/**
 * VALLIKS — سجل الطلبات ف Google Sheet.
 *
 * كل طلب كيتكتب هنا **قبل** ما يتحل واتساب. الفايدة: عندك سجل مرتب بالأرقام
 * عوض ما تقلب وسط المحادثات — وكتقدر تقارن شحال ضغطو الزر مقابل شحال وصلوك
 * بصح ف واتساب. `ref` (VLK-XXXXXX) هو نفسو ف الجوج.
 *
 * ⚠ هادا **ماشي** تأكيد ديال البيعة. الزبون يقدر يضغط الزر وما يصيفطش ف
 *   واتساب، ويقدر يصيفط ويرفض الطلب عند الباب. هاد الجدول كيسجل النية.
 *
 * ────────────────────────────────────────────────────────────────────
 * التركيب (5 دقايق، مرة وحدة)
 * ────────────────────────────────────────────────────────────────────
 * 1. صاوب Google Sheet جديدة
 * 2. Extensions → Apps Script، وامسح اللي كاين ولصق هاد الملف كامل
 * 3. بدل SECRET تحت بشي كلمة عشوائية طويلة (ماشي "valliks")
 * 4. Deploy → New deployment → Type: Web app
 *      Execute as:        Me
 *      Who has access:    Anyone          ← ضروري، الموقع ساكن بلا سيرفر
 * 5. نسخ رابط الـWeb App (كيسالي بـ/exec)
 * 6. ف src/data/products.js → SHOP.analytics:
 *      sheet:    '<الرابط>'
 *      sheetKey: '<نفس SECRET>'
 * 7. npm run build && npx vercel --prod
 *
 * ⚠ "Anyone" معناها أي واحد ف الأنترنت يقدر يصيفط لهاد الرابط، والرابط
 *   والمفتاح بجوجهم كيمشيو ف كود المتصفح. SECRET كيوقف العبث العادي ماشي
 *   واحد جاد. إلا ولا شي واحد كيعمر ليك الجدول: بدل SECRET، أعد النشر،
 *   وحدّث products.js. الحل الجدي هو دالة على Vercel بمفتاح ف السيرفر.
 */

const SECRET = 'BADAL_HADI_B_CHI_KELMA_TWILA';

const HEADERS = [
  'التاريخ', 'الرقم', 'المنتوجات', 'العدد', 'الإجمالي',
  'المدينة', 'السمية', 'التيليفون', 'العنوان', 'ملاحظة', 'اللغة',
];

function doPost(e) {
  try {
    // الموقع كيصيفط بـsendBeacon/text-plain باش يتفادى preflight ديال CORS
    const data = JSON.parse(e.postData.contents);

    if (data.key !== SECRET) {
      return ContentService.createTextOutput('no');
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // الرأس كيتكتب مرة وحدة، أول طلب
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const items = data.items || [];

    // "TOTAL STRIKE (كحل · L) ×2" — سطر واحد مقروء ف خانة وحدة
    const label = items.map(function (it) {
      const bits = [it.color, it.size].filter(Boolean).join(' · ');
      const design = it.design ? ' — ' + it.design : '';
      const qty = it.qty > 1 ? ' ×' + it.qty : '';
      return it.name + (bits ? ' (' + bits + ')' : '') + design + qty;
    }).join('\n');

    const count = items.reduce(function (n, it) { return n + (it.qty || 0); }, 0);

    sheet.appendRow([
      data.at ? new Date(data.at) : new Date(),
      data.ref || '',
      label,
      count,
      data.total || 0,
      data.city || '',
      data.name || '',
      // ⚠ نص صريح: بلاه Sheets كتحيد الصفر ديال 0612... وكتخليه رقم
      "'" + (data.phone || ''),
      data.address || '',
      data.notes || '',
      data.lang || '',
    ]);

    return ContentService.createTextOutput('ok');
  } catch (err) {
    // ماكنرميوش: sendBeacon ماكيقراش الجواب أصلاً، والزبون ماخاصو يتأثر
    console.error(err);
    return ContentService.createTextOutput('err');
  }
}
