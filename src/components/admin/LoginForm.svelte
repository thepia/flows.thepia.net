<script>
import { signInWithMagicLink } from '../../stores/auth.ts';

let email = '';
let _loading = false;
let _message = '';
let _error = '';

async function handleLogin() {
  if (!email) return;

  _loading = true;
  _error = '';
  _message = '';

  try {
    await signInWithMagicLink(email);
    _message = 'Check your email for the login link!';
    email = '';
  } catch (err) {
    _error = err.message || 'Failed to send login link';
  } finally {
    _loading = false;
  }
}
</script>

<div class="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
  <div class="text-center mb-8">
    <h1 class="text-2xl font-serif text-gray-900 dark:text-white mb-2">
      Admin Login
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      Enter your email to receive a login link
    </p>
  </div>
  
  <form on:submit|preventDefault={handleLogin} class="space-y-6">
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Email Address
      </label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="admin@thepia.com"
        required
        disabled={_loading}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
               dark:bg-gray-700 dark:text-white disabled:opacity-50"
      />
    </div>
    
    <button
      type="submit"
      disabled={_loading || !email}
      class="w-full bg-primary hover:bg-primary-600 text-white font-medium 
             py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
             focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      {_loading ? 'Sending...' : 'Send Login Link'}
    </button>
  </form>
  
  {#if _message}
    <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
      <p class="text-sm text-green-800 dark:text-green-300">{_message}</p>
    </div>
  {/if}
  
  {#if _error}
    <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <p class="text-sm text-red-800 dark:text-red-300">{_error}</p>
    </div>
  {/if}
  
  <div class="mt-6 text-center">
    <p class="text-xs text-gray-500 dark:text-gray-400">
      No registration available. Contact administrator for access.
    </p>
  </div>
</div>