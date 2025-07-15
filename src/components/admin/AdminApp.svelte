<script>
import { isAdmin, loading, signOut, user } from '../../stores/auth.ts';
import InvitationsViewSimple from './InvitationsViewSimple.svelte';
import TestInvitationFlow from './TestInvitationFlow.svelte';
import LoginForm from './LoginForm.svelte';

let _showUserMenu = false;

function handleSignOut() {
  signOut();
  _showUserMenu = false;
}
</script>

{#if $loading}
  <!-- Loading State -->
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p class="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
{:else if !$user}
  <!-- Login Form -->
  <div class="min-h-screen flex items-center justify-center p-4">
    <LoginForm />
  </div>
{:else if !$isAdmin}
  <!-- Access Denied -->
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
      <div class="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h2 class="text-xl font-serif text-gray-900 dark:text-white mb-2">
        Access Denied
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        You don't have administrator privileges. Contact the system administrator for access.
      </p>
      
      <button
        on:click={handleSignOut}
        class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        Sign Out
      </button>
    </div>
  </div>
{:else}
  <!-- Admin Interface -->
  <div class="min-h-screen">
    <!-- Navigation Bar -->
    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <!-- Logo/Title -->
          <div class="flex items-center">
            <h1 class="text-xl font-serif text-gray-900 dark:text-white">
              Thepia Flows Admin
            </h1>
          </div>
          
          <!-- User Menu -->
          <div class="flex items-center">
            <div class="relative">
              <button
                on:click={() => _showUserMenu = !_showUserMenu}
                class="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span class="mr-2">{$user.email}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {#if _showUserMenu}
                <div class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    on:click={handleSignOut}
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Sign Out
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <!-- Test Invitation Flow Section -->
      <section>
        <TestInvitationFlow />
      </section>
      
      <!-- Invitations Management Section -->
      <section>
        <InvitationsViewSimple />
      </section>
    </main>
  </div>
{/if}

<!-- Click outside to close user menu -->
{#if _showUserMenu}
  <div 
    class="fixed inset-0 z-0" 
    role="button"
    tabindex="-1"
    on:click={() => _showUserMenu = false}
    on:keydown={(e) => e.key === 'Escape' && (_showUserMenu = false)}
  ></div>
{/if}