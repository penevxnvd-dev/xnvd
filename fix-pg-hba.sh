#!/bin/bash

# Fix pg_hba.conf to allow password authentication
# Run with: sudo bash fix-pg-hba.sh

set -e

echo "🔧 Fixing PostgreSQL Authentication Configuration"
echo "=================================================="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo:"
    echo "   sudo bash fix-pg-hba.sh"
    exit 1
fi

PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

# Backup the file
echo "📦 Creating backup..."
cp "$PG_HBA" "${PG_HBA}.backup.$(date +%Y%m%d_%H%M%S)"
echo "✅ Backup created"

# Check current configuration
echo ""
echo "📋 Current localhost authentication method:"
grep -E "^[^#].*127.0.0.1|^[^#].*localhost" "$PG_HBA" | head -3 || echo "No localhost entry found"

# Update to use md5 (password authentication)
echo ""
echo "🔧 Updating to use password authentication (md5)..."

# Comment out existing localhost lines and add new one
sed -i '/^host.*127\.0\.0\.1\/32/s/^/# /' "$PG_HBA" 2>/dev/null || true

# Add md5 authentication for localhost
if ! grep -q "^host.*all.*all.*127\.0\.0\.1\/32.*md5" "$PG_HBA"; then
    echo "host    all             all             127.0.0.1/32            md5" >> "$PG_HBA"
    echo "✅ Added md5 authentication for localhost"
else
    echo "✅ md5 authentication already configured"
fi

# Reload PostgreSQL
echo ""
echo "🔄 Reloading PostgreSQL..."
systemctl reload postgresql
echo "✅ PostgreSQL reloaded"

# Test connection
echo ""
echo "🧪 Testing connection..."
export PGPASSWORD=postgres
if psql -h localhost -U postgres -d xnvd -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection test successful!"
else
    echo "⚠️  Connection test failed - you may need to set the password:"
    echo "   sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\""
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Configuration updated!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Now try running migrations:"
echo "  cd /home/hades/Music/xnvd-main/server"
echo "  npm run prisma:migrate"
echo ""

