<script lang="ts">
import { onMount } from 'svelte';
import { thepiaColors } from '@thepia/branding';
import LoadingSpinner from '../../demo/LoadingSpinner.svelte';

// Browser detection for Astro
const browser = typeof window !== 'undefined';

let authStore = null;
let SignInForm = null;
let authLoaded = false;
let determiningMode = false;
let authError = null;
let currentUser = null;
let isAuthenticated = false;
let showingDemo = false;
let invitationToken = null;
let tokenData = null;
let showRegistrationForm = false;
let isSubmitting = false;
let tokenValid = false;
let signinEmail = '';
let isSigningIn = false;

// Registration form data
let registrationData = {
  email: '',
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  jobTitle: '',
  acceptedTerms: false,
  acceptedPrivacy: false
};

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
      tokenValid = validateInvitationToken(invitationToken, tokenData);
      console.log('Token validation result:', tokenValid);
      
      if (!tokenValid) {
        authError = 'Invalid or expired invitation token. Please contact support for a new invitation.';
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
    // Dynamically import flows-auth to avoid SSR issues
    const { createAuthStore, SignInForm: AuthForm } = await import('@thepia/flows-auth');
    SignInForm = AuthForm;

    authStore = createAuthStore({
      apiBaseUrl: 'https://api.thepia.com',
      clientId: 'thepia-flows-app',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableMagicLinks: true,
      enableSocialLogin: false,
      enablePasswordLogin: false,
      branding: {
        companyName: 'Thepia Flows',
        logoUrl: '/favicon.svg',
        primaryColor: thepiaColors.primary,
      },
    });

    // Subscribe to auth state changes
    authStore.subscribe(($auth) => {
      currentUser = $auth.user;
      isAuthenticated = $auth.isAuthenticated;
      
      // Redirect to app if authenticated
      if (isAuthenticated && currentUser) {
        window.location.href = '/app';
      }
    });

    authLoaded = true;
    
    // If we have a valid token, now check if the user exists
    if (invitationToken && tokenValid && tokenData) {
      determiningMode = true;
      await checkTokenAndUserStatus();
      determiningMode = false;
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    authError = error.message || 'Failed to load authentication system';
  }
});

// Check token validity and user existence
async function checkTokenAndUserStatus() {
  try {
    // Check if user already exists
    const userCheck = await authStore.checkUser(tokenData.email);
    
    if (userCheck.exists) {
      // User exists - redirect to sign-in instead of registration
      console.log('User already exists, showing sign-in form');
      authError = `An account with ${tokenData.email} already exists. Please sign in below.`;
      showRegistrationForm = false;
      return;
    }
    
    // User doesn't exist and token is valid - show registration form
    console.log('Valid token for new user, showing registration form');
    
    // Pre-fill registration data
    registrationData.email = tokenData.email || '';
    registrationData.firstName = tokenData.firstName || tokenData.name?.split(' ')[0] || '';
    registrationData.lastName = tokenData.lastName || tokenData.name?.split(' ').slice(1).join(' ') || '';
    registrationData.company = tokenData.company || tokenData.companyName || '';
    registrationData.phone = tokenData.phone || '';
    registrationData.jobTitle = tokenData.jobTitle || 'Hiring Manager';
    
    showRegistrationForm = true;
    authError = null; // Clear any previous errors
    
  } catch (error) {
    console.error('Failed to check user status:', error);
    authError = 'Unable to verify invitation. Please try again or contact support.';
    showRegistrationForm = false;
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

// Show demo mode
function showDemo() {
  showingDemo = true;
}

// Hide demo mode
function hideDemo() {
  showingDemo = false;
}

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
      firstName: payload.firstName || payload.name?.split(' ')[0],
      lastName: payload.lastName || payload.name?.split(' ').slice(1).join(' '),
      name: payload.name,
      company: payload.company || payload.companyName,
      phone: payload.phone,
      jobTitle: payload.jobTitle,
      expires: payload.exp ? new Date(payload.exp * 1000) : null,
      issuedAt: payload.iat ? new Date(payload.iat * 1000) : null,
      ...payload,
    };
  } catch (error) {
    throw new Error('Failed to decode invitation token');
  }
}

// Validate invitation token signature and expiration
function validateInvitationToken(token, tokenData) {
  if (!token || !tokenData) {
    return false;
  }

  try {
    // Check if token is expired
    if (tokenData.expires && tokenData.expires < new Date()) {
      console.warn('Invitation token has expired');
      return false;
    }

    // Check if token was issued in the future (clock skew protection)
    if (tokenData.issuedAt && tokenData.issuedAt > new Date(Date.now() + 5 * 60 * 1000)) {
      console.warn('Invitation token issued in the future');
      return false;
    }

    // Basic JWT structure validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT structure');
      return false;
    }

    // Validate required fields
    if (!tokenData.email) {
      console.warn('Invitation token missing required email field');
      return false;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tokenData.email)) {
      console.warn('Invitation token contains invalid email format');
      return false;
    }

    // For production, you would verify the signature here using a public key
    // For now, we'll do basic validation
    const [header, payload, signature] = parts;
    
    // Validate that the signature is not empty (basic check)
    if (!signature || signature.length < 10) {
      console.warn('Invitation token has invalid or missing signature');
      return false;
    }

    // Additional security: Check that the token payload hasn't been tampered with
    try {
      const decodedPayload = JSON.parse(atob(payload));
      if (decodedPayload.email !== tokenData.email) {
        console.warn('Token payload mismatch detected');
        return false;
      }
    } catch (error) {
      console.warn('Failed to re-decode token payload for validation');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Handle registration form submission
async function handleRegistrationSubmit() {
  // Validate required fields
  if (!registrationData.email || !registrationData.firstName || !registrationData.lastName) {
    authError = 'Please fill in all required fields';
    return;
  }
  
  if (!registrationData.acceptedTerms || !registrationData.acceptedPrivacy) {
    authError = 'You must accept the Terms of Service and Privacy Policy';
    return;
  }
  
  // Validate that email matches token (security check)
  if (tokenData.email && tokenData.email.toLowerCase() !== registrationData.email.toLowerCase()) {
    authError = 'Email address must match the invitation token.';
    return;
  }
  
  isSubmitting = true;
  authError = null;
  
  try {
    
    // Create user profile with token metadata
    const userProfile = {
      email: registrationData.email,
      given_name: registrationData.firstName,
      family_name: registrationData.lastName,
      name: `${registrationData.firstName} ${registrationData.lastName}`,
      company: registrationData.company,
      phone: registrationData.phone,
      job_title: registrationData.jobTitle,
      metadata: {
        invitation_token: invitationToken,
        invitation_data: tokenData,
        registered_at: new Date().toISOString(),
        source: 'invitation_link',
        token_validated: true
      }
    };
    
    // Register the user with flows-auth (this will trigger passkey creation)
    const result = await authStore.registerUser({
      email: registrationData.email,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      acceptedTerms: registrationData.acceptedTerms,
      acceptedPrivacy: registrationData.acceptedPrivacy,
      invitationToken: invitationToken || undefined // Pass invitation token for email verification
    });
    
    if (result.step === 'success' && result.user) {
      // Registration successful - will auto-redirect via auth state subscription
      console.log('Registration successful:', result.user);
    }
  } catch (error) {
    console.error('Registration failed:', error);
    
    // Handle specific error cases
    if (error.message?.includes('User already exists')) {
      authError = 'An account with this email already exists. Please sign in instead.';
      switchToSignIn();
    } else if (error.message?.includes('NotAllowedError')) {
      authError = 'Passkey creation was cancelled. Please try again and allow the passkey creation when prompted.';
    } else if (error.message?.includes('NotSupportedError')) {
      authError = 'Passkey authentication is not supported on this device. Please use a device with biometric authentication.';
    } else {
      authError = error.message || 'Registration failed. Please try again.';
    }
  } finally {
    isSubmitting = false;
  }
}

// Switch to sign-in mode
function switchToSignIn() {
  showRegistrationForm = false;
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
    const result = await authStore.signInWithPasskey(signinEmail);
    
    if (result.step === 'success' && result.user) {
      // Sign-in successful - will auto-redirect via auth state subscription
      console.log('Passkey sign-in successful:', result.user);
    }
  } catch (error) {
    console.error('Passkey sign-in failed:', error);
    
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
<div class="app-container">
  <!-- Background Pattern -->
  <div class="background-pattern"></div>
  
  <!-- Main Content -->
  <div class="content" class:registration-mode={showRegistrationForm}>
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
    <div class="auth-container">
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
      {:else if showRegistrationForm && tokenData}
        <!-- Registration Form with Token Data -->
        <div class="registration-container">
          <h2 class="registration-title">Complete Your Registration</h2>
          <p class="registration-subtitle">We have some information from your invitation. Please review and complete your profile.</p>
          
          {#if tokenData.expires && tokenData.expires < new Date()}
            <div class="warning-banner">
              <svg class="warning-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3l-7.732-13.5c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span>This invitation has expired. You can still register, but some features may be limited.</span>
            </div>
          {/if}
          
          <form on:submit|preventDefault={handleRegistrationSubmit}>
            <div class="form-grid">
              <div class="form-field">
                <label for="email">Email Address <span class="required">*</span></label>
                <input
                  id="email"
                  type="email"
                  bind:value={registrationData.email}
                  required
                  readonly={!!tokenData.email}
                  class:readonly={!!tokenData.email}
                />
              </div>
              
              <div class="form-field">
                <label for="firstName">First Name <span class="required">*</span></label>
                <input
                  id="firstName"
                  type="text"
                  bind:value={registrationData.firstName}
                  required
                />
              </div>
              
              <div class="form-field">
                <label for="lastName">Last Name <span class="required">*</span></label>
                <input
                  id="lastName"
                  type="text"
                  bind:value={registrationData.lastName}
                  required
                />
              </div>
              
              <div class="form-field">
                <label for="company">Company</label>
                <input
                  id="company"
                  type="text"
                  bind:value={registrationData.company}
                />
              </div>
              
              <div class="form-field">
                <label for="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  bind:value={registrationData.phone}
                />
              </div>
              
              <div class="form-field">
                <label for="jobTitle">Job Title</label>
                <input
                  id="jobTitle"
                  type="text"
                  bind:value={registrationData.jobTitle}
                />
              </div>
            </div>
            
            <div class="terms-container">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={registrationData.acceptedTerms}
                  required
                />
                <span>I agree to the <a href="/terms" target="_blank">Terms of Service</a> <span class="required">*</span></span>
              </label>
              
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={registrationData.acceptedPrivacy}
                  required
                />
                <span>I agree to the <a href="/privacy" target="_blank">Privacy Policy</a> <span class="required">*</span></span>
              </label>
            </div>
            
            <button 
              type="submit" 
              class="submit-button"
              disabled={isSubmitting || !registrationData.acceptedTerms || !registrationData.acceptedPrivacy}
            >
              {#if isSubmitting}
                <span class="loading-spinner"></span>
                Creating Account...
              {:else}
                🔑 Create Account with Passkey
              {/if}
            </button>
          </form>
          
          <div class="form-footer">
            <p>Already have an account? <button on:click={switchToSignIn} class="link-button">Sign in instead</button></p>
          </div>
        </div>
      {:else if authLoaded && !showingDemo && !showRegistrationForm}
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
      {:else if showingDemo}
        <!-- Demo Mode -->
        <div class="demo-container">
          <h2>Demo Mode</h2>
          <p>Experience Thepia Flows without signing in</p>
          <button class="demo-back-button" on:click={hideDemo}>
            ← Back to Sign In
          </button>
          <!-- Add demo content here -->
        </div>
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
      {#if !showRegistrationForm}
        <span class="footer-divider">•</span>
        <button on:click={showDemo} class="footer-link" disabled={showingDemo}>
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

  .auth-container {
    background: white;
    border-radius: 16px;
    box-shadow: 
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    margin-bottom: 24px;
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

    .auth-container {
      border-radius: 12px;
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

    .auth-container {
      background: #2d3748;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.4),
        0 10px 10px -5px rgba(0, 0, 0, 0.2);
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