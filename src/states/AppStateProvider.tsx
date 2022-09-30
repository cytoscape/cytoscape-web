import * as React from 'react'
// import { Context, createContext, FC, ReactNode, useReducer } from React
import { TableFactory } from '../models/Table/TableFactory'
import { ApplicationState } from './ApplicationState'

const initialState: ApplicationState = {
  network: null,
  networkAttributes: TableFactory.createTable('Network Table'),
  nodeTable: TableFactory.createTable('Node Table'),
  edgeTable: TableFactory.createTable('Edge Table'),
  networkView: null,
  visualStyle: null,
}

export const AppContext: React.Context<ApplicationState> =
  React.createContext(initialState)

interface ContainerProps {
  children?: React.ReactNode
}

export const AppStateProvider: React.FC<ContainerProps> = ({ children }) => {
  const [state, dispatch] = React.useReducer(
    (state: ApplicationState, action: any) => {
      switch (action.type) {
        case 'dummyAction':
          const newState = { ...state }
          return newState
        default:
          throw new Error()
      }
    },
    initialState,
  )

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>
}
