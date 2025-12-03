#!/bin/bash

# Скрипт за спиране на XNVD приложението

set -e

echo "🛑 Спиране на XNVD приложението..."
echo ""

# Цветове
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Порти
BACKEND_PORT=3001
FRONTEND_PORT=8080

# Функция за убиване на процеси на порт
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}🔍 Проверявам порт $port ($name)...${NC}"
    
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✓ Порт $port е свободен${NC}"
    else
        echo -e "${YELLOW}⚠ Намерени процеси на порт $port: $pids${NC}"
        kill -9 $pids 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Процесите са спрени${NC}"
    fi
}

# Функция за убиване на процеси по име
kill_by_name() {
    local pattern=$1
    local name=$2
    
    echo -e "${YELLOW}🔍 Проверявам процеси '$name'...${NC}"
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✓ Няма процеси '$name'${NC}"
    else
        echo -e "${YELLOW}⚠ Намерени процеси '$name': $pids${NC}"
        pkill -f "$pattern" 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Процесите са спрени${NC}"
    fi
}

# Убиване на процеси
kill_port $BACKEND_PORT "Backend"
kill_port $FRONTEND_PORT "Frontend"
kill_by_name "tsx watch src/index.ts" "Backend Server"
kill_by_name "vite" "Frontend Server"

echo ""
echo -e "${GREEN}✅ Всички процеси са спрени!${NC}"
echo ""

