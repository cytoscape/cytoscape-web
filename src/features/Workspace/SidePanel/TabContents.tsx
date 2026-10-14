import { lazy, Suspense } from 'react'

import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { CyApp } from '../../../models/AppModel'
import {
  BUILTIN_SUB_NETWORK_RESOURCE_ID,
  listRightPanelAppTabs,
} from '../../../models/UiModel/impl/panelTabs'
import { AppIdProvider } from '../.././../app-api/AppIdContext'
import { buildPerAppApis } from '../../../app-api/core/perAppApis'
import { PluginErrorBoundary } from '../../AppManager/PluginErrorBoundary'
// Lazy, directly from MainPanel (not the barrel): the hierarchy viewer pulls
// d3-hierarchy/-selection/-zoom and react-query, which would otherwise ship
// with the eager workspace chunk.
const ViewerPanel = lazy(() =>
  import('@/features/HierarchyViewer/components/MainPanel').then((m) => ({
    default: m.MainPanel,
  })),
)
import { TabPanel } from './TabPanel'

// ── Panel entry ──────────────────────────────────────────────────

export interface PanelEntry {
  resourceId: string
  label: string
  component: React.ComponentType<any>
  appId?: string
  errorFallback?: unknown
}

/**
 * Build an ordered, visibility-filtered array of panel entries from the
 * 'right-panel' resources in AppResourceStore.
 *
 * Returns entries ready for rendering, including the built-in Sub Network
 * Viewer at the front.
 */
export function usePanelEntries(): PanelEntry[] {
  const apps: Record<string, CyApp> = useAppStore((state) => state.apps)
  const runtimeResources = useAppResourceStore((state) => state.resources)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  // Identity, visibility and order come from the model, which the App API's
  // `panel.open` shares — so the tab it selects is one this strip shows.
  const appPanels: PanelEntry[] = listRightPanelAppTabs(
    apps,
    runtimeResources,
    currentNetworkId,
  ).map(
    ({ resource, resourceId, appId }): PanelEntry => ({
      resourceId,
      label: resource.title ?? resource.id,
      component: resource.component as React.ComponentType<any>,
      appId,
      errorFallback: resource.errorFallback,
    }),
  )

  // Prepend built-in Sub Network Viewer
  return [
    {
      resourceId: BUILTIN_SUB_NETWORK_RESOURCE_ID,
      label: 'Sub Network Viewer',
      component: ViewerPanel,
    },
    ...appPanels,
  ]
}

/**
 * Render the panel entries as TabPanel elements.
 */
export function renderPanelContents(
  entries: PanelEntry[],
  selectedIndex: number,
): JSX.Element[] {
  return entries.map((entry, index) => {
    const PanelComponent = entry.component
    const content = entry.appId ? (
      <AppIdProvider
        value={{ appId: entry.appId, apis: buildPerAppApis(entry.appId) }}
      >
        <PluginErrorBoundary
          appId={entry.appId}
          slot="right-panel"
          customFallback={entry.errorFallback as any}
        >
          <Suspense>
            <PanelComponent />
          </Suspense>
        </PluginErrorBoundary>
      </AppIdProvider>
    ) : (
      // Built-in panel (no AppIdProvider needed)
      <Suspense>
        <PanelComponent />
      </Suspense>
    )

    return (
      <TabPanel
        label={entry.label}
        key={entry.resourceId}
        index={index}
        value={selectedIndex}
      >
        {content}
      </TabPanel>
    )
  })
}
