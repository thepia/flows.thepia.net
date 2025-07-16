# Account Creation Implementation Plan

## Current State Analysis

After implementing the `createAccount` function in flows-auth, it became clear that the complete account creation flow requires additional API endpoints and Auth0 configuration that may not be fully implemented.

## Required API Endpoints

### 1. **User Registration** ✅ IMPLEMENTED
- **Endpoint**: `POST /auth/register`
- **Status**: ✅ Working (updated to handle invitation tokens and full names)
- **Location**: `/Volumes/Projects/Thepia/thepia.com/src/api/auth/register.ts`

### 2. **WebAuthn Registration Options** ❓ NEEDS VERIFICATION
- **Endpoint**: `POST /auth/webauthn/register-options`
- **Status**: ❓ Exists but needs verification for flows.thepia.net compatibility
- **Location**: `/Volumes/Projects/Thepia/thepia.com/src/api/auth/webauthn/register-options.ts`
- **Requirements**:
  - Accept `{ email, userId }` parameters
  - Generate SimpleWebAuthn registration options
  - Handle enhanced userId format: `auth0|passkey-${email}-${timestamp}-${auth0UserId}`

### 3. **WebAuthn Registration Verification** ❓ NEEDS VERIFICATION  
- **Endpoint**: `POST /auth/webauthn/register-verify`
- **Status**: ❓ Exists but needs verification for flows.thepia.net compatibility
- **Location**: `/Volumes/Projects/Thepia/thepia.com/src/api/auth/webauthn/register-verify.ts`
- **Requirements**:
  - Accept `{ userId, registrationResponse }` parameters
  - Verify WebAuthn registration using SimpleWebAuthn
  - Store credential in Auth0 user metadata

### 4. **WebAuthn Authentication Challenge** ❓ NEEDS VERIFICATION
- **Endpoint**: `POST /auth/webauthn/challenge`  
- **Status**: ❓ Exists but needs verification for flows.thepia.net compatibility
- **Location**: `/Volumes/Projects/Thepia/thepia.com/src/api/auth/webauthn/challenge.ts`
- **Requirements**:
  - Accept `{ email }` parameter
  - Generate authentication challenge for existing credentials
  - Return challenge data for SimpleWebAuthn

### 5. **WebAuthn Authentication Verification** ❓ NEEDS VERIFICATION
- **Endpoint**: `POST /auth/webauthn/verify`
- **Status**: ❓ Exists but needs verification for flows.thepia.net compatibility  
- **Location**: `/Volumes/Projects/Thepia/thepia.com/src/api/auth/webauthn/verify.ts`
- **Requirements**:
  - Verify WebAuthn authentication response
  - Return user data and access tokens
  - Handle flows-auth response format

## Auth0 Configuration Requirements

### 1. **User Metadata Schema**
Auth0 users need to support storing WebAuthn credentials in metadata:

```json
{
  "user_metadata": {
    "name": "John Doe",
    "firstName": "John", 
    "lastName": "Doe",
    "acceptedTerms": true,
    "acceptedPrivacy": true,
    "registrationDate": "2025-01-15T12:00:00Z",
    "source": "invitation"
  },
  "app_metadata": {
    "webauthn_credentials": [
      {
        "credentialID": "base64-encoded-id",
        "credentialPublicKey": "base64-encoded-key", 
        "counter": 0,
        "credentialDeviceType": "singleDevice",
        "credentialBackedUp": false,
        "transports": ["internal"],
        "createdAt": 1642248000000
      }
    ]
  }
}
```

### 2. **Management API Permissions**
The Auth0 Management API client needs permissions for:
- `read:users`
- `update:users` 
- `create:users`
- `read:user_metadata`
- `update:user_metadata`

### 3. **Enhanced User ID Format**
The system uses enhanced user IDs for WebAuthn compatibility:
```
auth0|passkey-{email}-{timestamp}-{auth0UserId}
```

This format allows:
- Email extraction for user lookup
- Timestamp tracking for versioning
- Auth0 ID linking for direct user association

## Missing Dependencies

### 1. **SimpleWebAuthn Browser Library**
flows-auth needs to include SimpleWebAuthn for proper WebAuthn handling:

```bash
cd /Volumes/Projects/Thepia/flows-auth
pnpm add @simplewebauthn/browser
```

### 2. **Challenge Storage System**
The API server needs a challenge storage system for WebAuthn:
- In-memory store for development
- Redis or database for production
- TTL management for security

### 3. **RP ID Configuration**
WebAuthn requires proper Relying Party configuration:
- `thepia.com` for production
- `dev.thepia.com` for development
- Support for custom ports in development

## Implementation Steps

### Phase 1: Verify Existing API Endpoints ❓ TODO
1. **Test registration options endpoint**
   - Verify it accepts email + userId parameters
   - Check response format compatibility with SimpleWebAuthn
   - Test with enhanced userId format

2. **Test registration verification endpoint** 
   - Verify it accepts registrationResponse parameter
   - Check Auth0 credential storage
   - Test error handling

3. **Test authentication endpoints**
   - Verify challenge generation works
   - Check authentication verification
   - Test token response format

### Phase 2: Fix Missing Pieces 🔧 TODO
1. **Add SimpleWebAuthn dependency** to flows-auth
2. **Update API endpoints** if needed for flows.thepia.net compatibility
3. **Configure Auth0 metadata schema** for credential storage
4. **Set up challenge storage** system

### Phase 3: Integration Testing 🧪 TODO  
1. **End-to-end account creation test**
   - User registration → WebAuthn setup → Authentication
   - Test with invitation tokens
   - Verify Auth0 data storage

2. **Error handling verification**
   - Test WebAuthn cancellation
   - Test device compatibility issues  
   - Test network failures

### Phase 4: Production Readiness 🚀 TODO
1. **Security review** of WebAuthn implementation
2. **Performance testing** of registration flow
3. **Documentation** for troubleshooting
4. **Monitoring** and error reporting

## Current Blockers

1. **❓ Unknown API Endpoint Compatibility**: Need to verify existing WebAuthn endpoints work with flows.thepia.net
2. **📦 Missing SimpleWebAuthn Dependency**: flows-auth needs @simplewebauthn/browser 
3. **🔧 Challenge Storage**: API server may need challenge storage system
4. **⚙️ Auth0 Configuration**: Need to verify credential storage schema is set up

## Testing Strategy

### Unit Tests
- Test createAccount function with mocked API responses
- Test error handling for each WebAuthn step
- Test invitation token parsing and validation

### Integration Tests  
- Test against real Auth0 instance
- Test WebAuthn registration and authentication flow
- Test with actual browser WebAuthn APIs

### End-to-End Tests
- Test complete user journey from invitation to authentication
- Test across different browsers and devices
- Test error recovery scenarios

## Risk Assessment

### High Risk 🔴
- **WebAuthn Browser Compatibility**: Not all browsers/devices support passkeys
- **Auth0 Credential Storage**: If metadata schema isn't set up correctly
- **Challenge Management**: Security vulnerabilities if not implemented properly

### Medium Risk 🟡  
- **Error Handling**: Poor UX if WebAuthn errors aren't handled gracefully
- **Performance**: Registration flow could be slow with multiple API calls
- **Development Environment**: Complex setup for HTTPS + WebAuthn testing

### Low Risk 🟢
- **Token Parsing**: Invitation token decoding is straightforward
- **User Registration**: Basic Auth0 user creation is well-established
- **Form Validation**: Standard form validation patterns

## Success Criteria

✅ **User can complete full account creation flow**:
1. Fill out registration form with invitation token
2. Click "Create Account with Passkey" 
3. See browser biometric prompt (Touch ID/Face ID)
4. Complete passkey creation
5. Automatically signed in with new account

✅ **Error handling works properly**:
- Clear error messages for WebAuthn failures
- Graceful handling of user cancellation
- Recovery options for unsupported devices

✅ **Data integrity maintained**:
- User data properly stored in Auth0
- WebAuthn credentials linked to user account
- Invitation token metadata preserved

## Next Steps

1. **🔍 IMMEDIATE**: Verify existing API endpoint compatibility
2. **📦 IMMEDIATE**: Add SimpleWebAuthn dependency to flows-auth  
3. **🔧 HIGH**: Implement missing API pieces if needed
4. **🧪 HIGH**: Create comprehensive test suite
5. **📚 MEDIUM**: Document troubleshooting guide
6. **🚀 LOW**: Production deployment planning

---

*This document should be updated as implementation progresses and unknowns are resolved.*