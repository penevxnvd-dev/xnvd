#!/bin/bash

# Complete setup script - Run this after starting PostgreSQL
# Usage: bash run-setup.sh

set -e

echo "🚀 XNVD Complete Setup"
echo "======================"
echo ""

# Check if we're in the right directory
if [ ! -f "server/package.json" ]; then
    echo "❌ Please run this script from the xnvd-main directory"
    exit 1
fi

cd server

# Step 1: Check database connection
echo "📡 Step 1: Checking database connection..."
if node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => { console.log('OK'); p.\$disconnect(); process.exit(0); }).catch(e => { console.log('FAIL'); process.exit(1); })" 2>/dev/null | grep -q "OK"; then
    echo "✅ Database is accessible"
else
    echo "❌ Database is not accessible. Please start PostgreSQL first:"
    echo "   sudo systemctl start postgresql"
    echo "   sudo -u postgres psql -c 'CREATE DATABASE xnvd;'"
    exit 1
fi

# Step 2: Run migrations
echo ""
echo "🔄 Step 2: Running database migrations..."
npm run prisma:migrate

# Step 3: Create admin account
echo ""
echo "👤 Step 3: Creating admin account..."
node scripts/create-admin.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now login at: http://localhost:8080/auth"
echo "  Email: admin@xnvd.com"
echo "  Password: Admin123!"
echo ""


