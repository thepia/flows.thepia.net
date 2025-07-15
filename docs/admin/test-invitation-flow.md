# Test Invitation Flow Documentation

## Overview

The Test Invitation Flow component in the admin interface provides a comprehensive testing environment for the complete demo request → approval → invitation → registration workflow.

## Purpose

- **Test the complete invitation flow** without affecting production data
- **Generate real JWT tokens** for testing registration endpoints
- **Simulate demo form submissions** with realistic data
- **Validate the thepia.com API integration** in a controlled environment

## Location

**Admin Interface**: `/admin` → "Test Invitation Flow" section (top of page)

## Features

### 1. Demo Request Simulation

Simulates actual demo form submissions by calling the thepia.com API with test data:

- **API Endpoint**: `https://dev.thepia.com:8443/api/inquiries` (local) or `https://api.thepia.com/inquiries` (production)
- **Request Type**: POST with complete demo request payload
- **Safety**: Only allows test-pattern emails (`test-*@thepia.com`)

### 2. Test Templates

Pre-configured test scenarios:

- **Basic Demo Request**: Standard client onboarding flow
- **Support Request**: Technical support workflow
- **Partnership Inquiry**: Partnership review process

### 3. Test Email Generation

- **Pattern**: `test-invitation-{timestamp}-{random}@thepia.com`
- **Safety**: Prevents accidental production data contamination
- **Uniqueness**: Timestamp + random string prevents conflicts

### 4. Real JWT Token Generation

When invitations are approved through the admin interface, they generate real JWT tokens with:

- **Valid signatures** (using JWT_SECRET)
- **Complete claims** (user data, expiration, etc.)
- **90-day expiration** (configurable)
- **Single-use validation**

## Usage Workflow

### Step 1: Create Test Demo Request

1. Navigate to `/admin` and authenticate
2. In "Test Invitation Flow" section:
   - Click a template or enter custom data
   - Ensure email follows test pattern
   - Click "Simulate Demo Request"

### Step 2: Approve Invitation

1. Scroll down to "Invitations Management" section
2. Find your test invitation (should be in "Requested" tab)
3. Click "Approve" on the invitation card
4. This generates a real JWT token in the database

### Step 3: Extract JWT Token

The JWT token can be accessed via:

- **Database query**: `SELECT jwt_token FROM invitations WHERE email = 'your-test-email@thepia.com'`
- **Admin interface**: View invitation details (if implemented)
- **API endpoint**: GET invitation by ID (if implemented)

### Step 4: Test Registration

Use the extracted JWT token to test the registration API:

```javascript
const registrationData = {
  email: 'your-test-email@thepia.com',
  firstName: 'Test',
  lastName: 'User',
  acceptedTerms: true,
  acceptedPrivacy: true,
  invitationToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your JWT token
};

const response = await fetch('https://dev.thepia.com:8443/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(registrationData)
});
```

## Integration Test Example

```javascript
// tests/deno/invitation-token-registration.test.ts
Deno.test('GIVEN admin creates test invitation WHEN approved THEN should generate valid JWT', async () => {
  // Step 1: Simulate demo request via admin interface
  const testEmail = 'test-integration-' + Date.now() + '@thepia.com';
  
  // Step 2: Approve invitation (manual step via admin UI)
  // Step 3: Extract JWT token from database
  // Step 4: Test registration with token
  // Step 5: Verify email is marked as verified
});
```

## Safety Features

### Test Email Validation

- **Enforced pattern**: Must contain `test-` and `@thepia.com`
- **Error on production emails**: Prevents accidental real user impact
- **Unique generation**: Timestamp-based to avoid conflicts

### Environment Awareness

- **Local development**: Uses `dev.thepia.com:8443`
- **Production**: Uses `api.thepia.com` (with test email restrictions)
- **Clear indicators**: UI shows which environment is being used

### Data Isolation

- **Test data only**: All generated data is clearly marked as test
- **Easy cleanup**: Test emails can be batch deleted
- **Audit trail**: All test actions are logged

## Troubleshooting

### Demo Request Fails

1. **Check API server**: Ensure local API server is running (`pnpm api`)
2. **Verify email pattern**: Must follow `test-*@thepia.com` format
3. **Check network**: Ensure connection to dev.thepia.com:8443
4. **Review logs**: Check browser console and API server logs

### Invitation Not Created

1. **Check database**: Query `invitations` table for the test email
2. **Verify integration**: Ensure thepia.com API properly creates invitations
3. **Check spam filtering**: Test emails should score as "clean"

### JWT Token Issues

1. **Verify approval**: Ensure invitation status is "approved"
2. **Check token generation**: Look for jwt_token field in database
3. **Validate signature**: Ensure JWT_SECRET matches between environments
4. **Check expiration**: JWT tokens expire after 90 days

## Database Schema

Test invitations are stored in the same `invitations` table as production:

```sql
-- Key fields for test invitations
SELECT 
  id,
  email,
  status,
  jwt_token,
  invitation_code,
  created_at,
  expires_at
FROM invitations 
WHERE email LIKE 'test-%@thepia.com'
ORDER BY created_at DESC;
```

## Security Considerations

- **Test data only**: Never use real user emails
- **Token security**: JWT tokens are still real and should be handled securely
- **Access control**: Admin interface requires proper authentication
- **Environment separation**: Clear distinction between test and production

## Maintenance

### Cleanup Test Data

```sql
-- Clean up old test invitations (older than 30 days)
DELETE FROM invitations 
WHERE email LIKE 'test-%@thepia.com' 
AND created_at < NOW() - INTERVAL '30 days';
```

### Monitor Test Usage

```sql
-- Monitor test invitation creation
SELECT 
  DATE(created_at) as date,
  COUNT(*) as test_invitations_created
FROM invitations 
WHERE email LIKE 'test-%@thepia.com'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

## Related Documentation

- [flows-auth Integration](../../flows-auth/docs/auth/api-integration.md)
- [Invitation Token Implementation](../docs/auth/invitation-tokens.md)
- [Admin Interface Guide](./admin-interface.md)
- [API Testing Patterns](../../thepia.com/docs/testing/api-testing.md)