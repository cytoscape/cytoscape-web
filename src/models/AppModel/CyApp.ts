import { ComponentMetadata } from './ComponentMetadata'
import { AppStatus } from './AppStatus'

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

  // Name of components to be exposed via Module Federation
  components: ComponentMetadata[]

  // Current status of the app. Default is 'active', which is set by the host
  status?: AppStatus
}
