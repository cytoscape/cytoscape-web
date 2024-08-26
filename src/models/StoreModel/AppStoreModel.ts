import { AppStatus } from '../AppModel/AppStatus'
import { CyApp } from '../AppModel/CyApp'

export interface AppState {
  apps: Record<string, CyApp>
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
   * Set current status of the app
   *
   * @param id
   * @param status
   * @returns
   */
  setStatus: (id: string, status: AppStatus) => void
}

export type AppStore = AppState & AppAction
