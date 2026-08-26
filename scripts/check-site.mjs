import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { findHangingRussianWords } from './russian-typography.mjs';

const content = JSON.parse(readFileSync('content/site.json', 'utf8'));
if (content.schemaVersion !== 2 || !content.global || !Array.isArray(content.pages) || !Array.isArray(content.cases)) {
  throw new Error('content/site.json has an unsupported schema');
}
const globalFields = Object.fromEntries(content.global.fields.map((field) => [field.key, field.value]));
const allowedEmails = new Set(globalFields.contact_emails ?? []);

const publicPages = [
  ...content.pages.map((page) => page.file),
  ...content.cases.map((project) => `portfolio/${project.slug}/index.html`),
];
const pages = [...publicPages, 'admin/index.html'];
const assets = [
  'src/site.css',
  'src/site.js',
  'src/admin.css',
  'src/admin.js',
  'content/site.json',
  'scripts/generate-site.mjs',
  'scripts/russian-typography.mjs',
  'scripts/prepare-pages.mjs',
  'ADMIN.md',
  'assets/hero-material-axis.webp',
  'assets/favicon.webp',
  'favicon.ico',
  ...content.cases.flatMap((project) => [project.cover, ...project.images]),
  'assets/fonts/Commissioner-VF.woff2',
  'assets/fonts/Geologica-VF.woff2',
  'assets/fonts/Literata-VF.woff2',
  'assets/fonts/OFL-Commissioner.txt',
  'assets/fonts/OFL-Geologica.txt',
  'assets/fonts/OFL-Literata.txt',
];

for (const file of [...new Set([...pages, ...assets, '.nojekyll', 'robots.txt', 'sitemap.xml', '.github/workflows/pages.yml'])]) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  if (file !== '.nojekyll' && statSync(file).size === 0) throw new Error(`${file} is empty`);
}

const linkAttrs = /(?:href|src)=["']([^"']+)["']/g;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  if (/localhost|127\.0\.0\.1/i.test(html)) throw new Error(`${page} contains localhost`);
  if (/(?:href|src)=["']\/(?!\/)/.test(html)) throw new Error(`${page} contains a root-relative path`);
  if (!/<title>[^<]+<\/title>/.test(html)) throw new Error(`${page} missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) throw new Error(`${page} missing description`);
  if (!/<link rel="canonical" href="https:\/\/[^"]+"/.test(html) && page !== 'admin/index.html') throw new Error(`${page} missing canonical`);
  if (!/<meta property="og:title" content="[^"]+"/.test(html) && page !== 'admin/index.html') throw new Error(`${page} missing Open Graph data`);
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) throw new Error(`${page} must contain exactly one h1, found ${h1s.length}`);
  for (const match of html.matchAll(/href=["']mailto:([^"']+)["']/gi)) {
    if (!allowedEmails.has(match[1])) throw new Error(`${page} contains an unknown contact email: ${match[1]}`);
  }
  if (/<a\b[^>]*href=["'][^"']*\/consent\//i.test(html)) throw new Error(`${page} contains a visible consent link`);
  if (html.includes('Как удобно — так и свяжемся')) throw new Error(`${page} contains the old contact placeholder`);
  if (html.includes('Онлайн-форма не передает данные')) throw new Error(`${page} contains the removed backend notice`);
  const hangingWords = findHangingRussianWords(html);
  if (hangingWords.length) throw new Error(`${page} contains hanging Russian words: ${[...new Set(hangingWords)].join(', ')}`);

  for (const match of html.matchAll(linkAttrs)) {
    const url = match[1];
    if (/^(?:https?:|tel:|mailto:|#)/.test(url)) continue;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean || /^(?:\.\.\/)*assets\//.test(clean) || /^(?:\.\.\/)*src\//.test(clean)) continue;
    const resolved = normalize(join(dirname(page), clean));
    const target = clean.endsWith('/') ? join(resolved, 'index.html') : resolved;
    if (!existsSync(target)) throw new Error(`${page} links to missing local file: ${url} -> ${target}`);
  }

  if (publicPages.includes(page)) {
    const images = [...html.matchAll(/<img\s+[^>]*>/g)].map((match) => match[0]);
    for (const image of images) {
      if (!/\swidth="\d+"/.test(image) || !/\sheight="\d+"/.test(image)) throw new Error(`${page} has an image without dimensions`);
      if (!/\salt="[^"]*"/.test(image)) throw new Error(`${page} has an image without alt text`);
    }
  }
}

for (const page of content.pages) {
  if (!Array.isArray(page.fields) || page.fields.length === 0) throw new Error(`${page.id} has no content fields`);
  if (!publicPages.includes(page.file)) throw new Error(`${page.id} references an unknown generated page: ${page.file}`);
}

const caseIds = new Set();
const caseSlugs = new Set();
for (const project of content.cases) {
  if (caseIds.has(project.id) || caseSlugs.has(project.slug)) throw new Error(`Duplicate case id or slug: ${project.id}`);
  caseIds.add(project.id);
  caseSlugs.add(project.slug);
  if (!['brand', 'designer'].includes(project.audience)) throw new Error(`${project.id} has an unknown audience`);
  if (!Array.isArray(project.fields) || project.fields.length === 0) throw new Error(`${project.id} has no fields`);
  if (!project.sourceFolder || !project.category) throw new Error(`${project.id} is missing sourceFolder or category`);
  if (!Array.isArray(project.images) || project.images.length === 0 || project.images[0] !== project.cover) throw new Error(`${project.id} must start its image list with the cover`);
}

const portfolioCases = content.cases.filter((project) => project.portfolio !== false);
if (portfolioCases.length !== 8) throw new Error(`Portfolio must contain 8 curated cases, found ${portfolioCases.length}`);
const categoryCounts = portfolioCases.reduce((groups, project) => {
  groups[project.category] = (groups[project.category] ?? 0) + 1;
  return groups;
}, {});
for (const [category, expected] of Object.entries({ bedroom: 2, bathroom: 2, tbo: 2, sketch: 1, collage: 1 })) {
  if ((categoryCounts[category] ?? 0) !== expected) throw new Error(`Portfolio category ${category} must contain ${expected} cases`);
}

const css = readFileSync('src/site.css', 'utf8');
if (/url\(["']?\//.test(css)) throw new Error('src/site.css contains root-relative url()');
for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const url = match[1];
  if (/^(?:data:|https?:)/.test(url)) continue;
  const target = normalize(join('src', url));
  if (!existsSync(target)) throw new Error(`src/site.css links to missing local file: ${url} -> ${target}`);
}

const siteScript = [readFileSync('src/site.js', 'utf8'), ...publicPages.map((page) => readFileSync(page, 'utf8'))].join('\n');
for (const event of ['audience_select', 'portfolio_open', 'cta_click', 'form_start', 'form_submit', 'form_error', 'contact_click']) {
  if (!siteScript.includes(event)) throw new Error(`src/site.js does not instrument ${event}`);
}

console.log(`RENDART site passed source validation: ${publicPages.length} public pages, ${content.cases.length} cases`);
