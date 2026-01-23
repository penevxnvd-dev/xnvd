# XNVD - Управление на реализатори

Платформа за управление на реализатори, сделки, диагнози и обучение.

## Технологии

Проектът е изграден с:

- **Vite** - Build tool и dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI библиотека
- **shadcn-ui** - UI компоненти
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend-as-a-Service (база данни, автентикация, RLS)
- **React Query** - Data fetching и caching
- **React Router** - Client-side routing

## Инсталация

```sh
# Клониране на репозитория
git clone <YOUR_GIT_URL>

# Навигация към директорията на проекта
cd xnvd

# Инсталиране на зависимости
npm install

# Стартиране на development server
npm run dev
```

## Конфигурация

Създайте `.env` файл в root директорията с:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Скриптове

- `npm run dev` - Стартира development server
- `npm run build` - Build за production
- `npm run preview` - Preview на production build
- `npm run lint` - Проверка на код с ESLint
- `npm test` - Стартиране на тестове

## Deployment

Проектът използва **GitHub Actions** за автоматизиран deployment към **Vercel**. Всеки push към `main` branch тригерира:

- Автоматично тестване и linting
- Production deployment към Vercel (ако тестовете минават)

## Структура на проекта

```
xnvd/
├── src/
│   ├── components/     # React компоненти
│   ├── pages/          # Страници
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility функции и API клиенти
│   ├── data/           # Статични данни и структури
│   └── utils/          # Helper функции
├── supabase/
│   └── migrations/     # Database миграции
└── public/             # Статични файлове
```

## Роли и права

Системата поддържа следните роли:

- **admin** - Пълен достъп
- **regional_manager** - Управление на региони
- **office_manager** - Управление на офиси
- **team_leader** - Управление на екипи
- **realtor** - Реализатор (с различни нива)

## Лиценз

Приватен проект - всички права запазени.
