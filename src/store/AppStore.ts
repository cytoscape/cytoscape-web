// const SimpleMenu = ExternalComponent('hello', './MenuExample')
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { CyApp } from '../models/AppModel/CyApp'

interface AppState {
  apps: Record<string, CyApp>
  isEnabled: Map<string, boolean>
}

interface AppAction {
  add: (app: CyApp) => void
  setEnabled: (id: string, enabled: boolean) => void
}

type AppStore = AppState & AppAction

export const useAppStore = create(
  immer<AppStore>((set) => ({
    apps: {},
    isEnabled: new Map<string, boolean>(),

    add: (app: CyApp) => {
      set((state) => {
        // Add app only when it is not already present
        if (!state.apps[app.id]) {
          state.apps[app.id] = app
          console.info(`App registered: ${app.id}`)
          state.isEnabled.set(app.id, true)
        }
      })
    },
    setEnabled: (id: string, enabled: boolean) => {
      set((state) => {
        state.isEnabled.set(id, enabled)
      })
    },
  })),
)
