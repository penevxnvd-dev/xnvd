#!/bin/bash

# Бърз скрипт за създаване на админски акаунт
# Използва данните директно от .env файла или environment variables

echo ""
echo "=== Създаване на админски акаунт ==="
echo ""

# Админски данни
ADMIN_EMAIL="admin@xnvd.com"
ADMIN_PASSWORD="Admin123!"
ADMIN_NAME="Администратор"

echo "📧 Email: $ADMIN_EMAIL"
echo "🔑 Парола: $ADMIN_PASSWORD"
echo "👤 Име: $ADMIN_NAME"
echo "👑 Роля: admin"
echo ""

# Проверка за Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не е инсталиран!"
    exit 1
fi

# Стартиране на Node.js скрипта
node create-admin.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Ако скриптът е успешен, използвайте:"
echo ""
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "   Влезте на: http://localhost:5174/auth"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

