#!/bin/bash

# Database Setup Script for XNVD
# Run this script with: sudo bash setup-database.sh

set -e

echo "🚀 XNVD Database Setup"
echo "======================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run this script with sudo:"
    echo "   sudo bash setup-database.sh"
    exit 1
fi

# Step 1: Check if PostgreSQL is installed
echo "📦 Step 1: Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Installing..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    echo "✅ PostgreSQL installed"
else
    echo "✅ PostgreSQL is installed"
fi

# Step 2: Start PostgreSQL service
echo ""
echo "🔄 Step 2: Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql 2>/dev/null || true
sleep 2

if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ Failed to start PostgreSQL"
    exit 1
fi

# Step 3: Create database
echo ""
echo "🗄️  Step 3: Creating database 'xnvd'..."
sudo -u postgres psql -c "CREATE DATABASE xnvd;" 2>/dev/null && echo "✅ Database created" || echo "⚠️  Database already exists (this is OK)"

# Step 4: Verify database exists
echo ""
echo "✅ Step 4: Verifying database..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw xnvd; then
    echo "✅ Database 'xnvd' exists"
else
    echo "❌ Database 'xnvd' was not created"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ PostgreSQL setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps (run these in the server directory):"
echo "  cd /home/hades/Music/xnvd-main/server"
echo "  npm run prisma:migrate"
echo "  node scripts/create-admin.js"
echo ""


