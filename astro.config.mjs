import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
    svelte(),
  ],
  output: 'static',
  site: 'https://flows.thepia.net',
  build: {
    assets: 'assets',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
    server: {
      host: 'dev.thepia.net',
      port: 5176,
      https: false, // Will be handled by reverse proxy in production
    },
  },
  experimental: {
    contentCollectionCache: true,
  },
});
