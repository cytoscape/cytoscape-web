import { ReactElement, useEffect, useState } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { MessagePanel } from '../Messages'
import { CyjsRenderer } from './CyjsRenderer'
import { useUiStateStore } from '../../store/UiStateStore'
import { VisualStyle } from '../../models/VisualStyleModel'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { NetworkView } from '../../models/ViewModel'
import { NetworkTab } from './NetworkTab'
import { NetworkTabs } from './NetworkTabs'
import { Renderer } from '../../models/RendererModel/Renderer'

interface NetworkPanelProps {
  networkId: IdType
}

/**
 * Main network renderer visualizing the current network
 */
const NetworkPanel = ({ networkId }: NetworkPanelProps): ReactElement => {
  const [isActive, setIsActive] = useState<boolean>(false)

  const ui = useUiStateStore((state) => state.ui)
  const { activeNetworkView, enablePopup } = ui

  const setActiveNetworkView: (id: IdType) => void = useUiStateStore(
    (state) => state.setActiveNetworkView,
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
  const renderer: Renderer = {
    id: 'cyjs',
    name: 'Cytoscape.js Renderer',
    description: 'Node-link diagram renderer based on Cytoscape.js',
    getComponent: (network: Network) => <CyjsRenderer network={network} />,
  }

  // Show tabs only when multiple views are available
  if (views.length === 1) {
    return (
      <NetworkTab
        network={targetNetwork}
        renderer={renderer}
        bgColor={bgColor}
        isActive={isActive}
        handleClick={handleClick}
      />
    )
  } else {
    return <NetworkTabs />
  }
}

export default NetworkPanel
