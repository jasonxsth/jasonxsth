import { resolve } from 'node:path';
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const projectRoot = import.meta.dirname;
const content = JSON.parse(readFileSync(resolve(projectRoot, 'content/site.json'), 'utf8'));
const generatedPages = [
  ...content.pages.map((page) => page.file),
  ...content.cases.map((project) => `portfolio/${project.slug}/index.html`),
];

const inputs = Object.fromEntries([
  ...generatedPages.map((file, index) => [`page-${index}`, resolve(projectRoot, file)]),
  ['admin', resolve(projectRoot, 'admin/index.html')],
]);

const topLevelRoutes = [...new Set(generatedPages
  .filter((file) => file.includes('/'))
  .map((file) => file.split('/')[0]))];

const sitesStaticEntries = [
  'index.html',
  '404.html',
  ...topLevelRoutes,
  'admin',
  'content',
  'assets',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
];

const sitesWorker = `const worker = {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};

export default worker;
`;

export default defineConfig({
  base: './',
  plugins: [{
    name: 'rendart-static-files',
    configureServer(server) {
      server.middlewares.use('/content/site.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(readFileSync(resolve(projectRoot, 'content/site.json')));
      });
    },
    closeBundle() {
      const dist = resolve(projectRoot, 'dist');
      for (const file of ['.nojekyll', 'robots.txt', 'sitemap.xml', 'favicon.ico']) {
        copyFileSync(resolve(projectRoot, file), resolve(dist, file));
      }

      const contentDir = resolve(dist, 'content');
      mkdirSync(contentDir, { recursive: true });
      copyFileSync(resolve(projectRoot, 'content/site.json'), resolve(contentDir, 'site.json'));

      // Keep stable, unhashed media URLs for Open Graph crawlers.
      const stableAssets = resolve(dist, 'assets');
      mkdirSync(resolve(stableAssets, 'projects'), { recursive: true });
      copyFileSync(resolve(projectRoot, 'assets/hero-material-axis.webp'), resolve(stableAssets, 'hero-material-axis.webp'));
      cpSync(resolve(projectRoot, 'assets/projects'), resolve(stableAssets, 'projects'), { recursive: true });
      cpSync(resolve(projectRoot, 'assets/fonts'), resolve(stableAssets, 'fonts'), { recursive: true });

      const serverDir = resolve(dist, 'server');
      mkdirSync(serverDir, { recursive: true });
      writeFileSync(resolve(serverDir, 'index.js'), sitesWorker);

      const sitesClientDir = resolve(dist, 'client');
      mkdirSync(sitesClientDir, { recursive: true });
      for (const entry of sitesStaticEntries) {
        cpSync(resolve(dist, entry), resolve(sitesClientDir, entry), { recursive: true });
      }
    },
  }],
  build: {
    rollupOptions: { input: inputs },
  },
});
