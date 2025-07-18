# Development Setup for flows.thepia.net

This document provides definitive solutions for the disruptive cache/build issues when developing with flows-auth.

## 🏗️ **CRITICAL: Static Prerendering Architecture**

**flows.thepia.net uses STATIC PRERENDERING, not SSR**

- **✅ All pages**: `prerender = true` (static generation)
- **❌ NO SSR**: Only `/dev/*` paths use SSR
- **❌ NO dynamic imports**: Use standard ES6 imports for @thepia/flows-auth
- **❌ NO browser guards**: Components run during build, not in browser

### **Import Pattern**
```typescript
// ✅ CORRECT: Static imports (works with prerender = true)
import { createAuthStore, SignInForm } from '@thepia/flows-auth';

// ❌ WRONG: Dynamic imports (only needed for SSR)
const { createAuthStore } = await import('@thepia/flows-auth');
```

### **Why This Matters**
- **Static prerendering** = HTML generated at build time
- **SSR** = HTML generated at request time  
- **flows-auth** works perfectly with static prerendering
- **No browser APIs** are called during build phase
- **Dynamic imports** are unnecessary and add complexity

## 🚀 **Quick Start**

**After making flows-auth changes:**
```bash
pnpm run rebuild:flows-auth
# Then restart your dev server
```

**When pnpm version errors occur:**
```bash
pnpm run force-refresh
# Then restart your dev server
```

**For active flows-auth development:**
```bash
pnpm run dev:flows
# Runs both flows-auth build:watch and demo dev server
```

## The Problem

When using `file:../flows-auth` dependency, changes to flows-auth source code don't automatically update in the demo app due to:
1. Vite not watching symlinked dependencies
2. Build artifacts being cached
3. Node module resolution caching
4. **pnpm version mismatches** between repositories

## Definitive Solutions

### Solution 1: One-Time Setup (Recommended)

Run this once to set up proper linking:

```bash
pnpm run setup:flows-auth-dev
```

This script:
- Builds flows-auth 
- Creates global pnpm link
- Links it in demo app
- Clears all caches

### Solution 2: Development Workflow

For daily development, use one of these patterns:

#### Option A: Automatic rebuild (Recommended)
```bash
pnpm run dev:flows
```
This runs both flows-auth build:watch and the demo dev server concurrently.

#### Option B: Manual rebuild when needed
```bash
pnpm run rebuild:flows-auth
```
Run this whenever you make flows-auth changes, then restart your dev server.

### Solution 3: Nuclear Option (When Everything is Broken)

When pnpm version conflicts or severe cache issues occur:

```bash
pnpm run force-refresh
```

This command:
- Works regardless of pnpm version mismatches
- Completely rebuilds flows-auth from scratch
- Clears ALL caches and dependencies
- Verifies the session functions are properly exported
- Reports success/failure with detailed diagnostics

## Development Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm dev` | Normal dev server | Standard development |
| `pnpm dev:flows` | Dev server + auto-rebuild flows-auth | Active flows-auth development |
| `pnpm rebuild:flows-auth` | Manual rebuild flows-auth + clear cache | After flows-auth changes |
| `pnpm force-refresh` | **Nuclear option - rebuild everything** | **When version conflicts break builds** |
| `pnpm setup:flows-auth-dev` | One-time development setup | Initial setup only |

## Troubleshooting

### ❌ **"ERR_PNPM_BAD_PM_VERSION" errors**
This means pnpm version mismatch between flows-auth and demo app:
1. **SOLUTION**: Run `pnpm run force-refresh` (handles version conflicts)
2. If still broken, check `packageManager` field in both package.json files

### ❌ **"Functions not found" errors** 
This means flows-auth changes aren't being picked up:
1. Run `pnpm rebuild:flows-auth`
2. Restart your dev server
3. Hard refresh browser (Cmd+Shift+R)

### ❌ **"Module not found" errors**
This means linking is broken:
1. Run `pnpm setup:flows-auth-dev`
2. Restart your dev server

### ❌ **"isAuthenticatedFromSession is not a function"**
This means the sessionStorage functions aren't exported:
1. **SOLUTION**: Run `pnpm run force-refresh`
2. Verify exports: `node -e "console.log(Object.keys(require('./node_modules/@thepia/flows-auth/dist/index.cjs')).filter(e => e.includes('Session')))"`

### 🔍 **Still having issues?**
1. Check that flows-auth builds without errors: `cd ../flows-auth && pnpm build`
2. Verify session functions exist: `node -e "const f=require('./node_modules/@thepia/flows-auth/dist/index.cjs'); console.log('Session functions:', Object.keys(f).filter(e => e.includes('Session')))"`
3. Check browser console for import errors

## GitHub Packages Configuration

### ⚠️ **CRITICAL**: Ensure `@thepia` scope is configured correctly

For `pnpm install` to work with `@thepia/flows-auth` and other Thepia packages, you **MUST** have proper GitHub Packages authentication configured.

#### **Quick Check**
```bash
pnpm config get @thepia:registry
# Should return: https://npm.pkg.github.com
```

If it returns `undefined`, follow the setup below.

#### **One-Time Setup**

**Option 1: User-level config (Recommended)**
```bash
# Configure the @thepia scope to use GitHub Packages
pnpm config set @thepia:registry https://npm.pkg.github.com

# Set your GitHub Personal Access Token
pnpm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN
```

**Option 2: Project-level .npmrc**
Create `.npmrc` in project root:
```
@thepia:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

#### **Getting Your GitHub Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate token with `read:packages` permission
3. Use the token in the config above

#### **Common Issues**

**❌ `@thepian` vs `@thepia` scope mismatch**
```bash
# Remove incorrect scope if it exists
pnpm config delete @thepian:registry

# Set correct scope
pnpm config set @thepia:registry https://npm.pkg.github.com
```

**❌ "404 Not Found" when installing `@thepia/flows-auth`**
- Check your GitHub token has `read:packages` permission
- Verify you have access to the `thepia` organization
- Ensure the token is correctly set in npmrc

**❌ "ENOTFOUND npm.pkg.github.com"**
- Check your internet connection
- Verify the registry URL is correct (no trailing slash)

#### **Verification**
```bash
# Test that @thepia packages can be accessed
pnpm view @thepia/flows-auth

# Should show package information, not 404 error
```

## Best Practices

1. **Always run `pnpm rebuild:flows-auth` after making flows-auth changes**
2. **Use `pnpm dev:flows` for active flows-auth development**
3. **Hard refresh browser after flows-auth changes**
4. **Keep flows-auth build:watch running in a separate terminal**
5. **Ensure `@thepia` scope is configured before running `pnpm install`**

This eliminates the disruptive cache/build/reload cycle and provides predictable development workflow.