# WebAuthn RPID Configuration Reference

## Overview

WebAuthn requires the Relying Party ID (RPID) to match the origin domain for security. This document defines the correct RPID configuration for each environment to prevent "RPID did not match the origin" errors.

## Environment Matrix

### Development Environment
- **Frontend URL**: `https://dev.thepia.net:5176` (flows.thepia.net dev server)
- **Backend API**: `https://dev.thepia.com:8443` (thepia.com API server)
- **Required RPID**: `dev.thepia.net`
- **Config Location**: `/Volumes/Projects/Thepia/flows.thepia.net/.env`
- **Config Value**: `PUBLIC_WEBAUTHN_RP_ID=dev.thepia.net`

### Production Environment
- **Frontend URL**: `https://flows.thepia.net` (deployed flows.thepia.net)
- **Backend API**: `https://api.thepia.com` (production API)
- **Required RPID**: `thepia.net`
- **Config Location**: Environment variables in deployment
- **Config Value**: `PUBLIC_WEBAUTHN_RP_ID=thepia.net`

### Local Testing Environment
- **Frontend URL**: `https://localhost:5176` (local development)
- **Backend API**: `https://dev.thepia.com:8443` (local API server)
- **Required RPID**: `localhost`
- **Config Location**: `/Volumes/Projects/Thepia/flows.thepia.net/.env`
- **Config Value**: `PUBLIC_WEBAUTHN_RP_ID=localhost`

## Backend RPID Resolution Logic

The backend automatically determines the correct RPID based on the request hostname:

**File**: `/Volumes/Projects/Thepia/thepia.com/src/api/utils/webauthn-config.ts`

```typescript
// Development environments
if (hostname === "dev.thepia.net" || hostname.endsWith(".dev.thepia.net")) {
  return {
    rpId: "dev.thepia.net",
    rpName: "Thepia Flows (Dev)",
    origin: `https://${hostname}`,
    timeout: 60000,
  };
}

if (hostname === "dev.thepia.com" || hostname.endsWith(".dev.thepia.com")) {
  return {
    rpId: "dev.thepia.com", 
    rpName: "Thepia (Dev)",
    origin: `https://${hostname}`,
    timeout: 60000,
  };
}

// Production environments
if (hostname === "thepia.net" || hostname.endsWith(".thepia.net")) {
  return {
    rpId: "thepia.net",
    rpName: "Thepia Flows",
    origin: `https://${hostname}`,
    timeout: 60000,
  };
}

if (hostname === "thepia.com" || hostname.endsWith(".thepia.com")) {
  return {
    rpId: "thepia.com",
    rpName: "Thepia",
    origin: `https://${hostname}`,
    timeout: 60000,
  };
}

// Local development
if (hostname === "localhost" || hostname.startsWith("localhost:")) {
  return {
    rpId: "localhost",
    rpName: "Thepia (Local)",
    origin: `https://${hostname}`,
    timeout: 60000,
  };
}
```

## Frontend Configuration Files

### flows.thepia.net/.env
```bash
# Development (default)
PUBLIC_WEBAUTHN_RP_ID=dev.thepia.net

# Production (change for deployment)
# PUBLIC_WEBAUTHN_RP_ID=thepia.net

# Local testing (change for localhost)
# PUBLIC_WEBAUTHN_RP_ID=localhost
```

### flows-auth Library Configuration
The flows-auth library automatically uses the RPID from the backend response, so no additional configuration is needed.

## Common Issues and Solutions

### Issue 1: "RPID did not match the origin"
**Cause**: Frontend RPID doesn't match the domain you're accessing
**Solution**: Update `PUBLIC_WEBAUTHN_RP_ID` in `.env` to match the domain

### Issue 2: CORS errors with WebAuthn
**Cause**: Backend doesn't recognize the origin
**Solution**: Ensure backend webauthn-config.ts includes your domain

### Issue 3: WebAuthn works locally but fails in deployment
**Cause**: Production environment variables not updated
**Solution**: Update deployment environment variables

## Verification Steps

1. **Check current domain**: Look at browser URL bar
2. **Check frontend config**: Verify `PUBLIC_WEBAUTHN_RP_ID` matches domain
3. **Check backend logs**: Look for WebAuthn configuration being used
4. **Test WebAuthn**: Try registration/authentication flow

## Domain Matching Rules

- **Exact match**: `dev.thepia.net` matches `dev.thepia.net`
- **Subdomain match**: `app.thepia.net` matches `thepia.net` (if configured)
- **Port ignored**: `dev.thepia.net:5176` matches `dev.thepia.net`
- **Protocol ignored**: `https://dev.thepia.net` matches `dev.thepia.net`

## Configuration Checklist

- [ ] Frontend `.env` file has correct `PUBLIC_WEBAUTHN_RP_ID`
- [ ] Backend webauthn-config.ts recognizes the domain
- [ ] HTTPS is enabled (required for WebAuthn)
- [ ] No mixed content warnings in browser
- [ ] Browser supports WebAuthn (check console)

## Troubleshooting Commands

```bash
# Check current frontend config
grep PUBLIC_WEBAUTHN_RP_ID /Volumes/Projects/Thepia/flows.thepia.net/.env

# Check backend config
grep -A 5 -B 5 "dev.thepia.net" /Volumes/Projects/Thepia/thepia.com/src/api/utils/webauthn-config.ts

# Test WebAuthn support
# In browser console:
navigator.credentials && navigator.credentials.create
```

---
*Created: January 16, 2025*
*Last Updated: January 16, 2025*