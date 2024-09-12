import React, { ReactNode } from 'react'
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from 'react-error-boundary'

interface ErrorBoundaryProps {
  children: ReactNode
}

const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps): ReactNode => {
  return (
    <div role="alert">
      <p>Failed to load remote App:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

const ErrorHandler: React.FC<ErrorBoundaryProps> = ({ children }) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.warn('App loader caught an error', error, errorInfo)
      }}
    >
      {children}
    </ReactErrorBoundary>
  )
}

export default ErrorHandler
