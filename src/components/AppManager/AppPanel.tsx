import { Suspense } from 'react'
import ErrorHandler from './ErrorHandler'
import React from 'react'

/**
 * @file AppPanel.tsx
 * @description AppPanel to host external dynamic apps
 * @module AppPanel Component - React Component
 */
export const AppPanel = () => {
  const HelloPanel = React.lazy(() => import('hello/HelloPanel' as any))

  return (
    <ErrorHandler>
      <Suspense fallback={<div>Loading app...</div>}>
        <HelloPanel />
      </Suspense>
    </ErrorHandler>
  )
}
