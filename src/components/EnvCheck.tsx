import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { getEnv } from '@/lib/env';

interface EnvCheckProps {
  children: React.ReactNode;
}

export const EnvCheck: React.FC<EnvCheckProps> = ({ children }) => {
  const [envError, setEnvError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsChecking(false);
      setEnvError('Environment check timed out. Please check browser console for errors.');
    }, 5000);

    try {
      getEnv();
      setEnvError(null);
      setIsChecking(false);
      clearTimeout(timeoutId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setEnvError(message);
      setIsChecking(false);
      clearTimeout(timeoutId);
      console.error('Environment check failed:', error);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  if (envError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Липсват настройки</CardTitle>
            </div>
            <CardDescription>
              Приложението не може да стартира без необходимите environment variables
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Грешка в конфигурацията</AlertTitle>
              <AlertDescription className="mt-2">
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded mt-2">
                  {envError}
                </pre>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold">Как да поправите:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Отидете в{' '}
                  <a
                    href="https://vercel.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-1"
                  >
                    Vercel Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Изберете проекта <strong>xnvd</strong></li>
                <li>Отидете на <strong>Settings</strong> → <strong>Environment Variables</strong></li>
                <li>Добавете следните променливи:</li>
              </ol>
              <div className="bg-muted p-4 rounded-md space-y-2 text-sm font-mono">
                <div>
                  <strong>VITE_SUPABASE_URL</strong>
                  <div className="text-muted-foreground text-xs mt-1">
                    Вашият Supabase Project URL (от Supabase Dashboard → Settings → API)
                  </div>
                </div>
                <div>
                  <strong>VITE_SUPABASE_PUBLISHABLE_KEY</strong>
                  <div className="text-muted-foreground text-xs mt-1">
                    Вашият Supabase anon/public key (от Supabase Dashboard → Settings → API)
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  След добавяне на променливите, отидете на <strong>Deployments</strong> и направете <strong>Redeploy</strong> на последния deployment.
                </p>
              </div>
              <div className="mt-4">
                <a
                  href="https://github.com/penevxnvd-dev/xnvd/blob/main/VERCEL_ENV_SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-1 text-sm"
                >
                  Вижте подробни инструкции
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

