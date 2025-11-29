# 🚀 XNVD - Стартиране на приложението

## ⚡ Бърз старт (5 минути)

### Стъпка 1: PostgreSQL база данни

```bash
# Стартирайте PostgreSQL
sudo systemctl start postgresql

# Създайте база данни
sudo -u postgres psql -c "CREATE DATABASE xnvd;"
```

### Стъпка 2: Backend настройка

```bash
cd server

# Инициализация на базата данни
./scripts/init-db.sh

# Създаване на админски акаунт
node scripts/create-admin.js

# Стартиране на backend
npm run dev
```

Backend ще работи на: **http://localhost:3001**

### Стъпка 3: Frontend стартиране

```bash
# В root директорията (нов терминал)
npm run dev
```

Frontend ще работи на: **http://localhost:5174**

### Стъпка 4: Вход в приложението

Отворете: **http://localhost:5174/auth**

**Админски акаунт:**
- 📧 Email: `admin@xnvd.com`
- 🔑 Password: `Admin123!`

---

## ✅ Готово!

Приложението е напълно функционално и готово за използване!

## 📚 Допълнителна документация

- `README_SETUP.md` - Пълни инструкции
- `QUICK_START.md` - Бърз старт
- `MIGRATION_COMPLETE.md` - Детайли за миграцията
- `server/README.md` - Backend API документация

