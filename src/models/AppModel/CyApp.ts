/**
 * Base interface to define the app object
 *
 * All apps should implement this and this will be the entry point for the app
 *
 */
export interface CyApp {
  // Unique ID of the app
  id: string

  // Human readable name of the app
  name: string

  // Base URL to access the app (hosting remoteEntry.js)
  url: string

  // Turn on/off the app in the host
  enabled: boolean

  // Name of components to be exposed as custom components
  components?: string[]
}
