# Registration Migration Baseline Documentation

This document captures the complete current state of registration functionality in flows.thepia.net before migration to flows-auth RegistrationForm.

**Migration Start Date**: 2025-01-18  
**flows-auth Version**: 1.0.4  
**Target**: Replace custom registration in AppSignIn.svelte with flows-auth RegistrationForm

## Current Registration Implementation Analysis

### 1. Component Structure

**Primary Component**: `src/components/app/AppSignIn.svelte`
- **Total Lines**: ~1,500 lines
- **Registration Logic**: Lines 40-450 (approx.)
- **Registration Form UI**: Lines 615-714
- **Registration Handler**: Lines 339-430
- **Mixed Concerns**: Registration, sign-in, demo initialization, invitation handling

### 2. Current Registration Flow

#### Step 1: Invitation Token Processing
```javascript
// URL Parameter Detection
const urlParams = new URLSearchParams(window.location.search);
invitationToken = urlParams.get('token');

// JWT Token Decoding
tokenData = decodeInvitationToken(invitationToken);
const tokenValidationResult = validateInvitationToken(invitationToken, tokenData);
```

#### Step 2: User Existence Check
```javascript
// Determines registration vs sign-in mode
const result = await processInvitationToken(invitationToken, authStore);
if (result.userExists) {
  // Switch to sign-in mode
  showRegistrationForm = false;
  signinEmail = result.email;
} else {
  // Show registration form
  showRegistrationForm = true;
  // Pre-fill form data
  registrationData = { ...result.registrationData };
}
```

#### Step 3: Registration Form Submission
```javascript
// Current registration data structure
let registrationData = {
  email: '',
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  jobTitle: '',
  acceptedTerms: false,
  acceptedPrivacy: false,
};
```

#### Step 4: Account Creation
```javascript
// Uses flows-auth createAccount method
const result = await authStore.createAccount({
  email: registrationData.email,
  firstName: registrationData.firstName,
  lastName: registrationData.lastName,
  acceptedTerms: registrationData.acceptedTerms,
  acceptedPrivacy: registrationData.acceptedPrivacy,
  invitationToken: invitationToken || undefined,
});
```

#### Step 5: Success Handling
```javascript
if (result.step === 'success' && result.user) {
  // Upgrade to employee storage for better UX
  configureSessionStorage({
    type: 'localStorage',
    userRole: 'employee',
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    migrateExistingSession: true,
    preserveTokens: true
  });
  
  // Clean invitation URL and redirect
  cleanInvitationUrl();
  isAuthenticated = true;
  currentUser = result.user;
}
```

### 3. Current Form Fields

#### Required Fields
- **Email**: `input[type="email"]` - readonly if from invitation token
- **First Name**: `input[type="text"]` - required
- **Last Name**: `input[type="text"]` - required
- **Terms of Service**: `checkbox` - required
- **Privacy Policy**: `checkbox` - required

#### Optional Fields
- **Company**: `input[type="text"]` - always visible
- **Phone Number**: `input[type="tel"]` - always visible
- **Job Title**: `input[type="text"]` - always visible

### 4. Current Validation Logic

#### Client-side Validation
```javascript
// Required field validation
if (!registrationData.email || !registrationData.firstName || !registrationData.lastName) {
  authError = 'Please fill in all required fields';
  return;
}

// Terms validation
if (!registrationData.acceptedTerms || !registrationData.acceptedPrivacy) {
  authError = 'You must accept the Terms of Service and Privacy Policy';
  return;
}

// Email matching validation (security)
if (tokenData.email && tokenData.email.toLowerCase() !== registrationData.email.toLowerCase()) {
  authError = 'Email address must match the invitation token.';
  return;
}
```

### 5. Current Invitation Token Features

#### Token Data Structure
```javascript
// Expected invitation token payload
{
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  company: "Acme Corp",
  phone: "+1-555-0123",
  jobTitle: "Engineer",
  expires: "2025-12-31T23:59:59Z",
  message: "Welcome to our team!"
}
```

#### Token Processing Features
- **JWT Decoding**: Custom implementation with signature validation
- **Expiration Handling**: Shows warning banner for expired tokens
- **Field Pre-filling**: Populates form fields from token data
- **Email Readonly**: Makes email field readonly when from token
- **Security Validation**: Ensures email matches token to prevent hijacking

### 6. Current User Profile Creation

#### Auth0 User Profile Format
```javascript
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
    token_validated: true,
  },
};
```

### 7. Current Styling Implementation

#### CSS Structure
- **Total CSS**: ~800 lines in `<style>` block
- **Color Scheme**: Uses `@thepia/branding` colors
- **Layout**: CSS Grid with responsive breakpoints
- **Animations**: Loading spinners, gradient backgrounds
- **Dark Mode**: Full dark/light theme support

#### Key Style Classes
```css
.app-container { /* Main container with gradient background */ }
.auth-card { /* Central auth card with shadow */ }
.form-grid { /* CSS Grid for form fields */ }
.form-field { /* Individual form field styling */ }
.submit-button { /* Primary action button */ }
.readonly { /* Readonly input styling */ }
.warning-banner { /* Expired token warning */ }
```

### 8. Current Error Handling

#### Error Types
- **Validation Errors**: Client-side field validation
- **Token Errors**: Invalid or expired invitation tokens
- **WebAuthn Errors**: Passkey creation failures
- **API Errors**: Network or server errors

#### Error Display
```javascript
// Error state management
let authError = null;

// Error display in template
{#if authError}
  <div class="error-message">
    {authError}
  </div>
{/if}
```

### 9. Current State Management

#### State Variables
```javascript
// Auth state
let authStore = null;
let authLoaded = false;
let isAuthenticated = false;
let currentUser = null;

// UI state
let determiningMode = false;
let showRegistrationForm = false;
let isSubmitting = false;
let isSigningIn = false;

// Token state
let invitationToken = null;
let tokenData = null;
let tokenValid = false;

// Form state
let registrationData = { /* form fields */ };
let signinEmail = '';
let authError = null;
```

### 10. Current Demo Integration

#### Post-Registration Demo Setup
```javascript
// After successful registration
if (result.step === 'success' && result.user) {
  // Configure storage for employee experience
  configureSessionStorage({
    type: 'localStorage',
    userRole: 'employee',
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    migrateExistingSession: true,
    preserveTokens: true
  });
  
  // Clean invitation URL
  cleanInvitationUrl();
  
  // Update auth state
  isAuthenticated = true;
  currentUser = result.user;
  
  // Demo app automatically initializes with user data
}
```

### 11. Current WebAuthn Integration

#### WebAuthn Flow
```javascript
// Uses flows-auth createAccount method
const result = await authStore.createAccount({
  email: registrationData.email,
  firstName: registrationData.firstName,
  lastName: registrationData.lastName,
  acceptedTerms: registrationData.acceptedTerms,
  acceptedPrivacy: registrationData.acceptedPrivacy,
  invitationToken: invitationToken || undefined,
});
```

#### Error Handling
- **NotAllowedError**: User cancelled or timeout
- **NotSupportedError**: WebAuthn not available
- **General Errors**: Network or server issues

### 12. Current Business Logic Requirements

#### Required Features to Preserve
1. **Invitation Token Processing**: JWT decoding, validation, expiration handling
2. **Business Fields**: Company, phone, job title collection
3. **User Existence Check**: Switch between registration and sign-in modes
4. **Demo Initialization**: Automatic demo setup after registration
5. **Storage Configuration**: Employee vs guest storage strategies
6. **URL Cleanup**: Remove invitation token from URL after use
7. **Custom Styling**: Maintain Thepia branding and UX

#### Optional Features to Improve
1. **Auto-Sign-In**: Fix potential blocking success screen
2. **Form Validation**: Improve with step-by-step validation
3. **User Experience**: Multi-step flow vs single large form
4. **Code Maintainability**: Reduce from 1500+ lines to focused components

## Migration Success Criteria

### Must-Have Features
- [ ] Invitation token processing preserved
- [ ] Business fields (company, phone, jobTitle) collected
- [ ] User existence check and mode switching
- [ ] Demo initialization after registration
- [ ] Storage configuration (employee vs guest)
- [ ] URL cleanup after registration
- [ ] Custom Thepia branding maintained

### Should-Have Improvements
- [ ] Auto-sign-in bug fixed
- [ ] Multi-step registration flow
- [ ] Better error handling
- [ ] Reduced code complexity
- [ ] Better user experience

### Could-Have Enhancements
- [ ] Progress indicators
- [ ] Back navigation between steps
- [ ] Improved mobile experience
- [ ] Better accessibility

## Pre-Migration Checklist

- [x] Document current implementation
- [x] Identify all business requirements
- [x] Analyze flows-auth RegistrationForm capabilities
- [x] Create migration plan
- [ ] Backup current implementation
- [ ] Create test plan
- [ ] Begin migration implementation

## Files to Modify

### Primary Files
- `src/components/app/AppSignIn.svelte` - Replace registration logic
- `src/utils/invitationHandler.js` - May need updates for flows-auth integration

### Secondary Files
- `src/demo/DemoApp.svelte` - May need updates for new auth events
- `src/components/app/AppSignIn.svelte` - CSS styling adaptation

### Configuration Files
- `package.json` - Ensure flows-auth version compatibility
- `astro.config.mjs` - No changes expected

## Testing Strategy

### Manual Testing Required
1. **Happy Path**: Registration with invitation token
2. **Edge Cases**: Expired tokens, invalid tokens, network errors
3. **Business Fields**: All fields properly collected and stored
4. **Auto-Sign-In**: Immediate app access after registration
5. **Demo Integration**: Proper demo initialization
6. **Responsive Design**: Mobile and desktop layouts

### Automated Testing Considerations
- No existing tests for registration logic
- Consider adding tests after migration
- Use flows-auth test patterns as reference

---

**Note**: This baseline documentation serves as the reference for migration progress tracking and rollback planning if needed.