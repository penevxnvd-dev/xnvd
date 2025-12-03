#!/bin/bash
# Apply RLS migration using psql directly

set -e

MIGRATION_FILE="supabase/migrations/20250102000000_fix_rls_policies.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Try to get connection string from environment or use default
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL}}"

if [ -z "$DB_URL" ]; then
    echo "❌ Database connection string not found."
    echo ""
    echo "Please provide your Supabase database connection string:"
    echo "  1. Go to: https://supabase.com/dashboard/project/ufpeftuanzmkiryohesd/settings/database"
    echo "  2. Copy the 'URI' connection string"
    echo "  3. Run: export SUPABASE_DB_URL='postgresql://...'"
    echo "  4. Then run this script again"
    echo ""
    echo "Or provide it now:"
    read -p "Enter Supabase database connection string: " DB_URL
fi

if [ -z "$DB_URL" ]; then
    echo "❌ No connection string provided. Exiting."
    exit 1
fi

echo "🔌 Connecting to database..."
echo "🚀 Applying RLS policy fixes..."

# Extract connection details from URL if needed, or use psql directly
psql "$DB_URL" -f "$MIGRATION_FILE"

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "RLS policies have been fixed for:"
echo "  ✅ countries, cities, offices, teams"
echo "  ✅ realtors, deals, diagnoses"
echo "  ✅ training_progress, user_roles"
echo ""
echo "🎉 Database is ready for use!"

