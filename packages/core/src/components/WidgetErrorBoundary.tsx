import { Component, type ErrorInfo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary for widget sections
 * Prevents a crashing component from killing the whole dashboard
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Widget error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className={cn(
            'p-4 rounded-xl border border-red-500/20 bg-red-500/5',
            this.props.className
          )}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-400 lowercase">widget crashed</p>
              <p className="text-xs text-white/30 truncate mt-1">
                {this.state.error?.message || 'unknown error'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="try again"
            >
              <RotateCcw className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for widgets with error boundary
 */
export function WidgetContainer({
  children,
  className,
  title,
  icon: Icon,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <WidgetErrorBoundary className={className}>
      <div className="space-y-3">
        {title && (
          <div className="flex items-center gap-2 px-1">
            {Icon && <Icon className="w-4 h-4 text-white/40" />}
            <span className="text-xs text-white/40 lowercase">{title}</span>
          </div>
        )}
        {children}
      </div>
    </WidgetErrorBoundary>
  );
}
