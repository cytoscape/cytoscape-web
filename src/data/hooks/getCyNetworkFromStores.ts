import { CyNetwork } from '../../models/CyNetworkModel'
import { IdType } from '../../models/IdType'
import { OpaqueAspects } from '../../models/OpaqueAspectModel'
import { useNetworkStore } from './stores/NetworkStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useViewModelStore } from './stores/ViewModelStore'
import {
  getVisualStyleSetSnapshot,
  useVisualStyleStore,
} from './stores/VisualStyleStore'

/**
 * Assemble a complete CyNetwork from the in-memory stores, or undefined when
 * any required piece (network, tables, view models, visual style) is absent.
 *
 * This exists for the window where a network lives ONLY in memory: a network
 * imported in this session is added to the stores immediately, but its
 * IndexedDB persist is debounced, so a load that runs before the write lands
 * finds nothing in the DB (#665). Memory is authoritative exactly then.
 * Callers that have a successful DB read must prefer it — cross-tab sync
 * deliberately leaves non-current networks stale in the stores.
 */
export const getCyNetworkFromStores = (
  networkId: IdType,
): CyNetwork | undefined => {
  const network = useNetworkStore.getState().networks.get(networkId)
  const tables = useTableStore.getState().tables[networkId]
  const networkViews = useViewModelStore.getState().viewModels[networkId]
  const visualStyle = useVisualStyleStore.getState().visualStyles[networkId]

  if (
    network === undefined ||
    tables?.nodeTable === undefined ||
    tables?.edgeTable === undefined ||
    networkViews === undefined ||
    networkViews.length === 0 ||
    visualStyle === undefined
  ) {
    return undefined
  }

  const opaqueAspects: OpaqueAspects | undefined =
    useOpaqueAspectStore.getState().opaqueAspects[networkId]
  const otherAspects: OpaqueAspects[] =
    opaqueAspects === undefined
      ? []
      : Object.entries(opaqueAspects).map(([name, data]) => ({ [name]: data }))

  return {
    network,
    nodeTable: tables.nodeTable,
    edgeTable: tables.edgeTable,
    visualStyle,
    visualStyleSet: getVisualStyleSetSnapshot(networkId),
    // Shallow copies, not the stored objects: ViewModelStore.add mutates the
    // view it is given (viewId/type defaults, selection carry-over) and store
    // state is Immer-frozen, so re-adding the originals would throw.
    networkViews: networkViews.map((view) => ({ ...view })),
    visualStyleOptions:
      useUiStateStore.getState().ui.visualStyleOptions[networkId] ?? {},
    otherAspects,
    undoRedoStack: useUndoStore.getState().undoRedoStacks[networkId] ?? {
      undoStack: [],
      redoStack: [],
    },
  }
}
