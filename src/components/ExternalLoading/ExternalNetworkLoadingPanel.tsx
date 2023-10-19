import { useState, ReactElement, useContext, useEffect } from 'react'
import { Box, LinearProgress } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { Workspace } from '../../models/WorkspaceModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useCredentialStore } from '../../store/CredentialStore'
import { useNdexNetworkSummary } from '../../store/hooks/useNdexNetworkSummary'
import { AppConfigContext } from '../../AppConfigContext'
import { useUiStateStore } from '../../store/UiStateStore'

interface ExternalNetworkLoadingPanelProps {
  message: string
  showProgress?: boolean
}

export const ExternalNetworkLoadingPanel = (
  props: ExternalNetworkLoadingPanelProps,
): ReactElement => {
  const { ndexBaseUrl } = useContext(AppConfigContext)
  const navigate = useNavigate()
  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const { id, networkIds } = workspace
  const setShowErrorDialog = useUiStateStore(
    (state) => state.setShowErrorDialog,
  )

  const setErrorMessage = useUiStateStore((state) => state.setErrorMessage)

  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const addNetworkIds: (networkId: string) => void = useWorkspaceStore(
    (state) => state.addNetworkIds,
  )

  const deleteNetwork = useWorkspaceStore((state) => state.deleteNetwork)
  const setCurrentNetworkId: (networkId: string) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const location = useLocation()
  const redirect = (): void => {
    const networkId = location.pathname.split('/')[2]
    void getToken().then((token) => {
      useNdexNetworkSummary(networkId, ndexBaseUrl, token)
        .then((summary) => {
          const idSet = new Set(networkIds)

          if (idSet.has(networkId)) {
            deleteNetwork(networkId)
          }

          // Add to the workspace
          addNetworkIds(networkId)
          setCurrentNetworkId(networkId)
          navigate(`/${id}/networks/${networkId}${location.search.toString()}`)
        })
        .catch((error) => {
          console.log('SUMMARY error', error)
          const errorMessage: string = error.message
          setErrorMessage(
            `Failed to load the network ${networkId}: ${errorMessage}`,
          )
          setShowErrorDialog(true)
        })
    })
  }

  useEffect(() => {
    console.log('workspace', workspace)
    if (id !== undefined) {
      redirect()
    }
  }, [id])

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
