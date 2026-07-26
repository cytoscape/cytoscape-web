import { useFilterStore } from '../../data/hooks/stores/FilterStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { SelectionStates } from '../../features/FloatingToolBar/ShareNetworkButton'
import { DEFAULT_FILTER_NAME } from '../../features/HierarchyViewer/components/FilterPanel/FilterPanel'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../models/FilterModel'
import { FilterUrlParams } from '../../models/FilterModel/FilterUrlParams'
import { GraphObjectType } from '../../models/NetworkModel'
import type { IdType } from '../../models/IdType'
import type { AppShellBootContext } from './appShellBootContext'

// Restores shareable UI state from the URL (see ShareNetworkButton, which
// produces these links).

const MAX_VIEW_MODEL_RETRIES = 10
const VIEW_MODEL_RETRY_DELAY_MS = 500

/** Networks load asynchronously, so the active view is restored a beat later. */
const NETWORK_VIEW_RESTORE_DELAY_MS = 1000

const splitIds = (value: string): IdType[] =>
  value === '' ? [] : value.split(' ')

/**
 * Applies a selection once the view model for `viewId` exists, polling for it.
 *
 * Shared by the main-network and subnetwork paths, which were byte-identical
 * copies of this loop. Gives up silently after ~5s: a link pointing at a
 * network that never loads is not worth an error the user cannot act on.
 */
const selectWhenViewReady = (
  viewId: IdType,
  nodes: IdType[],
  edges: IdType[],
  retryCount = 0,
): void => {
  const { getViewModel, exclusiveSelect } = useViewModelStore.getState()

  if (getViewModel(viewId) !== undefined) {
    exclusiveSelect(viewId, nodes, edges)
    return
  }

  if (retryCount < MAX_VIEW_MODEL_RETRIES) {
    setTimeout(() => {
      selectWhenViewReady(viewId, nodes, edges, retryCount + 1)
    }, VIEW_MODEL_RETRY_DELAY_MS)
  }
}

const restoreSelection = (
  search: URLSearchParams,
  viewId: IdType,
  nodeParam: string,
  edgeParam: string,
): void => {
  const nodes = search.get(nodeParam) ?? ''
  const edges = search.get(edgeParam) ?? ''

  if (nodes === '' && edges === '') {
    return
  }

  selectWhenViewReady(viewId, splitIds(nodes), splitIds(edges))
}

const restoreFilter = (search: URLSearchParams): void => {
  const filterFor = search.get(FilterUrlParams.FILTER_FOR)
  const filterBy = search.get(FilterUrlParams.FILTER_BY)
  const filterRange = search.get(FilterUrlParams.FILTER_RANGE)

  if (filterFor == null || filterBy == null || filterRange == null) {
    return
  }

  const filterConfig: FilterConfig = {
    name: DEFAULT_FILTER_NAME,
    attributeName: filterBy,
    target:
      filterFor === GraphObjectType.NODE
        ? GraphObjectType.NODE
        : GraphObjectType.EDGE,
    widgetType: FilterWidgetType.CHECKBOX,
    description: 'Filter nodes / edges by selected values',
    label: 'Interaction edge filter',
    range: { values: filterRange.split(',') },
    displayMode: DisplayMode.SELECT,
  }
  useFilterStore.getState().addFilterConfig(filterConfig)
}

const restoreNetworkViewTab = (search: URLSearchParams): void => {
  const raw = search.get('activeNetworkViewTab')
  if (raw == null) return

  const tabIndex = Number(raw)
  if (!isNaN(tabIndex) && tabIndex >= 0) {
    useUiStateStore.getState().setNetworkViewTabIndex(tabIndex)
  }
}

export const restoreUrlState = (
  ctx: AppShellBootContext,
  currentNetworkId: IdType,
): void => {
  const { search } = ctx

  restoreSelection(
    search,
    currentNetworkId,
    SelectionStates.SelectedNodes,
    SelectionStates.SelectedEdges,
  )
  restoreNetworkViewTab(search)
  restoreFilter(search)

  // The active view and its subnetwork selection need the components that own
  // them to exist first, hence the delay. Safe against the navigate() that
  // strips the params right after this returns, because `search` is a
  // mount-time snapshot rather than a live read.
  const activeNetworkViewId = search.get('activeNetworkView')
  setTimeout(() => {
    if (activeNetworkViewId == null) return

    useUiStateStore.getState().setActiveNetworkView(activeNetworkViewId)
    restoreSelection(
      search,
      activeNetworkViewId,
      'selectedSubnetworkNodes',
      'selectedSubnetworkEdges',
    )
  }, NETWORK_VIEW_RESTORE_DELAY_MS)
}
