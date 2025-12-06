/**
 * Примерен компонент за използване на Supabase в React
 * 
 * Този файл показва правилния начин да се използва Supabase в проекта.
 * Използвайте го като референция за създаване на нови компоненти.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

/**
 * Примерен компонент за показване на todos от Supabase
 * 
 * Важни неща:
 * 1. Използвайте supabase от @/integrations/supabase/client
 * 2. Винаги обработвайте грешки
 * 3. Използвайте правилни TypeScript типове
 * 4. Добавете loading state
 * 5. Използвайте правилни key props в map
 */
function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Функцията трябва да е async
    const fetchTodos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Правилно използване на Supabase query
        const { data, error: fetchError } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        // Проверка за данни (не length > 1, а просто проверка дали има данни)
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
  }, []); // Празен dependency array = изпълнява се само веднъж при mount

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  // Empty state
  if (todos.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Няма todos</div>
      </div>
    );
  }

  // Render todos
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Todos</h1>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li 
            key={todo.id} // Винаги използвайте уникален key (id, не самия обект)
            className="p-3 border rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={todo.completed}
                readOnly
                className="cursor-pointer"
              />
              <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>
                {todo.title}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TodoPage;

/**
 * Алтернативен подход: Използване на supabaseApi (препоръчително за проекта)
 * 
 * В проекта използваме supabaseApi от @/lib/supabaseApi, който предоставя
 * готови методи за различни операции. Това е по-добрият подход за този проект.
 */

import { supabaseApi } from '@/lib/supabaseApi';

function TodoPageWithApi() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        setLoading(true);
        
        // Използване на supabaseApi (ако има такъв метод)
        // const todos = await supabaseApi.getTodos();
        
        // Или директно използване на supabase клиента
        const { data, error } = await supabaseApi.supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setTodos(data || []);
      } catch (err: any) {
        console.error('Error:', err);
        toast.error('Грешка при зареждане на todos');
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, []);

  if (loading) return <div>Зареждане...</div>;
  if (todos.length === 0) return <div>Няма todos</div>;

  return (
    <div>
      {todos.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </div>
  );
}

