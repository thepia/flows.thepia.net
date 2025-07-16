# WebAuthn Testing Strategy & QA Process

## Common WebAuthn Pitfalls to Avoid

### 1. **Environment-Specific Issues**
- **HTTP vs HTTPS**: WebAuthn only works over HTTPS in production
- **Localhost exception**: Works on `localhost` but fails on other domains without HTTPS
- **Domain mismatch**: RP ID must match the domain serving the application
- **Origin validation**: Backend must validate origin matches expected domain

### 2. **Browser Compatibility Issues**
- **Safari quirks**: Different behavior for conditional mediation
- **Chrome virtual authenticator**: Only works in Chromium-based browsers
- **Mobile browsers**: Platform authenticator availability varies
- **Cross-browser credential sharing**: Passkeys sync differently across browsers

### 3. **User Experience Pitfalls**
- **Cancelled authentication**: Users can cancel passkey prompts
- **Multiple device scenarios**: Same user on different devices
- **Backup/recovery flows**: What happens when user loses their device
- **Graceful degradation**: Fallback when WebAuthn isn't supported

### 4. **Backend Integration Issues**
- **Challenge management**: Proper challenge storage and expiration
- **Credential storage**: Correct serialization/deserialization of binary data
- **User linking**: Associating WebAuthn credentials with Auth0 users
- **Duplicate credentials**: Handling multiple credentials for same user

## Real Integration Test Strategy

### Phase 1: API Contract Tests
```typescript
// Test WebAuthn API endpoints directly
describe('WebAuthn API Integration', () => {
  it('should generate registration options', async () => {
    const response = await api.getWebAuthnRegistrationOptions({
      email: 'test@example.com',
      userId: 'auth0|testuser'
    });
    
    expect(response.challenge).toBeDefined();
    expect(response.rp.id).toBe('thepia.net');
    expect(response.user.id).toBeDefined();
    expect(response.pubKeyCredParams).toHaveLength(2); // ES256, RS256
  });
  
  it('should verify registration response', async () => {
    // Use virtual authenticator to create real credential
    const credential = await createVirtualCredential();
    
    const result = await api.verifyWebAuthnRegistration({
      userId: 'auth0|testuser',
      registrationResponse: credential
    });
    
    expect(result.success).toBe(true);
  });
});
```

### Phase 2: Browser Integration Tests
```typescript
// Test actual WebAuthn browser APIs
describe('WebAuthn Browser Integration', () => {
  beforeEach(() => {
    // Setup virtual authenticator for consistent testing
    await page.evaluateOnNewDocument(() => {
      navigator.credentials.create = mockCredentialsCreate;
      navigator.credentials.get = mockCredentialsGet;
    });
  });
  
  it('should complete full registration flow', async () => {
    // 1. Navigate to /demo with invitation token
    await page.goto('/demo?token=valid-jwt-token');
    
    // 2. Fill registration form
    await page.fill('[data-test="email"]', 'test@example.com');
    await page.fill('[data-test="firstName"]', 'Test');
    await page.fill('[data-test="lastName"]', 'User');
    await page.check('[data-test="acceptTerms"]');
    await page.check('[data-test="acceptPrivacy"]');
    
    // 3. Click register and handle WebAuthn
    await page.click('[data-test="register-button"]');
    
    // 4. Verify passkey creation
    await page.waitForSelector('[data-test="registration-success"]');
    
    // 5. Verify Auth0 credential storage
    const user = await getAuth0User('test@example.com');
    expect(user.app_metadata.webauthn_credentials).toHaveLength(1);
  });
});
```

### Phase 3: Cross-Browser Testing
```typescript
// Test across different browsers and platforms
describe('Cross-Browser WebAuthn', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    it(`should work in ${browserName}`, async () => {
      const browser = await playwright[browserName].launch();
      // Test complete flow in each browser
    });
  });
});
```

### Phase 4: Error Scenario Tests
```typescript
describe('WebAuthn Error Scenarios', () => {
  it('should handle user cancellation gracefully', async () => {
    // Mock user cancelling passkey creation
    await page.evaluate(() => {
      navigator.credentials.create = () => Promise.reject(new DOMException('User cancelled', 'NotAllowedError'));
    });
    
    await page.click('[data-test="register-button"]');
    
    // Verify graceful error handling
    await expect(page.locator('[data-test="error-message"]')).toContainText('Passkey creation was cancelled');
  });
  
  it('should handle network failures during registration', async () => {
    // Mock network failure
    await page.route('**/auth/webauthn/register-options', route => route.abort());
    
    await page.click('[data-test="register-button"]');
    
    // Verify error handling
    await expect(page.locator('[data-test="error-message"]')).toContainText('Network error');
  });
});
```

## Manual QA Process

### Pre-Testing Setup
1. **Environment Preparation**
   - [ ] Local API server running (`pnpm api:watch`)
   - [ ] flows.thepia.net dev server running (`pnpm dev`)
   - [ ] HTTPS certificates valid
   - [ ] Auth0 test environment configured
   - [ ] Test invitation tokens generated

2. **Browser Setup**
   - [ ] Test in Chrome (latest)
   - [ ] Test in Safari (latest)
   - [ ] Test in Firefox (latest)
   - [ ] Test on mobile Safari (iOS)
   - [ ] Test on mobile Chrome (Android)

### Registration Flow Testing

#### Happy Path Testing
1. **New User Registration**
   - [ ] Navigate to `/demo?token=valid-jwt-token`
   - [ ] Verify invitation token is decoded and validated
   - [ ] Fill out registration form with valid data
   - [ ] Check terms and privacy checkboxes
   - [ ] Click "Register with Passkey"
   - [ ] Verify passkey creation prompt appears
   - [ ] Complete biometric authentication (Touch ID/Face ID)
   - [ ] Verify successful registration message
   - [ ] Check Auth0 user record has credential stored
   - [ ] Verify redirect to demo app

2. **Existing User with Passkey**
   - [ ] Use same invitation token with existing user
   - [ ] Verify shows sign-in form instead of registration
   - [ ] Enter email and click "Sign In with Passkey"
   - [ ] Complete biometric authentication
   - [ ] Verify successful authentication
   - [ ] Verify redirect to demo app

#### Error Scenario Testing
1. **User Cancellation**
   - [ ] Start registration process
   - [ ] Cancel passkey creation when prompted
   - [ ] Verify error message: "Passkey creation was cancelled"
   - [ ] Verify user can retry registration

2. **Unsupported Device**
   - [ ] Test on device without biometric authentication
   - [ ] Verify error message: "Biometric authentication not available"
   - [ ] Verify graceful degradation

3. **Network Failures**
   - [ ] Disconnect network during registration
   - [ ] Verify appropriate error message
   - [ ] Verify recovery when network restored

4. **Invalid Invitation Token**
   - [ ] Use expired token
   - [ ] Use malformed token
   - [ ] Verify error messages are user-friendly

### Authentication Flow Testing

#### Sign-In Testing
1. **Passkey Sign-In**
   - [ ] Navigate to `/demo` without token
   - [ ] Enter email of existing user
   - [ ] Click "Sign In with Passkey"
   - [ ] Complete biometric authentication
   - [ ] Verify successful authentication
   - [ ] Verify redirect to demo app

2. **Conditional Mediation**
   - [ ] Focus on email input field
   - [ ] Verify passkey suggestions appear (Chrome)
   - [ ] Select passkey from suggestion
   - [ ] Verify automatic authentication

#### Cross-Device Testing
1. **Different Device Sign-In**
   - [ ] Register passkey on Device A
   - [ ] Try to sign in on Device B
   - [ ] Verify appropriate error/fallback

2. **Multiple Passkeys**
   - [ ] Register multiple passkeys for same user
   - [ ] Verify user can choose between them
   - [ ] Test passkey selection UI

### Auth0 Integration Testing

#### Device Management
1. **Linked Devices**
   - [ ] Check Auth0 user profile after registration
   - [ ] Verify `app_metadata.webauthn_credentials` contains credential
   - [ ] Verify device metadata (created date, type)
   - [ ] Test multiple device registration

2. **Credential Cleanup**
   - [ ] Test invalid credential cleanup
   - [ ] Verify old credentials are removed
   - [ ] Test credential counter updates

## QA Checklist Template

### Pre-Release Checklist
- [ ] All integration tests passing
- [ ] Manual QA completed on all browsers
- [ ] Error scenarios tested and documented
- [ ] Performance testing completed
- [ ] Security review completed
- [ ] Auth0 integration verified
- [ ] Cross-device compatibility tested
- [ ] User experience flows validated

### Post-Release Monitoring
- [ ] Monitor WebAuthn success/failure rates
- [ ] Track user agent strings for compatibility issues
- [ ] Monitor Auth0 credential storage
- [ ] Track registration abandonment rates
- [ ] Monitor passkey authentication failures

## Testing Tools & Scripts

### Automated Testing Commands
```bash
# Run all WebAuthn tests
pnpm test:webauthn

# Run integration tests against local API
pnpm test:integration:local

# Run cross-browser tests
pnpm test:cross-browser

# Run manual QA checklist
pnpm test:manual-qa
```

### Debug Tools
```bash
# Check WebAuthn support in browser
console.log(window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable);

# Check conditional mediation support
console.log(window.PublicKeyCredential?.isConditionalMediationAvailable);

# Test virtual authenticator (Chrome DevTools)
navigator.credentials.create({ /* test options */ });
```

### Common Debug Commands
```bash
# Check Auth0 user credentials
curl -H "Authorization: Bearer $AUTH0_TOKEN" \
  "https://thepia.eu.auth0.com/api/v2/users/auth0|userid"

# Test API endpoints directly
curl -X POST https://dev.thepia.com:8443/auth/webauthn/register-options \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userId":"auth0|testuser"}'
```

## Success Metrics

### Technical Metrics
- **Registration Success Rate**: >95% for supported browsers
- **Authentication Success Rate**: >98% for users with passkeys
- **Error Recovery Rate**: >90% of users retry after cancellation
- **Cross-Browser Compatibility**: 100% for Chrome, Safari, Firefox

### User Experience Metrics
- **Registration Completion Time**: <30 seconds average
- **Authentication Speed**: <5 seconds average
- **User Satisfaction**: Positive feedback on passkey experience
- **Support Tickets**: <1% of registrations require support

---
*Created: January 15, 2025*
*Status: In Progress*