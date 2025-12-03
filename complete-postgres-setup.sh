#!/bin/bash

# Complete PostgreSQL Setup Script
# This script fixes authentication and sets up the database
# Run with: sudo bash complete-postgres-setup.sh

set -e

echo "🚀 Complete PostgreSQL Setup for XNVD"
echo "======================================"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo:"
    echo "   sudo bash complete-postgres-setup.sh"
    exit 1
fi

# Step 1: Ensure PostgreSQL is running
echo "🔄 Step 1: Ensuring PostgreSQL is running..."
systemctl start postgresql
sleep 2

if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ Failed to start PostgreSQL"
    exit 1
fi

# Step 2: Set password for postgres user
echo ""
echo "🔑 Step 2: Setting password for postgres user..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>&1
echo "✅ Password set"

# Step 3: Update pg_hba.conf to allow password authentication
echo ""
echo "🔧 Step 3: Configuring authentication..."
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"

# Backup the file
cp "$PG_HBA" "${PG_HBA}.backup"

# Check if md5 is already set for localhost
if ! grep -q "^host.*localhost.*postgres.*md5" "$PG_HBA"; then
    echo "Updating pg_hba.conf to allow password authentication..."
    # Add md5 authentication for localhost connections
    sed -i '/^host.*localhost.*127\.0\.0\.1\/32.*scram-sha-256/c\host    all             all             127.0.0.1/32            scram-sha-256' "$PG_HBA" 2>/dev/null || true
    sed -i '/^host.*localhost.*127\.0\.0\.1\/32.*md5/c\host    all             all             127.0.0.1/32            md5' "$PG_HBA" 2>/dev/null || true
    
    # If no localhost line exists, add one
    if ! grep -q "^host.*localhost.*127\.0\.0\.1" "$PG_HBA"; then
        echo "host    all             all             127.0.0.1/32            md5" >> "$PG_HBA"
    fi
fi

# Reload PostgreSQL configuration
systemctl reload postgresql
echo "✅ Authentication configured"

# Step 4: Create database
echo ""
echo "🗄️  Step 4: Creating database 'xnvd'..."
sudo -u postgres psql -c "CREATE DATABASE xnvd;" 2>/dev/null && echo "✅ Database created" || echo "⚠️  Database already exists (this is OK)"

# Step 5: Verify setup
echo ""
echo "✅ Step 5: Verifying setup..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw xnvd; then
    echo "✅ Database 'xnvd' exists"
else
    echo "❌ Database was not created"
    exit 1
fi

# Step 6: Test connection
echo ""
echo "🧪 Step 6: Testing connection with password..."
export PGPASSWORD=postgres
if psql -h localhost -U postgres -d xnvd -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Connection test successful!"
else
    echo "⚠️  Connection test failed, but database exists"
    echo "You may need to check pg_hba.conf manually"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PostgreSQL setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  cd /home/hades/Music/xnvd-main/server"
echo "  npm run prisma:migrate"
echo "  node scripts/create-admin.js"
echo ""

