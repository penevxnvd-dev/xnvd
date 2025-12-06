// Connection status indicator component
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const ConnectionStatus = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test connection by fetching a simple query
        const { error: testError } = await supabase
          .from('countries')
          .select('id')
          .limit(1);

        if (testError) {
          // Check if it's an auth error (expected for unauthenticated users)
          if (testError.code === 'PGRST301' || testError.message.includes('JWT')) {
            setStatus('connected');
            setError(null);
            return;
          }
          throw testError;
        }

        setStatus('connected');
        setError(null);
      } catch (err: any) {
        console.error('Connection check failed:', err);
        setStatus('disconnected');
        setError(err.message || 'Connection failed');
      }
    };

    checkConnection();
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Проверка...
      </Badge>
    );
  }

  if (status === 'connected') {
    return (
      <Badge variant="outline" className="gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Свързано
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Несвързано
      {error && <span className="ml-1 text-xs">({error})</span>}
    </Badge>
  );
};

