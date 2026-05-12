import { ComponentType } from './ComponentType'

export interface ComponentMetadata {
  id: string
  type: ComponentType
  /**
   * Optional pre-built lazy component (React.lazy() result).
   *
   * When provided, the host renders this component directly without loading it
   * via Module Federation `container.get()`. This allows plugins to expose only
   * `'./AppConfig'` in their webpack config — no per-component `exposes` entry needed.
   *
   * Example (in your AppConfig file):
   *
   *   import { lazy } from 'react'
   *   components: [{
   *     id: 'MyPanel',
   *     type: ComponentType.Panel,
   *     component: lazy(() => import('./components/MyPanel')),
   *   }]
   *
   * If omitted, the host falls back to loading the component via Module Federation
   * using the `id` as the module name (legacy behaviour, requires a matching
   * `exposes` entry in the plugin's webpack.config.js).
   */
  component?: any
}
