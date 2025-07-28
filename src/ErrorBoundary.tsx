import { Component, ErrorInfo, ReactNode } from 'react'
import { logUi } from './debug'

interface Props {
  children?: ReactNode
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
      return (
        <div style={{ color: 'red' }}>
          <h1>Error: there was an error</h1>
          <p>{'(Add better error message here)'}</p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
