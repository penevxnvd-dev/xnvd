# Ръководство за използване на Supabase в проекта

## Импортиране на Supabase клиент

### Вариант 1: Директно използване (за прости заявки)

```typescript
import { supabase } from '@/integrations/supabase/client';

// Пример за заявка
const { data, error } = await supabase
  .from('todos')
  .select('*');
```

### Вариант 2: Използване на supabaseApi (препоръчително)

```typescript
import { supabaseApi } from '@/lib/supabaseApi';

// Използване на готови методи
const todos = await supabaseApi.getTodos();

// Или достъп до supabase клиента
const { data } = await supabaseApi.supabase
  .from('todos')
  .select('*');
```

## Правилен пример на React компонент

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (data && data.length > 0) {
          setTodos(data);
        } else {
          setTodos([]);
        }
      } catch (err: any) {
        console.error('Error fetching todos:', err);
        setError(err.message || 'Грешка при зареждане на данни');
        toast.error('Грешка при зареждане на todos');
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, []);

  if (loading) {
    return <div>Зареждане...</div>;
  }

  if (error) {
    return <div className="text-destructive">{error}</div>;
  }

  if (todos.length === 0) {
    return <div>Няма todos</div>;
  }

  return (
    <div>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </div>
  );
}
```

## Често срещани грешки и как да ги избегнете

### ❌ Грешно: Липсва async/await

```typescript
// ГРЕШНО
useEffect(() => {
  function getTodos() {
    const { data: todos } = await supabase.from('todos').select();
    // ...
  }
  getTodos();
}, []);
```

### ✅ Правилно: Използване на async функция

```typescript
// ПРАВИЛНО
useEffect(() => {
  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('todos')
      .select('*');
    
    if (error) throw error;
    if (data) setTodos(data);
  };
  
  fetchTodos();
}, []);
```

### ❌ Грешно: Неправилна проверка за данни

```typescript
// ГРЕШНО
if (todos.length > 1) {
  setTodos(todos);
}
```

### ✅ Правилно: Проверка за наличие на данни

```typescript
// ПРАВИЛНО
if (data && data.length > 0) {
  setTodos(data);
} else {
  setTodos([]);
}
```

### ❌ Грешно: Неправилен key prop

```typescript
// ГРЕШНО
{todos.map((todo) => (
  <li key={todo}>{todo}</li>
))}
```

### ✅ Правилно: Използване на уникален идентификатор

```typescript
// ПРАВИЛНО
{todos.map((todo) => (
  <li key={todo.id}>{todo.title}</li>
))}
```

### ❌ Грешно: Неправилен импорт

```typescript
// ГРЕШНО
import { supabase } from '../utils/supabase';
```

### ✅ Правилно: Използване на правилния път

```typescript
// ПРАВИЛНО
import { supabase } from '@/integrations/supabase/client';
// или
import { supabaseApi } from '@/lib/supabaseApi';
```

## Best Practices

1. **Винаги обработвайте грешки**
   ```typescript
   const { data, error } = await supabase.from('todos').select();
   if (error) {
     console.error('Error:', error);
     toast.error('Грешка при зареждане на данни');
     return;
   }
   ```

2. **Добавете loading state**
   ```typescript
   const [loading, setLoading] = useState(true);
   
   useEffect(() => {
     const fetchData = async () => {
       setLoading(true);
       // ... fetch data
       setLoading(false);
     };
     fetchData();
   }, []);
   ```

3. **Използвайте TypeScript типове**
   ```typescript
   interface Todo {
     id: string;
     title: string;
     completed: boolean;
   }
   
   const [todos, setTodos] = useState<Todo[]>([]);
   ```

4. **Добавете error handling**
   ```typescript
   try {
     const { data, error } = await supabase.from('todos').select();
     if (error) throw error;
     setTodos(data || []);
   } catch (err: any) {
     console.error('Error:', err);
     toast.error('Грешка при зареждане на данни');
   }
   ```

5. **Използвайте правилни dependency arrays**
   ```typescript
   // Изпълнява се само веднъж при mount
   useEffect(() => {
     fetchData();
   }, []);
   
   // Изпълнява се при промяна на userId
   useEffect(() => {
     fetchData();
   }, [userId]);
   ```

## Примери от проекта

Вижте следните файлове за реални примери:
- `src/pages/realtor/RealtorDashboard.tsx` - Комплексен пример с множество заявки
- `src/components/cards/CityCardWithKPI.tsx` - Пример за заявка в useEffect
- `src/components/UserManagementDialog.tsx` - Пример за заявка с joins

