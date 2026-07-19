/**
 * @deprecated The Module Federation exposure of this store (cyweb/VisualStyleStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/VisualStyleStore Module Federation export will be removed after 2 release cycles.
 */
import { current } from 'immer'
import { create, StateCreator, StoreApi } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import {
  VisualStyleState,
  VisualStyleStore,
} from '../../../models/StoreModel/VisualStyleStoreModel'
import {
  AttributeName,
  ValueType,
  ValueTypeName,
} from '../../../models/TableModel'
import {
  MAX_STYLES_PER_NETWORK,
  VisualPropertyName,
  VisualPropertyValueType,
  VisualStyle,
  VisualStyleSet,
} from '../../../models/VisualStyleModel'
import * as VisualStyleImpl from '../../../models/VisualStyleModel/impl/visualStyleImpl'
import {
  cloneVisualStyle,
  createStyleId,
  createStyleSet,
  isValidStyleSet,
  uniqueStyleName,
} from '../../../models/VisualStyleModel/impl/visualStyleSetImpl'
import { MappingFunctionType } from '../../../models/VisualStyleModel/VisualMappingFunction'
import { VisualPropertyValueTypeName } from '../../../models/VisualStyleModel/VisualPropertyValueTypeName'
import {
  clearVisualStyleFromDb,
  deleteVisualStyleFromDb,
  putVisualStyleSetToDb,
} from '../../db'
import { useUndoStore } from './UndoStore'
import { useWorkspaceStore } from './WorkspaceStore'

/**
 * Assemble the complete VisualStyleSet of a network from store state.
 *
 * The store keeps the active style's content as a working copy in
 * `visualStyles[networkId]` and everything else in `styleSets[networkId]`;
 * this overlays the two into the full model-layer shape used for
 * persistence and CX2 export.
 *
 * Returns undefined when the network has no style (deleted / never added).
 */
export const assembleStyleSet = (
  state: VisualStyleState,
  networkId: IdType,
): VisualStyleSet | undefined => {
  const activeStyle = state.visualStyles[networkId]
  if (activeStyle === undefined) {
    return undefined
  }
  const setState = state.styleSets[networkId]
  if (setState === undefined) {
    // Networks registered before multi-style support existed in memory;
    // degrade to a single-style set so persistence keeps working.
    return createStyleSet(activeStyle)
  }
  const styles = Object.fromEntries(
    Object.entries(setState.styles)
      .filter(
        ([styleId, entry]) =>
          styleId === setState.activeStyleId || entry.visualStyle !== undefined,
      )
      .map(([styleId, entry]) => [
        styleId,
        {
          id: entry.id,
          name: entry.name,
          visualStyle:
            styleId === setState.activeStyleId
              ? activeStyle
              : (entry.visualStyle as VisualStyle),
        },
      ]),
  )
  return {
    activeStyleId: setState.activeStyleId,
    styles,
  }
}

/**
 * Snapshot the complete VisualStyleSet of a network from the live store.
 * Safe to call outside React (export hooks, app-api core, etc.).
 */
export const getVisualStyleSetSnapshot = (
  networkId: IdType,
): VisualStyleSet | undefined =>
  assembleStyleSet(useVisualStyleStore.getState(), networkId)

/**
 * True when a network's style set has reached the maximum size. Enforced on
 * every set-growing action so any locally created set can round-trip through
 * NDEx (the importer rejects oversized cyWebVisualStyles aspects).
 */
const isStyleSetAtCap = (styles: Record<IdType, unknown>): boolean =>
  Object.keys(styles).length >= MAX_STYLES_PER_NETWORK

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
        logStore.info('[VisualStyleStore]: Persisting visual style store')
        const currentNetworkId =
          useWorkspaceStore.getState().workspace.currentNetworkId

        set(args)
        const updated = assembleStyleSet(get(), currentNetworkId)

        if (updated !== undefined) {
          await putVisualStyleSetToDb(currentNetworkId, updated).then(() => {})
        }
      },
      get,
      api,
    )

export const useVisualStyleStore = create(
  immer<VisualStyleStore>(
    persist((set, get) => ({
      visualStyles: {},
      styleSets: {},

      add: (
        networkId: IdType,
        visualStyle: VisualStyle,
        styleSet?: VisualStyleSet,
      ) => {
        set((state) => {
          if (state.visualStyles[networkId] !== undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Visual Style already exists for network ${networkId}, and it
              will be overwritten.`,
            )
          }
          // The visualStyle parameter is authoritative for the active
          // content (converters guarantee it matches the set's active entry)
          state.visualStyles[networkId] = visualStyle

          if (styleSet !== undefined && isValidStyleSet(styleSet)) {
            state.styleSets[networkId] = {
              activeStyleId: styleSet.activeStyleId,
              styles: Object.fromEntries(
                Object.entries(styleSet.styles).map(([styleId, namedStyle]) => [
                  styleId,
                  {
                    id: namedStyle.id,
                    name: namedStyle.name,
                    visualStyle:
                      styleId === styleSet.activeStyleId
                        ? undefined
                        : namedStyle.visualStyle,
                  },
                ]),
              ),
            }
          } else if (state.styleSets[networkId] === undefined) {
            const freshSet = createStyleSet(visualStyle)
            state.styleSets[networkId] = {
              activeStyleId: freshSet.activeStyleId,
              styles: {
                [freshSet.activeStyleId]: {
                  id: freshSet.activeStyleId,
                  name: freshSet.styles[freshSet.activeStyleId].name,
                  visualStyle: undefined,
                },
              },
            }
          }
          // else: keep the existing named-style set — legacy callers
          // (e.g. the renderer) use add() to refresh the active style only

          // Persist a plain snapshot: the draft proxies are revoked as soon
          // as this producer returns, but the DB write runs asynchronously
          const assembled = assembleStyleSet(current(state), networkId)
          if (assembled !== undefined) {
            void putVisualStyleSetToDb(networkId, assembled)
          }

          return state
        })
      },

      switchStyle: (networkId: IdType, styleId: IdType) => {
        let switched = false
        set((state) => {
          const setState = state.styleSets[networkId]
          const workingCopy = state.visualStyles[networkId]
          if (setState === undefined || workingCopy === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot switch style, unknown network ${networkId}`,
            )
            return state
          }
          if (setState.activeStyleId === styleId) {
            return state
          }
          const target = setState.styles[styleId]
          const previousActive = setState.styles[setState.activeStyleId]
          if (target === undefined || target.visualStyle === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot switch to unknown style ${styleId} of network ${networkId}`,
            )
            return state
          }
          // Park the working copy under the previously active entry, then
          // promote the target's content to be the new working copy
          previousActive.visualStyle = workingCopy
          state.visualStyles[networkId] = target.visualStyle
          target.visualStyle = undefined
          setState.activeStyleId = styleId
          switched = true
          return state
        })
        if (switched) {
          // Undo entries recorded so far reference the previous style; keeping
          // them would corrupt the newly activated style when undone.
          useUndoStore
            .getState()
            .addStack(networkId, { undoStack: [], redoStack: [] })
        }
      },

      createStyle: (networkId: IdType, name?: string) => {
        let newId: IdType | undefined
        set((state) => {
          const setState = state.styleSets[networkId]
          const activeStyle = state.visualStyles[networkId]
          if (setState === undefined || activeStyle === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot create style, unknown network ${networkId}`,
            )
            return state
          }
          if (isStyleSetAtCap(setState.styles)) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot create style, network ${networkId} already has ${MAX_STYLES_PER_NETWORK} styles`,
            )
            return state
          }
          const existingNames = Object.values(setState.styles).map(
            (entry) => entry.name,
          )
          newId = createStyleId()
          setState.styles[newId] = {
            id: newId,
            name: uniqueStyleName(name ?? 'New Style', existingNames),
            visualStyle: cloneVisualStyle(current(activeStyle)),
          }
          return state
        })
        return newId
      },

      duplicateStyle: (networkId: IdType, styleId: IdType) => {
        let newId: IdType | undefined
        set((state) => {
          const setState = state.styleSets[networkId]
          const activeStyle = state.visualStyles[networkId]
          if (setState === undefined || activeStyle === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot duplicate style, unknown network ${networkId}`,
            )
            return state
          }
          const source = setState.styles[styleId]
          if (source === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot duplicate unknown style ${styleId} of network ${networkId}`,
            )
            return state
          }
          if (isStyleSetAtCap(setState.styles)) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot duplicate style, network ${networkId} already has ${MAX_STYLES_PER_NETWORK} styles`,
            )
            return state
          }
          // current() snapshots the draft — structuredClone (inside
          // cloneVisualStyle) cannot clone live Immer proxies
          const content =
            styleId === setState.activeStyleId
              ? current(activeStyle)
              : source.visualStyle !== undefined
                ? current(source.visualStyle)
                : undefined
          if (content === undefined) {
            return state
          }
          const existingNames = Object.values(setState.styles).map(
            (entry) => entry.name,
          )
          newId = createStyleId()
          setState.styles[newId] = {
            id: newId,
            name: uniqueStyleName(`Copy of ${source.name}`, existingNames),
            visualStyle: cloneVisualStyle(content),
          }
          return state
        })
        return newId
      },

      renameStyle: (networkId: IdType, styleId: IdType, name: string) => {
        set((state) => {
          const entry = state.styleSets[networkId]?.styles[styleId]
          if (entry === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot rename unknown style ${styleId} of network ${networkId}`,
            )
            return state
          }
          const siblingNames = Object.values(state.styleSets[networkId].styles)
            .filter((sibling) => sibling.id !== styleId)
            .map((sibling) => sibling.name)
          entry.name = uniqueStyleName(name, siblingNames)
          return state
        })
      },

      deleteStyle: (networkId: IdType, styleId: IdType) => {
        let deletedActive = false
        set((state) => {
          const setState = state.styleSets[networkId]
          if (
            setState === undefined ||
            setState.styles[styleId] === undefined
          ) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot delete unknown style ${styleId} of network ${networkId}`,
            )
            return state
          }
          const remainingIds = Object.keys(setState.styles).filter(
            (id) => id !== styleId,
          )
          if (remainingIds.length === 0) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot delete the last style of network ${networkId}`,
            )
            return state
          }
          if (setState.activeStyleId === styleId) {
            // Promote the first remaining style to active before deleting
            const nextId = remainingIds[0]
            const next = setState.styles[nextId]
            if (next.visualStyle === undefined) {
              return state
            }
            state.visualStyles[networkId] = next.visualStyle
            next.visualStyle = undefined
            setState.activeStyleId = nextId
            deletedActive = true
          }
          delete setState.styles[styleId]
          return state
        })
        if (deletedActive) {
          useUndoStore
            .getState()
            .addStack(networkId, { undoStack: [], redoStack: [] })
        }
      },

      importStyle: (
        networkId: IdType,
        name: string,
        visualStyle: VisualStyle,
      ) => {
        let newId: IdType | undefined
        set((state) => {
          const setState = state.styleSets[networkId]
          if (setState === undefined) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot import style, unknown network ${networkId}`,
            )
            return state
          }
          if (isStyleSetAtCap(setState.styles)) {
            logStore.warn(
              `[${useVisualStyleStore.name}]: Cannot import style, network ${networkId} already has ${MAX_STYLES_PER_NETWORK} styles`,
            )
            return state
          }
          const existingNames = Object.values(setState.styles).map(
            (entry) => entry.name,
          )
          newId = createStyleId()
          setState.styles[newId] = {
            id: newId,
            name: uniqueStyleName(name, existingNames),
            visualStyle: cloneVisualStyle(visualStyle),
          }
          return state
        })
        return newId
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
          delete state.visualStyles[networkId]
          delete state.styleSets[networkId]
          void deleteVisualStyleFromDb(networkId).then(() => {
            logStore.info(
              `[${useVisualStyleStore.name}]: Deleted visual style from db: ${networkId}`,
            )
          })
          return state
        })
      },
      deleteAll: () => {
        set((state) => {
          state.visualStyles = {}
          state.styleSets = {}
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

          return state
        })
      },
    })),
  ),
)
