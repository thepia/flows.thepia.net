<script>
import { onMount } from 'svelte';
import { cleanInvitationUrl, handleInvitationUrl } from '../../utils/invitationHandler';
import { thepiaColors } from '@thepia/branding';

// Import icons for replacing inline SVGs
import { Warning, CheckCircle, User } from 'phosphor-svelte';

// Browser detection for Astro environment
const browser = typeof window !== 'undefined';

let authStore = null;
let authConfig = null;
let SignInFormComponent = null;
let isLoading = true;
let authError = null;
let isAuthenticated = false;
let currentUser = null;

// Detect available API server (same as AuthContextProvider)
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
    // Detect available API server
    const apiBaseUrl = await detectApiServerUrl();
    console.log('🔧 AuthSection using API server:', apiBaseUrl);

    // Dynamically import flows-auth
    const { createAuthStore, SignInForm } = await import('@thepia/flows-auth');
    SignInFormComponent = SignInForm;

    // Create auth configuration
    authConfig = {
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

    // Create auth store
    authStore = createAuthStore(authConfig);

    // Initialize the auth store
    await authStore.initialize();
    console.log('✅ Auth store initialized successfully');

    // Subscribe to auth state changes
    authStore.subscribe(($auth) => {
      // Derive isAuthenticated from state
      const authIsAuthenticated = $auth.state === 'authenticated';

      console.log('🔍 AuthSection: Auth state changed:', {
        isAuthenticated: authIsAuthenticated,
        hasUser: !!$auth.user,
        userEmail: $auth.user?.email,
        state: $auth.state
      });

      currentUser = $auth.user;
      isAuthenticated = authIsAuthenticated;

      // Handle invitation URLs and redirect to app if authenticated
      if (isAuthenticated && currentUser) {
        // Check if this was an invitation flow
        const url = new URL(window.location.href);
        const hadToken = url.searchParams.has('token');

        if (hadToken) {
          // FR9.6: Invitation flow (?token= present) MAY redirect to /app after authentication
          console.log('🚀 AuthSection: Invitation flow - redirecting to /app:', currentUser.email);

          // Clean up invitation parameters
          cleanInvitationUrl();
          console.log('🔗 Invitation URL cleaned up after successful authentication');

          // Redirect to app for invitation flows
          window.location.href = '/app';
        } else {
          // FR9.2: Normal authentication - show "Open Demo" button, don't auto-redirect
          console.log('🔍 AuthSection: User authenticated, showing Open Demo button for:', currentUser.email);
        }
      }
    });

    // Check initial authentication state using the isAuthenticated function
    const initialIsAuthenticated = authStore.isAuthenticated();
    console.log('🔍 AuthSection: Initial auth state check:', {
      isAuthenticated: initialIsAuthenticated
    });

    // FR9.2: AuthSection MUST NOT automatically redirect authenticated users from landing page
    // Instead, show "Open Demo" button and let users choose
    if (initialIsAuthenticated) {
      console.log('🔍 AuthSection: User already authenticated, showing Open Demo button');
      // Don't redirect automatically - let the subscription handle UI updates
    }

    // Handle invitation URLs on component mount
    if (browser) {
      const invitationResult = handleInvitationUrl();
      console.log('🔗 Invitation URL handling result:', invitationResult);
    }

    isLoading = false;
  } catch (err) {
    console.error('Failed to initialize auth store:', err);
    authError = 'Failed to initialize authentication system. Please check your connection.';
    isLoading = false;
  }
});

// SignInForm event handlers
function handleSignInSuccess(detail) {
  console.log('✅ SignInForm Success:', detail);
  console.log(`🎉 User ${detail.user.email} successfully authenticated via ${detail.method}`);
}

function handleSignInError(detail) {
  console.error('❌ SignInForm Error:', detail);
  console.log(`⚠️ Authentication error: ${detail.error.message || detail.error.code}`);
  authError = detail.error.message || detail.error.code || 'Authentication failed';
}

function handleStepChange(detail) {
  console.log('🔄 SignInForm Step Change:', detail);
  console.log(`📍 Authentication flow step: ${detail.step}`);
}
</script>

<div class="auth-section">
  {#if isLoading}
    <!-- Loading State -->
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-3 text-gray-600">Loading authentication...</span>
    </div>
  {:else if authError}
    <!-- Error State -->
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div class="w-12 h-12 text-red-400 mx-auto mb-4 flex items-center justify-center">
        <Warning size={48} color="currentColor" />
      </div>
      <h3 class="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
      <p class="text-red-600 mb-4">{authError}</p>
      <button
        on:click={() => window.location.reload()}
        class="btn-secondary"
      >
        Try Again
      </button>
    </div>
  {:else if isAuthenticated}
    <!-- Authenticated State -->
    <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
      <div class="w-12 h-12 text-green-400 mx-auto mb-4 flex items-center justify-center">
        <CheckCircle size={48} color="currentColor" />
      </div>
      <h3 class="text-lg font-medium text-green-800 mb-2">Welcome back, {currentUser?.email || 'User'}!</h3>
      <p class="text-green-600 mb-4">You're already signed in.</p>
      <button
        on:click={() => window.location.href = '/app'}
        class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
      >
        Open Demo App
      </button>
    </div>
  {:else if SignInFormComponent}
    <!-- SignInForm Component - gets config from context via useAuthSafe() -->
    <div class="signin-form-wrapper">
      <svelte:component this={SignInFormComponent}
        size="medium"
        variant="inline"
        className="thepia-flows-signin"
        on:success={(e) => handleSignInSuccess(e.detail)}
        on:error={(e) => handleSignInError(e.detail)}
        on:stepChange={(e) => handleStepChange(e.detail)}
      />
    </div>
  {:else}
    <!-- Fallback loading for SignInForm -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <User size={32} color="var(--color-brand-primary, #988ACA)" />
      </div>
      <h3 class="text-xl font-medium text-gray-900 mb-2">Loading Authentication...</h3>
      <p class="text-gray-600">Please wait while we initialize the sign-in form.</p>
    </div>
  {/if}
</div>

<style>
  .auth-section {
    max-width: 400px;
    margin: 0 auto;
  }

  .signin-form-wrapper {
    max-width: 100%;
  }

  /* Ensure SignInForm integrates well with the page */
  :global(.thepia-flows-signin) {
    margin: 0 auto;
  }
</style>
