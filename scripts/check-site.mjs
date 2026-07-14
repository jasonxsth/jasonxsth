import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = ['index.html', 'src/styles.css', '.nojekyll'];
for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`${file} is missing`);
  if (file !== '.nojekyll' && !readFileSync(file, 'utf8').trim()) throw new Error(`${file} is empty`);
}

const html = readFileSync('index.html', 'utf8');
for (const id of ['about', 'services', 'portfolio', 'process', 'clients', 'contact']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing #${id}`);
}

const localAbsolutePathPattern = /(?:href|src)=["']\/(?!\/)/g;
if (localAbsolutePathPattern.test(html)) {
  throw new Error('Use relative paths for GitHub Pages assets, not root-relative / paths');
}

if (!html.includes('href="./src/styles.css"')) {
  throw new Error('CSS must be linked with a relative ./src/styles.css path for GitHub Pages');
}

console.log('Static RENDART site is ready for GitHub Pages');
