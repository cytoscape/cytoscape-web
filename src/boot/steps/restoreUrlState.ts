import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { SelectionStates } from '@/features/FloatingToolBar/ShareNetworkButton'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '@/models/FilterModel'
import { FilterUrlParams } from '@/models/FilterModel/FilterUrlParams'
import { GraphObjectType } from '@/models/NetworkModel/GraphObjectType'
import type { IdType } from '@/models/IdType'
import { isViewOfNetwork } from '@/models/UiModel/impl/uiImpl'
import type { AppShellBootContext } from './appShellBootContext'

// Restores shareable UI state from the URL (see ShareNetworkButton, which
// produces these links).

/** Name of the filter config built from the filter URL parameters. */
const DEFAULT_FILTER_NAME = 'checkboxFilter'

const splitIds = (value: string): IdType[] =>
  value === '' ? [] : value.split(' ')

/** Network id the URL path names (`/:workspaceId/networks/:networkId`). */
const urlNetworkId = (): IdType | undefined => {
  const match = /\/networks\/([^/]+)/.exec(window.location.pathname)
  return match === null ? undefined : decodeURIComponent(match[1])
}

/**
 * Runs `onReady` once the view model for `viewId` exists (#965).
 *
 * Waits on the store instead of polling for a fixed time, so a network that
 * loads slowly still gets its shared state. The wait ends without running
 * `onReady` when the user has moved on, because the link's state belongs to
 * what they left:
 * - the current network changes to one that `viewId` is not a view of;
 * - the URL names such a network when the view model arrives. A URL-driven
 *   switch sets the current network only after the new load settles, while a
 *   stale load of the old network still registers its view model;
 * - `isAbandoned` returns true on a view model change.
 *
 * Returns a function that cancels the wait.
 */
export const whenViewModelReady = (
  viewId: IdType,
  onReady: () => void,
  isAbandoned: () => boolean = () => false,
): (() => void) => {
  const isReady = (): boolean =>
    useViewModelStore.getState().getViewModel(viewId) !== undefined

  if (isReady()) {
    onReady()
    return () => {}
  }

  let unsubscribeView = (): void => {}
  let unsubscribeWorkspace = (): void => {}
  const cancel = (): void => {
    unsubscribeView()
    unsubscribeWorkspace()
  }

  unsubscribeView = useViewModelStore.subscribe(() => {
    if (isAbandoned()) {
      cancel()
      return
    }
    if (!isReady()) return
    cancel()
    const routeNetworkId = urlNetworkId()
    if (
      routeNetworkId !== undefined &&
      !isViewOfNetwork(viewId, routeNetworkId)
    ) {
      return
    }
    onReady()
  })
  unsubscribeWorkspace = useWorkspaceStore.subscribe((state, previous) => {
    const networkId = state.workspace.currentNetworkId
    if (networkId === previous.workspace.currentNetworkId) return
    if (!isViewOfNetwork(viewId, networkId)) cancel()
  })

  return cancel
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

  whenViewModelReady(viewId, () => {
    useViewModelStore
      .getState()
      .exclusiveSelect(viewId, splitIds(nodes), splitIds(edges))
  })
}

/**
 * Builds a FilterConfig from URL search parameters, or undefined unless
 * FILTER_FOR, FILTER_BY and FILTER_RANGE are all present.
 *
 * Pure and exported so the shareable-URL filter semantics can be tested
 * without touching the store.
 */
export const buildFilterConfigFromSearchParams = (
  search: URLSearchParams,
): FilterConfig | undefined => {
  const filterFor = search.get(FilterUrlParams.FILTER_FOR)
  const filterBy = search.get(FilterUrlParams.FILTER_BY)
  const filterRange = search.get(FilterUrlParams.FILTER_RANGE)

  if (filterFor == null || filterBy == null || filterRange == null) {
    return undefined
  }

  return {
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
}

const restoreFilter = (search: URLSearchParams): void => {
  const filterConfig = buildFilterConfigFromSearchParams(search)
  if (filterConfig !== undefined) {
    useFilterStore.getState().addFilterConfig(filterConfig)
  }
}

const restoreNetworkViewTab = (search: URLSearchParams): void => {
  const raw = search.get('activeNetworkViewTab')
  if (raw == null) return

  // Only a whole index: `NetworkTabs` matches it exactly, so a fraction would
  // select no tab (#995). One past the last tab is handled there, where the
  // tab count is known.
  const tabIndex = Number(raw)
  if (Number.isInteger(tabIndex) && tabIndex >= 0) {
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

  // The active view and its subnetwork selection need that subnetwork to be
  // loaded, so both wait for its view model instead of a fixed delay (#965).
  // Safe against the navigate() that strips the params right after this
  // returns, because `search` is a mount-time snapshot rather than a live read.
  const activeNetworkViewId = search.get('activeNetworkView')
  if (activeNetworkViewId == null) return

  whenViewModelReady(
    activeNetworkViewId,
    () => {
      useUiStateStore.getState().setActiveNetworkView(activeNetworkViewId)
      restoreSelection(
        search,
        activeNetworkViewId,
        'selectedSubnetworkNodes',
        'selectedSubnetworkEdges',
      )
    },
    subsystemDeselected(currentNetworkId, activeNetworkViewId),
  )
}

/**
 * For a hierarchy subnetwork view (`<hierarchyId>_<subsystemNodeId>`), returns
 * a check that turns true once the user selects another subsystem in the
 * hierarchy, so a slow subnetwork load cannot replace their newer choice.
 *
 * It only turns true after the subsystem has been seen selected: before the
 * link's own selection applies, the hierarchy may still hold an older one.
 * For any other view it never turns true.
 */
const subsystemDeselected = (
  hierarchyId: IdType,
  viewId: IdType,
): (() => boolean) => {
  if (hierarchyId === '' || !viewId.startsWith(`${hierarchyId}_`)) {
    return () => false
  }
  const subsystemId = viewId.slice(hierarchyId.length + 1)
  const isSubsystemSelected = (): boolean =>
    useViewModelStore.getState().getViewModel(hierarchyId)?.selectedNodes[0] ===
    subsystemId
  // When the hierarchy is already loaded, restoreUrlState() selected the
  // subsystem before this guard was created, so start from the current state.
  let seenSelected = isSubsystemSelected()

  return () => {
    if (isSubsystemSelected()) {
      seenSelected = true
      return false
    }
    return seenSelected
  }
}
