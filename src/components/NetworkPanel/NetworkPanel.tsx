import { Box } from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
import { IdType } from '../../models/IdType'
import { Network } from '../../models/NetworkModel'
import { useNetworkStore } from '../../store/NetworkStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { MessagePanel } from '../Messages'
import { NetworkRenderer } from './NetworkRenderer'

const NetworkPanel = (): ReactElement => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const networks: Map<IdType, Network> = useNetworkStore(
    (state) => state.networks,
  )

  const [isBusy, setIsBusy] = useState<boolean>(false)

  useEffect(() => {
    console.log('NetworkPanel: ID change useEffect', currentNetworkId)
    setIsBusy(true)
  }, [currentNetworkId])

  if (networks.size === 0) {
    return <MessagePanel message="No network selected" />
  }

  const targetNetwork: Network = networks.get(currentNetworkId) ?? {
    id: '', // an empty network
    nodes: [],
    edges: [],
  }

  let height = '100%'
  let background = 'red'
  if (isBusy) {
    height = '100%'
    background = 'blue'
  }
  return (
    <Box sx={{ height, width: '100%', background }}>
      <NetworkRenderer
        network={targetNetwork}
        setIsBusy={setIsBusy}
        isBusy={isBusy}
      />
    </Box>
  )
}

export default NetworkPanel
