#!/bin/bash
# Automatic migration script for Supabase
# This script applies migrations automatically from terminal

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Автоматично прилагане на миграция"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Инсталиране на Supabase CLI..."
    npm install -g supabase
    echo "✅ Supabase CLI е инсталиран"
    echo ""
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Влизане в Supabase..."
    echo "Моля влезте в Supabase CLI:"
    supabase login
    echo ""
fi

# Link to project
PROJECT_REF="ufpeftuanzmkiryohesd"
echo "🔗 Свързване с проект: $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF" || echo "⚠️  Вече е свързан или има грешка"
echo ""

# Apply migration
echo "⏳ Прилагане на миграция..."
echo ""

# Method 1: Use supabase db push (if migrations are in supabase/migrations)
if [ -d "supabase/migrations" ]; then
    echo "📁 Намерени миграции в supabase/migrations/"
    supabase db push
else
    # Method 2: Execute SQL file directly
    if [ -f "apply-supabase-migrations.sql" ]; then
        echo "📝 Изпълнение на apply-supabase-migrations.sql"
        supabase db execute --file apply-supabase-migrations.sql
    else
        echo "❌ Не е намерен файл за миграция"
        exit 1
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Миграцията е приложена успешно!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

