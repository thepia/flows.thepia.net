<script>
import { thepiaColors } from '@thepia/branding';
import { onMount } from 'svelte';

// Browser detection for Astro
const browser = typeof window !== 'undefined';

let authStore = null;
let initError = null;
let isLoading = true;

// For synchronous context setup, we need to conditionally import
let setAuthContext = null;

// Detect available API server (local first, then production)
async function detectApiServerUrl() {
  // For localhost development, use production API directly to avoid CORS issues
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('🏠 Running on localhost - using production API to avoid CORS issues');
    return 'https://api.thepia.com';
  }

  // For dev.thepia.net domains, try local development server first
  if (typeof window !== 'undefined' && window.location.hostname.includes('dev.thepia.net')) {
    try {
      const localResponse = await fetch('https://dev.thepia.com:8443/health', {
        signal: AbortSignal.timeout(3000),
      });
      if (localResponse.ok) {
        console.log('🔧 Using local API server: https://dev.thepia.com:8443');
        return 'https://dev.thepia.com:8443';
      }
    } catch (error) {
      console.log('ℹ️ Local API server not available, using production');
    }
  }

  // Fallback to production
  console.log('🌐 Using production API server: https://api.thepia.com');
  return 'https://api.thepia.com';
}

onMount(async () => {
  if (!browser) return;

  try {
    // Import flows-auth and use legacy global store approach
    const { initializeAuth } = await import('@thepia/flows-auth');
    
    // Detect proper API server
    const apiBaseUrl = await detectApiServerUrl();
    console.log('🔧 AuthContextProvider detected API server:', apiBaseUrl);
    
    // Create auth configuration with detected API server
    const authConfig = {
      apiBaseUrl: apiBaseUrl,
      clientId: 'thepia-flows-landing',
      signInMode: 'login-or-register',
      domain: 'thepia.net',
      enablePasskeys: false,
      enableMagicLinks: true,
      enablePasswordLogin: false,
      branding: {
        companyName: 'Thepia Flows',
        logoUrl: '/favicon.svg',
        primaryColor: thepiaColors.primary,
        showPoweredBy: true
      },
    };

    // Use legacy global store pattern that works with async initialization
    authStore = initializeAuth(authConfig);
    console.log('✅ Auth global store initialized with API server:', apiBaseUrl);
    
    // Initialize the auth store
    await authStore.initialize();
    isLoading = false;
    console.log('✅ Auth store fully initialized');
    
  } catch (err) {
    console.error('Failed to initialize auth store:', err);
    initError = err.message || 'Failed to initialize authentication system';
    isLoading = false;
  }
});
</script>

<!-- Only render children when running in browser and context is ready -->
{#if browser}
  {#if initError}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div class="w-12 h-12 text-red-400 mx-auto mb-4 flex items-center justify-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-red-800 mb-2">Authentication Setup Error</h3>
      <p class="text-red-600">{initError}</p>
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-3 text-gray-600">Initializing authentication...</span>
    </div>
  {:else}
    <slot />
  {/if}
{:else}
  <!-- SSR fallback - don't render anything during SSR -->
{/if}

<style>
  .border-primary {
    border-color: var(--color-brand-primary, #988ACA);
  }
</style>