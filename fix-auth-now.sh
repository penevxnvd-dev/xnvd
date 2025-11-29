#!/bin/bash

# Quick fix for PostgreSQL authentication
# Run with: sudo bash fix-auth-now.sh

echo "🔐 Fixing PostgreSQL Authentication"
echo ""

# Set password
echo "Setting postgres password..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Create database
echo "Creating database..."
sudo -u postgres psql -c "CREATE DATABASE xnvd;"

# Verify
echo "Verifying..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw xnvd && echo "✅ Database created!" || echo "❌ Database creation failed"

echo ""
echo "Done! Now run:"
echo "  cd /home/hades/Music/xnvd-main/server"
echo "  npm run prisma:migrate"

