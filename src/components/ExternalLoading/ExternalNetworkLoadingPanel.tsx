import { ReactElement, useEffect } from 'react'
import { Box, LinearProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { Workspace } from '../../models/WorkspaceModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

interface ExternalNetworkLoadingPanelProps {
  message: string
  showProgress?: boolean
}

export const ExternalNetworkLoadingPanel = (
  props: ExternalNetworkLoadingPanelProps,
): ReactElement => {
  const navigation = useNavigate()
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)

  // const addNetworks: (ids: IdType | IdType[]) => void = useWorkspaceStore(
  //   (state) => state.addNetworkIds,
  // )

  // const location = useLocation()
  useEffect(() => {
    // const networkId = location.pathname.split('/')[2]
    // addNetworks([networkId])
    console.log('workspace', workspace)
    navigation('/')
  }, [])
  return (
    <Box
      sx={{ width: '100%', height: '100%', display: 'grid', padding: '1em' }}
    >
      <Box sx={{ margin: 'auto' }}>
        <h2>{props.message}</h2>
        {props.showProgress ?? false ? <LinearProgress /> : null}
      </Box>
    </Box>
  )
}
