import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const source = 'dist';
const output = '_site';
const content = JSON.parse(readFileSync('content/site.json', 'utf8'));
const expectedPages = [
  ...content.pages.map((page) => page.file),
  ...content.cases.map((project) => `portfolio/${project.slug}/index.html`),
  'admin/index.html',
  'content/site.json',
];

if (!existsSync(source) || statSync(source).size === 0) {
  throw new Error('dist is missing. Run npm run build first.');
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });

for (const file of expectedPages) {
  const target = join(output, file);
  if (!existsSync(target) || statSync(target).size === 0) throw new Error(`Failed to prepare ${target}`);
}

for (const file of ['index.html', '404.html', 'admin/index.html', 'content/site.json', 'assets']) {
  const target = join(output, 'client', file);
  if (!existsSync(target) || statSync(target).size === 0) throw new Error(`Failed to prepare Sites asset ${target}`);
}

console.log(`Prepared RENDART Pages artifact in ${output}`);
