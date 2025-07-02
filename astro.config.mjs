import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    svelte(),
    tailwind({
      applyBaseStyles: false, // We'll use our own base styles
    }),
  ],
  output: 'static',
  site: 'https://flows.thepia.net',
  build: {
    assets: 'assets',
  },
  vite: {
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
