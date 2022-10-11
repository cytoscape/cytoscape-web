import * as React from 'react'

import { ApplicationState } from './ApplicationState'
import { serializeCurrentNetwork, serializeWorkspace } from '../models'

import exampleData from '../../data/example-db.json'

const workspace = serializeWorkspace(exampleData.workspace)
const currentNetwork = serializeCurrentNetwork(exampleData.currentNetwork)
const allNetworks = exampleData.allNetworks.map((otherNetwork) =>
  serializeCurrentNetwork(otherNetwork),
)
const initialState: ApplicationState = {
  workspace,
  currentNetwork,

  appDispatch: null,
}

export const AppContext: React.Context<ApplicationState> =
  React.createContext(initialState)

interface AppStateProviderProps {
  children?: React.ReactNode
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = React.useReducer(
    (state: ApplicationState, action: any) => {
      switch (action.type) {
        case 'dummyAction': {
          const newState = { ...state }
          return newState
        }
        case 'setCurrentNetwork': {
          const newCurrentNetwork = allNetworks.find(
            (otherNetwork) =>
              otherNetwork.summary.uuid === action.payload.networkId,
          )
          const newState = {
            ...state,
            ...Object.assign(workspace, {
              currentNetworkUUID: action.payload.networkId,
            }),
          }
          Object.assign(newState, { currentNetwork: newCurrentNetwork })

          return newState
        }
        default:
          throw new Error(`Invalid action type`)
      }
    },
    initialState,
  )

  return (
    <AppContext.Provider
      value={Object.assign(state, { appDispatch: dispatch })}
    >
      {children}
    </AppContext.Provider>
  )
}
