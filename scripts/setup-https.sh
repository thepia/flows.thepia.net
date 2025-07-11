#!/bin/bash

# Setup HTTPS for flows.thepia.net local development
# Creates wildcard SSL certificates for *.thepia.net using mkcert

set -e

echo "🔐 Setting up HTTPS for flows.thepia.net local development..."

# Create certs directory if it doesn't exist
mkdir -p certs

# Check if certificates already exist
if [ -f "certs/dev.thepia.net.pem" ] && [ -f "certs/dev.thepia.net-key.pem" ]; then
    echo "✅ SSL certificates already exist"
    echo "📍 Certificate location: certs/"
    echo "🌐 Access your site at: https://dev.thepia.net:5176"
    exit 0
fi

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "📦 Installing mkcert..."
    
    # Install mkcert based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install mkcert
        else
            echo "❌ Please install Homebrew first: https://brew.sh"
            echo "   Then run: brew install mkcert"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Please install mkcert manually:"
        echo "Ubuntu/Debian: sudo apt install libnss3-tools && curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64 && chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
        exit 1
    else
        echo "❌ Unsupported OS. Please install mkcert manually: https://github.com/FiloSottile/mkcert"
        exit 1
    fi
fi

echo "🔧 Installing local CA..."
mkcert -install

echo "📜 Generating wildcard SSL certificates for *.thepia.net..."

# Generate wildcard certificate for *.thepia.net
mkcert -cert-file certs/dev.thepia.net.pem -key-file certs/dev.thepia.net-key.pem "*.thepia.net" "thepia.net" localhost 127.0.0.1

echo "✅ SSL certificates generated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Add dev.thepia.net to your /etc/hosts file:"
echo "   sudo sh -c 'echo \"127.0.0.1 dev.thepia.net\" >> /etc/hosts'"
echo ""
echo "2. Update Supabase dashboard redirect URLs:"
echo "   - Site URL: https://dev.thepia.net:5176"
echo "   - Redirect URLs: https://dev.thepia.net:5176/admin"
echo ""
echo "3. Start the dev server:"
echo "   pnpm dev"
echo ""
echo "🌐 Your site will be available at: https://dev.thepia.net:5176"
echo "🔐 WebAuthn and Supabase Auth will now work!"
echo ""
echo "💡 The wildcard certificate works for any *.thepia.net subdomain"
echo "✅ Certificate is automatically trusted by macOS (no manual trust needed)"