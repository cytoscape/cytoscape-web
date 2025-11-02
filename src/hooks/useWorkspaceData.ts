import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useTableStore } from './stores/TableStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useAppStore } from './stores/AppStore'

export const useWorkspaceData = () => {
  const apps = useAppStore((state) => state.apps)
  const serviceApps = useAppStore((state) => state.serviceApps)
  const networkModifiedStatus = useWorkspaceStore(
    (state) => state.workspace.networkModified,
  )
  const networks = useNetworkStore((state) => state.networks)
  const visualStyles = useVisualStyleStore((state) => state.visualStyles)
  const summaries = useNetworkSummaryStore((state) => state.summaries)
  const tables = useTableStore((state) => state.tables)
  const viewModels = useViewModelStore((state) => state.viewModels)
  const networkVisualStyleOpt = useUiStateStore(
    (state) => state.ui.visualStyleOptions,
  )
  const opaqueAspects = useOpaqueAspectStore((state) => state.opaqueAspects)
  const allNetworkId = useWorkspaceStore((state) => state.workspace.networkIds)
  const currentWorkspaceName = useWorkspaceStore(
    (state) => state.workspace.name,
  )
  const workspaceId = useWorkspaceStore((state) => state.workspace.id)
  const isRemoteWorkspace = useWorkspaceStore(
    (state) => state.workspace.isRemote,
  )

  return {
    apps,
    serviceApps,
    networks,
    visualStyles,
    summaries,
    tables,
    viewModels,
    networkVisualStyleOpt,
    opaqueAspects,
    allNetworkId,
    workspaceId,
    currentWorkspaceName,
    networkModifiedStatus,
    isRemoteWorkspace,
  }
}
