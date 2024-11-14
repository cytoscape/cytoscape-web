import { IdType } from '../models/IdType'
import {
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../models/VisualStyleModel'

import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { ValueType } from '../models/TableModel'
import {
  DiscreteMappingFunction,
  MappingFunctionType,
  PassthroughMappingFunction,
  ContinuousMappingFunction,
} from '../models/VisualStyleModel/VisualMappingFunction'
import { ContinuousFunctionControlPoint } from '../models/VisualStyleModel/VisualMappingFunction/ContinuousMappingFunction'
import { VisualPropertyValueTypeName } from '../models/VisualStyleModel/VisualPropertyValueTypeName'

import {
  clearVisualStyleFromDb,
  deleteVisualStyleFromDb,
  putVisualStyleToDb,
} from './persist/db'
import { useWorkspaceStore } from './WorkspaceStore'
import { VisualStyleStore } from '../models/StoreModel/VisualStyleStoreModel'

/**
 * Visual Style State manager based on zustand
 *
 */
const persist =
  (config: StateCreator<VisualStyleStore>) =>
  (
    set: StoreApi<VisualStyleStore>['setState'],
    get: StoreApi<VisualStyleStore>['getState'],
    api: StoreApi<VisualStyleStore>,
  ) =>
    config(
      async (args) => {
        const currentNetworkId =
          useWorkspaceStore.getState().workspace.currentNetworkId

        set(args)
        const updated = get().visualStyles[currentNetworkId]
        const deleted = updated === undefined

        if (!deleted) {
          await putVisualStyleToDb(currentNetworkId, updated).then(() => {})
        }
      },
      get,
      api,
    )

export const useVisualStyleStore = create(
  immer<VisualStyleStore>(
    persist((set) => ({
      visualStyles: {},

      add: (networkId: IdType, visualStyle: VisualStyle) => {
        set((state) => {
          if (state.visualStyles[networkId] !== undefined) {
            console.warn(`Visual Style already exists for network ${networkId}`)
            return state
          }
          state.visualStyles[networkId] = visualStyle
          void putVisualStyleToDb(networkId, visualStyle)
            .then(() => {
              console.debug('Added visual style to DB', networkId)
            })
            .catch((err) => {
              console.error('Error adding visual style to DB', err)
            })
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
      setDiscreteMappingValue: (networkId, vpName, values, vpValue) => {
        set((state) => {
          const mapping = state.visualStyles[networkId][vpName]
            .mapping as DiscreteMappingFunction
          if (mapping?.vpValueMap != null) {
            values.forEach((value) => {
              mapping?.vpValueMap.set(value, vpValue)
            })
          }
          return state
        })
      },
      deleteDiscreteMappingValue: (networkId, vpName, values) => {
        set((state) => {
          const mapping = state.visualStyles[networkId][vpName]
            .mapping as DiscreteMappingFunction
          if (mapping?.vpValueMap != null) {
            values.forEach((value) => {
              mapping?.vpValueMap.delete(value)
            })
          }
          return state
        })
      },
      setContinuousMappingValues: (
        networkId,
        vpName,
        min,
        max,
        controlPoints,
        ltMinVpValue,
        gtMaxVpValue,
      ) => {
        set((state) => {
          const mapping = state.visualStyles[networkId][vpName]
            .mapping as ContinuousMappingFunction
          if (mapping != null) {
            mapping.min = min
            mapping.max = max
            mapping.controlPoints = controlPoints
            mapping.ltMinVpValue = ltMinVpValue
            mapping.gtMaxVpValue = gtMaxVpValue
          }
          return state
        })
      },

      createDiscreteMapping(networkId, vpName, attributeName) {
        set((state) => {
          const { defaultValue } = state.visualStyles[networkId][vpName]
          const vpValueMap = new Map<ValueType, VisualPropertyValueType>()

          const discreteMapping: DiscreteMappingFunction = {
            attribute: attributeName,
            type: MappingFunctionType.Discrete,
            vpValueMap,
            visualPropertyType: '',
            defaultValue,
          }
          state.visualStyles[networkId][vpName].mapping = discreteMapping
          return state
        })
      },

      createContinuousMapping(
        networkId,
        vpName,
        vpType,
        attributeName,
        attributeValues,
      ) {
        set((state) => {
          const DEFAULT_COLOR_SCHEME = ['red', 'white', 'blue']
          const DEFAULT_NUMBER_RANGE =
            !vpName.includes('Opacity') && !vpName.includes('opacity')
              ? [1, 100]
              : [0, 1]

          const createColorMapping = (): {
            min: ContinuousFunctionControlPoint
            max: ContinuousFunctionControlPoint
            ctrlPts: ContinuousFunctionControlPoint[]
          } => {
            const min = {
              value: attributeValues[0],
              vpValue: DEFAULT_COLOR_SCHEME[0],
              inclusive: true,
            }

            const max = {
              value: attributeValues[attributeValues.length - 1],
              vpValue: DEFAULT_COLOR_SCHEME[2],
              inclusive: true,
            }

            const ctrlPts = [
              {
                value: attributeValues[0],
                vpValue: DEFAULT_COLOR_SCHEME[0],
              },
              {
                value: attributeValues[Math.floor(attributeValues.length / 2)], // TODO compute median instead of just the middle value
                vpValue: DEFAULT_COLOR_SCHEME[1],
              },
              {
                value: attributeValues[attributeValues.length - 1],
                vpValue: DEFAULT_COLOR_SCHEME[2],
              },
            ]

            return { min, max, ctrlPts }
          }

          const createNumberMapping = (): {
            min: ContinuousFunctionControlPoint
            max: ContinuousFunctionControlPoint
            ctrlPts: ContinuousFunctionControlPoint[]
          } => {
            const min = {
              value: attributeValues[0],
              vpValue: DEFAULT_NUMBER_RANGE[0],
              inclusive: true,
            }

            const max = {
              value: attributeValues[attributeValues.length - 1],
              vpValue: DEFAULT_NUMBER_RANGE[1],
              inclusive: true,
            }

            const ctrlPts = [
              {
                value: attributeValues[0],
                vpValue: DEFAULT_NUMBER_RANGE[0],
              },
              {
                value: attributeValues[attributeValues.length - 1],
                vpValue: DEFAULT_NUMBER_RANGE[1],
              },
            ]

            return { min, max, ctrlPts }
          }

          const { defaultValue, type } = state.visualStyles[networkId][vpName]
          if (vpType === VisualPropertyValueTypeName.Color) {
            const { min, max, ctrlPts } = createColorMapping()
            const continuousMapping: ContinuousMappingFunction = {
              attribute: attributeName,
              type: MappingFunctionType.Continuous,
              min,
              max,
              controlPoints: ctrlPts,
              visualPropertyType: type,
              defaultValue,
              ltMinVpValue: DEFAULT_COLOR_SCHEME[0],
              gtMaxVpValue: DEFAULT_COLOR_SCHEME[2],
            }
            // void putVisualStyleToDb(
            //   networkId,
            //   state.visualStyles[networkId],
            // ).then(() => {})

            state.visualStyles[networkId][vpName].mapping = continuousMapping
          } else if (vpType === VisualPropertyValueTypeName.Number) {
            const { min, max, ctrlPts } = createNumberMapping()
            const continuousMapping: ContinuousMappingFunction = {
              attribute: attributeName,
              type: MappingFunctionType.Continuous,
              min,
              max,
              controlPoints: ctrlPts,
              visualPropertyType: type,
              defaultValue,
              ltMinVpValue: DEFAULT_NUMBER_RANGE[0],
              gtMaxVpValue: DEFAULT_NUMBER_RANGE[1],
            }
            state.visualStyles[networkId][vpName].mapping = continuousMapping
          } else {
            console.error(
              `Could not create continuous mapping function because vpType needs to be a color or number.  Received ${vpType}}`,
            )
          }
          return state
        })
      },

      createPassthroughMapping(networkId, vpName, attributeName) {
        set((state) => {
          const { defaultValue, type } = state.visualStyles[networkId][vpName]
          const passthroughMapping: PassthroughMappingFunction = {
            type: MappingFunctionType.Passthrough,
            attribute: attributeName,
            visualPropertyType: type,
            defaultValue,
          }
          state.visualStyles[networkId][vpName].mapping = passthroughMapping
          return state
        })
      },
      removeMapping(networkId, vpName) {
        set((state) => {
          const vp = state.visualStyles[networkId][vpName]
          delete vp.mapping
          return state
        })
      },
      setMapping(networkId, vpName, mapping) {
        set((state) => {
          const vp = state.visualStyles[networkId][vpName]
          vp.mapping = mapping
          return state
        })
      },
      delete: (networkId) => {
        set((state) => {
          const filtered: Record<string, VisualStyle> = Object.keys(
            state.visualStyles,
          ).reduce<Record<string, VisualStyle>>((acc, key) => {
            if (key !== networkId) {
              acc[key] = state.visualStyles[key]
            }
            return acc
          }, {})
          void deleteVisualStyleFromDb(networkId).then(() => {
            console.log('Deleted visual style from db', networkId)
          })
          return {
            ...state,
            visualStyles: filtered,
          }
        })
      },
      deleteAll: () => {
        set((state) => {
          state.visualStyles = {}
          clearVisualStyleFromDb()
            .then(() => {
              console.log('Deleted all visual styles from db')
            })
            .catch((err) => {
              console.error('Error clearing visual styles from db', err)
            })

          return state
        })
      },
    })),
  ),
)
