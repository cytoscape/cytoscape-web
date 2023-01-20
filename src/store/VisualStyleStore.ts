import { IdType } from '../models/IdType'
import {
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../models/VisualStyleModel'

import create from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ValueType } from '../models/TableModel'
import {
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  ContinuousMappingFunction,
} from '../models/VisualStyleModel/VisualMappingFunction'

/**
//  * Visual Style State manager based on zustand
//  */
interface VisualStyleState {
  visualStyles: Record<IdType, VisualStyle>
}

/**
 * Actions to mutate visual style structure
 */
interface UpdateVisualStyleAction {
  setDefault: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ) => void
  setBypass: (
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
    vpValue: VisualPropertyValueType,
  ) => void
  deleteBypass: (
    networkId: IdType,
    vpName: VisualPropertyName,
    elementIds: IdType[],
  ) => void
  setMapping: (
    networkId: IdType,
    vpName: VisualPropertyName,
    attributeName: string,
    mappingType: MappingFunctionType,
  ) => void
  setDiscreteMappingValue: (
    networkId: IdType,
    vpName: VisualPropertyName,
    value: ValueType,
    vpValue: VisualPropertyValueType,
  ) => void
  deleteDiscreteMappingValue: (
    networkId: IdType,
    vpName: VisualPropertyName,
    value: ValueType,
  ) => void
  removeMapping: (networkId: IdType, vpName: VisualPropertyName) => void
  // setMapping: () // TODO
}

interface VisualStyleAction {
  set: (networkId: IdType, visualStyle: VisualStyle) => void
  //   reset: () => void

  //   add: (network: Network) => void
  //   delete: (networkId: IdType) => void
  //   deleteAll: () => void
}

export const useVisualStyleStore = create(
  immer<VisualStyleState & VisualStyleAction & UpdateVisualStyleAction>(
    (set) => ({
      visualStyles: {},

      set: (networkId: IdType, visualStyle: VisualStyle) => {
        set((state) => {
          state.visualStyles[networkId] = visualStyle
          return state
        })
      },

      setDefault: (
        networkId: IdType,
        vpName: VisualPropertyName,
        vpValue: VisualPropertyValueType,
      ) => {
        set((state) => {
          state.visualStyles[networkId][vpName].defaultValue = vpValue
          return state
        })
      },

      setBypass: (
        networkId: IdType,
        vpName: VisualPropertyName,
        elementIds: IdType[],
        vpValue: VisualPropertyValueType,
      ) => {
        set((state) => {
          const bypassMap = state.visualStyles[networkId][vpName].bypassMap

          elementIds.forEach((eleId) => {
            bypassMap.set(eleId, vpValue)
          })

          return state
        })
      },
      deleteBypass(networkId, vpName, elementIds: IdType[]) {
        set((state) => {
          const bypassMap = state.visualStyles[networkId][vpName].bypassMap
          elementIds.forEach((eleId) => {
            bypassMap.delete(eleId)
          })

          return state
        })
      },
      setDiscreteMappingValue: (networkId, vpName, value, vpValue) => {
        set((state) => {
          const mapping = state.visualStyles[networkId][vpName]
            .mapping as DiscreteMappingFunction
          if (mapping?.vpValueMap != null) {
            mapping?.vpValueMap.set(value, vpValue)
          }
        })
      },
      deleteDiscreteMappingValue: (networkId, vpName, value) => {
        set((state) => {
          const mapping = state.visualStyles[networkId][vpName]
            .mapping as DiscreteMappingFunction
          if (mapping?.vpValueMap != null) {
            mapping?.vpValueMap.delete(value)
          }
        })
      },

      setMapping(networkId, vpName, attributeName, mappingType) {
        set((state) => {
          switch (mappingType) {
            case MappingFunctionType.Discrete: {
              const discreteMapping: DiscreteMappingFunction = {
                attribute: attributeName,
                type: MappingFunctionType.Discrete,
                vpValueMap: new Map<ValueType, VisualPropertyValueType>(),
                defaultValue:
                  state.visualStyles[networkId][vpName].defaultValue,
              }
              state.visualStyles[networkId][vpName].mapping = discreteMapping
              break
            }
            case MappingFunctionType.Passthrough: {
              const passthroughMapping: PassthroughMappingFunction = {
                type: MappingFunctionType.Passthrough,
                attribute: attributeName,
              }
              state.visualStyles[networkId][vpName].mapping = passthroughMapping
              break
            }
            case MappingFunctionType.Continuous: {
              const continuousMapping: ContinuousMappingFunction = {
                type: MappingFunctionType.Continuous,
                attribute: attributeName,
                intervals: [],
              }
              state.visualStyles[networkId][vpName].mapping = continuousMapping
              break
            }
          }
        })
      },
      removeMapping(networkId, vpName) {
        set((state) => {
          state.visualStyles[networkId][vpName].mapping = null
        })
      },
    }),
  ),
)
