import { lazy, Suspense } from 'react'

import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { appRegistry } from '../../../data/hooks/stores/useAppManager'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { CyApp } from '../../../models/AppModel'
import {
  BUILTIN_SUB_NETWORK_RESOURCE_ID,
  listRightPanelAppTabs,
} from '../../../models/UiModel/impl/panelTabs'
import { AppIdProvider } from '../.././../app-api/AppIdContext'
import { buildPerAppApis } from '../../../app-api/core/perAppApis'
import ExternalComponent from '../../AppManager/ExternalComponent'
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

// ── Merged panel entry (manifest + runtime) ──────────────────────

export interface PanelEntry {
  resourceId: string
  label: string
  component: React.ComponentType<any>
  appId?: string
  errorFallback?: unknown
}

/**
 * Build an ordered, visibility-filtered array of panel entries by merging
 * CyApp.components (manifest) and AppResourceStore (runtime).
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
  ).map((tab): PanelEntry => {
    const { resource, manifest } = tab
    if (resource !== undefined) {
      return {
        resourceId: tab.resourceId,
        label: resource.title ?? resource.id,
        component: resource.component as React.ComponentType<any>,
        appId: tab.appId,
        errorFallback: resource.errorFallback,
      }
    }

    // Manifest panel. Prefer the lazy component from appRegistry (survives
    // DB restore).
    const freshComponent = appRegistry
      .get(tab.appId)
      ?.components?.find((c) => c.id === tab.id)
    const PanelComponent: any =
      freshComponent?.component ??
      manifest?.component ??
      ExternalComponent(tab.appId, './' + tab.id)

    return {
      resourceId: tab.resourceId,
      label: tab.id,
      component: PanelComponent,
      appId: tab.appId,
    }
  })

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
