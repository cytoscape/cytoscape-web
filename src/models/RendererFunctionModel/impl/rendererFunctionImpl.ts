import { IdType } from '../../IdType'

export type RendererFunction = (...args: any[]) => any

export interface RendererFunctionState {
  rendererFunctions: Map<string, Map<string, RendererFunction>>
  rendererFunctionsByNetworkId: Map<
    IdType,
    Map<string, Map<string, RendererFunction>>
  >
}

/**
 * Set a function for a renderer
 */
export const setFunction = (
  state: RendererFunctionState,
  rendererName: string,
  functionName: string,
  rendererFunction: RendererFunction,
  networkId?: IdType,
): RendererFunctionState => {
  const newRendererFunctions = new Map(state.rendererFunctions)
  if (!newRendererFunctions.has(rendererName)) {
    newRendererFunctions.set(rendererName, new Map<string, RendererFunction>())
  }
  const rendererMap = newRendererFunctions.get(rendererName)!
  const newRendererMap = new Map(rendererMap)
  newRendererMap.set(functionName, rendererFunction)
  newRendererFunctions.set(rendererName, newRendererMap)

  let newRendererFunctionsByNetworkId = state.rendererFunctionsByNetworkId
  if (networkId) {
    newRendererFunctionsByNetworkId = new Map(
      state.rendererFunctionsByNetworkId,
    )
    if (!newRendererFunctionsByNetworkId.has(networkId)) {
      newRendererFunctionsByNetworkId.set(
        networkId,
        new Map<string, Map<string, RendererFunction>>(),
      )
    }
    const networkMap = newRendererFunctionsByNetworkId.get(networkId)!
    const newNetworkMap = new Map(networkMap)
    if (!newNetworkMap.has(rendererName)) {
      newNetworkMap.set(rendererName, new Map<string, RendererFunction>())
    }
    const rendererMapInNetwork = newNetworkMap.get(rendererName)!
    const newRendererMapInNetwork = new Map(rendererMapInNetwork)
    newRendererMapInNetwork.set(functionName, rendererFunction)
    newNetworkMap.set(rendererName, newRendererMapInNetwork)
    newRendererFunctionsByNetworkId.set(networkId, newNetworkMap)
  }

  return {
    rendererFunctions: newRendererFunctions,
    rendererFunctionsByNetworkId: newRendererFunctionsByNetworkId,
  }
}

/**
 * Get a function for a renderer
 */
export const getFunction = (
  state: RendererFunctionState,
  rendererName: string,
  functionName: string,
  networkId?: IdType,
): RendererFunction | undefined => {
  if (networkId) {
    return state.rendererFunctionsByNetworkId
      .get(networkId)
      ?.get(rendererName)
      ?.get(functionName)
  }
  return state.rendererFunctions.get(rendererName)?.get(functionName)
}

/**
 * Delete functions for a network
 */
export const deleteFunctionsForNetwork = (
  state: RendererFunctionState,
  networkId: IdType,
): void => {
  const byNetwork = state.rendererFunctionsByNetworkId.get(networkId)
  if (byNetwork !== undefined) {
    for (const [rendererName, fnMap] of byNetwork.entries()) {
      const globalRendererMap = state.rendererFunctions.get(rendererName)
      if (globalRendererMap !== undefined) {
        for (const [functionName, registeredFn] of fnMap.entries()) {
          if (globalRendererMap.get(functionName) === registeredFn) {
            globalRendererMap.delete(functionName)
          }
        }
      }
    }
    state.rendererFunctionsByNetworkId.delete(networkId)
  }
}
