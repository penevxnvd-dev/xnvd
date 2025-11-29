#!/bin/bash

# PostgreSQL Installation and Setup Script for XNVD
# Run this script with: sudo bash install-postgresql.sh

set -e

echo "🚀 XNVD PostgreSQL Installation & Setup"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash install-postgresql.sh"
    exit 1
fi

# Step 1: Update package list
echo "📦 Step 1: Updating package list..."
apt-get update

# Step 2: Install PostgreSQL
echo ""
echo "📦 Step 2: Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Step 3: Start PostgreSQL service
echo ""
echo "🔄 Step 3: Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Wait a moment for PostgreSQL to start
sleep 3

# Verify PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ Failed to start PostgreSQL"
    systemctl status postgresql
    exit 1
fi

# Step 4: Create database
echo ""
echo "🗄️  Step 4: Creating database 'xnvd'..."
sudo -u postgres psql -c "CREATE DATABASE xnvd;" 2>/dev/null && echo "✅ Database created" || echo "⚠️  Database already exists (this is OK)"

# Step 5: Verify database exists
echo ""
echo "✅ Step 5: Verifying database..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw xnvd; then
    echo "✅ Database 'xnvd' exists and is ready"
else
    echo "❌ Database 'xnvd' was not created"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PostgreSQL installation and setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps (run these in the server directory):"
echo "  cd /home/hades/Music/xnvd-main/server"
echo "  npm run prisma:migrate"
echo "  node scripts/create-admin.js"
echo ""

