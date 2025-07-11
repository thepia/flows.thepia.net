#!/bin/bash

# Setup Let's Encrypt certificates for local development
# This script uses DNS challenge to get real certificates for local development

set -e

echo "🔐 Setting up Let's Encrypt certificates for local development..."

# Configuration
DOMAIN="dev.thepia.net"  # Use a subdomain of your real domain
EMAIL="your-email@thepia.com"
CERT_DIR="./certs"

# Check if getssl is installed
if ! command -v getssl &> /dev/null; then
    echo "📦 Installing getssl..."
    
    # Install getssl
    curl --silent https://raw.githubusercontent.com/srvrco/getssl/latest/getssl > getssl
    chmod 700 getssl
    sudo mv getssl /usr/local/bin/
fi

# Create getssl configuration
echo "⚙️  Creating getssl configuration..."
getssl -c "$DOMAIN"

# Configure getssl for DNS challenge
cat > ~/.getssl/"$DOMAIN"/getssl.cfg << EOF
# Domain configuration for $DOMAIN
CA="https://acme-v02.api.letsencrypt.org/directory"
DOMAIN="$DOMAIN"
SANS=""
ACL=('/var/www/html/.well-known/acme-challenge')
USE_SINGLE_ACL="true"
RENEW_ALLOW="30"
SERVER_TYPE="https"
CHECK_REMOTE="true"
VALIDATE_VIA_DNS="true"
DNS_ADD_COMMAND="echo 'Add DNS TXT record: _acme-challenge.$DOMAIN with value: \$1'"
DNS_DEL_COMMAND="echo 'Remove DNS TXT record: _acme-challenge.$DOMAIN'"
RELOAD_CMD=""
EOF

echo "📋 Manual DNS Challenge Setup Required:"
echo ""
echo "1. Add this DNS record to your domain:"
echo "   Type: A"
echo "   Name: dev"
echo "   Value: 127.0.0.1"
echo ""
echo "2. Add this to your /etc/hosts file:"
echo "   127.0.0.1 dev.thepia.net"
echo ""
echo "3. Run: getssl $DOMAIN"
echo "4. Follow the DNS TXT record instructions"
echo ""
echo "💡 Alternative: Use the current self-signed certificate approach"
echo "   It's simpler and works well for local development"