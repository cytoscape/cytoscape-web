import { Suspense } from 'react'

import { useAppResourceStore } from '../../../data/hooks/stores/AppResourceStore'
import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { appRegistry } from '../../../data/hooks/stores/useAppManager'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import {
  ComponentType as AppComponentType,
  CyApp,
} from '../../../models/AppModel'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { ComponentMetadata } from '../../../models/AppModel/ComponentMetadata'
import type { RegisteredAppResource } from '../../../models/AppModel/RegisteredAppResource'
import { AppIdProvider } from '../.././../app-api/AppIdContext'
import ExternalComponent from '../../AppManager/ExternalComponent'
import { PluginErrorBoundary } from '../../AppManager/PluginErrorBoundary'
import { ViewerPanel } from '../../HierarchyViewer/components'
import { TabPanel } from './TabPanel'

// ── Builtin panel identity ───────────────────────────────────────

const BUILTIN_SUB_NETWORK_ID =
  '__builtin__::right-panel::sub-network-viewer'

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

  // 1. Collect runtime resources for 'right-panel' slot
  const runtimePanels: PanelEntry[] = runtimeResources
    .filter((r: RegisteredAppResource) => {
      if (r.slot !== 'right-panel') return false
      // Must be active app
      if (apps[r.appId]?.status !== AppStatus.Active) return false
      // Evaluate requires.network
      if (r.requires?.network && !currentNetworkId) return false
      return true
    })
    .map(
      (r: RegisteredAppResource): PanelEntry => ({
        resourceId: `${r.appId}::right-panel::${r.id}`,
        label: r.title ?? r.id,
        component: r.component as React.ComponentType<any>,
        appId: r.appId,
        errorFallback: r.errorFallback,
      }),
    )

  // Track runtime resourceIds for deduplication
  const runtimeIds = new Set(runtimePanels.map((p) => p.resourceId))

  // 2. Collect manifest panels from CyApp.components
  const manifestPanels: PanelEntry[] = []
  Object.keys(apps).forEach((appId: string) => {
    const app: CyApp = apps[appId]
    if (app.status !== AppStatus.Active) return

    const components = app.components ?? []
    components.forEach((component: ComponentMetadata) => {
      if (component.type !== AppComponentType.Panel) return

      // If a runtime resource with the same identity exists, skip manifest
      const manifestResourceId = `${appId}::right-panel::${component.id}`
      if (runtimeIds.has(manifestResourceId)) return

      // Prefer the lazy component from appRegistry (survives DB restore)
      const freshComponent = appRegistry
        .get(appId)
        ?.components?.find((c) => c.id === component.id)
      const PanelComponent: any =
        freshComponent?.component ??
        component.component ??
        ExternalComponent(appId, './' + component.id)

      manifestPanels.push({
        resourceId: manifestResourceId,
        label: component.id,
        component: PanelComponent,
        appId,
      })
    })
  })

  // 3. Merge: runtime resources first (already ordered), then manifest
  const appPanels = [...runtimePanels, ...manifestPanels]

  // 4. Sort by order (ascending, undefined last), then by array position
  appPanels.sort((a, b) => {
    const rA = runtimeResources.find(
      (r) => `${r.appId}::right-panel::${r.id}` === a.resourceId,
    )
    const rB = runtimeResources.find(
      (r) => `${r.appId}::right-panel::${r.id}` === b.resourceId,
    )
    const orderA = rA?.order ?? Infinity
    const orderB = rB?.order ?? Infinity
    return orderA - orderB
  })

  // 5. Prepend built-in Sub Network Viewer
  return [
    {
      resourceId: BUILTIN_SUB_NETWORK_ID,
      label: 'Sub Network Viewer',
      component: ViewerPanel,
    },
    ...appPanels,
  ]
}

/**
 * Build per-app APIs map for AppIdProvider.
 * Lazily imported to avoid circular dependencies.
 */
function getPerAppApis(appId: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createResourceApi } = require('../../../app-api/core/resourceApi')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createContextMenuApi } = require('../../../app-api/core/contextMenuApi')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CyWebApi } = require('../../../app-api/core')
  return {
    ...CyWebApi,
    resource: createResourceApi(appId),
    contextMenu: createContextMenuApi(appId),
  }
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
      <AppIdProvider value={{ appId: entry.appId, apis: getPerAppApis(entry.appId) }}>
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
      <PanelComponent />
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
