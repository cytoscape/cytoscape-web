import { ReactElement, useEffect, useState } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { MessagePanel } from '../Messages'
import { useUiStateStore } from '../../store/UiStateStore'
import { VisualStyle } from '../../models/VisualStyleModel'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { NetworkView } from '../../models/ViewModel'
import { NetworkTab } from './NetworkTab'
import { NetworkTabs } from './NetworkTabs'
import { Renderer } from '../../models/RendererModel/Renderer'
import { useRendererStore } from '../../store/RendererStore'
import { use } from 'cytoscape'

interface NetworkPanelProps {
  networkId: IdType
}

/**
 * Component to display the network visualizations for the current network data
 * 
 * @param networkId - the ID of the network model to display
 * 
 */
const NetworkPanel = ({ networkId }: NetworkPanelProps): ReactElement => {
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

  if (networks.size === 0) {
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
