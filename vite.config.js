import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { applyContent } from './scripts/apply-content.mjs';

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
      server.middlewares.use('/content/site.json', (request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(readFileSync(resolve(import.meta.dirname, 'content/site.json')));
      });
    },
    closeBundle() {
      for (const file of ['.nojekyll', 'robots.txt', 'sitemap.xml', 'favicon.ico']) {
        copyFileSync(resolve(import.meta.dirname, file), resolve(import.meta.dirname, 'dist', file));
      }
      const serverDir = resolve(import.meta.dirname, 'dist/server');
      mkdirSync(serverDir, { recursive: true });
      writeFileSync(resolve(serverDir, 'index.js'), sitesWorker);
      applyContent(import.meta.dirname);
    },
  }],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        approach: resolve(import.meta.dirname, 'about/index.html'),
        capabilities: resolve(import.meta.dirname, 'services/index.html'),
        projects: resolve(import.meta.dirname, 'portfolio/index.html'),
        business: resolve(import.meta.dirname, 'b2b/index.html'),
        contact: resolve(import.meta.dirname, 'contacts/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
});
