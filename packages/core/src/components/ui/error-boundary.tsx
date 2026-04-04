import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Global Error Boundary component that catches render errors gracefully.
 * - Shows styled error card with dark bg and gold accent (consistent with app theme)
 * - Includes Return to Dashboard and Try Again buttons
 * - NEVER exposes file paths, stack traces, or component names in production
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console for debugging, but DON'T display to user
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReturnHome = () => {
    window.location.href = '/';
  };

  handleTryAgain = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="w-full h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0a0a0a] border border-[#ffb10f]/30 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-[#ffb10f] mx-auto mb-4" />
            <h2 
              className="text-xl font-bold text-white mb-2 lowercase" 
              style={{ fontFamily: 'varela round, sans-serif' }}
            >
              something went wrong
            </h2>
            <p className="text-zinc-400 text-sm mb-6 lowercase">
              we encountered an unexpected issue. please try again or return to the dashboard.
            </p>

            {/* Only show error details in development */}
            {isDev && this.state.error && (
              <div className="bg-black/50 rounded p-3 mb-4 text-left overflow-auto max-h-32">
                <code className="text-xs text-[#ffb10f]/80 font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReturnHome}
                className="bg-[#ffb10f] text-black hover:bg-[#ffb10f]/90 lowercase"
              >
                <Home className="w-4 h-4 mr-2" />
                return to dashboard
              </Button>
              <Button
                onClick={this.handleTryAgain}
                variant="outline"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white lowercase"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                try again
              </Button>
            </div>

            <p className="text-zinc-600 text-xs mt-4 lowercase">
              if this persists, please check your connection and try refreshing the page
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Page-level Error Boundary wrapper that preserves the sidebar/shell when a page crashes.
 * Use this to wrap individual page components so one page crash doesn't nuke the entire app.
 */
export function PageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
