import { describe, expect, it } from 'vitest';
import { createAuthStore } from '@thepia/flows-auth';

/**
 * Reproduces: "authStore.subscribe is not a function"
 *
 * AuthSection.svelte and AppSignIn.svelte both do:
 *   authStore = createAuthStore(config);
 *   authStore.subscribe(($auth) => { ... });
 *
 * That was valid when flows-auth's composed store implemented the Svelte
 * store contract directly. It no longer does — createAuthStore() now
 * returns a Zustand-backed ComposedAuthStore with no top-level `subscribe`.
 * flows-auth ships `makeSvelteCompatible()` (stores/adapters/svelte) for
 * exactly this case.
 */
describe('createAuthStore Svelte store contract', () => {
  const config = {
    apiBaseUrl: 'https://api.thepia.com',
    clientId: 'test-client',
    domain: 'thepia.net',
    enablePasskeys: false,
    enableMagicLinks: true,
    enablePasswordLogin: false,
  };

  it('does not expose a Svelte-compatible subscribe() on the raw store', () => {
    const authStore = createAuthStore(config as any);
    expect(typeof (authStore as any).subscribe).not.toBe('function');
  });

  it('AuthSection/AppSignIn usage pattern throws TypeError', () => {
    const authStore = createAuthStore(config as any);
    expect(() => (authStore as any).subscribe(() => {})).toThrow(TypeError);
  });
});
