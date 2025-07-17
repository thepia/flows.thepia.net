#!/bin/bash

# Force refresh flows-auth - works regardless of pnpm version issues
# This is the "nuclear option" to ensure flows-auth changes are picked up

set -e

echo "🔄 Force refreshing flows-auth (pnpm version: $(pnpm --version))"

# Step 1: Build flows-auth fresh
echo "📦 Building flows-auth..."
cd ../flows-auth
pnpm build
cd ../flows.thepia.net

# Step 2: Nuclear option - remove everything
echo "🧹 Clearing all caches and dependencies..."
rm -rf node_modules/.vite
rm -rf .astro  
rm -rf node_modules/@thepia
rm -rf node_modules/.pnpm

# Step 3: Force fresh install
echo "💾 Force reinstalling all dependencies..."
pnpm install --force

# Step 4: Verify flows-auth is working
echo "🔍 Verifying flows-auth exports..."
if node -e "
try {
  const exports = Object.keys(require('./node_modules/@thepia/flows-auth/dist/index.cjs'));
  console.log('✅ flows-auth exports found:', exports.length, 'items');
  const sessionFuncs = exports.filter(e => e.includes('Session'));
  console.log('✅ Session functions:', sessionFuncs);
  if (exports.includes('isAuthenticatedFromSession')) {
    console.log('✅ isAuthenticatedFromSession: FOUND');
  } else {
    console.log('❌ isAuthenticatedFromSession: MISSING');
    process.exit(1);
  }
} catch (e) {
  console.log('❌ Error loading flows-auth:', e.message);
  process.exit(1);
}
"; then
  echo "✅ flows-auth is properly loaded and exports are available"
else
  echo "❌ flows-auth verification failed"
  exit 1
fi

echo ""
echo "🎯 flows-auth force refresh complete!"
echo "   Now restart your dev server and hard refresh browser (Cmd+Shift+R)"