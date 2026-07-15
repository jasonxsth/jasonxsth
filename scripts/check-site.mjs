import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const publicPages = [
  'index.html',
  'about/index.html',
  'services/index.html',
  'portfolio/index.html',
  'b2b/index.html',
  'contacts/index.html',
];

const adminPages = ['admin/index.html'];
const pages = [...publicPages, ...adminPages];

const assets = [
  'src/site.css',
  'src/site.js',
  'src/admin.css',
  'src/admin.js',
  'content/site.json',
  'scripts/apply-content.mjs',
  'ADMIN.md',
  'assets/hero-material-axis.webp',
  'assets/favicon.webp',
  'favicon.ico',
  'assets/projects/material-precision-bedroom.webp',
  'assets/projects/material-bathroom-green.webp',
  'assets/projects/calm-bedroom.webp',
  'assets/projects/dark-bathroom.webp',
  'assets/projects/bathroom-study.webp',
  'assets/projects/collage-bathroom.webp',
  'assets/projects/collage-living.webp',
  'assets/projects/technical-drawing.webp',
  'assets/fonts/Commissioner-VF.woff2',
  'assets/fonts/Geologica-VF.woff2',
  'assets/fonts/Literata-VF.woff2',
  'assets/fonts/OFL-Commissioner.txt',
  'assets/fonts/OFL-Geologica.txt',
  'assets/fonts/OFL-Literata.txt',
];

for (const file of [...pages, ...assets, '.nojekyll', 'robots.txt', 'sitemap.xml', '.github/workflows/pages.yml']) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  if (file !== '.nojekyll' && statSync(file).size === 0) throw new Error(`${file} is empty`);
}

const linkAttrs = /(?:href|src)=["']([^"']+)["']/g;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  if (/localhost|127\.0\.0\.1/i.test(html)) throw new Error(`${page} contains localhost`);
  if (/(?:href|src)=["']\/(?!\/)/.test(html)) throw new Error(`${page} contains root-relative path`);
  if (!/<title>[^<]+<\/title>/.test(html)) throw new Error(`${page} missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) throw new Error(`${page} missing description`);
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) throw new Error(`${page} must contain exactly one h1, found ${h1s.length}`);

  for (const match of html.matchAll(linkAttrs)) {
    const url = match[1];
    if (/^(?:https?:|mailto:|tel:|#)/.test(url)) continue;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean || clean.startsWith('../assets/') || clean.startsWith('assets/') || clean.startsWith('../src/') || clean.startsWith('src/')) continue;
    const resolved = normalize(join(dirname(page), clean));
    const target = clean.endsWith('/') ? join(resolved, 'index.html') : resolved;
    if (!existsSync(target)) throw new Error(`${page} links to missing local file: ${url} -> ${target}`);
  }

  if (publicPages.includes(page)) {
    if (/placeholder|место для изображения/i.test(html)) throw new Error(`${page} contains a placeholder`);
    if (/\b(?:83%|награ(?:да|ды)|без единой ошибки)\b/i.test(html)) throw new Error(`${page} contains an unverified claim`);
  }
}

const content = JSON.parse(readFileSync('content/site.json', 'utf8'));
if (content.schemaVersion !== 1 || !Array.isArray(content.pages)) throw new Error('content/site.json has an unsupported schema');
if (content.pages.length !== publicPages.length) throw new Error('content/site.json must describe every public page');

for (const page of content.pages) {
  if (!publicPages.includes(page.file)) throw new Error(`${page.id} references an unknown page: ${page.file}`);
  if (!Array.isArray(page.fields) || page.fields.length === 0) throw new Error(`${page.id} has no content fields`);
}

const css = readFileSync('src/site.css', 'utf8');
if (/url\(["']?\//.test(css)) throw new Error('src/site.css contains root-relative url()');
for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const url = match[1];
  if (/^(?:data:|https?:)/.test(url)) continue;
  const target = normalize(join('src', url));
  if (!existsSync(target)) throw new Error(`src/site.css links to missing local file: ${url} -> ${target}`);
}

console.log('RENDART site passed source validation');
