import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { IdType } from '../../../models/IdType'
import * as RendererFunctionImpl from '../../../models/RendererFunctionModel/impl/rendererFunctionImpl'
import { RendererFunction } from '../../../models/RendererFunctionModel/impl/rendererFunctionImpl'

interface RendererFunctionStore {
  rendererFunctions: Map<string, Map<string, RendererFunction>>
  rendererFunctionsByNetworkId: Map<
    IdType,
    Map<string, Map<string, RendererFunction>>
  >
}

interface RendererFunctionActions {
  setFunction: (
    rendererName: string,
    functionName: string,
    rendererFunction: RendererFunction,
    networkId?: IdType,
  ) => void

  getFunction: (
    rendererName: string,
    functionName: string,
    networkId?: IdType,
  ) => RendererFunction | undefined

  deleteFunctionsForNetwork: (networkId: IdType) => void
}

export const useRendererFunctionStore = create(
  immer<RendererFunctionStore & RendererFunctionActions>((set, get) => ({
    rendererFunctions: new Map<string, Map<string, RendererFunction>>(),
    rendererFunctionsByNetworkId: new Map<
      IdType,
      Map<string, Map<string, RendererFunction>>
    >(),

    setFunction: (
      rendererName: string,
      functionName: string,
      rendererFunction: RendererFunction,
      networkId?: IdType,
    ) => {
      set((state) => {
        const newState = RendererFunctionImpl.setFunction(
          state,
          rendererName,
          functionName,
          rendererFunction,
          networkId,
        )
        state.rendererFunctions = newState.rendererFunctions
        state.rendererFunctionsByNetworkId =
          newState.rendererFunctionsByNetworkId
        return state
      })
    },
    getFunction(rendererName, functionName, networkId?: IdType) {
      return RendererFunctionImpl.getFunction(
        get(),
        rendererName,
        functionName,
        networkId,
      )
    },
    deleteFunctionsForNetwork(networkId: IdType) {
      set((state) => {
        RendererFunctionImpl.deleteFunctionsForNetwork(state, networkId)
      })
    },
  })),
)
