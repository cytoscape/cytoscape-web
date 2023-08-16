import { ReactElement, useContext, useEffect } from 'react'
import { Box, LinearProgress } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { Workspace } from '../../models/WorkspaceModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useCredentialStore } from '../../store/CredentialStore'
import { useNdexNetworkSummary } from '../../store/hooks/useNdexNetworkSummary'
import { AppConfigContext } from '../../AppConfigContext'

interface ExternalNetworkLoadingPanelProps {
  message: string
  showProgress?: boolean
}

export const ExternalNetworkLoadingPanel = (
  props: ExternalNetworkLoadingPanelProps,
): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const navigation = useNavigate()
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const location = useLocation()
  useEffect(() => {
    const networkId = location.pathname.split('/')[2]
    void getToken().then((token) => {
      console.log('token', token, networkId)
      useNdexNetworkSummary(networkId, ndexBaseUrl, token)
        .then((summary) => {
          console.log('summary', summary)
          console.log('workspace', workspace)
          navigation('/')
        })
        .catch((error) => {
          console.log('SUMMARY error', error)
          navigation('/')
        })
    })
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
