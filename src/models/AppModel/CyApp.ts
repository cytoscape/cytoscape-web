import { AppStatus } from './AppStatus'
import { ComponentMetadata } from './ComponentMetadata'

/**
 * Base interface to define the app object
 *
 * All apps should implement this and this will be the entry point for the app
 *
 */
export interface CyApp {
  // Unique ID of the app. This works as the namespace for the app
  // in the module federation.
  id: string

  // Human-readable name of the app
  name: string

  // Description of the app
  description?: string

  /**
   * Semantic version of the app (e.g. '1.2.0').
   *
   * Recommended: import from the app's own package.json so this value
   * stays in sync with the published npm version automatically:
   *
   *   import packageJson from '../package.json'
   *   const { version } = packageJson        // destructure to avoid webpack warning
   *   export const MyApp: CyApp = { ..., version }
   *
   * Requires `resolveJsonModule: true` in tsconfig.json
   * (already enabled in all example apps).
   */
  version?: string

  // Name of components to be exposed via Module Federation
  components: ComponentMetadata[]

  // Current status of the app. Default is 'active', which is set by the host
  status?: AppStatus
}
