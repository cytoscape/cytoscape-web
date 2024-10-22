import { AppStatus } from '../AppModel/AppStatus'
import { CyApp } from '../AppModel/CyApp'
import { ServiceApp } from '../AppModel/ServiceApp'
import { ServiceAppTask } from '../AppModel/ServiceAppTask'

export interface AppState {
  apps: Record<string, CyApp>

  // URL of the service endpoint is the key
  serviceApps: Record<string, ServiceApp>

  // Status of the remote task
  currentTask?: ServiceAppTask
}

export interface AppAction {
  /**
   * Try to restore app states from IndexedDB
   *
   * @returns
   */
  restore: (appIds: string[]) => Promise<void>

  /**
   * Add an app from the external module
   *
   * @param app
   * @returns
   */
  add: (app: CyApp) => void

  /**
   * Fetch service metadata and add it to the store
   *
   * @param url - ServiceApp endpoint to be added
   */
  addService: (url: string) => Promise<void>

  /**
   * Remove an app from the store
   *
   * @param id
   * @returns
   */
  removeService: (url: string) => void

  /**
   * Set current status of the app
   *
   * @param id
   * @param status
   * @returns
   */
  setStatus: (id: string, status: AppStatus) => void

  /**
   * Set current task of the app
   *
   * @param task
   * @returns
   */
  setCurrentTask: (task: ServiceAppTask) => void

  /**
   * Clear current task
   *
   * @returns
   */
  clearCurrentTask: () => void

  /**
   * Update the parameters for the service call
   *
   */
  updateServiceParameter: (
    url: string,
    displayName: string,
    value: string,
  ) => void

  /**
   * Update the input column (selected column in the table)
   * name for the service call
   *
   * @param url - Service App ID
   * @param name - Input column name (key)
   * @param columnName - New column name to be used in the service call
   *
   */
  updateInputColumn: (url: string, name: string, columnName: string) => void
}

export type AppStore = AppState & AppAction
