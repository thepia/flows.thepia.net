import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to get server config based on available certificates
export function getServerConfig() {
  const config = {
    host: 'dev.thepia.net',
    port: 5176,
  };

  console.log('✅ HTTPS server configured for port 5176');
  console.log('🌐 Access your site at: https://dev.thepia.net:5176');
  console.log('📱 Network devices can access via the same URL');

  return config;
}

// Function to get HTTPS config
export function getHttpsConfig() {
  // Use Let's Encrypt certificates (dev.thepia.net) - required for Safari WebAuthn
  try {
    const keyPath = join(__dirname, '..', 'certs', 'dev.thepia.net-key.pem');
    const certPath = join(__dirname, '..', 'certs', 'dev.thepia.net.pem');

    const httpsConfig = {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
    };

    console.log("✅ HTTPS enabled with Let's Encrypt certificates");
    console.log('🔒 Real SSL certificate - WebAuthn ready');

    return httpsConfig;
  } catch (error) {
    // Fallback to self-signed certificates only if Let's Encrypt unavailable
    try {
      const keyPath = join(__dirname, '..', 'certs', 'localhost-key.pem');
      const certPath = join(__dirname, '..', 'certs', 'localhost.pem');

      const httpsConfig = {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
      };

      console.warn("⚠️ Let's Encrypt certificates not found, using self-signed fallback");
      console.warn('🔐 Run `pnpm setup:letsencrypt` for full WebAuthn support');

      return httpsConfig;
    } catch (error) {
      console.error('❌ No HTTPS certificates found');
      console.error('🔐 Run `pnpm setup:letsencrypt` to enable HTTPS for WebAuthn');
      return false;
    }
  }
}