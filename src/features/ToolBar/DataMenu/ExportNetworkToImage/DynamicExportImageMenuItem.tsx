import { MenuItem } from '@mui/material'
import React, { lazy, Suspense } from 'react'

import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { BaseMenuProps } from '../../BaseMenuProps'

// Lazy load the ExportImageMenuItem component
const ExportImageMenuItem = lazy(() =>
  import('./ExportNetworkToImageMenuItem').then((module) => ({
    default: module.ExportImageMenuItem,
  })),
)

// Loading component
const LoadingMenuItem = () => (
  <MenuItem disabled>Loading export options...</MenuItem>
)

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ExportImageMenuItem error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <MenuItem disabled>Failed to load export component</MenuItem>
    }

    return this.props.children
  }
}

// Dynamic wrapper component
const DynamicExportImageMenuItem = (props: BaseMenuProps) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingMenuItem />}>
        <ExportImageMenuItem {...props} />
      </Suspense>
    </ErrorBoundary>
  )
}

export { DynamicExportImageMenuItem as ExportImageMenuItem }
