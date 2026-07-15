import { resolve } from 'node:path';
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'rendart-static-files',
    closeBundle() {
      for (const file of ['.nojekyll', 'robots.txt', 'sitemap.xml', 'favicon.ico']) {
        copyFileSync(resolve(import.meta.dirname, file), resolve(import.meta.dirname, 'dist', file));
      }
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
      },
    },
  },
});
