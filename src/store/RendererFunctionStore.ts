import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface RendererFunctionStore {
  rendererFunctions: Map<string, Map<string, Function>>
}

interface RendererFunctionActions {
  setFunction: (
    rendererName: string,
    functionName: string,
    rendererFunction: Function,
  ) => void

  getFunction: (
    rendererName: string,
    functionName: string,
  ) => Function | undefined
}

export const useRendererFunctionStore = create(
  immer<RendererFunctionStore & RendererFunctionActions>((set, get) => ({
    rendererFunctions: new Map<string, Map<string, Function>>(),

    setFunction: (
      rendererName: string,
      functionName: string,
      rendererFunction: Function,
    ) => {
      set((state) => {
        if (!state.rendererFunctions.has(rendererName)) {
          state.rendererFunctions.set(rendererName, new Map<string, Function>())
        }
        state.rendererFunctions
          .get(rendererName)
          ?.set(functionName, rendererFunction)
      })
    },
    getFunction(rendererName, functionName) {
      return get().rendererFunctions.get(rendererName)?.get(functionName)
    },
  })),
)
