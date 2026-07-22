# Storage Configuration Example for flows.thepia.net

This document shows how to implement configurable storage in flows.thepia.net for different user types.

## Problem Solved

The original issue was that flows-auth had conflicting session management:
- State machine used localStorage 
- sessionManager used sessionStorage
- This caused authentication inconsistency on page reload

## Solution

Now flows-auth has unified, configurable storage that can be set based on user role:
- **Employees**: localStorage for persistent sessions (7 days)
- **Guests**: sessionStorage for security (8 hours)

## Implementation Example

### 1. Update AuthSection.svelte for Employee Access

```typescript
// src/components/auth/AuthSection.svelte
import { getOptimalSessionConfig } from '@thepia/flows-auth';

onMount(async () => {
  if (!browser) return;

  try {
    const { createAuthStore } = await import('@thepia/flows-auth');
    const apiBaseUrl = await detectApiServer();

    // Configure storage for employee access
    const storageConfig = getOptimalSessionConfig('employee', 'thepia.net');
    
    authStore = createAuthStore({
      apiBaseUrl: apiBaseUrl,
      clientId: 'thepia-flows-landing',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableSocialLogin: false,
      enablePasswordLogin: false,
      storage: storageConfig, // NEW: Employee-optimized storage
      branding: {
        companyName: 'Thepia Flows',
        logoUrl: '/favicon.svg',
        primaryColor: thepiaColors.primary,
      },
    });

    console.log('🗄️ Storage configured for employees:', storageConfig);
  } catch (err) {
    console.error('Failed to load auth:', err);
  }
});
```

### 2. Update AppSignIn.svelte for App Access

```typescript
// src/components/app/AppSignIn.svelte
import { getOptimalSessionConfig, configureSessionStorage } from '@thepia/flows-auth';

onMount(async () => {
  if (!browser) return;

  try {
    const flowsAuthModule = await import('@thepia/flows-auth');
    const { createAuthStore, /* other imports */ } = flowsAuthModule;
    
    const apiBaseUrl = await detectApiServer();

    // Configure for employee app usage (persistent sessions)
    const storageConfig = getOptimalSessionConfig('employee', 'thepia.net');
    
    authStore = createAuthStore({
      apiBaseUrl: apiBaseUrl,
      clientId: 'thepia-flows-app',
      domain: 'thepia.net',
      enablePasskeys: true,
      enableSocialLogin: false,
      enablePasswordLogin: false,
      storage: storageConfig, // NEW: Persistent employee sessions
      branding: {
        companyName: 'Thepia Flows',
        logoUrl: '/favicon.svg',
        primaryColor: thepiaColors.primary,
      },
    });

    // The rest of your auth setup...
  } catch (error) {
    console.error('Failed to initialize auth:', error);
  }
});
```

### 3. Dynamic Configuration Based on User Role

```typescript
// Example: Configure storage after user authentication
authStore.subscribe(($auth) => {
  if ($auth.isAuthenticated && $auth.user) {
    const userMetadata = $auth.user.metadata;
    const userRole = userMetadata?.role || 'guest';
    
    // Reconfigure storage based on actual user role
    if (userRole === 'thepia_staff' || userRole === 'employee') {
      configureSessionStorage({
        type: 'localStorage',
        sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
        persistentSessions: true,
        userRole: 'employee'
      });
      console.log('🔄 Switched to persistent employee sessions');
    }
  }
});
```

## Configuration Options

### For Employee Portal

```typescript
const employeeConfig = {
  storage: {
    type: 'localStorage',
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    persistentSessions: true,
    userRole: 'employee'
  }
};
```

### For Guest/Demo Access

```typescript
const guestConfig = {
  storage: {
    type: 'sessionStorage',
    sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
    persistentSessions: false,
    userRole: 'guest'
  }
};
```

### Auto-Configuration Helper

```typescript
import { getOptimalSessionConfig } from '@thepia/flows-auth';

// Automatically get optimal config
const config = getOptimalSessionConfig('employee'); // or 'guest'
```

## Benefits

1. **Consistent Authentication**: No more conflicts between localStorage and sessionStorage
2. **Role-Based UX**: Employees get persistent sessions, guests get secure sessions
3. **Configurable**: Easy to adjust timeouts and storage types
4. **Backward Compatible**: Existing code continues to work
5. **Security Focused**: Defaults to secure sessionStorage

## Testing

To test the configuration:

1. **Employee Mode**: Sessions should persist across browser restarts
2. **Guest Mode**: Sessions should clear when tab is closed
3. **Configuration Check**: Use browser dev tools to inspect storage

```javascript
// In browser console
import { getStorageConfig } from '@thepia/flows-auth';
console.log('Current storage config:', getStorageConfig());
```

## Migration Notes

- **No breaking changes**: Existing flows.thepia.net code continues to work
- **Optional feature**: Storage configuration is entirely optional
- **Gradual adoption**: Can be implemented component by component
- **Default behavior**: Still uses sessionStorage if no config provided

This solves the original sessionManager consistency issue while providing flexible storage options for different user types.
