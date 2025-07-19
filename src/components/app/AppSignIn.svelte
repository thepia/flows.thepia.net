<script lang="ts">
import { thepiaColors } from '@thepia/branding';
import { onMount } from 'svelte';
import DemoApp from '../../demo/DemoApp.svelte';
import LoadingSpinner from '../../demo/LoadingSpinner.svelte';
import { cleanInvitationUrl } from '../../utils/invitationHandler';
import { 
  createAuthStore, 
  SignInForm,
  AccountCreationForm,
  isAuthenticatedFromSession,
  getCurrentUserFromSession,
  detectApiServer,
  configureSessionStorage,
  getStorageConfig,
  decodeInvitationToken,
  validateInvitationToken,
  hashInvitationToken,
  processInvitationToken
} from '@thepia/flows-auth';

// Browser detection for Astro
const browser = typeof window !== 'undefined';

let authStore = null;
let authLoaded = false;
let determiningMode = false;
let authError = null;
let invitationToken = null;
let tokenData = null;
let showAccountCreationForm = false;
let tokenValid = false;
let signinEmail = '';
let isAuthenticated = false;
let currentUser = null;
let isSigningIn = false;
let apiBaseUrl = 'https://api.thepia.com'; // Default to production, will be updated in onMount

// Session functions - now imported statically

// Account creation form data - now handled by AccountCreationForm component

// API server detection function (imported statically)

onMount(async () => {
  if (!browser) return;

  // Check for invitation token in URL
  const urlParams = new URLSearchParams(window.location.search);
  invitationToken = urlParams.get('token');

  if (invitationToken) {
    try {
      // First, decode the token
      tokenData = decodeInvitationToken(invitationToken);
      console.log('Invitation token decoded:', tokenData);

      // Validate the token signature and expiration
      const tokenValidationResult = validateInvitationToken(invitationToken, tokenData);
      tokenValid = tokenValidationResult.isValid;
      console.log('Token validation result:', tokenValidationResult);

      if (!tokenValid) {
        authError =
          'Invalid or expired invitation token. Please contact support for a new invitation.';
        return;
      }

      // We'll check if user exists after auth store is initialized
    } catch (error) {
      console.error('Failed to decode invitation token:', error);
      authError = 'Invalid invitation link. Please contact support.';
      return;
    }
  }

  try {
    // Detect available API server (local first, then production)
    const apiServerResult = await detectApiServer();
    apiBaseUrl = apiServerResult.url;
    console.log('🔧 Using API server:', apiBaseUrl);

    // Configure storage with conservative defaults (security-first approach)
    configureSessionStorage({
      type: 'sessionStorage',
      userRole: 'guest', // Start conservative - will upgrade after authentication
      sessionTimeout: 8 * 60 * 60 * 1000 // 8 hours default
    });

    console.log('🗄️ Storage configured with conservative defaults:', getStorageConfig());
    console.log('🎨 Thepia branding colors:', thepiaColors);

    authStore = createAuthStore({
      apiBaseUrl: apiBaseUrl,
      clientId: 'thepia-flows-app',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableMagicLinks: true,
      enableSocialLogin: false,
      enablePasswordLogin: false,
      // Remove hardcoded storage config - use dynamic configuration
      applicationContext: {
        userType: 'mixed', // Public demo site with mixed user types
        forceGuestMode: true // Always start with guest mode for security
      },
      branding: {
        companyName: 'Thepia Flows',
        logoUrl: '/favicon.svg',
        primaryColor: thepiaColors.primary,
      },
    });

    // Create updateAuthState function following the implementation guide
    function updateAuthState() {
      try {
        isAuthenticated = isAuthenticatedFromSession();
        currentUser = getCurrentUserFromSession();

        console.log('🔍 Auth state updated:', {
          isAuthenticated,
          hasUser: !!currentUser,
          source: 'updateAuthState'
        });

        // Clean up invitation URL if authenticated
        if (isAuthenticated && currentUser && invitationToken) {
          cleanInvitationUrl();
          console.log('🔗 Invitation URL cleaned up after authentication');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        // Fallback to unauthenticated state
        isAuthenticated = false;
        currentUser = null;
      }
    }

    // Listen for sessionUpdate events (proper thepia.com pattern)
    window.addEventListener('sessionUpdate', (event) => {
      updateAuthState();

      console.log('🔍 Session updated via event:', {
        isAuthenticated,
        hasUser: !!currentUser,
        sessionData: event.detail
      });
    });

    // Subscribe to auth store primarily for error handling and state transitions
    authStore.subscribe(async ($auth) => {
      // Always update from session (source of truth)
      updateAuthState();

      console.log('🔍 Auth store state changed:', {
        storeState: $auth.state,
        storeUser: !!$auth.user,
        storeAccessToken: !!$auth.accessToken,
        sessionAuthenticated: isAuthenticated,
        sessionUser: !!currentUser
      });

      // Debug: Check what's in sessionStorage
      const sessionData = sessionStorage.getItem('thepia_auth_session');
      console.log('🔍 SessionStorage content:', sessionData ? 'HAS DATA' : 'EMPTY');

      // Debug: Check session functions
      if (isAuthenticatedFromSession && getCurrentUserFromSession) {
        console.log('🔍 Session function results:', {
          isAuthenticatedFromSession: isAuthenticatedFromSession(),
          getCurrentUserFromSession: getCurrentUserFromSession()
        });
      }

      // Dynamic role upgrade after successful authentication
      if ($auth.state === 'authenticated' && $auth.user) {
        const userRole = $auth.user.metadata?.role;
        console.log('🔍 User authenticated with role:', userRole);
        
        // Note: Storage configuration should be handled by the auth store itself
        // during the registration/authentication process. We don't need to manually
        // upgrade storage here since the auth store manages session persistence.
        
        if (userRole === 'employee') {
          console.log('👨‍💼 Employee user authenticated - auth store should have configured appropriate storage');
        } else if (userRole === 'admin') {
          console.log('👨‍💻 Admin user authenticated - auth store should have configured appropriate storage');
        } else {
          console.log('👤 Guest user authenticated - using conservative storage defaults');
        }
      }

      // Handle auth store errors
      if ($auth.state === 'error') {
        authError = $auth.error;
        console.error('Auth store error:', $auth.error);
      }
    });

    authLoaded = true;

    // Check for existing session on page load
    updateAuthState();
    
    console.log('🔍 Initial session check:', {
      isAuthenticated,
      hasUser: !!currentUser,
      invitationToken: !!invitationToken
    });
    
    if (isAuthenticated && currentUser) {
      console.log('🎯 User already authenticated');
      
      // Clean up invitation URL if present
      if (invitationToken) {
        cleanInvitationUrl();
        console.log('🔗 Invitation URL cleaned up (user already authenticated)');
      }
    } else if (invitationToken && tokenValid && tokenData) {
      // No existing session but have invitation token
      determiningMode = true;
      await checkTokenAndUserStatus();
      determiningMode = false;
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    authError = error.message || 'Failed to load authentication system';
  }
});

// Check token validity and user existence using flows-auth library
async function checkTokenAndUserStatus() {
  try {
    const result = await processInvitationToken(invitationToken, authStore, {
      errorReporter: (type, data) => {
        // Send to error reporter if available
        if (window.ErrorReporter) {
          if (type.includes('warning') || type.includes('Warning')) {
            window.ErrorReporter.reportWarning(type, data);
          } else {
            window.ErrorReporter.reportInfo(type, data);
          }
        }
      },
      enableDebugLogging: true
    });

    // Handle result based on recommended action
    switch (result.action) {
      case 'signin':
        showAccountCreationForm = false;
        authError = null;
        break;
        
      case 'register':
      case 'complete_registration':
        // Pre-fill registration data from token
        if (result.registrationData) {
          // Registration data is now handled by AccountCreationForm component
          // through the invitationTokenData prop
        }
        showAccountCreationForm = true;
        authError = null;
        break;
        
      case 'error':
        authError = result.error || 'Unable to verify invitation. Please try again or contact support.';
        showAccountCreationForm = false;
        break;
    }
  } catch (error) {
    console.error('Failed to check user status:', error);
    authError = 'Unable to verify invitation. Please try again or contact support.';
    showAccountCreationForm = false;
  }
}

// Handle successful authentication
function handleAuthSuccess(event) {
  const { user } = event.detail;
  console.log('Authentication successful:', user);

  // Redirect to main app
  window.location.href = '/app';
}

// Handle authentication errors
function handleAuthError(event) {
  const { error } = event.detail;
  console.error('Authentication error:', error);

  // Show user-friendly error
  authError = error.message || 'Authentication failed. Please try again.';

  // Clear error after 5 seconds
  setTimeout(() => {
    authError = null;
  }, 5000);
}

// Handle AccountCreationForm appAccess event (immediate app access after registration)
function handleAppAccess(event) {
  const { user, autoSignIn, emailVerifiedViaInvitation } = event.detail;
  console.log('📱 AccountCreationForm appAccess event received - redirecting to DemoApp:', {
    user: user?.email,
    autoSignIn,
    emailVerifiedViaInvitation
  });

  // Clean invitation URL since registration is complete
  if (invitationToken) {
    cleanInvitationUrl();
    console.log('🔗 Invitation URL cleaned up after registration completion');
  }

  // Close the registration form dialog
  showAccountCreationForm = false;

  // Redirect to DemoApp immediately - don't wait for auth store subscription
  console.log('🎯 Redirecting to /app after successful account creation');
  window.location.href = '/app';
}

// Handle AccountCreationForm success event - show DemoApp immediately
function handleRegistrationSuccess(event) {
  const { user } = event.detail;
  console.log('🎯 SUCCESS EVENT RECEIVED - showing DemoApp:', user);

  // Clean invitation URL since registration is complete
  if (invitationToken) {
    cleanInvitationUrl();
    console.log('🔗 Invitation URL cleaned up after registration completion');
  }

  // Close the registration form dialog
  showAccountCreationForm = false;

  // Update auth state to show DemoApp
  isAuthenticated = true;
  currentUser = user;

  console.log('🎯 DemoApp should now be visible');
}

// Handle AccountCreationForm error event
function handleRegistrationError(event) {
  const { error } = event.detail;
  console.error('Registration error:', error);
  authError = error.message || 'Registration failed. Please try again.';
}

// Handle switch to sign-in mode
function handleSwitchToSignIn() {
  showAccountCreationForm = false;
  signinEmail = tokenData?.email || '';
  authError = null;
}


// Invitation token utilities are now imported from @thepia/flows-auth

// Switch to sign-in mode
function switchToSignIn() {
  showAccountCreationForm = false;
  authError = null;
}

// Handle passkey sign-in
async function handlePasskeySignIn() {
  if (!signinEmail.trim()) {
    authError = 'Please enter your email address';
    return;
  }

  isSigningIn = true;
  authError = null;

  try {
    // Try to sign in with passkey using flows-auth
    console.log('🔍 DEMO: About to call authStore.signInWithPasskey with:', signinEmail);
    console.log('🔍 DEMO: authStore type:', typeof authStore);
    console.log('🔍 DEMO: authStore.signInWithPasskey type:', typeof authStore?.signInWithPasskey);
    
    const result = await authStore.signInWithPasskey(signinEmail);
    
    console.log('🔍 DEMO: signInWithPasskey result:', result);

    if (result.step === 'success' && result.user) {
      // Sign-in successful - auth store handles session persistence
      console.log('✅ Passkey sign-in successful:', result.user?.email);
      console.log('🔍 Auth store will handle session persistence and storage configuration');
    }
  } catch (error) {
    console.error('Passkey sign-in failed:', error);
    
    // Send detailed error to error reports for debugging
    if (window.ErrorReporter) {
      window.ErrorReporter.reportError('WebAuthn sign-in failure', {
        email: signinEmail,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    }

    // Handle specific error cases
    if (error.message?.includes('NotAllowedError')) {
      authError = 'Passkey authentication was cancelled. Please try again.';
    } else if (error.message?.includes('NotSupportedError')) {
      authError = 'Passkey authentication is not supported on this device.';
    } else if (error.message?.includes('InvalidStateError')) {
      authError = 'No passkey found for this email address.';
    } else if (error.message?.includes('not found') || error.message?.includes('404')) {
      authError = 'No account found with this email address.';
    } else {
      authError = error.message || 'Sign-in failed. Please try again.';
    }
  } finally {
    isSigningIn = false;
  }
}
</script>

<!-- Full-screen App Container -->
<div class="app-container" style="--thepia-primary: {thepiaColors.primary}; --thepia-primary-600: {thepiaColors.primaryDark}; --thepia-secondary: {thepiaColors.secondary}; --brand-primary: {thepiaColors.primary}; --brand-primary-dark: {thepiaColors.primaryDark}">
  <!-- Background Pattern -->
  <div class="background-pattern"></div>
  
  <!-- Main Content -->
  <div class="content" class:registration-mode={showAccountCreationForm}>
    <!-- Logo and Title -->
    <div class="app-header">
      <div class="brand-lockup">
        <img src="/logo.svg" alt="Thepia" class="brand-logo" />
        <h1 class="brand-title">
          <span class="brand-flows">Flows</span>
        </h1>
      </div>
      <p class="app-tagline">Streamline your workflows with intelligent automation</p>
    </div>

    <!-- Auth Container -->
    <div class="auth-section">
      {#if authError}
        <!-- Error Message -->
        <div class="error-banner">
          <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{authError}</span>
        </div>
      {/if}

      {#if !authLoaded}
        <!-- Loading State -->
        <div class="loading-container">
          <LoadingSpinner />
          <p class="loading-text">Initializing secure authentication...</p>
        </div>
      {:else if determiningMode}
        <!-- Determining Login vs Register Animation -->
        <div class="determining-container">
          <div class="determining-animation">
            <svg width="120" height="120" viewBox="0 0 120 120" class="auth-spinner">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--color-primary)"
                stroke-width="3"
                stroke-dasharray="157"
                stroke-dashoffset="157"
                stroke-linecap="round"
                class="circle-bg"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="var(--color-primary)"
                stroke-width="3"
                stroke-dasharray="157"
                stroke-linecap="round"
                class="circle-progress"
              />
              <g class="auth-icons">
                <circle cx="60" cy="60" r="25" fill="var(--color-primary)" fill-opacity="0.1" class="center-circle" />
                <!-- Key icon -->
                <path
                  d="M60 45 L60 35 M52 43 L68 43 M55 46 L65 46 M58 49 L62 49"
                  stroke="var(--color-primary)"
                  stroke-width="2"
                  stroke-linecap="round"
                  fill="none"
                  class="key-icon"
                />
                <!-- User icon -->
                <circle
                  cx="60"
                  cy="55"
                  r="8"
                  fill="none"
                  stroke="var(--color-primary)"
                  stroke-width="2"
                  class="user-head"
                />
                <path
                  d="M45 75 C45 68, 51 62, 60 62 C69 62, 75 68, 75 75"
                  fill="none"
                  stroke="var(--color-primary)"
                  stroke-width="2"
                  stroke-linecap="round"
                  class="user-body"
                />
              </g>
            </svg>
          </div>
          <p class="determining-text">Checking invitation details...</p>
        </div>
      {:else if showAccountCreationForm && tokenData && authStore && authLoaded}
        <!-- Account Creation Form with flows-auth AccountCreationForm -->
        <AccountCreationForm
            config={{
              apiBaseUrl: apiBaseUrl,
              clientId: 'thepia-flows-app',
              domain: 'thepia.net',
              enablePasskeys: true,
              enableMagicLinks: true,
              enableSocialLogin: false,
              enablePasswordLogin: false,
              branding: {
                companyName: 'Thepia',
                logoUrl: '/logo.svg',
                primaryColor: thepiaColors.primary,
                showPoweredBy: false
              }
            }}
            additionalFields={['company', 'phone', 'jobTitle']}
            invitationTokenData={tokenData}
            readOnlyFields={tokenData ? [
              ...(tokenData.email ? ['email'] : []),
              ...(tokenData.firstName ? ['firstName'] : []),
              ...(tokenData.lastName ? ['lastName'] : []),
              ...(tokenData.company ? ['company'] : []),
              ...(tokenData.phone ? ['phone'] : []),
              ...(tokenData.jobTitle ? ['jobTitle'] : [])
            ] : []}
            initialEmail={tokenData?.email || ''}
            onSwitchToSignIn={handleSwitchToSignIn}
            showLogo={false}
            compact={false}
            on:appAccess={handleAppAccess}
            on:success={handleRegistrationSuccess}
            on:error={handleRegistrationError}
          />
      {:else if authLoaded && !isAuthenticated && !showAccountCreationForm}
        <!-- Regular Passkey Sign In -->
        <div class="signin-container">
          <h2 class="signin-title">Sign In</h2>
          <p class="signin-subtitle">Use your passkey to securely access your account</p>
          
          <form on:submit|preventDefault={handlePasskeySignIn}>
            <div class="form-field">
              <label for="signin-email">Email Address</label>
              <input
                id="signin-email"
                type="email"
                bind:value={signinEmail}
                placeholder="your.email@company.com"
                required
                disabled={isSigningIn}
              />
            </div>
            
            <button 
              type="submit" 
              class="signin-button"
              disabled={isSigningIn || !signinEmail.trim()}
            >
              {#if isSigningIn}
                <span class="loading-spinner"></span>
                Signing in...
              {:else}
                🔑 Sign in with Passkey
              {/if}
            </button>
          </form>
          
          <div class="signin-info">
            <div class="passkey-info">
              <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-9a2 2 0 00-2-2H6a2 2 0 00-2 2v9a2 2 0 002 2z"></path>
              </svg>
              <span>Your device will prompt for Touch ID, Face ID, or Windows Hello</span>
            </div>
          </div>
        </div>
      {:else if isAuthenticated && currentUser}
        <!-- Authenticated Demo App -->
        <DemoApp />
      {:else}
        <!-- Fallback -->
        <div class="fallback-container">
          <p>Authentication system unavailable</p>
          <button on:click={() => window.location.reload()} class="retry-button">
            Retry
          </button>
        </div>
      {/if}
    </div>

    <!-- Footer Links -->
    <div class="app-footer">
      <a href="/" class="footer-link">← Back to Home</a>
      {#if !showAccountCreationForm}
        <span class="footer-divider">•</span>
        <button class="footer-link" disabled={isAuthenticated}>
          Try Demo
        </button>
      {/if}
      <span class="footer-divider">•</span>
      <a href="https://thepia.com/contact" class="footer-link">Contact Support</a>
    </div>
  </div>
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  }

  /* Auth container styling - only for login form, not registration form */
  .signin-container {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
    padding: 32px 32px;
  }

  .background-pattern {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 20% 80%, rgba(152, 138, 202, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(91, 154, 111, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(152, 138, 202, 0.05) 0%, transparent 50%);
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 440px;
    padding: 20px;
  }

  /* Wider container when showing registration form */
  .content.registration-mode {
    max-width: 600px;
  }

  .app-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .brand-logo {
    height: 32px;
    max-width: 160px;
    object-fit: contain;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
    flex-shrink: 0;
  }

  .brand-title {
    font-size: 45px;
    font-weight: 300;
    color: #1a202c;
    margin: 0;
    line-height: 1;
    font-family: 'EB Garamond', 'New York', Times, serif;
    letter-spacing: -0.02em;
  }

  .brand-thepia {
    font-weight: 600;
    color: var(--thepia-primary);
  }

  .brand-flows {
    font-weight: 300;
    color: #1a202c;
    font-style: italic;
    margin-left: 8px;
  }

  .app-tagline {
    font-size: 16px;
    color: #64748b;
    margin: 0;
  }


  .error-banner {
    background: #fee2e2;
    color: #991b1b;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .error-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .loading-container {
    padding: 48px 24px;
    text-align: center;
  }

  .loading-text {
    margin-top: 16px;
    color: #64748b;
    font-size: 14px;
  }

  .signin-wrapper {
    /* The SignInForm component will handle its own padding */
  }

  .demo-container {
    padding: 32px 24px;
    text-align: center;
  }

  .demo-container h2 {
    font-size: 24px;
    font-weight: 600;
    color: #1a202c;
    margin: 0 0 8px 0;
  }

  .demo-container p {
    color: #64748b;
    margin: 0 0 24px 0;
  }

  .demo-back-button {
    background: none;
    border: none;
    color: var(--thepia-primary);
    font-size: 14px;
    cursor: pointer;
    padding: 8px 16px;
    border-radius: 8px;
    transition: background-color 0.2s;
  }

  .demo-back-button:hover {
    background: rgba(152, 138, 202, 0.1);
  }

  .fallback-container {
    padding: 48px 24px;
    text-align: center;
  }

  .fallback-container p {
    color: #64748b;
    margin: 0 0 16px 0;
  }

  .retry-button {
    background: var(--thepia-primary);
    color: white;
    border: none;
    padding: 8px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-button:hover {
    background: var(--thepia-primary-600);
    transform: translateY(-1px);
  }

  .app-footer {
    text-align: center;
    font-size: 14px;
  }

  .footer-link {
    color: #64748b;
    text-decoration: none;
    transition: color 0.2s;
    background: none;
    border: none;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  .footer-link:hover:not(:disabled) {
    color: var(--thepia-primary);
  }

  .footer-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .footer-divider {
    color: #cbd5e1;
    margin: 0 12px;
  }

  /* Mobile Responsive */
  @media (max-width: 480px) {
    .content {
      padding: 16px;
    }

    .brand-lockup {
      gap: 12px;
    }

    .brand-logo {
      height: 26px;
      max-width: 130px;
    }

    .brand-title {
      font-size: 35px;
    }

    .brand-flows {
      margin-left: 6px;
    }

    .app-tagline {
      font-size: 14px;
    }


    .app-footer {
      font-size: 12px;
    }

    .footer-divider {
      margin: 0 8px;
    }
  }

  /* Sign In Form Styles */
  .signin-container {
    padding: 32px 32px;
  }

  .signin-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a202c;
    margin: 0 0 8px 0;
    text-align: center;
  }

  .signin-subtitle {
    color: #64748b;
    text-align: center;
    margin: 0 0 32px 0;
    font-size: 14px;
  }

  .signin-button {
    width: 100%;
    background: var(--thepia-primary);
    color: white;
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .signin-button:hover:not(:disabled) {
    background: var(--thepia-primary-600);
    transform: translateY(-1px);
  }

  .signin-button:disabled {
    background: #d1d5db;
    color: #6b7280;
    cursor: not-allowed;
    transform: none;
  }

  .signin-button .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .signin-info {
    text-align: center;
  }

  .passkey-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    color: #10b981;
    font-weight: 500;
  }

  .info-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* Registration Form Styles */
  .registration-container {
    padding: 32px 32px;
  }

  .registration-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a202c;
    margin: 0 0 8px 0;
    text-align: center;
  }

  .registration-subtitle {
    color: #64748b;
    text-align: center;
    margin: 0 0 24px 0;
    font-size: 14px;
  }

  .warning-banner {
    background: #fef3c7;
    color: #92400e;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .warning-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
  }

  .form-field:first-child {
    grid-column: 1 / -1;
  }

  /* Make company field span full width too */
  .form-field:nth-child(4) {
    grid-column: 1 / -1;
  }

  .form-field label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
  }

  .form-field input {
    padding: 12px 16px;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;
  }

  .form-field input:focus {
    outline: none;
    border-color: var(--thepia-primary);
    box-shadow: 0 0 0 3px rgba(152, 138, 202, 0.1);
  }

  .form-field input.readonly {
    background: #f9fafb;
    cursor: not-allowed;
  }

  .required {
    color: #ef4444;
  }

  .terms-container {
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    color: #374151;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    margin-top: 2px;
    width: 16px;
    height: 16px;
    accent-color: var(--thepia-primary);
  }

  .checkbox-label a {
    color: var(--thepia-primary);
    text-decoration: none;
  }

  .checkbox-label a:hover {
    text-decoration: underline;
  }

  .submit-button {
    width: 100%;
    background: var(--thepia-primary);
    color: white;
    border: none;
    padding: 16px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 16px;
  }

  .submit-button:hover:not(:disabled) {
    background: var(--thepia-primary-600);
    transform: translateY(-1px);
  }

  .submit-button:disabled {
    background: #d1d5db;
    color: #6b7280;
    cursor: not-allowed;
    transform: none;
  }

  .submit-button .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 8px;
  }

  .form-footer {
    text-align: center;
    font-size: 14px;
    color: #64748b;
  }

  .link-button {
    background: none;
    border: none;
    color: var(--thepia-primary);
    cursor: pointer;
    text-decoration: underline;
    font: inherit;
    padding: 0;
  }

  .link-button:hover {
    color: var(--thepia-primary-600);
  }

  /* Mobile responsive for registration form */
  @media (max-width: 768px) {
    .content.registration-mode {
      max-width: 100%;
      padding: 16px;
    }
    
    .form-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    
    .form-field:first-child,
    .form-field:nth-child(4) {
      grid-column: 1;
    }
  }

  @media (max-width: 480px) {
    .registration-container {
      padding: 24px 16px;
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .app-container {
      background: linear-gradient(135deg, #1a202c 0%, #2d3748 100%);
    }

    .brand-title {
      color: #f7fafc;
    }

    .brand-flows {
      color: #e2e8f0;
    }

    .app-tagline {
      color: #a0aec0;
    }

    .signin-title {
      color: #f7fafc;
    }

    .signin-subtitle {
      color: #a0aec0;
    }


    .error-banner {
      background: #742a2a;
      color: #fed7d7;
    }

    .registration-title {
      color: #f7fafc;
    }

    .registration-subtitle {
      color: #a0aec0;
    }

    .warning-banner {
      background: #78350f;
      color: #fed7aa;
    }

    .form-field label {
      color: #e2e8f0;
    }

    .form-field input {
      background: #374151;
      border-color: #4a5568;
      color: #f7fafc;
    }

    .form-field input:focus {
      border-color: var(--thepia-primary);
    }

    .form-field input.readonly {
      background: #1f2937;
    }

    .checkbox-label {
      color: #e2e8f0;
    }

    .form-footer {
      color: #a0aec0;
    }

    .loading-text,
    .fallback-container p,
    .demo-container p {
      color: #a0aec0;
    }

    .demo-container h2 {
      color: #f7fafc;
    }

    .footer-link {
      color: #a0aec0;
    }

    .footer-link:hover:not(:disabled) {
      color: var(--thepia-primary);
    }

    .footer-divider {
      color: #4a5568;
    }
  }
  /* Determining Mode Animation */
  .determining-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    text-align: center;
  }

  .determining-animation {
    margin-bottom: 24px;
  }

  .auth-spinner {
    animation: gentle-rotate 3s linear infinite;
  }

  .circle-bg {
    opacity: 0.2;
  }

  .circle-progress {
    animation: draw-circle 2s ease-in-out infinite;
    transform-origin: center;
  }

  .auth-icons {
    animation: fade-pulse 2s ease-in-out infinite;
  }

  .center-circle {
    animation: scale-pulse 2s ease-in-out infinite;
  }

  .key-icon {
    animation: key-bounce 1.5s ease-in-out infinite;
    transform-origin: center;
  }

  .user-head, .user-body {
    animation: user-fade 2.5s ease-in-out infinite;
  }

  .determining-text {
    color: var(--color-primary);
    font-size: 16px;
    font-weight: 500;
    margin: 0;
    animation: text-pulse 2s ease-in-out infinite;
  }

  /* Animation Keyframes */
  @keyframes gentle-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes draw-circle {
    0% { 
      stroke-dashoffset: 157;
      opacity: 0.3;
    }
    50% { 
      stroke-dashoffset: 0;
      opacity: 1;
    }
    100% { 
      stroke-dashoffset: -157;
      opacity: 0.3;
    }
  }

  @keyframes fade-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  @keyframes scale-pulse {
    0%, 100% { 
      transform: scale(1);
      opacity: 0.1;
    }
    50% { 
      transform: scale(1.1);
      opacity: 0.2;
    }
  }

  @keyframes key-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    25% { transform: translateY(-2px) scale(1.05); }
    75% { transform: translateY(1px) scale(0.98); }
  }

  @keyframes user-fade {
    0%, 100% { opacity: 0.7; }
    33% { opacity: 1; }
    66% { opacity: 0.8; }
  }

  @keyframes text-pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }
</style>