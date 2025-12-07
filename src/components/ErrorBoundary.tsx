import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
// Note: ErrorFallback is outside Router context, so we use window.location instead

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You can log the error to an error reporting service here
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const isDev = import.meta.env.DEV;

  const handleGoHome = () => {
    // Use window.location since we're outside Router context
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Нещо се обърка</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Грешка в приложението</AlertTitle>
            <AlertDescription>
              Съжаляваме, възникна неочаквана грешка. Моля, опитайте отново.
            </AlertDescription>
          </Alert>

          {isDev && error && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="font-mono text-sm text-destructive mb-2">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <pre className="text-xs overflow-auto max-h-64">
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onReset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Опитай отново
            </Button>
            <Button onClick={handleGoHome} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Начало
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorBoundary;

