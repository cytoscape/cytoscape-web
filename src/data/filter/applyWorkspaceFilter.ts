import { logStore } from '../../debug'
import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import type { AppliedWorkspaceFilter } from '../../models/FilterModel/FilterTree'
import {
  createFilterContext,
  evaluateFilter,
} from '../../models/FilterModel/impl/evaluateFilter'
import { getWorkspaceFilter } from '../../models/FilterModel/impl/workspaceFiltersImpl'
import type { IdType } from '../../models/IdType'
import { GraphObjectType } from '../../models/NetworkModel/GraphObjectType'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '../../models/VisualStyleModel/VisualPropertyValue/VisibilityType'
import { useFilterStore } from '../hooks/stores/FilterStore'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'

/**
 * Applying the FILTER tab's workspace filters to a network
 * (docs/specifications/FILTER_SPECIFICATION.md).
 *
 * Plain functions over the stores, with no React, returning results rather
 * than throwing, so a future filter App API can wrap them in `ApiResult`.
 */

export const ApplyFilterError = {
  FILTER_NOT_FOUND: 'filter-not-found',
  // The network, or its tables, are not loaded
  NETWORK_NOT_FOUND: 'network-not-found',
  // Show mode writes visibility bypasses, which need the network's style
  STYLE_NOT_FOUND: 'style-not-found',
} as const

export type ApplyFilterError =
  (typeof ApplyFilterError)[keyof typeof ApplyFilterError]

export type ApplyWorkspaceFilterResult =
  | {
      readonly success: true
      // False for a filter without conditions, which changes nothing
      readonly applied: boolean
      readonly displayMode: DisplayMode
      // Selected elements (select mode) or visible ones (show mode)
      readonly nodeCount: number
      readonly edgeCount: number
      readonly elapsedMs: number
    }
  | { readonly success: false; readonly error: ApplyFilterError }

const hasOwn = <T>(record: Record<string, T>, key: string): boolean =>
  Object.hasOwn(record, key)

/**
 * Remove every node and edge visibility bypass of a network: show all
 * (Cytoscape Desktop's "Show all nodes and edges")
 */
const showAll = (networkId: IdType): void => {
  const { visualStyles, setBypassMap } = useVisualStyleStore.getState()
  if (!hasOwn(visualStyles, networkId)) return
  setBypassMap(networkId, NodeVisualPropertyName.NodeVisibility, new Map())
  setBypassMap(networkId, EdgeVisualPropertyName.EdgeVisibility, new Map())
}

/**
 * Switch off the subnetwork's `filterWidgets` filter, if it has one and it is
 * on, and remove the visibility bypass it wrote (what CheckboxFilter does
 * when switched off)
 */
const switchOffSubnetworkFilter = (networkId: IdType): void => {
  const { filterConfigs, setFilterEnabled } = useFilterStore.getState()
  const config: FilterConfig | undefined = hasOwn(filterConfigs, networkId)
    ? filterConfigs[networkId]
    : undefined
  if (config === undefined || config.enabled === false) return

  setFilterEnabled(networkId, false)
  const { visualStyles, deleteBypass } = useVisualStyleStore.getState()
  const tables = useTableStore.getState().tables[networkId]
  if (!hasOwn(visualStyles, networkId) || tables === undefined) return
  const isNode = config.target === GraphObjectType.NODE
  deleteBypass(
    networkId,
    isNode
      ? NodeVisualPropertyName.NodeVisibility
      : EdgeVisualPropertyName.EdgeVisibility,
    [...(isNode ? tables.nodeTable : tables.edgeTable).rows.keys()],
  )
}

const hiddenBypass = (
  allIds: readonly IdType[],
  keptIds: readonly IdType[],
): Map<IdType, VisibilityType> => {
  const kept = new Set(keptIds)
  const bypass = new Map<IdType, VisibilityType>()
  allIds.forEach((id) => {
    if (!kept.has(id)) bypass.set(id, VisibilityType.None)
  })
  return bypass
}

/**
 * Apply a workspace filter to a network, in the filter's display mode.
 *
 * - Select: the network's selection becomes the elements that pass.
 * - Show: the elements that pass (and those the filter is not about) stay
 *   visible; the others get a "none" visibility bypass. Every other
 *   visibility bypass of the network is removed, as in Cytoscape Desktop,
 *   where showing a filter result also shows elements hidden before.
 *
 * A network has one applied workspace filter: applying a select filter after
 * a show filter first shows every element again. Applying any workspace
 * filter switches off the subnetwork's `filterWidgets` filter. A filter
 * without conditions changes nothing. Nothing goes on the undo stack.
 */
export const applyWorkspaceFilter = (
  networkId: IdType,
  filterId: IdType,
): ApplyWorkspaceFilterResult => {
  const filterStore = useFilterStore.getState()
  const filter = getWorkspaceFilter(filterStore.workspaceFilters, filterId)
  if (filter === undefined) {
    return { success: false, error: ApplyFilterError.FILTER_NOT_FOUND }
  }
  const network = useNetworkStore.getState().networks.get(networkId)
  const tables = useTableStore.getState().tables[networkId]
  if (network === undefined || tables === undefined) {
    return { success: false, error: ApplyFilterError.NETWORK_NOT_FOUND }
  }
  const { displayMode } = filter
  const show = displayMode === DisplayMode.SHOW_HIDE
  if (show && !hasOwn(useVisualStyleStore.getState().visualStyles, networkId)) {
    return { success: false, error: ApplyFilterError.STYLE_NOT_FOUND }
  }

  const start = performance.now()
  const result = evaluateFilter(
    createFilterContext(network, tables.nodeTable, tables.edgeTable),
    filter.root,
    displayMode,
  )
  if (result === undefined) {
    return {
      success: true,
      applied: false,
      displayMode,
      nodeCount: 0,
      edgeCount: 0,
      elapsedMs: performance.now() - start,
    }
  }

  switchOffSubnetworkFilter(networkId)

  if (show) {
    const { setBypassMap } = useVisualStyleStore.getState()
    setBypassMap(
      networkId,
      NodeVisualPropertyName.NodeVisibility,
      hiddenBypass(
        network.nodes.map((node) => node.id),
        result.nodeIds,
      ),
    )
    setBypassMap(
      networkId,
      EdgeVisualPropertyName.EdgeVisibility,
      hiddenBypass(
        network.edges.map((edge) => edge.id),
        result.edgeIds,
      ),
    )
  } else {
    const previous = useFilterStore.getState().appliedWorkspaceFilters
    if (
      hasOwn(previous, networkId) &&
      previous[networkId].displayMode === DisplayMode.SHOW_HIDE
    ) {
      showAll(networkId)
    }
    useViewModelStore
      .getState()
      .exclusiveSelect(networkId, result.nodeIds, result.edgeIds)
  }
  useFilterStore
    .getState()
    .setAppliedWorkspaceFilter(networkId, { filterId, displayMode })

  const elapsedMs = performance.now() - start
  logStore.info(
    `[applyWorkspaceFilter]: "${filter.name}" (${displayMode}) on ${networkId}: ${result.nodeIds.length} nodes, ${result.edgeIds.length} edges in ${Math.round(elapsedMs)} ms`,
  )
  return {
    success: true,
    applied: true,
    displayMode,
    nodeCount: result.nodeIds.length,
    edgeCount: result.edgeIds.length,
    elapsedMs,
  }
}

/**
 * Change a filter's display mode and apply it right away, as Cytoscape
 * Desktop's select/show radio buttons do. Switching from show to select
 * shows every element again first.
 */
export const setWorkspaceFilterDisplayModeAndApply = (
  networkId: IdType,
  filterId: IdType,
  displayMode: DisplayMode,
): ApplyWorkspaceFilterResult => {
  const { workspaceFilters, setWorkspaceFilterDisplayMode } =
    useFilterStore.getState()
  if (getWorkspaceFilter(workspaceFilters, filterId) === undefined) {
    return { success: false, error: ApplyFilterError.FILTER_NOT_FOUND }
  }
  setWorkspaceFilterDisplayMode(filterId, displayMode)
  return applyWorkspaceFilter(networkId, filterId)
}

/**
 * Forget the workspace filter applied to a network. When it was applied in
 * show mode, every element is shown again. Called when the subnetwork's
 * `filterWidgets` filter is switched back on, which then owns the network's
 * visibility; no workspace filter is changed.
 */
export const releaseWorkspaceFilter = (networkId: IdType): void => {
  const { appliedWorkspaceFilters, deleteAppliedWorkspaceFilter } =
    useFilterStore.getState()
  if (!hasOwn(appliedWorkspaceFilters, networkId)) return
  if (
    appliedWorkspaceFilters[networkId].displayMode === DisplayMode.SHOW_HIDE
  ) {
    showAll(networkId)
  }
  deleteAppliedWorkspaceFilter(networkId)
}

/**
 * Whether a workspace filter in show mode owns the network's visibility
 */
export const isWorkspaceFilterShown = (
  applied: Readonly<Record<IdType, AppliedWorkspaceFilter>>,
  networkId: IdType,
): boolean =>
  hasOwn(applied, networkId) &&
  applied[networkId].displayMode === DisplayMode.SHOW_HIDE
