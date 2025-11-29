#!/bin/bash

# Скрипт за настройка на базата данни

echo "🔧 Настройка на базата данни..."

# Проверка за PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не е инсталиран!"
    echo "Инсталирайте PostgreSQL и опитайте отново."
    exit 1
fi

# Четене на DATABASE_URL от .env
if [ ! -f .env ]; then
    echo "❌ .env файлът не съществува!"
    echo "Създайте .env файл с DATABASE_URL"
    exit 1
fi

source .env

# Извличане на данни от DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | grep -oP '/([^?]+)' | sed 's/\///')
DB_USER=$(echo $DATABASE_URL | grep -oP '://([^:]+)' | sed 's|://||')
DB_PASS=$(echo $DATABASE_URL | grep -oP '://[^:]+:([^@]+)' | sed 's|://[^:]*:||')
DB_HOST=$(echo $DATABASE_URL | grep -oP '@([^:]+)' | sed 's/@//')

echo "📊 База данни: $DB_NAME"
echo "👤 Потребител: $DB_USER"
echo ""

# Създаване на база данни (ако не съществува)
echo "Създаване на база данни..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Базата данни вече съществува или има грешка"

# Прилагане на миграции
echo "Прилагане на миграции..."
npm run prisma:migrate

echo ""
echo "✅ Базата данни е настроена!"
echo ""


