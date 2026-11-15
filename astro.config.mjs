import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://www.faigo.ro',
  output: 'static',
  srcDir: './app',
  integrations: [preact()],
  vite: {
    server: {
      proxy: {
        '/api/room': { target: 'http://127.0.0.1:8787', ws: true },
      },
    },
  },
});
