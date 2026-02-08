import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnChange?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });

    // Log error to error tracking service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    const { resetOnChange } = this.props;
    
    if (resetOnChange && JSON.stringify(resetOnChange) !== JSON.stringify(prevProps.resetOnChange)) {
      this.resetErrorBoundary();
    }
  }

  logError = (error: Error, errorInfo: ErrorInfo): void => {
    // In production, send to error tracking service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      console.error('Application Error:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    } else {
      console.error('Error caught by boundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  };

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  reloadPage = (): void => {
    window.location.reload();
  };

  goHome = (): void => {
    window.location.href = '/';
  };

  reportError = (): void => {
    const { error, errorInfo } = this.state;
    const emailBody = `
Error Details:
${error?.toString()}

Component Stack:
${errorInfo?.componentStack}

URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    window.location.href = `mailto:support@currystardom.com?subject=App Error Report&body=${encodeURIComponent(emailBody)}`;
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="glass rounded-3xl p-8 max-w-md w-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-black mb-2">Something went wrong</h1>
              <p className="text-gray-400">
                We apologize for the inconvenience. Our team has been notified.
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-white/5 rounded-xl p-4">
                <div className="text-xs font-mono text-gray-400 overflow-auto max-h-32">
                  {error.toString()}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.resetErrorBoundary}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={this.reloadPage}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-xl font-bold hover:bg-yellow-500/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              <button
                onClick={this.goHome}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Homepage
              </button>

              <button
                onClick={this.reportError}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500/30 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Report Error
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-xs text-gray-500">
                Error ID: {Date.now().toString(36)}
                <br />
                Need help? Contact support@currystardom.com
              </p>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `WithErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for error boundary reset
export const useErrorBoundaryReset = () => {
  const [key, setKey] = React.useState(0);
  
  const reset = () => {
    setKey(prev => prev + 1);
  };
  
  return { key, reset };
};

export default ErrorBoundary;