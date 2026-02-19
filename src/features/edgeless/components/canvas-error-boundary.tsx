import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '' }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[canvas error boundary]', error, errorInfo)
    this.setState({
      error,
      errorInfo: errorInfo?.componentStack || '',
    })

    // attempt to save any pending data
    try {
      const drawingId = (window as any).__pkmCurrentDrawingId
      if (drawingId) {
        const canvasData = (window as any).pkmGetCanvasJSON?.()
        if (canvasData) {
          localStorage.setItem(`pkm-emergency-backup-${drawingId}`, JSON.stringify(canvasData))
          console.log('[canvas error boundary] emergency backup saved')
        }
      }
    } catch (e) {
      console.error('[canvas error boundary] backup failed:', e)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="w-full h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-black/50 border border-red-500/30 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 lowercase" style={{ fontFamily: 'varela round, sans-serif' }}>
              canvas crashed
            </h2>
            <p className="text-zinc-400 text-sm mb-4 lowercase">
              something went wrong with the drawing canvas. your work may have been backed up.
            </p>

            {this.state.error && (
              <div className="bg-black/50 rounded p-3 mb-4 text-left overflow-auto max-h-32">
                <code className="text-xs text-red-400 font-mono">
                  {this.state.error.message}
                </code>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                reload page
              </Button>
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 lowercase"
              >
                try again
              </Button>
            </div>

            <p className="text-zinc-600 text-xs mt-4 lowercase">
              if this persists, check the console for details
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
