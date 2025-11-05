import { IdType } from '../../IdType'

export interface RendererFunctionState {
  rendererFunctions: Map<string, Map<string, Function>>
  rendererFunctionsByNetworkId: Map<IdType, Map<string, Map<string, Function>>>
}

/**
 * Set a function for a renderer
 */
export const setFunction = (
  state: RendererFunctionState,
  rendererName: string,
  functionName: string,
  rendererFunction: Function,
  networkId?: IdType,
): RendererFunctionState => {
  const newRendererFunctions = new Map(state.rendererFunctions)
  if (!newRendererFunctions.has(rendererName)) {
    newRendererFunctions.set(rendererName, new Map<string, Function>())
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
        new Map<string, Map<string, Function>>(),
      )
    }
    const networkMap = newRendererFunctionsByNetworkId.get(networkId)!
    const newNetworkMap = new Map(networkMap)
    if (!newNetworkMap.has(rendererName)) {
      newNetworkMap.set(rendererName, new Map<string, Function>())
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
): Function | undefined => {
  if (networkId) {
    return state.rendererFunctionsByNetworkId
      .get(networkId)
      ?.get(rendererName)
      ?.get(functionName)
  }
  return state.rendererFunctions.get(rendererName)?.get(functionName)
}

