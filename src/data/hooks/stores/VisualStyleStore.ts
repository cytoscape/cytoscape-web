/**
 * @deprecated The Module Federation exposure of this store (cyweb/VisualStyleStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/VisualStyleStore Module Federation export will be removed after 2 release cycles.
 */
import { create, StateCreator } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { VisualStyleStore } from '../../../models/StoreModel/VisualStyleStoreModel'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'
import {
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import * as VisualStyleImpl from '../../../models/VisualStyleModel/impl/visualStyleImpl'
import { MappingFunctionType } from '../../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import {
  clearVisualStyleFromDb,
  deleteVisualStyleFromDb,
  putVisualStyleToDb,
} from '../../db'
import { isHydrating } from './hydrationContext'
import { persistNetworkSlices } from './persistNetworkSlices'

/**
 * Visual Style State manager based on zustand
 *
 */
const persist = (config: StateCreator<VisualStyleStore>) =>
  persistNetworkSlices<VisualStyleStore, VisualStyle>(config, {
    label: 'VisualStyleStore',
    selectSlices: (state) => state.visualStyles,
    putSlice: (networkId, visualStyle) =>
      putVisualStyleToDb(networkId, visualStyle),
  })

export const useVisualStyleStore = create(
  immer<VisualStyleStore>(
    persist((set, get) => ({
      visualStyles: {},

      add: (networkId: IdType, visualStyle: VisualStyle) => {
        set((state) => {
          if (state.visualStyles[networkId] !== undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Visual Style already exists for network ${networkId}, and it 
              will be overwritten.`,
            )
          }
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
          state.visualStyles[networkId] = VisualStyleImpl.setDefault(
            state.visualStyles[networkId],
            vpName,
            vpValue,
          )
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
          state.visualStyles[networkId] = VisualStyleImpl.setBypass(
            state.visualStyles[networkId],
            vpName,
            elementIds,
            vpValue,
          )
          return state
        })
      },
      deleteBypass(networkId, vpName, elementIds: IdType[]) {
        set((state) => {
          state.visualStyles[networkId] = VisualStyleImpl.deleteBypass(
            state.visualStyles[networkId],
            vpName,
            elementIds,
          )
          return state
        })
      },
      setBypassMap(networkId, vpName, elementMap) {
        set((state) => {
          state.visualStyles[networkId] = VisualStyleImpl.setBypassMap(
            state.visualStyles[networkId],
            vpName,
            elementMap,
          )
          return state
        })
      },
      setDiscreteMappingValue: (networkId, vpName, values, vpValue) => {
        set((state) => {
          state.visualStyles[networkId] =
            VisualStyleImpl.setDiscreteMappingValue(
              state.visualStyles[networkId],
              vpName,
              values,
              vpValue,
            )
          return state
        })
      },
      deleteDiscreteMappingValue: (networkId, vpName, values) => {
        set((state) => {
          state.visualStyles[networkId] =
            VisualStyleImpl.deleteDiscreteMappingValue(
              state.visualStyles[networkId],
              vpName,
              values,
            )
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
          state.visualStyles[networkId] =
            VisualStyleImpl.setContinuousMappingValues(
              state.visualStyles[networkId],
              vpName,
              min,
              max,
              controlPoints,
              ltMinVpValue,
              gtMaxVpValue,
            )
          return state
        })
      },

      createDiscreteMapping(networkId, vpName, attributeName, attributeType) {
        set((state) => {
          state.visualStyles[networkId] = VisualStyleImpl.createDiscreteMapping(
            state.visualStyles[networkId],
            vpName,
            attributeName,
            attributeType,
          )
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
          state.visualStyles[networkId] =
            VisualStyleImpl.createContinuousMapping(
              state.visualStyles[networkId],
              vpName,
              vpType,
              attributeName,
              attributeValues,
            )
          return state
        })
      },

      createPassthroughMapping(
        networkId,
        vpName,
        attributeName,
        attributeType,
      ) {
        set((state) => {
          state.visualStyles[networkId] =
            VisualStyleImpl.createPassthroughMapping(
              state.visualStyles[networkId],
              vpName,
              attributeName,
              attributeType,
            )
          return state
        })
      },
      createMapping(
        networkId: IdType,
        vpName: VisualPropertyName,
        vpType: VisualPropertyValueTypeName,
        mappingType: MappingFunctionType,
        attribute: AttributeName,
        attributeDataType: ValueTypeName,
        attributeValues: ValueType[],
      ) {
        switch (mappingType) {
          case MappingFunctionType.Discrete: {
            get().createDiscreteMapping(
              networkId,
              vpName,
              attribute,
              attributeDataType,
            )
            break
          }
          case MappingFunctionType.Continuous: {
            if (
              attributeDataType === ValueTypeName.Integer ||
              attributeDataType === ValueTypeName.Long ||
              attributeDataType === ValueTypeName.Double
            ) {
              get().createContinuousMapping(
                networkId,
                vpName,
                vpType,
                attribute,
                attributeValues,
                attributeDataType,
              )
            }
            break
          }
          case MappingFunctionType.Passthrough: {
            get().createPassthroughMapping(
              networkId,
              vpName,
              attribute,
              attributeDataType,
            )
            break
          }
        }
      },
      removeMapping(networkId, vpName) {
        set((state) => {
          state.visualStyles[networkId] = VisualStyleImpl.removeMapping(
            state.visualStyles[networkId],
            vpName,
          )
          return state
        })
      },
      setMapping(networkId, vpName, mapping) {
        set((state) => {
          state.visualStyles[networkId] = VisualStyleImpl.setMapping(
            state.visualStyles[networkId],
            vpName,
            mapping,
          )
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
          // Skip during cross-tab hydration: the peer tab already deleted this
          // row, so re-deleting it locally only mints another change record.
          if (!isHydrating()) {
            void deleteVisualStyleFromDb(networkId)
              .then(() => {
                logStore.info(
                  `[${useVisualStyleStore.name}]: Deleted visual style from db: ${networkId}`,
                )
              })
              .catch((e) => {
                logStore.error(
                  `[${useVisualStyleStore.name}]: Failed to delete visual style from db: ${networkId}`,
                  e,
                )
              })
          }
          return {
            ...state,
            visualStyles: filtered,
          }
        })
      },
      deleteAll: () => {
        set((state) => {
          state.visualStyles = {}
          if (!isHydrating()) {
            clearVisualStyleFromDb()
              .then(() => {
                logStore.info(
                  `[${useVisualStyleStore.name}]: Deleted all visual styles from db`,
                )
              })
              .catch((err) => {
                logStore.error(
                  `[${useVisualStyleStore.name}]: Error clearing visual styles from db: ${err}`,
                )
              })
          }

          return state
        })
      },
    })),
  ),
)
