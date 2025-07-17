import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { getHttpsConfig, getServerConfig } from './scripts/dev-server.mjs';
// import ThepiaBrandingPlugin from '@thepia/branding/astro/ThepiaBrandingPlugin.mjs';

// https://astro.build/config
export default defineConfig({
  integrations: [
    // ThepiaBrandingPlugin(),
    svelte(),
  ],
  output: process.env.NODE_ENV === 'development' ? 'server' : 'static',
  site: 'https://flows.thepia.net',
  trailingSlash: 'ignore',
  build: {
    assets: 'assets',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop'
    }
  },
  // Enable HTTPS for local development (required for WebAuthn in Safari)
  server: getServerConfig(),
  vite: {
    plugins: [tailwindcss()],
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    },
    server: {
      https: getHttpsConfig(),
      hmr: {
        port: 5177,
        host: 'localhost',
        protocol: 'ws',
      },
    },
  },
  experimental: {
    contentCollectionCache: true,
  },
});
