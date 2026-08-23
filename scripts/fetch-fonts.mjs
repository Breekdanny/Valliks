/**
 * تنزيل الخطوط من Google Fonts وحطها ف public/fonts/ باش تكون self-hosted.
 *
 * علاش self-hosted وماشي رابط CDN ديال Google:
 *  - طلب DNS + TLS زايد لدومين خارجي = 200-400ms زايدة على 4G مغربي
 *  - fonts.googleapis.com كيتحجب أحياناً على بعض الشبكات
 *  - كنتحكمو ف الـsubset: كناخدو غير عربي + لاتيني، ماشي كل اللغات
 *
 * الاستعمال:  node scripts/fetch-fonts.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public", "fonts");

// User-Agent حديث → Google كيرجع woff2 (أصغر صيغة، مدعومة ف كل المتصفحات الحالية)
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const FAMILIES = [
  "Anton",                          // عناوين لاتينية — عريض ومضغوط، ستريتوير
  "Archivo:wght@400;500;600;700",   // نص لاتيني
  "Tajawal:wght@400;500;700;900",   // عربي: نص + عناوين (900 ثقيل بزاف)
];

const CSS_URL =
  "https://fonts.googleapis.com/css2?" +
  FAMILIES.map((f) => `family=${encodeURIComponent(f)}`).join("&") +
  "&display=swap";

// كنحتافظو غير بالمجموعات اللي محتاجينها
const KEEP = new Set(["latin", "latin-ext", "arabic"]);

async function main() {
  await mkdir(OUT, { recursive: true });

  const css = await fetch(CSS_URL, { headers: { "User-Agent": UA } }).then((r) => {
    if (!r.ok) throw new Error(`Google Fonts رد بـ ${r.status}`);
    return r.text();
  });

  // كل @font-face فيه تعليق بسمية المجموعة قبلو: /* arabic */
  const blocks = css.split("/*").slice(1);
  const faces = [];

  for (const block of blocks) {
    const subset = block.slice(0, block.indexOf("*/")).trim();
    if (!KEEP.has(subset)) continue;

    const family = /font-family:\s*'([^']+)'/.exec(block)?.[1];
    const weight = /font-weight:\s*(\d+)/.exec(block)?.[1] ?? "400";
    const style = /font-style:\s*(\w+)/.exec(block)?.[1] ?? "normal";
    const url = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    if (!family || !url) continue;

    const slug = family.toLowerCase().replace(/\s+/g, "-");
    const file = `${slug}-${weight}-${subset}.woff2`;

    const buf = await fetch(url, { headers: { "User-Agent": UA } }).then((r) =>
      r.arrayBuffer()
    );
    await writeFile(resolve(OUT, file), Buffer.from(buf));

    faces.push({ family, weight, style, file, range, size: buf.byteLength });
    console.log(`  ${file.padEnd(34)} ${(buf.byteLength / 1024).toFixed(1)} KB`);
  }

  // كنولدو ملف CSS محلي بالمسارات ديالنا
  const out = faces
    .map(
      (f) => `@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url('/fonts/${f.file}') format('woff2');${
    f.range ? `\n  unicode-range: ${f.range};` : ""
  }
}`
    )
    .join("\n\n");

  const header = `/* مولّد بـ scripts/fetch-fonts.mjs — لا تعدله بيدك */\n\n`;
  await writeFile(resolve(ROOT, "src", "styles", "fonts.css"), header + out, "utf8");

  const total = faces.reduce((s, f) => s + f.size, 0);
  console.log(`\n  ${faces.length} ملف · ${(total / 1024).toFixed(0)} KB إجمالاً`);
}

main().catch((err) => {
  console.error("فشل تنزيل الخطوط:", err.message);
  console.error("الموقع غادي يخدم بخطوط النظام كـfallback.");
  process.exit(1);
});
