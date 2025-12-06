# 🔐 Решение на проблеми с влизане

## Проблем: "Невалиден имейл или парола"

### ✅ Решение 1: Проверка на credentials

Всички акаунти са тествани и работят:
- ✅ Краси Кътев: `krasi.katev@xnvd.com` / `Krasi123!`
- ✅ Лазар Бундев: `lazar.bundev@xnvd.com` / `Lazar123!`
- ✅ Георги Пенев: `georgi.penev@xnvd.com` / `Georgi123!`
- ✅ Камен Георгиев: `kamen.georgiev@xnvd.com` / `Kamen123!`

### ✅ Решение 2: Поправена конфигурация на Supabase client

Проблемът беше че session-ите не се запазваха. Поправих:

**Преди:**
```typescript
auth: {
  persistSession: false, // ❌ Session не се запазва
  autoRefreshToken: false, // ❌ Token не се обновява
}
```

**След:**
```typescript
auth: {
  persistSession: true, // ✅ Session се запазва
  autoRefreshToken: true, // ✅ Token се обновява автоматично
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
}
```

### ✅ Решение 3: Подобрена error handling

Добавих по-добра обработка на грешки при зареждане на профил след login.

## 🧪 Тестване

1. **Изчистете localStorage:**
   ```javascript
   localStorage.clear();
   ```

2. **Рестартирайте приложението:**
   ```bash
   npm run dev
   ```

3. **Опитайте да влезете** с някой от акаунтите по-горе

## 🔍 Debugging

Ако все още има проблем:

1. **Отворете Developer Console** (F12)
2. **Проверете Network tab** за грешки
3. **Проверете Console** за error messages
4. **Проверете Application > Local Storage** за `sb-*` keys

## 📋 Често срещани проблеми

### Проблем: Session не се запазва
**Решение:** Изчистете localStorage и опитайте отново

### Проблем: "Invalid login credentials"
**Решение:** 
- Проверете дали email адресът е правилен
- Проверете дали паролата е правилна (case-sensitive)
- Проверете дали няма допълнителни интервали

### Проблем: "Email not confirmed"
**Решение:** Всички акаунти са вече потвърдени. Ако виждате тази грешка, опитайте да изчистите cache-а.

## ✅ Всичко е готово!

След поправките, влизането трябва да работи правилно. Session-ите се запазват в localStorage и се обновяват автоматично.

