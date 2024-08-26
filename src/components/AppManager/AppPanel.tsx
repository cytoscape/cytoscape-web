import React, { ComponentType, LazyExoticComponent, Suspense } from 'react'
import { useAppPanel } from '../../store/hooks/useAppPanel'

const HelloPanel = React.lazy(() => import('hello/HelloPanel' as any))
const SubPanel = React.lazy(() => import('hello/SubPanel' as any))

/**
 * @file AppPanel.tsx
 * @description AppPanel to host external dynamic apps
 * @module AppPanel Component - React Component
 */
export const AppPanel = () => {
  const panels = useAppPanel()
  console.log('Panels::', panels)
  return (
    <Suspense fallback={<div>Loading app...</div>}>
      <HelloPanel message={'This message is from the host app.'} />
      <SubPanel message={'Sub message from the host app.'} color={'red'} />
      {panels.map(
        (AppPanel: LazyExoticComponent<ComponentType<any>>, index) => {
          return <AppPanel key={index} />
        },
      )}
    </Suspense>
  )
}
