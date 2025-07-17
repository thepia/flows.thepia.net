# Authentication Implementation Guide for flows.thepia.net

## Overview

This guide provides the definitive implementation plan for authentication in flows.thepia.net. This document must be followed exactly to ensure reliable authentication functionality.

## Architecture Reference

**Source**: `/Volumes/Projects/Thepia/thepia.com/docs/auth/authentication-state-machine.md`

The authentication system uses:
- **flows-auth**: Svelte library for WebAuthn authentication
- **sessionStorage**: Authentication state persistence
- **Event-driven updates**: Cross-component communication

## Authentication States

### 1. Initial State (`CheckingSession`)
- **Purpose**: Check for existing authentication on page load
- **Implementation**: Call `isAuthenticatedFromSession()` and `getCurrentUserFromSession()`
- **UI**: Loading state
- **Transitions**: → `SessionValid` OR → `SessionInvalid`

### 2. Valid Session State (`SessionValid`)
- **Purpose**: User is authenticated, show app content
- **Implementation**: Display `<DemoApp />` component
- **UI**: Full authenticated application
- **Persistence**: Session data in sessionStorage

### 3. Invalid Session State (`SessionInvalid`)
- **Purpose**: User needs to authenticate
- **Implementation**: Show sign-in form
- **UI**: Authentication form with WebAuthn
- **Transitions**: → `SessionValid` (after successful auth)

## Required Implementation

### 1. Authentication State Variables

```typescript
// In AppSignIn.svelte
let isAuthenticated = false;
let currentUser = null;
let authLoaded = false;
```

### 2. Session Functions Import

```typescript
// Dynamic import in onMount
const { 
  isAuthenticatedFromSession,
  getCurrentUserFromSession 
} = await import('@thepia/flows-auth');
```

### 3. State Update Functions

```typescript
function updateAuthState() {
  isAuthenticated = isAuthenticatedFromSession();
  currentUser = getCurrentUserFromSession();
}
```

### 4. Event Listeners

```typescript
// Listen for session updates
window.addEventListener('sessionUpdate', (event) => {
  updateAuthState();
});

// Listen for auth store changes
authStore.subscribe(($auth) => {
  updateAuthState();
});
```

### 5. Template Logic

```svelte
{#if !authLoaded}
  <!-- Loading state -->
{:else if !isAuthenticated}
  <!-- Sign-in form -->
{:else}
  <!-- Authenticated app -->
  <DemoApp />
{/if}
```

## Critical Requirements

### 1. NO State Duplication
- **NEVER** create duplicate authentication state variables
- **ALWAYS** use flows-auth session functions as single source of truth
- **AVOID** `showingDemo` or similar UI state variables

### 2. Reactive Updates
- **MUST** update UI state when session changes
- **MUST** listen to both `sessionUpdate` events and auth store changes
- **MUST** check session state on page load

### 3. Session Persistence
- **MUST** use sessionStorage for state persistence
- **MUST** dispatch `sessionUpdate` events when session changes
- **MUST** maintain session across page reloads

## Implementation Steps

### Step 1: Clean Up Existing Code
1. Remove any `showingDemo` state variables
2. Remove duplicate authentication state
3. Remove manual state management logic

### Step 2: Implement Session State
1. Add reactive variables for UI state
2. Import session functions dynamically
3. Create updateAuthState function

### Step 3: Add Event Listeners
1. Listen for sessionUpdate events
2. Listen for auth store changes
3. Update UI state in both listeners

### Step 4: Update Template
1. Use reactive variables in template
2. Show loading/signin/authenticated states
3. Remove any hardcoded state checks

### Step 5: Test Authentication Flow
1. Initial page load shows correct state
2. Authentication updates UI immediately
3. Page reload preserves authenticated state
4. Sign out clears state properly

## State Machine Implementation

```typescript
// Simplified state machine following thepia.com patterns
interface AuthState {
  current: 'checking' | 'authenticated' | 'unauthenticated';
  user: User | null;
  error: string | null;
}

function createAuthStateMachine() {
  let state: AuthState = {
    current: 'checking',
    user: null,
    error: null
  };

  function transition(event: AuthEvent) {
    switch (event.type) {
      case 'SESSION_VALID':
        state = {
          current: 'authenticated',
          user: event.user,
          error: null
        };
        break;
      
      case 'SESSION_INVALID':
        state = {
          current: 'unauthenticated',
          user: null,
          error: null
        };
        break;
      
      case 'AUTHENTICATION_ERROR':
        state = {
          current: 'unauthenticated',
          user: null,
          error: event.error
        };
        break;
    }
  }

  return { state, transition };
}
```

## Error Handling

### 1. Session Function Errors
```typescript
try {
  isAuthenticated = isAuthenticatedFromSession();
  currentUser = getCurrentUserFromSession();
} catch (error) {
  console.error('Session check failed:', error);
  // Fallback to unauthenticated state
  isAuthenticated = false;
  currentUser = null;
}
```

### 2. Authentication Errors
```typescript
authStore.subscribe(($auth) => {
  if ($auth.state === 'error') {
    authError = $auth.error;
    // Keep user in unauthenticated state
  }
});
```

## Testing Checklist

### Initial Load
- [ ] Page loads with correct initial state
- [ ] Loading state shows briefly
- [ ] Authenticated users see app immediately
- [ ] Unauthenticated users see sign-in form

### Authentication Flow
- [ ] Sign-in form accepts input
- [ ] WebAuthn authentication works
- [ ] Successful auth shows app immediately
- [ ] Session persists in sessionStorage
- [ ] sessionUpdate event fires on success

### State Persistence
- [ ] Page reload preserves authenticated state
- [ ] Page reload shows app for authenticated users
- [ ] Cross-tab authentication sync works
- [ ] Sign out clears all state

### Error Handling
- [ ] Authentication errors display properly
- [ ] Session errors fall back gracefully
- [ ] Network errors don't break UI
- [ ] Invalid sessions clear automatically

## Common Mistakes to Avoid

1. **Creating duplicate state** - Only use flows-auth session functions
2. **Missing event listeners** - Must listen to both sessionUpdate and auth store
3. **Hardcoded state checks** - Always use reactive variables
4. **No error handling** - Always wrap session calls in try/catch
5. **Missing initial state** - Always check session on page load

## References

- **State Machine**: `/Volumes/Projects/Thepia/thepia.com/docs/auth/authentication-state-machine.md`
- **flows-auth Library**: `/Volumes/Projects/Thepia/flows-auth/`
- **thepia.com Implementation**: `/Volumes/Projects/Thepia/thepia.com/src/services/sessionManager.ts`

This guide must be followed exactly to ensure reliable authentication functionality.