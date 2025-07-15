# Invitation Token Testing Guide

## Overview

This guide covers testing invitation tokens for the thepia.net registration flow, including both manual testing via the admin interface and automated integration tests.

## Quick Start

### Option 1: Use Admin Interface (Recommended)

1. **Navigate to admin**: Go to `/admin` on flows.thepia.net
2. **Create test request**: Use "Test Invitation Flow" section
3. **Approve invitation**: Find in "Invitations Management" → approve
4. **Extract JWT token**: From database or API
5. **Test registration**: Use token in registration API call

### Option 2: Use Existing Token

If you have a previously generated token, you can reuse it if:
- ✅ **Not expired** (90 days from creation)
- ✅ **Not used** (single-use tokens)
- ✅ **Valid signature** (matches JWT_SECRET)

## Testing Scenarios

### 1. Valid Invitation Token Registration

**Expected Result**: Email should be automatically verified

```javascript
// Test data
const testEmail = 'test-valid-token-' + Date.now() + '@thepia.com';
const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // From admin interface

// Registration request
const response = await fetch('https://dev.thepia.com:8443/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: testEmail,
    firstName: 'Test',
    lastName: 'User',
    acceptedTerms: true,
    acceptedPrivacy: true,
    invitationToken: validToken // Key field
  })
});

// Expected outcome
const result = await response.json();
assert(result.success === true);
assert(result.user.email_verified === true); // Email verified via token
```

### 2. Registration Without Invitation Token

**Expected Result**: Standard registration, email requires verification

```javascript
const response = await fetch('https://dev.thepia.com:8443/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test-no-token-' + Date.now() + '@thepia.com',
    firstName: 'No',
    lastName: 'Token',
    acceptedTerms: true,
    acceptedPrivacy: true
    // No invitationToken field
  })
});

// Expected outcome
const result = await response.json();
assert(result.success === true);
assert(result.user.email_verified === false); // Requires email verification
```

### 3. Invalid Invitation Token

**Expected Result**: Either rejected or treated as unverified

```javascript
const response = await fetch('https://dev.thepia.com:8443/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test-invalid-token-' + Date.now() + '@thepia.com',
    firstName: 'Invalid',
    lastName: 'Token',
    acceptedTerms: true,
    acceptedPrivacy: true,
    invitationToken: 'invalid.jwt.token'
  })
});

// Expected outcome: Either error or unverified email
if (response.ok) {
  const result = await response.json();
  assert(result.user.email_verified === false);
} else {
  const error = await response.json();
  assert(error.error.includes('token') || error.error.includes('invalid'));
}
```

## Integration Test Implementation

### Deno Test Example

```typescript
// tests/deno/invitation-token-flow.test.ts
import { assertEquals, assertExists } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('GIVEN admin creates invitation WHEN user registers with token THEN email verified', async () => {
  // GIVEN: Create test invitation via admin API simulation
  const testEmail = `test-flow-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@thepia.com`;
  
  // Step 1: Simulate demo request
  const demoResponse = await fetch('https://dev.thepia.com:8443/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: testEmail,
      company: 'Test Company',
      workflowType: 'client_onboarding',
      comment: 'Integration test',
      demoDuration: '14_days'
    })
  });
  
  assertEquals(demoResponse.ok, true, 'Demo request should succeed');
  const demoData = await demoResponse.json();
  
  // Step 2: Approve invitation (manual step - documented)
  console.log(`📝 Manual step: Approve invitation for ${testEmail} in admin interface`);
  console.log(`📋 Request ID: ${demoData.requestId}`);
  
  // Step 3: For now, test with existing token pattern
  // TODO: Automate approval step via API
  
  // Step 4: Test registration flow
  const registrationResponse = await fetch('https://dev.thepia.com:8443/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      firstName: 'Test',
      lastName: 'User',
      acceptedTerms: true,
      acceptedPrivacy: true
      // Note: invitationToken would be added manually for full test
    })
  });
  
  assertEquals(registrationResponse.ok, true, 'Registration should succeed');
  const registrationResult = await registrationResponse.json();
  assertEquals(registrationResult.success, true);
  assertExists(registrationResult.user);
  
  console.log('✅ Test completed - check email verification status manually');
});
```

### Vitest Test Example

```javascript
// tests/integration/invitation-token.test.js
import { describe, it, expect } from 'vitest';

describe('Invitation Token Flow', () => {
  it('should verify email when valid invitation token provided', async () => {
    // Arrange
    const testEmail = `test-${Date.now()}@thepia.com`;
    const invitationToken = process.env.TEST_INVITATION_TOKEN; // Set via environment
    
    // Act
    const response = await fetch(`${process.env.API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        acceptedTerms: true,
        acceptedPrivacy: true,
        invitationToken
      })
    });
    
    // Assert
    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.user.email_verified).toBe(true);
  });
});
```

## Manual Testing Workflow

### 1. Setup Test Environment

```bash
# Start local API server
cd /path/to/thepia.com
pnpm api

# Start flows.thepia.net development server
cd /path/to/flows.thepia.net
pnpm dev
```

### 2. Create Test Invitation

1. **Navigate to admin**: `https://dev.thepia.net/admin`
2. **Login**: Use admin credentials
3. **Create test request**: 
   - Click template or enter custom data
   - Use test email pattern: `test-manual-YYYY-MM-DD@thepia.com`
   - Click "Simulate Demo Request"

### 3. Approve Invitation

1. **Find invitation**: In "Invitations Management" section
2. **Check status**: Should be "requested"
3. **Approve**: Click approve button
4. **Verify**: Status changes to "approved"

### 4. Extract JWT Token

```sql
-- Connect to database and query
SELECT jwt_token, email, status, created_at 
FROM invitations 
WHERE email = 'your-test-email@thepia.com' 
ORDER BY created_at DESC 
LIMIT 1;
```

### 5. Test Registration API

```bash
# Test with curl
curl -X POST https://dev.thepia.com:8443/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@thepia.com",
    "firstName": "Test",
    "lastName": "User",
    "acceptedTerms": true,
    "acceptedPrivacy": true,
    "invitationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Environment Configuration

### Local Development

```bash
# .env file
JWT_SECRET=your-jwt-secret-key
API_BASE_URL=https://dev.thepia.com:8443
NODE_ENV=development
```

### Test Environment Variables

```bash
# For automated tests
TEST_INVITATION_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TEST_API_URL=https://dev.thepia.com:8443
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
```

## Troubleshooting

### Common Issues

1. **Token Expired**: JWT tokens expire after 90 days
   - **Solution**: Generate new token via admin interface

2. **Token Already Used**: Single-use restriction
   - **Solution**: Create new invitation for each test

3. **Invalid Signature**: JWT_SECRET mismatch
   - **Solution**: Ensure same secret across environments

4. **Email Pattern Error**: Non-test email used
   - **Solution**: Use `test-*@thepia.com` pattern only

### Debug Commands

```bash
# Check local API server
curl https://dev.thepia.com:8443/health

# Verify JWT token structure
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | cut -d. -f2 | base64 -d | jq

# Check database invitations
psql -h localhost -d your-db -c "SELECT * FROM invitations WHERE email LIKE 'test-%' ORDER BY created_at DESC LIMIT 5;"
```

## Cleanup

### Test Data Cleanup

```sql
-- Remove test invitations older than 7 days
DELETE FROM invitations 
WHERE email LIKE 'test-%@thepia.com' 
AND created_at < NOW() - INTERVAL '7 days';

-- Remove test users from Auth0 (if applicable)
-- This would be done via Auth0 Management API
```

### Automated Cleanup Script

```bash
#!/bin/bash
# cleanup-test-data.sh

echo "Cleaning up test invitation data..."

# Database cleanup
psql $DATABASE_URL -c "
DELETE FROM invitations 
WHERE email LIKE 'test-%@thepia.com' 
AND created_at < NOW() - INTERVAL '7 days';
"

echo "Test data cleanup completed"
```

## Related Documentation

- [Admin Interface Guide](../admin/test-invitation-flow.md)
- [API Testing Patterns](../../thepia.com/docs/testing/api-testing.md)
- [flows-auth Integration](../../flows-auth/docs/auth/invitation-tokens.md)
- [Database Schema](../database/invitations-schema.md)