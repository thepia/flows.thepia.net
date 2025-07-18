<script lang="ts">
import { onMount } from 'svelte';
// Browser detection for Astro
const browser = typeof window !== 'undefined';
import { thepiaColors } from '@thepia/branding';
import { reportSupabaseError } from '../lib/config/errorReporting.js';
import DemoAuth from './DemoAuth.svelte';
import DemoContent from './DemoContent.svelte';
import LoadingSpinner from './LoadingSpinner.svelte';

let authStore = null;
let authLoaded = false;
let authError = null;
let currentUser = null;
let isAuthenticated = false;
let invitationToken = null;

// Detect available API server (local first, then production)
async function detectApiServer(): Promise<string> {
  // Check for localhost development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'https://dev.thepia.com:8443';
  }

  // Try local development server first
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

  // Fallback to production
  console.log('🌐 Using production API server: https://api.thepia.com');
  return 'https://api.thepia.com';
}

// Parse URL parameters for invitation token
onMount(async () => {
  if (!browser) return;

  // Check for invitation token in URL
  const urlParams = new URLSearchParams(window.location.search);
  invitationToken = urlParams.get('token');

  console.log('Demo app starting up...', { invitationToken: !!invitationToken });

  try {
    // Dynamically import flows-auth session functions and auth store
    const { 
      isAuthenticatedFromSession,
      getCurrentUserFromSession,
      getAccessTokenFromSession,
      createAuthStore 
    } = await import('@thepia/flows-auth');

    // Initialize auth store for sign out functionality
    const apiBaseUrl = await detectApiServer();
    authStore = createAuthStore({
      apiBaseUrl,
      sessionStorage: 'session' // Use sessionStorage for this demo
    });
    console.log('🔒 Auth store initialized for DemoApp');

    // Check authentication from sessionStorage (thepia.com pattern)
    isAuthenticated = isAuthenticatedFromSession();
    currentUser = getCurrentUserFromSession();
    
    console.log('🔍 DemoApp session check:', {
      isAuthenticated,
      hasUser: !!currentUser,
      userEmail: currentUser?.email
    });

    // Listen for session updates
    window.addEventListener('sessionUpdate', (event) => {
      isAuthenticated = isAuthenticatedFromSession();
      currentUser = getCurrentUserFromSession();
      
      console.log('🔍 DemoApp session updated:', {
        isAuthenticated,
        hasUser: !!currentUser,
        sessionData: event.detail
      });
    });

    authLoaded = true;
    console.log('✅ DemoApp auth check complete');
  } catch (error) {
    console.error('Failed to check auth session:', error);
    authError = error.message || 'Failed to load authentication';

    await reportSupabaseError('demo', 'auth_init', error, {
      operation: 'checkAuthSession',
      component: 'DemoApp',
      invitationToken: !!invitationToken,
    });
  }
});

// Handle successful authentication
function _handleAuthSuccess(event) {
  const { user } = event.detail;
  console.log('Authentication successful:', user);
  currentUser = user;
  isAuthenticated = true;
}

// Handle authentication errors
function _handleAuthError(event) {
  const { error } = event.detail;
  console.error('Authentication error:', error);
  authError = error.message || 'Authentication failed';
}

// Handle sign out
async function _handleSignOut() {
  if (!browser) return;
  
  const userEmail = currentUser?.email;
  console.log('🔒 DemoApp sign out initiated', { userEmail });
  
  try {
    if (authStore) {
      // Use proper auth store signOut method
      console.log('🔒 Signing out via auth store...');
      await authStore.signOut();
      console.log('✅ Auth store sign out completed');
    } else {
      // Fallback to manual cleanup if auth store not available
      console.warn('⚠️ Auth store not available, falling back to manual cleanup');
      sessionStorage.removeItem('auth_access_token');
      sessionStorage.removeItem('auth_user');
    }
    
    // Update local state
    currentUser = null;
    isAuthenticated = false;
    
    // Dispatch session update event for other components
    window.dispatchEvent(new CustomEvent('sessionUpdate', {
      detail: { isAuthenticated: false, user: null }
    }));
    
    console.log('✅ DemoApp sign out completed');
  } catch (error) {
    console.error('❌ DemoApp sign out failed:', error);
    authError = error.message || 'Sign out failed';
  }
}
</script>

<!-- Main Demo App Container -->
<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Only show header for unauthenticated states -->
  {#if !isAuthenticated}
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <div class="flex items-center">
            <img src="/favicon.svg" alt="Thepia" class="h-8 w-8 mr-3" />
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              Thepia Flows Demo
            </h1>
          </div>

          <!-- Auth Status -->
          <div class="flex items-center gap-4">
            {#if authLoaded && !isAuthenticated}
              <span class="text-sm text-gray-600 dark:text-gray-400">
                Not signed in
              </span>
            {:else}
              <span class="text-sm text-gray-600 dark:text-gray-400">
                Loading...
              </span>
            {/if}
          </div>
        </div>
      </div>
    </header>
  {/if}

  <!-- Main Content -->
  {#if !isAuthenticated}
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {#if authError}
      <!-- Error State -->
      <div class="text-center py-12">
        <div class="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Demo Setup Error
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {authError}
        </p>
        <button
          on:click={() => window.location.reload()}
          class="px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    {:else if !authLoaded}
      <!-- Loading State -->
      <div class="text-center py-12">
        <LoadingSpinner />
        <p class="mt-4 text-gray-600 dark:text-gray-400">
          Loading Thepia Flows demo...
        </p>
      </div>
    {:else if !isAuthenticated}
      <!-- Authentication Required -->
      <DemoAuth
        {authStore}
        {invitationToken}
        on:success={_handleAuthSuccess}
        on:error={_handleAuthError}
      />
    {/if}
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Thepia Flows Demo - 
            <a href="https://thepia.com" class="text-primary hover:underline">
              Learn more about Thepia
            </a>
          </p>
          {#if invitationToken}
            <p class="mt-1 text-xs">
              Accessed via invitation token
            </p>
          {/if}
        </div>
      </div>
    </footer>
  {:else}
    <!-- Authenticated Demo Content -->
    <DemoContent
      {currentUser}
      {invitationToken}
      on:signOut={_handleSignOut}
    />
  {/if}
</div>