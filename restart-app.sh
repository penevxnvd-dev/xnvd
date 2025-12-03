#!/bin/bash

# Скрипт за рестарт на XNVD приложението
# Убива процесите на портовете и стартира сървърите на правилните портове

set -e

echo "🔄 Рестарт на XNVD приложението..."
echo ""

# Цветове за output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Порти
BACKEND_PORT=3001
FRONTEND_PORT=8080

# Функция за убиване на процеси на порт
kill_port() {
    local port=$1
    local name=$2
    
    echo -e "${YELLOW}🔍 Проверявам порт $port ($name)...${NC}"
    
    # Намиране на процесите, които използват порта
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        echo -e "${GREEN}✓ Порт $port е свободен${NC}"
    else
        echo -e "${YELLOW}⚠ Намерени процеси на порт $port: $pids${NC}"
        echo -e "${YELLOW}🛑 Убивам процесите...${NC}"
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
        echo -e "${YELLOW}🛑 Убивам процесите...${NC}"
        pkill -f "$pattern" 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓ Процесите са спрени${NC}"
    fi
}

# Стъпка 1: Убиване на процеси
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}Стъпка 1: Спиране на текущи процеси${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

# Убиване на процеси по портове
kill_port $BACKEND_PORT "Backend"
kill_port $FRONTEND_PORT "Frontend"

# Убиване на процеси по име (за всеки случай)
kill_by_name "tsx watch src/index.ts" "Backend Server"
kill_by_name "vite" "Frontend Server"

echo ""
echo -e "${GREEN}✓ Всички процеси са спрени${NC}"
echo ""

# Стъпка 2: Стартиране на сървърите
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}Стъпка 2: Стартиране на сървърите${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

# Проверка за директории
if [ ! -d "server" ]; then
    echo -e "${RED}❌ Директорията 'server' не съществува!${NC}"
    exit 1
fi

# Стартиране на Backend
echo -e "${YELLOW}🚀 Стартиране на Backend сървър (порт $BACKEND_PORT)...${NC}"
cd server

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env файлът не съществува в server директорията!${NC}"
    exit 1
fi

# Стартиране на backend в background
npx dotenv -e .env -- tsx watch src/index.ts > /tmp/xnvd-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend стартиран (PID: $BACKEND_PID)${NC}"
echo "   Логове: /tmp/xnvd-backend.log"

cd ..

# Изчакване backend да стартира
echo -e "${YELLOW}⏳ Изчаквам Backend да стартира...${NC}"
sleep 3

# Проверка дали backend работи
if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend работи на http://localhost:$BACKEND_PORT${NC}"
else
    echo -e "${RED}⚠ Backend може да не работи правилно. Проверете логовете: /tmp/xnvd-backend.log${NC}"
fi

echo ""

# Стартиране на Frontend
echo -e "${YELLOW}🚀 Стартиране на Frontend сървър (порт $FRONTEND_PORT)...${NC}"

# Стартиране на frontend в background
npm run dev > /tmp/xnvd-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend стартиран (PID: $FRONTEND_PID)${NC}"
echo "   Логове: /tmp/xnvd-frontend.log"

# Изчакване frontend да стартира
echo -e "${YELLOW}⏳ Изчаквам Frontend да стартира...${NC}"
sleep 5

# Проверка дали frontend работи
if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend работи на http://localhost:$FRONTEND_PORT${NC}"
else
    # Проверка за алтернативен порт
    ACTUAL_PORT=$(grep -oP "Local:\s+http://localhost:\K\d+" /tmp/xnvd-frontend.log 2>/dev/null | head -1 || echo "")
    if [ ! -z "$ACTUAL_PORT" ]; then
        echo -e "${YELLOW}⚠ Frontend работи на алтернативен порт: http://localhost:$ACTUAL_PORT${NC}"
    else
        echo -e "${RED}⚠ Frontend може да не работи правилно. Проверете логове: /tmp/xnvd-frontend.log${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Приложението е рестартирано!${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📊 Статус:${NC}"
echo -e "   Backend:  http://localhost:$BACKEND_PORT"
echo -e "   Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo -e "${GREEN}📝 Логове:${NC}"
echo -e "   Backend:  /tmp/xnvd-backend.log"
echo -e "   Frontend: /tmp/xnvd-frontend.log"
echo ""
echo -e "${GREEN}🛑 За спиране на сървърите използвайте:${NC}"
echo -e "   ./stop-app.sh"
echo ""

