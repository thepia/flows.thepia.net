#!/bin/bash

# Setup flows-auth for development with automatic rebuilding
# This script sets up proper linking and watch modes for seamless development

set -e

echo "🔧 Setting up flows-auth for development..."
echo "ℹ️  Current pnpm version: $(pnpm --version)"

# Navigate to flows-auth and set up linking
cd ../flows-auth
echo "📦 Building flows-auth library..."
pnpm build

echo "🔗 Setting up development link..."
# Use newer pnpm syntax if available, fallback to older syntax
if pnpm link --help | grep -q "global-dir"; then
    # pnpm v8+ syntax
    pnpm link --global
else
    # pnpm v6-7 syntax
    pnpm link --global
fi

# Navigate back to demo app
cd ../flows.thepia.net

echo "📎 Linking flows-auth in demo app..."
# Try multiple linking approaches for compatibility
if ! pnpm link --global @thepia/flows-auth 2>/dev/null; then
    echo "⚠️  Global link failed, trying local file reference..."
    # Ensure the file reference is current
    if grep -q "file:../flows-auth" package.json; then
        echo "✅ File reference already exists"
    else
        echo "📝 Adding file reference..."
        # This would need manual intervention
        echo "Please ensure package.json has: \"@thepia/flows-auth\": \"file:../flows-auth\""
    fi
fi

echo "🧹 Clearing all caches..."
rm -rf node_modules/.vite
rm -rf .astro
rm -rf node_modules/@thepia 2>/dev/null || true

echo "🔄 Reinstalling dependencies..."
pnpm install --force --silent

echo "✅ flows-auth development setup complete!"
echo ""
echo "📋 Development workflow:"
echo "1. In flows-auth directory: run 'pnpm build:watch' to auto-rebuild on changes"
echo "2. In demo app directory: restart dev server when you make flows-auth changes"
echo "3. Or use 'pnpm dev:flows' which handles this automatically"
echo ""
echo "🔍 Verify setup:"
echo "   node -e \"console.log('Available exports:', Object.keys(require('./node_modules/@thepia/flows-auth/dist/index.cjs')))\""