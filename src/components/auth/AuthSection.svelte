<script>
import { onMount } from 'svelte';

// Browser detection for Astro environment
const browser = typeof window !== 'undefined';

let authStore = null;
let _isLoading = true;
let _error = null;
const _isAuthenticated = false;
const _user = null;

onMount(async () => {
  if (!browser) return;

  try {
    // Mock auth implementation for initial development
    // TODO: Replace with actual flows-auth integration

    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock auth store
    authStore = {
      subscribe: (callback) => {
        callback({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
        return () => {}; // unsubscribe function
      },
      initialize: async () => {
        _isLoading = false;
      },
      signIn: () => {
        // Mock sign in - show alert for now
        alert('Mock sign in - flows-auth integration coming soon!');
      },
    };

    // Initialize mock auth store
    await authStore.initialize();
  } catch (err) {
    console.error('Failed to load auth:', err);
    _error = 'Failed to load authentication system';
    _isLoading = false;
  }
});

function handleSignIn() {
  if (authStore) {
    authStore.signIn();
  }
}
</script>

<div class="auth-section">
  {#if _isLoading}
    <!-- Loading State -->
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span class="ml-3 text-gray-600">Loading authentication...</span>
    </div>
  {:else if _error}
    <!-- Error State -->
    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
      </svg>
      <h3 class="text-lg font-medium text-red-800 mb-2">Authentication Error</h3>
      <p class="text-red-600 mb-4">{_error}</p>
      <button 
        on:click={() => window.location.reload()} 
        class="btn-secondary"
      >
        Try Again
      </button>
    </div>
  {:else if _isAuthenticated}
    <!-- Authenticated State -->
    <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <h3 class="text-lg font-medium text-green-800 mb-2">Welcome back!</h3>
      <p class="text-green-600 mb-4">Redirecting to demo...</p>
    </div>
  {:else}
    <!-- Sign In State -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <h3 class="text-xl font-medium text-gray-900 mb-2">Employee Access Required</h3>
        <p class="text-gray-600">
          This demo is restricted to Thepia employees. Please sign in with your employee credentials.
        </p>
      </div>

      <!-- Sign In Button -->
      <button 
        on:click={handleSignIn}
        class="w-full btn-primary flex items-center justify-center"
        disabled={!authStore}
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
        </svg>
        Sign In with Passkey
      </button>

      <!-- Info Section -->
      <div class="mt-6 pt-6 border-t border-gray-200">
        <div class="text-sm text-gray-500 space-y-2">
          <div class="flex items-center">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
            </svg>
            <span>Secure passkey authentication</span>
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>Privacy-compliant access</span>
          </div>
          <div class="flex items-center">
            <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span>Employee verification required</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .auth-section {
    max-width: 400px;
    margin: 0 auto;
  }
</style>
