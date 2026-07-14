import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';

const pages = ['index.html','about/index.html','services/index.html','portfolio/index.html','b2b/index.html','contacts/index.html'];
const required = [...pages, 'src/styles.css', 'src/script.js', '.nojekyll', 'robots.txt', 'sitemap.xml', '.github/workflows/pages.yml'];
const forbiddenBinaryExts = new Set(['.png','.jpg','.jpeg','.webp','.avif','.pdf','.woff','.woff2','.zip']);
for (const file of required) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  if (file !== '.nojekyll' && statSync(file).size === 0) throw new Error(`${file} is empty`);
}

const localFile = /\.(html?|css|js|json|ya?ml|xml|txt)$/i;
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
    if (url.startsWith('http') || url.startsWith('mailto:') || url.startsWith('#')) continue;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) continue;
    if (forbiddenBinaryExts.has(extname(clean).toLowerCase())) throw new Error(`${page} links to forbidden binary asset: ${url}`);
    if (!localFile.test(clean) && !clean.endsWith('/')) continue;
    const resolved = normalize(join(dirname(page), clean));
    const target = clean.endsWith('/') ? join(resolved, 'index.html') : resolved;
    if (!existsSync(target)) throw new Error(`${page} links to missing local file: ${url} -> ${target}`);
  }
}

const css = readFileSync('src/styles.css', 'utf8');
if (/url\(["']?\//.test(css)) throw new Error('CSS contains root-relative url() path');
for (const file of required) if (forbiddenBinaryExts.has(extname(file).toLowerCase())) throw new Error(`Forbidden binary file in text-only PR: ${file}`);
console.log('RENDART text-only static site passed validation');
