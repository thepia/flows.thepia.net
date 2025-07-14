<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
// Browser detection for Astro
const browser = typeof window !== 'undefined';
import { reportSupabaseError } from '../lib/config/errorReporting.js';

export let authStore: any;
export const invitationToken = null;

const dispatch = createEventDispatcher();

let _SignInForm = null;
let authComponentLoaded = false;
let authComponentError = null;
let registrationMode = false;
let invitationData = null;
let isNewUserRegistration = false;

onMount(async () => {
  if (!browser) return;

  try {
    // Dynamically import the SignInForm component
    const authModule = await import('@thepia/flows-auth');
    _SignInForm = authModule.SignInForm;
    authComponentLoaded = true;
    console.log('Auth component loaded successfully');

    // If we have an invitation token, decode it and set up registration flow
    if (invitationToken) {
      try {
        invitationData = decodeInvitationToken(invitationToken);
        isNewUserRegistration = true;
        registrationMode = true;
        console.log('Invitation token decoded for registration:', invitationData);
      } catch (error) {
        console.warn('Failed to decode invitation token:', error);
        authComponentError = 'Invalid invitation token';
      }
    }
  } catch (error) {
    console.error('Failed to load auth component:', error);
    authComponentError = error.message || 'Failed to load authentication component';

    await reportSupabaseError('demo', 'auth_component_load', error, {
      operation: 'loadAuthComponent',
      component: 'DemoAuth',
      invitationToken: !!invitationToken,
    });
  }
});

// Decode JWT invitation token
function decodeInvitationToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(atob(parts[1]));
    return {
      email: payload.email,
      name: payload.name || payload.firstName,
      company: payload.company || payload.companyName,
      expires: payload.exp ? new Date(payload.exp * 1000) : null,
      ...payload,
    };
  } catch (_error) {
    throw new Error('Failed to decode invitation token');
  }
}

// Handle successful authentication
function _handleAuthSuccess(event) {
  const { user, method } = event.detail;
  console.log('Authentication successful in DemoAuth:', {
    user,
    method,
    invitationData,
  });

  // Determine if this is a new user registration based on invitation context
  const isNewRegistration = isNewUserRegistration || !user.created_at;

  // If we have invitation data, merge it with user profile
  if (invitationData) {
    const enhancedUser = {
      ...user,
      // Ensure personal data from invitation is preserved
      name: user.name || invitationData.name || invitationData.firstName,
      given_name: user.given_name || invitationData.firstName || invitationData.name?.split(' ')[0],
      family_name:
        user.family_name ||
        invitationData.lastName ||
        invitationData.name?.split(' ').slice(1).join(' '),
      company: user.company || invitationData.company || invitationData.companyName,
      phone: user.phone || invitationData.phone,
      job_title: user.job_title || 'Hiring Manager',
      metadata: {
        ...user.metadata,
        invitation_id: invitationData.invitation_id,
        workflow_type: invitationData.workflow_type,
        demo_duration: invitationData.demo_duration,
        team_size: invitationData.team_size,
        invitation_source: 'thepia_flows_demo',
        account_created_from_invitation: true,
        registration_completed_at: new Date().toISOString(),
      },
    };

    console.log('Enhanced user profile with invitation data:', enhancedUser);
    dispatch('success', { user: enhancedUser, isNewRegistration, invitationData });
  } else {
    dispatch('success', { user, method, isNewRegistration });
  }
}

// Handle authentication errors
function _handleAuthError(event) {
  console.error('Authentication error in DemoAuth:', event.detail);
  dispatch('error', event.detail);
}

// Switch between sign-in and registration modes
function _toggleMode() {
  registrationMode = !registrationMode;
}
</script>

<div class="max-w-md mx-auto">
  <!-- Header -->
  <div class="text-center mb-8">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      {isNewUserRegistration ? 'Create Your Account' : 'Sign In to Continue'}
    </h2>
    
    {#if invitationToken && invitationData}
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414A6 6 0 0121 9z"></path>
          </svg>
          <span class="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {isNewUserRegistration ? 'Account Registration Invitation' : 'Demo Access Invitation'}
          </span>
        </div>
        
        {#if isNewUserRegistration}
          <div class="bg-white dark:bg-blue-900/10 rounded-lg p-4 mb-4">
            <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-2">🎯 Create Your Passkey Account</h3>
            <p class="text-sm text-blue-800 dark:text-blue-200 mb-3">
              You've been invited to create a secure account with passkey authentication. This will allow you to:
            </p>
            <ul class="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
              <li>• Access the Thepia Flows demo anytime</li>
              <li>• Sign in securely with your fingerprint or face ID</li>
              <li>• Return to your tasks and progress</li>
              <li>• Experience passwordless authentication</li>
            </ul>
          </div>
        {/if}
        
        <div class="bg-white dark:bg-blue-900/10 rounded-lg p-4">
          <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">Your Account Information</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <span class="font-medium">Email:</span>
              <p class="text-xs">{invitationData.email}</p>
            </div>
            <div>
              <span class="font-medium">Full Name:</span>
              <p class="text-xs">{invitationData.name || `${invitationData.firstName || ''} ${invitationData.lastName || ''}`.trim() || 'Not provided'}</p>
            </div>
            <div>
              <span class="font-medium">Company:</span>
              <p class="text-xs">{invitationData.company || invitationData.companyName || 'Not provided'}</p>
            </div>
            <div>
              <span class="font-medium">Role:</span>
              <p class="text-xs">Hiring Manager</p>
            </div>
            {#if invitationData.phone}
              <div>
                <span class="font-medium">Phone:</span>
                <p class="text-xs">{invitationData.phone}</p>
              </div>
            {/if}
            {#if invitationData.team_size}
              <div>
                <span class="font-medium">Team Size:</span>
                <p class="text-xs">{invitationData.team_size}</p>
              </div>
            {/if}
            {#if invitationData.workflow_type}
              <div class="col-span-full">
                <span class="font-medium">Workflow Focus:</span>
                <p class="text-xs">{invitationData.workflow_type}</p>
              </div>
            {/if}
            {#if invitationData.expires}
              <div class="col-span-full pt-2 border-t border-blue-200 dark:border-blue-700">
                <span class="font-medium">Invitation Expires:</span>
                <p class="text-xs">{invitationData.expires.toLocaleDateString()}</p>
              </div>
            {/if}
          </div>
          
          {#if isNewUserRegistration}
            <div class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <p class="text-xs text-blue-600 dark:text-blue-400">
                ✨ This information will be used to create your secure account profile
              </p>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <p class="text-gray-600 dark:text-gray-400">
        Please sign in to access the demo application
      </p>
    {/if}
  </div>

  <!-- Auth Component or Error -->
  {#if authComponentError}
    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
      <svg class="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p class="text-red-800 dark:text-red-200 text-sm mb-4">
        {authComponentError}
      </p>
      <button
        on:click={() => window.location.reload()}
        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
      >
        Retry
      </button>
    </div>
  {:else if !authComponentLoaded}
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        Loading authentication...
      </p>
    </div>
  {:else if _SignInForm}
    <!-- Flows Auth Sign In/Registration Form -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      {#if isNewUserRegistration}
        <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div class="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium">
              {registrationMode ? 'Creating new account with passkey' : 'Sign in with existing account'}
            </span>
          </div>
        </div>
      {/if}
      
      <svelte:component 
        this={_SignInForm}
        config={authStore.config}
        showLogo={false}
        compact={false}
        initialEmail={invitationData?.email || ''}
        on:success={_handleAuthSuccess}
        on:error={_handleAuthError}
      />
    </div>

    <!-- Mode Toggle for Invitation Users -->
    {#if invitationToken}
      <div class="text-center mt-6">
        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {registrationMode ? 'Already have a Thepia account?' : 'First time using Thepia Flows?'}
          </p>
          <button
            on:click={_toggleMode}
            class="text-sm text-primary hover:underline font-medium"
          >
            {registrationMode ? 'Sign in with existing account' : 'Create account with invitation'}
          </button>
          
          {#if registrationMode}
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">
                💡 Your invitation allows you to create a secure passkey account for future access
              </p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {:else}
    <div class="text-center py-8">
      <p class="text-gray-600 dark:text-gray-400">
        Authentication component not available
      </p>
    </div>
  {/if}

  <!-- Additional Help -->
  <div class="mt-6 text-center">
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Having trouble? 
      <a href="mailto:support@thepia.com" class="text-primary hover:underline">
        Contact support
      </a>
    </p>
  </div>
</div>