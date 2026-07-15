import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const source = 'dist';
const output = '_site';

if (!existsSync(source) || statSync(source).size === 0) {
  throw new Error('dist is missing. Run npm run build first.');
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(source, output, { recursive: true });

for (const file of ['index.html', 'about/index.html', 'services/index.html', 'portfolio/index.html', 'b2b/index.html', 'contacts/index.html']) {
  const target = join(output, file);
  if (!existsSync(target) || statSync(target).size === 0) throw new Error(`Failed to prepare ${target}`);
}

console.log(`Prepared RENDART Pages artifact in ${output}`);
