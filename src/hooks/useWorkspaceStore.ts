import create from 'zustand'
import produce from 'immer'

import {
  CurrentNetwork,
  serializeCurrentNetwork,
  serializeWorkspace,
  Workspace,
  // Workspace,
} from '../models'

import exampleData from '../../data/example-db.json'

const workspace = serializeWorkspace(exampleData.workspace)
const currentNetwork = serializeCurrentNetwork(exampleData.currentNetwork)
const allNetworks = exampleData.allNetworks.map((otherNetwork) =>
  serializeCurrentNetwork(otherNetwork),
)

export interface AppState {
  workspace: Workspace
  currentNetwork: CurrentNetwork
  setNetwork: (networkUUID: string) => void
}

export const useWorkspaceStore = create((set, get: () => AppState) => {
  const appState: AppState = {
    workspace,
    currentNetwork,
    setNetwork: (networkUUID: string): void => {
      const state: AppState = get()
      const currentNetwork: CurrentNetwork = state.currentNetwork
      const nextNetwork: CurrentNetwork =
        allNetworks.find(
          (otherNetwork) => otherNetwork.summary.uuid === networkUUID,
        ) ?? currentNetwork
      if (nextNetwork != null) {
        set(
          produce((state) => {
            state.currentNetwork = nextNetwork
            state.workspace.currentNetworkUUID = nextNetwork.summary.uuid
          }),
        )
      }
    },
  }
  return appState
})
