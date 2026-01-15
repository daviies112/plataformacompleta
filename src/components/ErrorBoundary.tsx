import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="error-boundary-container">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-destructive" data-testid="icon-error" />
              <h2 className="mt-4 text-lg font-semibold" data-testid="text-error-title">
                Algo deu errado
              </h2>
              <p className="mt-2 text-sm text-muted-foreground" data-testid="text-error-message">
                Ocorreu um erro inesperado. Por favor, tente novamente.
              </p>
              {this.state.error && (
                <p className="mt-2 text-xs text-muted-foreground font-mono bg-muted p-2 rounded overflow-auto max-h-20" data-testid="text-error-details">
                  {this.state.error.message}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <Button onClick={this.handleRetry} data-testid="button-retry">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button variant="outline" onClick={this.handleReload} data-testid="button-reload">
                  Recarregar página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
