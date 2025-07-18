# Migration Guide: Using Common Auth Utilities from flows-auth

This guide shows how to migrate from local auth implementations to the common utilities provided by flows-auth.

## 1. API Server Detection

### Before (local implementation):
```javascript
// Detect available API server (local first, then production)
async function detectApiServer() {
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
```

### After (using flows-auth):
```javascript
import { detectApiServer, DEFAULT_API_CONFIG } from '@thepia/flows-auth';

const apiServer = await detectApiServer(DEFAULT_API_CONFIG);
console.log('🔧 Using API server:', apiServer.url);
```

## 2. Invitation Token Handling

### Before (local implementation):
```javascript
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
```

### After (using flows-auth):
```javascript
import { decodeInvitationToken } from '@thepia/flows-auth';

const tokenData = decodeInvitationToken(token);
```

## 3. Token Validation

### Before (local implementation):
```javascript
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

    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}
```

### After (using flows-auth):
```javascript
import { validateInvitationToken } from '@thepia/flows-auth';

const validation = validateInvitationToken(token, tokenData);
if (validation.isValid) {
  // Token is valid
} else {
  // Handle validation error
  console.warn('Token validation failed:', validation.reason);
}
```

## 4. Registration Data Extraction

### Before (local implementation):
```javascript
// Pre-fill registration data
registrationData.email = tokenData.email || '';
registrationData.firstName = tokenData.firstName || tokenData.name?.split(' ')[0] || '';
registrationData.lastName = tokenData.lastName || tokenData.name?.split(' ').slice(1).join(' ') || '';
registrationData.company = tokenData.company || tokenData.companyName || '';
registrationData.phone = tokenData.phone || '';
registrationData.jobTitle = tokenData.jobTitle || 'Hiring Manager';
```

### After (using flows-auth):
```javascript
import { extractRegistrationData } from '@thepia/flows-auth';

const registrationData = extractRegistrationData(tokenData);
```

## 5. Token Hash Computation

### Before (local implementation):
```javascript
// Compute SHA-256 hash of invitation token for security verification
async function hashInvitationToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Failed to hash invitation token:', error);
    return null;
  }
}
```

### After (using flows-auth):
```javascript
import { hashInvitationToken } from '@thepia/flows-auth';

const tokenHash = await hashInvitationToken(token);
```

## 6. Complete Migration Example

Here's a complete example showing how to migrate AuthSection.svelte:

### Before (AuthSection.svelte):
```svelte
<script>
import { thepiaColors } from '@thepia/branding';
import { onMount } from 'svelte';

// Detect available API server (local first, then production)
async function detectApiServer() {
  // ... 40+ lines of detection logic
}

onMount(async () => {
  if (!browser) return;

  try {
    // Dynamically import flows-auth to avoid SSR issues
    const { createAuthStore } = await import('@thepia/flows-auth');

    // Detect available API server (local first, then production)
    const apiBaseUrl = await detectApiServer();
    console.log('🔧 AuthSection using API server:', apiBaseUrl);

    authStore = createAuthStore({
      apiBaseUrl: apiBaseUrl,
      // ... other config
    });
  } catch (err) {
    console.error('Failed to load auth:', err);
  }
});
</script>
```

### After (using flows-auth utilities):
```svelte
<script>
import { thepiaColors } from '@thepia/branding';
import { onMount } from 'svelte';

onMount(async () => {
  if (!browser) return;

  try {
    // Import both auth store and utilities
    const { createAuthStore, detectApiServer, DEFAULT_API_CONFIG } = await import('@thepia/flows-auth');

    // Detect available API server using common utility
    const apiServer = await detectApiServer(DEFAULT_API_CONFIG);
    console.log('🔧 AuthSection using API server:', apiServer.url);

    authStore = createAuthStore({
      apiBaseUrl: apiServer.url,
      // ... other config
    });
  } catch (err) {
    console.error('Failed to load auth:', err);
  }
});
</script>
```

## Code Reduction Benefits

By migrating to the common utilities, we reduce:

1. **AuthSection.svelte**: ~40 lines of API detection code
2. **AppSignIn.svelte**: ~150 lines of invitation token handling
3. **Overall**: ~200+ lines of duplicated code per project

## Migration Steps

1. ✅ **Install updated flows-auth**: Already done
2. ✅ **Update imports**: Import utilities from `@thepia/flows-auth`
3. ✅ **Replace local implementations**: Use common utilities
4. ✅ **Test functionality**: Verify all flows work correctly
5. ✅ **Remove local code**: Delete duplicated implementations

## Testing

After migration, ensure:
- API detection works correctly
- Token decoding and validation work
- Registration data extraction works
- All invitation flows work end-to-end
- Both local and production API servers work
- Error handling works as expected

The migration is backward compatible and should not break any existing functionality.