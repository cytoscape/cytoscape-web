import { useAppStore } from './stores/AppStore'
import { useNetworkStore } from './stores/NetworkStore'
import { useNetworkSummaryStore } from './stores/NetworkSummaryStore'
import { useOpaqueAspectStore } from './stores/OpaqueAspectStore'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useViewModelStore } from './stores/ViewModelStore'
import { useVisualStyleStore } from './stores/VisualStyleStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'

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
