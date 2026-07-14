import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const output = '_site';
const files = [
  'index.html',
  'about/index.html',
  'services/index.html',
  'portfolio/index.html',
  'b2b/index.html',
  'contacts/index.html',
  'src/styles.css',
  'src/script.js',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
];
const forbiddenBinaryExts = /\.(png|jpe?g|webp|avif|pdf|woff2?|zip)$/i;

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

for (const file of files) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  if (forbiddenBinaryExts.test(file)) throw new Error(`Refusing to publish binary asset: ${file}`);
  const target = join(output, file);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(file, target);
}

for (const file of files) {
  const target = join(output, file);
  if (!existsSync(target) || (file !== '.nojekyll' && statSync(target).size === 0)) {
    throw new Error(`Failed to prepare ${target}`);
  }
}

console.log(`Prepared text-only GitHub Pages artifact in ${output}`);
