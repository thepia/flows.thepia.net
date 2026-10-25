import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { flowsAuthTreeshake } from '@thepia/flows-auth/vite-preset';
import { getHttpsConfig, getServerConfig } from './scripts/dev-server.mjs';
import { resolve } from 'path';
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
    build: {
      rollupOptions: {
        treeshake: flowsAuthTreeshake,
      },
    },
    resolve: {
      alias: {
        // Fix paraglide messages resolution for flows-auth development
        '../paraglide/messages': resolve('../flows-auth/src/paraglide/messages'),
        '../../paraglide/messages': resolve('../flows-auth/src/paraglide/messages'),
      },
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
});
