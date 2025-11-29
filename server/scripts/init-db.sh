#!/bin/bash

# Скрипт за инициализация на базата данни

echo "🔧 Инициализация на базата данни XNVD..."
echo ""

# Проверка за PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не е инсталиран!"
    echo "Инсталирайте PostgreSQL:"
    echo "  sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Проверка дали PostgreSQL работи
if ! sudo systemctl is-active --quiet postgresql; then
    echo "⚠ PostgreSQL не работи. Опитвам се да го стартирам..."
    sudo systemctl start postgresql
    sleep 2
fi

# Четене на данни от .env
if [ -f .env ]; then
    source .env
else
    echo "⚠ .env файлът не съществува. Използвам стойности по подразбиране."
    DB_NAME="xnvd"
    DB_USER="postgres"
    DB_PASS="postgres"
fi

# Извличане на данни от DATABASE_URL ако съществува
if [ ! -z "$DATABASE_URL" ]; then
    DB_NAME=$(echo $DATABASE_URL | grep -oP '/([^?]+)' | sed 's/\///' | head -1)
    DB_USER=$(echo $DATABASE_URL | grep -oP '://([^:]+)' | sed 's|://||' | head -1)
    DB_PASS=$(echo $DATABASE_URL | grep -oP '://[^:]+:([^@]+)' | sed 's|://[^:]*:||' | head -1)
fi

echo "📊 База данни: ${DB_NAME:-xnvd}"
echo "👤 Потребител: ${DB_USER:-postgres}"
echo ""

# Създаване на база данни
echo "Създаване на база данни..."
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME:-xnvd};" 2>/dev/null && echo "✓ База данни създадена" || echo "⚠ Базата данни вече съществува или има грешка"

# Прилагане на SQL миграция
echo "Прилагане на SQL миграция..."
if [ -f prisma/migrations/init.sql ]; then
    sudo -u postgres psql -d ${DB_NAME:-xnvd} -f prisma/migrations/init.sql && echo "✓ Миграция приложена успешно" || echo "⚠ Грешка при прилагане на миграция"
else
    echo "⚠ init.sql файлът не е намерен"
fi

echo ""
echo "✅ Базата данни е инициализирана!"
echo ""
echo "Следваща стъпка:"
echo "  node scripts/create-admin.js"


