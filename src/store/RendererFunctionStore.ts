import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { IdType } from '../models/IdType'

interface RendererFunctionStore {
  rendererFunctions: Map<string, Map<string, Function>>
  rendererFunctionsByNetworkId: Map<IdType, Map<string, Map<string, Function>>>
}

interface RendererFunctionActions {
  setFunction: (
    rendererName: string,
    functionName: string,
    rendererFunction: Function,
    networkId?: IdType,
  ) => void

  getFunction: (
    rendererName: string,
    functionName: string,
    networkId?: IdType,
  ) => Function | undefined
}

export const useRendererFunctionStore = create(
  immer<RendererFunctionStore & RendererFunctionActions>((set, get) => ({
    rendererFunctions: new Map<string, Map<string, Function>>(),
    rendererFunctionsByNetworkId: new Map<
      IdType,
      Map<string, Map<string, Function>>
    >(),

    setFunction: (
      rendererName: string,
      functionName: string,
      rendererFunction: Function,
      networkId?: IdType,
    ) => {
      set((state) => {
        if (!state.rendererFunctions.has(rendererName)) {
          state.rendererFunctions.set(rendererName, new Map<string, Function>())
        }
        state.rendererFunctions
          .get(rendererName)
          ?.set(functionName, rendererFunction)

        if (networkId) {
          if (!state.rendererFunctionsByNetworkId.has(networkId)) {
            state.rendererFunctionsByNetworkId.set(
              networkId,
              new Map<string, Map<string, Function>>(),
            )
          }
          if (
            !state.rendererFunctionsByNetworkId
              .get(networkId)
              ?.has(rendererName)
          ) {
            state.rendererFunctionsByNetworkId
              .get(networkId)
              ?.set(rendererName, new Map<string, Function>())
          }
          state.rendererFunctionsByNetworkId
            .get(networkId)
            ?.get(rendererName)
            ?.set(functionName, rendererFunction)
        }
      })
    },
    getFunction(rendererName, functionName, networkId?: IdType) {
      if (networkId) {
        return get()
          .rendererFunctionsByNetworkId.get(networkId)
          ?.get(rendererName)
          ?.get(functionName)
      }
      return get().rendererFunctions.get(rendererName)?.get(functionName)
    },
  })),
)
