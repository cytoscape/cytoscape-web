import { Component, ErrorInfo, ReactNode } from 'react'

import { logUi } from '../debug'

interface Props {
  children?: ReactNode
  /**
   * What to render after a crash. Pass `null` for a boundary that removes its
   * subtree silently — the right behaviour for a decorative overlay whose
   * failure must not replace the app around it.
   */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logUi.error(
      `[${ErrorBoundary.name}]:[${this.componentDidCatch.name}]: Uncaught error:`,
      error,
      errorInfo,
    )
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // `fallback` is optional, so an explicit `null` has to be distinguished
      // from "not supplied" — the former is a silent boundary.
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }
      return (
        <div data-testid="error-boundary" style={{ color: 'red' }}>
          <h1>Error: there was an error</h1>
          <p>{'(Add better error message here)'}</p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
