# WebAuthn Registration Flow Testing

## Overview

This directory contains comprehensive tests for the WebAuthn registration flow to identify exact failure points and ensure the complete /demo registration process works correctly.

## Test Files

- `webauthn-registration-test.js` - Complete test suite covering all registration steps
- `../scripts/test-webauthn-registration.js` - Test runner with pre-flight checks

## Prerequisites

Before running the tests, ensure you have:

1. **Local API Server Running**
   ```bash
   cd /Volumes/Projects/Thepia/thepia.com
   pnpm api:watch
   ```

2. **flows.thepia.net Dev Server Running**
   ```bash
   cd /Volumes/Projects/Thepia/flows.thepia.net
   pnpm dev
   ```

3. **Dependencies Installed**
   ```bash
   pnpm install
   ```

## Running the Tests

### Automated Test Suite
```bash
# Run complete WebAuthn registration test
pnpm test:webauthn
```

### Manual Step-by-Step Testing

1. **API Health Check**
   ```bash
   curl https://dev.thepia.com:8443/health
   ```

2. **User Registration**
   ```bash
   curl -X POST https://dev.thepia.com:8443/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","firstName":"Test","lastName":"User","acceptedTerms":true,"acceptedPrivacy":true}'
   ```

3. **WebAuthn Registration Options**
   ```bash
   curl -X POST https://dev.thepia.com:8443/auth/webauthn/register-options \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","userId":"auth0|userid"}'
   ```

## Test Coverage

The test suite covers:

### ✅ API Endpoint Tests
- [ ] API health check
- [ ] User existence check
- [ ] User registration
- [ ] WebAuthn registration options
- [ ] WebAuthn registration verification
- [ ] Auth0 device linking

### ✅ Integration Tests
- [ ] Complete registration flow
- [ ] Error handling scenarios
- [ ] Auth0 user creation
- [ ] WebAuthn credential storage
- [ ] Session management

### ✅ Edge Cases
- [ ] Invalid invitation tokens
- [ ] Duplicate user registration
- [ ] Network failures
- [ ] WebAuthn cancellation
- [ ] Unsupported browsers

## Expected Results

### Successful Registration Flow
1. **API Health**: ✅ Returns 200 OK
2. **User Check**: ✅ Returns user existence status
3. **User Registration**: ✅ Creates Auth0 user with proper metadata
4. **WebAuthn Options**: ✅ Returns valid challenge and options
5. **Mock Credential**: ✅ Creates valid credential format
6. **WebAuthn Verification**: ✅ Verifies credential successfully
7. **Auth0 Device Linking**: ✅ Stores credential in user metadata

### Common Failure Points
- **API Server Not Running**: Connection refused errors
- **Invalid Auth0 Config**: Authentication errors
- **CORS Issues**: Cross-origin request blocked
- **Challenge Expiry**: Timeout errors
- **Credential Format**: Serialization errors

## Troubleshooting

### API Server Issues
```bash
# Check if API server is running
lsof -i :8443

# Check API server logs
tail -f /path/to/api/logs

# Restart API server
pnpm api:watch
```

### Auth0 Configuration
```bash
# Check Auth0 environment variables
echo $AUTH0_MANAGEMENT_CLIENT_ID
echo $AUTH0_MANAGEMENT_CLIENT_SECRET
echo $PUBLIC_AUTH0_DOMAIN
```

### WebAuthn Issues
- Ensure HTTPS is enabled
- Check browser WebAuthn support
- Verify domain configuration
- Test with virtual authenticator

## Test Data

The test suite uses:
- **Test Email**: `test-webauthn-{timestamp}@thepia.net`
- **API Base URL**: `https://dev.thepia.com:8443`
- **Mock Credentials**: Generated for each test run

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run WebAuthn Tests
  run: |
    pnpm api:watch &
    pnpm dev &
    sleep 10
    pnpm test:webauthn
```

## Next Steps

After running the tests:

1. **Review test results** to identify failure points
2. **Fix any identified issues** in the implementation
3. **Re-run tests** to verify fixes
4. **Add additional test cases** for edge cases
5. **Document any workarounds** or known issues

---
*Created: January 15, 2025*
*Last Updated: January 15, 2025*