import { createContext, useContext } from 'react'

import type { AppManagerCommands } from '../../data/hooks/stores/useAppManager'

const AppManagerCommandsContext = createContext<
  AppManagerCommands | undefined
>(undefined)

export const AppManagerCommandsProvider = AppManagerCommandsContext.Provider

export const useAppManagerCommands = (): AppManagerCommands => {
  const ctx = useContext(AppManagerCommandsContext)
  if (ctx === undefined) {
    throw new Error(
      'useAppManagerCommands must be used within AppManagerCommandsProvider',
    )
  }
  return ctx
}
