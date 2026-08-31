/**
 * @deprecated The Module Federation exposure of this store (cyweb/VisualStyleStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/VisualStyleStore Module Federation export will be removed after 2 release cycles.
 */
import { current } from 'immer'
import { create, StateCreator } from 'zustand'
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
  stripBypasses,
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
  putUndoRedoStackToDb,
  putVisualStyleSetToDb,
} from '../../db'
import { isHydrating } from './hydrationContext'
import { persistNetworkSlices } from './persistNetworkSlices'
import { useUndoStore } from './UndoStore'
import { trackWrite } from './trackWrite'

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
 * Persist the (finalized) style set of a specific network.
 *
 * The persist middleware below only writes the CURRENT network's row, but
 * the Vizmapper can target a non-current network (ui.activeNetworkView,
 * e.g. a HierarchyViewer subnetwork) — so every style-set action calls this
 * for the network it actually mutated.
 */
const persistStyleSetOf = (networkId: IdType): void => {
  const assembled = assembleStyleSet(useVisualStyleStore.getState(), networkId)
  if (assembled !== undefined) {
    void trackWrite(putVisualStyleSetToDb(networkId, assembled)).catch((e) => {
      logStore.error(
        `[VisualStyleStore]: Failed to persist style set of network ${networkId}: ${e}`,
      )
    })
  }
}

/**
 * Clear a network's undo/redo history in memory AND in the DB.
 * UndoStore's own persist middleware also only covers the current network,
 * and a cleared-in-memory-but-stale-on-disk stack would corrupt the newly
 * activated style after a reload.
 */
const clearUndoHistoryOf = (networkId: IdType): void => {
  useUndoStore.getState().addStack(networkId, { undoStack: [], redoStack: [] })
  void trackWrite(
    putUndoRedoStackToDb(networkId, {
      undoStack: [],
      redoStack: [],
    }),
  ).catch((e) => {
    logStore.error(
      `[VisualStyleStore]: Failed to persist cleared undo stack of network ${networkId}: ${e}`,
    )
  })
}

/**
 * Visual Style State manager based on zustand
 *
 */
const persist = (config: StateCreator<VisualStyleStore>) =>
  persistNetworkSlices<VisualStyleStore, VisualStyle>(config, {
    label: 'VisualStyleStore',
    // The active style's content is what changes on nearly every mutation,
    // so `visualStyles` is the change signal. Actions that touch only the
    // named-style metadata (create / rename / delete / switch) call
    // persistStyleSetOf() themselves.
    selectSlices: (state) => state.visualStyles,
    // The row holds the whole named-style set, not just the active style:
    // assemble it from live state at flush time rather than writing the
    // passed-in slice on its own.
    putSlice: (networkId) => {
      const styleSet = getVisualStyleSetSnapshot(networkId)
      return styleSet === undefined
        ? Promise.resolve()
        : putVisualStyleSetToDb(networkId, styleSet)
    },
  })

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

          if (styleSet !== undefined && !isValidStyleSet(styleSet)) {
            // Silently falling back hid malformed CX2 imports: the network
            // loaded with a single default style and nothing said why.
            logStore.warn(
              `[${useVisualStyleStore.name}]: Rejected an invalid style set for network ${networkId}` +
                ` (activeStyleId=${String(styleSet.activeStyleId)},` +
                ` styleIds=[${Object.keys(styleSet.styles ?? {}).join(', ')}]);` +
                ' falling back to a single default style',
            )
          }

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
          //
          // The persist middleware writes the assembled row for the network
          // whose slice changed, so no explicit put is needed here.

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
          persistStyleSetOf(networkId)
        }
        // The undo history is deliberately NOT cleared here.
        //
        // It used to be, because edits recorded under the old style would be
        // replayed onto the new one. The switch is now itself an undoable edit
        // (UndoCommandType.SWITCH_STYLE), so undoing past it restores the
        // previous style FIRST and older edits land on the style they were
        // recorded under — the stack is self-consistent. Clearing here would
        // also wipe the very edit the caller is about to push.
        return switched
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
        if (newId !== undefined) {
          persistStyleSetOf(networkId)
        }
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
        if (newId !== undefined) {
          persistStyleSetOf(networkId)
        }
        return newId
      },

      renameStyle: (networkId: IdType, styleId: IdType, name: string) => {
        let renamed = false
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
          renamed = true
          return state
        })
        if (renamed) {
          persistStyleSetOf(networkId)
        }
      },

      deleteStyle: (networkId: IdType, styleId: IdType) => {
        let deleted = false
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
          }
          delete setState.styles[styleId]
          deleted = true
          return state
        })
        if (deleted) {
          persistStyleSetOf(networkId)
          // Cleared for ANY delete, not just the active one (which is why
          // deletedActive is no longer the condition): a SWITCH_STYLE edit
          // pointing at a style that no longer exists cannot be replayed, and
          // dropping only that edit would leave the older ones landing on
          // whichever style happened to be active. This is the one genuinely
          // unrecoverable case, and delete is rare and confirmation-gated.
          clearUndoHistoryOf(networkId)
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
            // stripBypasses, not just clone: bypasses are keyed by the SOURCE
            // network's node and edge ids, which name nothing in this network.
            // Carrying them over applied arbitrary overrides to whichever
            // elements happened to share an id.
            visualStyle: cloneVisualStyle(stripBypasses(visualStyle)),
          }
          return state
        })
        if (newId !== undefined) {
          persistStyleSetOf(networkId)
        }
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
          return state
        })
      },
      deleteAll: () => {
        set((state) => {
          state.visualStyles = {}
          state.styleSets = {}
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
