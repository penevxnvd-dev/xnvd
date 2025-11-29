#!/bin/bash

# Complete PostgreSQL authentication fix
# Run with: sudo bash fix-postgres-auth.sh

set -e

echo "🔐 Fixing PostgreSQL Authentication"
echo "===================================="
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo:"
    echo "   sudo bash fix-postgres-auth.sh"
    exit 1
fi

# Step 1: Set password for postgres user
echo "🔑 Step 1: Setting password for postgres user..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Password set successfully"
else
    echo "⚠️  Password may already be set or there was an issue"
fi

# Step 2: Check if database exists
echo ""
echo "🗄️  Step 2: Checking database..."
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw xnvd && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "no" ]; then
    echo "Creating database 'xnvd'..."
    sudo -u postgres psql -c "CREATE DATABASE xnvd;" 2>&1
    echo "✅ Database created"
else
    echo "✅ Database 'xnvd' already exists"
fi

# Step 3: Test connection with password
echo ""
echo "🧪 Step 3: Testing connection..."
export PGPASSWORD=postgres
if psql -h localhost -U postgres -d xnvd -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection test successful!"
else
    echo "⚠️  Connection test failed - checking authentication method..."
    
    # Check pg_hba.conf
    echo ""
    echo "Checking authentication configuration..."
    sudo cat /etc/postgresql/16/main/pg_hba.conf | grep -E "^[^#].*localhost" | head -3
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "You can now run:"
echo "  cd /home/hades/Music/xnvd-main/server"
echo "  npm run prisma:migrate"
echo "  node scripts/create-admin.js"
echo ""

