#!/bin/bash

# Set PostgreSQL password and test connection
# Run with: sudo bash set-password-and-test.sh

echo "🔐 Setting PostgreSQL Password"
echo "=============================="
echo ""

# Set password
echo "Setting postgres user password..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
echo "✅ Password set"

# Reload PostgreSQL
echo ""
echo "🔄 Reloading PostgreSQL..."
systemctl reload postgresql
echo "✅ PostgreSQL reloaded"

# Test connection
echo ""
echo "🧪 Testing connection..."
export PGPASSWORD=postgres
if psql -h 127.0.0.1 -U postgres -d xnvd -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection test successful!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Ready for migrations!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Now run:"
    echo "  cd /home/hades/Music/xnvd-main/server"
    echo "  npm run prisma:migrate"
    echo "  node scripts/create-admin.js"
else
    echo "❌ Connection test failed"
    echo "Please check the password and pg_hba.conf configuration"
fi

