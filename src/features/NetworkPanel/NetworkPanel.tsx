import { ReactElement, useEffect, useState } from 'react'

import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useRendererStore } from '../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { NetworkView } from '../../models/ViewModel'
import { VisualStyle } from '../../models/VisualStyleModel'
import { MessagePanel } from '../Messages'
import { NetworkTab } from './NetworkTab'
import { NetworkTabs } from './NetworkTabs'

interface NetworkPanelProps {
  networkId: IdType
  failedToLoad?: boolean
}

/**
 * Component to display the network visualizations for the current network data
 *
 * @param networkId - the ID of the network model to display
 *
 */
const NetworkPanel = ({
  networkId,
  failedToLoad = false,
}: NetworkPanelProps): ReactElement => {
  const [isActive, setIsActive] = useState<boolean>(false)

  const ui = useUiStateStore((state) => state.ui)
  const { activeNetworkView, enablePopup } = ui

  const setActiveNetworkView: (id: IdType) => void = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )

  const renderers: Record<string, Renderer> = useRendererStore(
    (state) => state.renderers,
  )

  const defaultRendererName: string = useRendererStore(
    (state) => state.defaultRendererName,
  )

  useEffect(() => {
    if (
      (networkId === activeNetworkView || activeNetworkView === '') &&
      enablePopup
    ) {
      setIsActive(true)
    } else {
      setIsActive(false)
    }
  }, [activeNetworkView, networkId, enablePopup])

  const visualStyles = useVisualStyleStore((state) => state.visualStyles)

  const networks: Map<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const networkViews: Record<string, NetworkView[]> = useViewModelStore(
    (state) => state.viewModels,
  )

  const workspace = useWorkspaceStore((state) => state.workspace)

  if (failedToLoad) {
    return <MessagePanel message="Failed to load network data" />
  }

  if (workspace.networkIds.length === 0) {
    return <MessagePanel message="No network selected" />
  }

  const targetNetwork: Network = networks.get(networkId) ?? {
    id: '', // an empty network
    nodes: [],
    edges: [],
  }

  if (targetNetwork.id === '') {
    return <MessagePanel message="Loading network data..." />
  }

  const targetId = targetNetwork.id

  // Check network has multiple views or single
  const views: NetworkView[] = networkViews[targetId]
  const vs: VisualStyle = visualStyles[targetNetwork.id]

  const handleClick = (): void => {
    setActiveNetworkView(targetNetwork.id)
  }

  const bgColor = vs?.networkBackgroundColor?.defaultValue as string

  // Show tabs only when multiple views are available
  if (Object.keys(renderers).length === 1) {
    // Use default renderer without tab if there is only one view
    return (
      <NetworkTab
        network={targetNetwork}
        renderer={renderers[defaultRendererName]}
        bgColor={bgColor}
        isActive={isActive}
        handleClick={handleClick}
        selected={true}
      />
    )
  } else {
    return (
      <NetworkTabs
        network={targetNetwork}
        views={views}
        renderers={renderers}
        isActive={isActive}
        bgColor={bgColor}
        handleClick={handleClick}
      />
    )
  }
}

export default NetworkPanel
