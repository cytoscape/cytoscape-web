import { Box } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { FloatingToolBar } from '../FloatingToolBar/FloatingToolBar'
import { MessagePanel } from '../Messages'
import { CyjsRenderer } from './CyjsRenderer'
import { PopupPanel } from '../PopupPanel'
import { useUiStateStore } from '../../store/UiStateStore'
import { VisualStyle } from '../../models/VisualStyleModel'
import { useVisualStyleStore } from '../../store/VisualStyleStore'

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

  const [visible, setVisible] = useState<boolean>(false)
  const [position, setPosition] = useState<[number, number]>([0, 0])

  const networks: Map<IdType, Network> = useNetworkStore(
    (state) => state.networks,
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
    return <MessagePanel message="Preparing network data..." />
  }

  const vs: VisualStyle = visualStyles[targetNetwork.id]

  const handleClick = (e: any): void => {
    setVisible(!visible)
    setPosition([e.clientX, e.clientY])
    setActiveNetworkView(networkId)
  }

  const bgColor = vs?.networkBackgroundColor?.defaultValue as string
  const renderer: JSX.Element = <CyjsRenderer network={targetNetwork} />
  return (
    <Box
      sx={{
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        backgroundColor: bgColor !== undefined ? bgColor : '#FFFFFF',
        border: isActive ? '3px solid orange' : '3px solid transparent',
      }}
      onClick={handleClick}
    >
      {renderer}
      <FloatingToolBar />
      <PopupPanel
        setVisible={setVisible}
        visible={visible}
        position={position}
      />
    </Box>
  )
}

export default NetworkPanel
