#!/bin/bash

# Nuclear option to force flows-auth updates to apply
# This script does everything possible to ensure changes are picked up

set -e

echo "🎯 TARGETED FLOWS-AUTH UPDATE - This will rebuild and reinstall flows-auth only"
echo "ℹ️  Current pnpm version: $(pnpm --version)"

# Step 1: Build flows-auth with new version
echo "📦 Building flows-auth v1.0.3..."
cd ../flows-auth
pnpm build

# Verify the new exports are there
echo "🔍 Verifying new exports in flows-auth..."
if node -e "
const exports = Object.keys(require('./dist/index.cjs'));
const storageExports = exports.filter(e => e.includes('Storage') || e.includes('configure'));
console.log('Storage exports found:', storageExports);
if (!exports.includes('configureSessionStorage')) {
  console.log('❌ configureSessionStorage not found!');
  process.exit(1);
}
if (!exports.includes('getOptimalSessionConfig')) {
  console.log('❌ getOptimalSessionConfig not found!');
  process.exit(1);
}
console.log('✅ All new exports verified');
"; then
  echo "✅ flows-auth exports verified"
else
  echo "❌ flows-auth exports verification failed"
  exit 1
fi

cd ../flows.thepia.net

# Step 2: Targeted cleanup of flows-auth only
echo "🎯 Targeted cleanup of @thepia/flows-auth..."
rm -rf node_modules/@thepia/flows-auth
rm -rf node_modules/.pnpm/*@thepia*flows-auth*
rm -rf .astro
rm -rf dist
rm -rf .vite

# Step 3: Clear only flows-auth from pnpm cache
echo "🧹 Clearing @thepia/flows-auth from pnpm cache..."
pnpm store prune || true
# Remove flows-auth from pnpm store specifically
find ~/.pnpm-store -name "*flows-auth*" -type d -exec rm -rf {} + 2>/dev/null || true

# Step 4: Reinstall flows-auth from local file dependency
echo "💾 Reinstalling @thepia/flows-auth from file:../flows-auth..."
pnpm install

# Step 5: Verify flows-auth is properly installed
echo "🔍 Verifying flows-auth installation..."
if node -e "
try {
  const flowsAuth = require('@thepia/flows-auth');
  const exports = Object.keys(flowsAuth);
  console.log('✅ flows-auth loaded, exports:', exports.length);
  
  // Check for new storage functions
  if (flowsAuth.configureSessionStorage) {
    console.log('✅ configureSessionStorage: FOUND');
  } else {
    console.log('❌ configureSessionStorage: MISSING');
    process.exit(1);
  }
  
  if (flowsAuth.getOptimalSessionConfig) {
    console.log('✅ getOptimalSessionConfig: FOUND');
  } else {
    console.log('❌ getOptimalSessionConfig: MISSING');
    process.exit(1);
  }
  
  if (flowsAuth.StorageConfig) {
    console.log('✅ StorageConfig type: FOUND');
  } else {
    console.log('⚠️  StorageConfig type: Not directly accessible (this is normal for types)');
  }
  
  console.log('✅ All required exports are available');
} catch (e) {
  console.log('❌ Error loading flows-auth:', e.message);
  console.log('Stack:', e.stack);
  process.exit(1);
}
"; then
  echo "✅ flows-auth verification successful"
else
  echo "❌ flows-auth verification failed"
  exit 1
fi

# Step 6: Test import in actual code context
echo "🧪 Testing flows-auth import in project context..."

# First check if the package is installed
if [ -d "node_modules/@thepia/flows-auth" ]; then
  echo "✅ @thepia/flows-auth package found in node_modules"

  # Test CommonJS import first (more reliable)
  if node -e "
    try {
      const flowsAuth = require('@thepia/flows-auth');
      const exports = Object.keys(flowsAuth);
      console.log('✅ CommonJS import successful, exports:', exports.length);

      // Check for new storage functions
      const storageExports = exports.filter(e => e.includes('Storage') || e.includes('configure'));
      console.log('✅ Storage exports:', storageExports);

      if (flowsAuth.configureSessionStorage && flowsAuth.getOptimalSessionConfig) {
        console.log('✅ All new storage functions available');
      } else {
        console.log('❌ Missing storage functions');
        process.exit(1);
      }
    } catch (e) {
      console.log('❌ CommonJS import failed:', e.message);
      process.exit(1);
    }
  "; then
    echo "✅ Package import test successful"
  else
    echo "❌ Package import test failed"
    exit 1
  fi
else
  echo "❌ @thepia/flows-auth package not found in node_modules"
  echo "ℹ️  This suggests the installation failed"
  exit 1
fi

echo ""
echo "🎯 TARGETED UPDATE COMPLETE!"
echo ""
echo "📋 Next steps:"
echo "1. Restart your dev server completely (kill and restart)"
echo "2. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)"
echo "3. Check browser console for any import errors"
echo "4. Test authentication - sessionManager consistency should now be fixed"
echo ""
echo "🔧 New features available:"
echo "   - configureSessionStorage() for runtime config"
echo "   - getOptimalSessionConfig('employee') for auto-config"
echo "   - StorageConfig type for TypeScript"
echo ""
echo "✅ flows-auth v1.0.3 with configurable storage is now active!"
