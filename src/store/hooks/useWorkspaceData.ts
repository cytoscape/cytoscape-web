import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useNetworkStore } from '../../store/NetworkStore'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useTableStore } from '../../store/TableStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useUiStateStore } from '../../store/UiStateStore'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useOpaqueAspectStore } from '../../store/OpaqueAspectStore'
import { useAppStore } from '../../store/AppStore'

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
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const currentWorkspaceName = useWorkspaceStore((state) => state.workspace.name)
  const workspaceId = useWorkspaceStore((state) => state.workspace.id)
  const isRemoteWorkspace = useWorkspaceStore((state) => state.workspace.isRemote)
  

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
    currentNetworkId,
    workspaceId,
    currentWorkspaceName,
    networkModifiedStatus,
    isRemoteWorkspace
  }
}
