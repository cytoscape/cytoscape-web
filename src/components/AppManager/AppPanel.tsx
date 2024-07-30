import React, { Suspense, useEffect } from 'react'
import { CyApp } from 'src/models'

const HelloPanel = React.lazy(() => import('hello/HelloPanel' as any))
const SubPanel = React.lazy(() => import('hello/SubPanel' as any))

/**
 * @file AppPanel.tsx
 * @description AppPanel to host external dynamic apps
 * @module AppPanel Component - React Component
 */
export const AppPanel = () => {
  useEffect(() => {
    const loadComponent = async () => {
      console.log('AppPanel mounted')
      const module = await import('simpleMenu/SimpleMenuApp' as any)

      const { SimpleMenuApp } = module
      console.log('App module loaded###########', SimpleMenuApp, module)
    }

    loadComponent()

    return () => {
      console.log('AppPanel unmounted')
    }
  }, [])

  return (
    <Suspense fallback={<div>Loading app...</div>}>
      <HelloPanel message={'This message is from the host app.'} />
      <SubPanel message={'Sub message from the host app.'} color={'red'} />
    </Suspense>
  )
}
