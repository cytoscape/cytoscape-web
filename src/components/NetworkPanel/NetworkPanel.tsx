import { Box } from '@mui/material'
import { ReactElement, useState } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { FloatingToolBar } from '../FloatingToolBar/FloatingToolBar'
import { MessagePanel } from '../Messages'
import { CyjsRenderer } from './CyjsRenderer'
import { PopupPanel } from '../PopupPanel'

interface NetworkPanelProps {
  networkId: IdType
}

/**
 * Main network renderer visualizing the current network
 */
const NetworkPanel = ({ networkId }: NetworkPanelProps): ReactElement => {
  const [visible, setVisible] = useState<boolean>(false)
  const [position, setPosition] = useState<[number, number]>([0, 0])
  // const currentNetworkId: IdType = useWorkspaceStore(
  //   (state) => state.workspace.currentNetworkId,
  // )

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

  const handleClick = (e: any): void => {
    setVisible(!visible)
    setPosition([e.clientX, e.clientY])
  }

  const renderer: JSX.Element = <CyjsRenderer network={targetNetwork} />
  return (
    <Box sx={{ height: '100%', width: '100%' }} onClick={handleClick}>
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
