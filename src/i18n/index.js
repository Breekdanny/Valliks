/* ==========================================================================
   تبديل اللغة عربية ↔ فرنسية مع RTL/LTR.

   الطريقة: الـHTML كيجي معمّر بالعربية (باش محركات البحث والزوار اللي عندهم JS
   مطفي يشوفو نص حقيقي)، وهاد الملف كيبدل النصوص ملي كيبدل الزائر اللغة.
   ========================================================================== */

import { DICTS } from './strings.js';

const KEY = 'valliks:lang';
const listeners = new Set();

let lang = read();

function read() {
  // ?lang=ar ولا ?lang=fr كيغلب على كلشي — مفيد باش تشارك رابط بلغة محددة
  // (مثلاً إعلان إنستغرام موجه لجمهور فرنكوفوني) وللاختبار.
  const forced = new URLSearchParams(location.search).get('lang');
  if (forced && DICTS[forced]) return forced;

  try {
    const stored = localStorage.getItem(KEY);
    if (stored && DICTS[stored]) return stored;
  } catch { /* وضع التصفح الخاص كيرمي — عادي */ }

  // نبداو بالفرنسية غير إلا كان المتصفح فرنسي صافي
  return navigator.language?.startsWith('fr') ? 'fr' : 'ar';
}

export const getLang = () => lang;
export const isRTL = () => lang === 'ar';

/** النص ديال المفتاح. إلا ماكانش المفتاح كيرجع المفتاح نفسو باش يبان الخطأ. */
export function t(key) {
  return DICTS[lang][key] ?? key;
}

/** القيمة المناسبة من كائن فيه {ar, fr} */
export function pick(obj) {
  return obj?.[lang] ?? obj?.ar ?? '';
}

/** رقم بصيغة اللغة الحالية (العربية كتستعمل الأرقام اللاتينية ف المغرب) */
export function money(n) {
  const cur = lang === 'ar' ? 'د.م' : 'DH';
  return `${n} ${cur}`;
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** كيبدل نصوص كل العناصر المعلّمة داخل root */
export function applyTo(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
}

export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, lang);
  } catch { /* تجاهل */ }
  paint();
  listeners.forEach((fn) => fn(lang));
}

export const toggleLang = () => setLang(lang === 'ar' ? 'fr' : 'ar');

function paint() {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = isRTL() ? 'rtl' : 'ltr';

  document.title = t('meta.title');
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('meta.desc'));

  applyTo(document);
}

/** كيتنادى مرة وحدة ف البداية */
export function initI18n() {
  paint();
}
