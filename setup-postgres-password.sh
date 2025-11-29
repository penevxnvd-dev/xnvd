#!/bin/bash

# Script to set PostgreSQL password and create database
# Run with: sudo bash setup-postgres-password.sh

set -e

echo "🔐 Setting up PostgreSQL password and database..."
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo:"
    echo "   sudo bash setup-postgres-password.sh"
    exit 1
fi

# Set password for postgres user
echo "🔑 Setting password for postgres user..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || echo "⚠️  Could not set password (may already be set)"

# Create database
echo ""
echo "🗄️  Creating database 'xnvd'..."
sudo -u postgres psql -c "CREATE DATABASE xnvd;" 2>/dev/null && echo "✅ Database created" || echo "⚠️  Database already exists (this is OK)"

# Verify
echo ""
echo "✅ Verifying setup..."
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw xnvd; then
    echo "✅ Database 'xnvd' exists"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ PostgreSQL is ready!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "You can now run:"
    echo "  cd /home/hades/Music/xnvd-main/server"
    echo "  npm run prisma:migrate"
    echo "  node scripts/create-admin.js"
else
    echo "❌ Database was not created"
    exit 1
fi

