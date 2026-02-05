import { IdType } from '../../IdType'
import { OpaqueAspects } from '../OpaqueAspects'

export interface OpaqueAspectState {
  opaqueAspects: Record<IdType, OpaqueAspects>
}

/**
 * Add an aspect for a network
 */
export const add = (
  state: OpaqueAspectState,
  networkId: IdType,
  aspectName: string,
  aspectData: any[],
): OpaqueAspectState => {
  const networkAspects = state.opaqueAspects[networkId] ?? {}
  return {
    ...state,
    opaqueAspects: {
      ...state.opaqueAspects,
      [networkId]: {
        ...networkAspects,
        [aspectName]: aspectData,
      },
    },
  }
}

/**
 * Add multiple aspects for a network
 */
export const addAll = (
  state: OpaqueAspectState,
  networkId: IdType,
  aspects: OpaqueAspects[],
  isUpdate: boolean = false,
): OpaqueAspectState => {
  const networkAspects = isUpdate ? {} : state.opaqueAspects[networkId] ?? {}
  const newNetworkAspects = { ...networkAspects }

  aspects.forEach((aspect) => {
    const [aspectName, aspectData] = Object.entries(aspect)[0]
    newNetworkAspects[aspectName] = aspectData
  })

  return {
    ...state,
    opaqueAspects: {
      ...state.opaqueAspects,
      [networkId]: newNetworkAspects,
    },
  }
}

/**
 * Delete all aspects for a network
 */
export const deleteAspects = (
  state: OpaqueAspectState,
  networkId: IdType,
): OpaqueAspectState => {
  if (networkId === undefined) {
    return state
  }

  const { [networkId]: deleted, ...restOpaqueAspects } = state.opaqueAspects
  return {
    ...state,
    opaqueAspects: restOpaqueAspects,
  }
}

/**
 * Delete a single aspect for a network
 */
export const deleteSingleAspect = (
  state: OpaqueAspectState,
  networkId: IdType,
  aspectName: string,
): OpaqueAspectState => {
  const networkAspects = state.opaqueAspects[networkId]
  if (!networkAspects) {
    return state
  }

  const { [aspectName]: deleted, ...restAspects } = networkAspects
  return {
    ...state,
    opaqueAspects: {
      ...state.opaqueAspects,
      [networkId]: restAspects,
    },
  }
}

/**
 * Clear all aspects for a network
 */
export const clearAspects = (
  state: OpaqueAspectState,
  networkId: IdType,
): OpaqueAspectState => {
  return {
    ...state,
    opaqueAspects: {
      ...state.opaqueAspects,
      [networkId]: {},
    },
  }
}

/**
 * Delete all aspects for all networks
 */
export const deleteAll = (state: OpaqueAspectState): OpaqueAspectState => {
  return {
    ...state,
    opaqueAspects: {},
  }
}

/**
 * Update an aspect for a network
 */
export const update = (
  state: OpaqueAspectState,
  networkId: IdType,
  aspectName: string,
  aspectData: any[],
): OpaqueAspectState => {
  const networkAspects = state.opaqueAspects[networkId] ?? {}
  return {
    ...state,
    opaqueAspects: {
      ...state.opaqueAspects,
      [networkId]: {
        ...networkAspects,
        [aspectName]: [...aspectData], // Create new array copy
      },
    },
  }
}

