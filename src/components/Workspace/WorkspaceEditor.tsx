import { Suspense, lazy, useContext, useEffect, useState } from 'react'
import { Allotment } from 'allotment'
import _ from 'lodash'
import { Box } from '@mui/material'

import { Outlet, useNavigate } from 'react-router-dom'

import { useNdexNetwork } from '../../store/hooks/useNdexNetwork'
import { useNdexNetworkSummary } from '../../store/hooks/useNdexNetworkSummary'
import { useTableStore } from '../../store/TableStore'
import { useVisualStyleStore } from '../../store/VisualStyleStore'
import { useNetworkStore } from '../../store/NetworkStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { IdType } from '../../models/IdType'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { AppConfigContext } from '../../AppConfigContext'
import { Workspace } from '../../models/WorkspaceModel'
import { putNetworkViewToDb } from '../../store/persist/db'
import { NetworkView } from '../../models/ViewModel'
import { useWorkspaceManager } from '../../store/hooks/useWorkspaceManager'

import { useCredentialStore } from '../../store/CredentialStore'
import { SnackbarMessageList } from '../Messages'
import { NetworkBrowserPanel } from './NetworkBrowserPanel/NetworkBrowserPanel'

import { SidePanel } from './SidePanel/SidePanel'
import { useUiStateStore } from '../../store/UiStateStore'
import { Ui } from '../../models/UiModel'
import { PanelState } from '../../models/UiModel/PanelState'
import { OpenRightPanelButton } from './SidePanel/OpenRightPanelButton'
import { ManualLayoutPanel } from '../LayoutTools'

const NetworkPanel = lazy(() => import('../NetworkPanel/NetworkPanel'))
const TableBrowser = lazy(() => import('../TableBrowser/TableBrowser'))

/**
 * The main workspace editor containing all except toolbar
 *
 */
const WorkSpaceEditor = (): JSX.Element => {
  useWorkspaceManager()

  // Server location
  const { ndexBaseUrl } = useContext(AppConfigContext)

  const navigate = useNavigate()

  const getToken: () => Promise<string> = useCredentialStore(
    (state) => state.getToken,
  )

  const credentialInitialized: boolean = useCredentialStore(
    (state) => state.initialized,
  )

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const ui: Ui = useUiStateStore((state) => state.ui)
  const { panels } = ui

  const workspace: Workspace = useWorkspaceStore((state) => state.workspace)
  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const viewModels: Record<string, NetworkView> = useViewModelStore(
    (state) => state.viewModels,
  )

  const setNetworkModified: (id: IdType, isModified: boolean) => void =
    useWorkspaceStore((state) => state.setNetworkModified)

  // listen to view model changes
  // assume that if the view model change, the network has been modified and set the networkModified flag to true
  useViewModelStore.subscribe(
    (state) => state.viewModels[currentNetworkId],
    (prev: NetworkView, next: NetworkView) => {
      if (prev === undefined || next === undefined) {
        return
      }
      const viewModelChanged =
        prev !== undefined &&
        next !== undefined &&
        !_.isEqual(
          // omit selection state and hovered element changes as valid viewModel changes
          _.omit(prev, ['hoveredElement', 'selectedNodes', 'selectedEdges']),
          _.omit(next, ['hoveredElement', 'selectedNodes', 'selectedEdges']),
        )

      // primitve compare fn that does not take into account the selection/hover state
      // this leads to the network having a 'modified' state even though nothing was modified
      const { networkModified } = workspace
      const currentNetworkIsNotModified =
        networkModified[currentNetworkId] === undefined ??
        !networkModified[currentNetworkId] ??
        false

      if (viewModelChanged && currentNetworkIsNotModified) {
        setNetworkModified(currentNetworkId, true)
      }
    },
  )

  // Network Summaries
  const summaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
    (state) => state.summaries,
  )
  const setSummaries = useNetworkSummaryStore((state) => state.addAll)
  const removeSummary = useNetworkSummaryStore((state) => state.delete)

  const [tableBrowserHeight, setTableBrowserHeight] = useState(0)
  const [tableBrowserWidth, setTableBrowserWidth] = useState(window.innerWidth)
  const [allotmentDimensions, setAllotmentDimensions] = useState<
    [number, number]
  >([0, 0])

  const addNewNetwork = useNetworkStore((state) => state.add)
  const addVisualStyle = useVisualStyleStore((state) => state.add)
  const addTable = useTableStore((state) => state.add)
  const addViewModel = useViewModelStore((state) => state.add)

  const loadNetworkSummaries = async (): Promise<void> => {
    const currentToken = await getToken()
    const summaries = await useNdexNetworkSummary(
      workspace.networkIds,
      ndexBaseUrl,
      currentToken,
    )

    setSummaries(summaries)
  }

  const loadCurrentNetworkById = async (networkId: IdType): Promise<void> => {
    const currentToken = await getToken()
    const res = await useNdexNetwork(networkId, ndexBaseUrl, currentToken)
    const { network, nodeTable, edgeTable, visualStyle, networkView } = res

    addNewNetwork(network)
    addVisualStyle(networkId, visualStyle)
    addTable(networkId, nodeTable, edgeTable)
    addViewModel(networkId, networkView)
  }

  /**
   * Initializations
   */
  useEffect(() => {
    const windowWidthListener = (): void => {
      setTableBrowserWidth(window.innerWidth)
    }
    window.addEventListener('resize', windowWidthListener)

    return () => {
      window.removeEventListener('resize', windowWidthListener)
    }
  }, [])

  /**
   * Check number of networks in the workspace
   */
  useEffect(() => {
    if (!credentialInitialized) {
      return
    }
    const networkCount: number = workspace.networkIds.length
    const summaryCount: number = Object.keys(summaries).length

    if (networkCount === 0 && summaryCount === 0) {
      return
    }

    // No action required if empty or no change
    if (networkCount === 0) {
      if (summaryCount !== 0) {
        // Remove the last one
        removeSummary(Object.keys(summaries)[0])
      }
      return
    }

    const summaryIds: IdType[] = [...Object.keys(summaries)]

    // Case 1: network removed
    if (networkCount < summaryCount) {
      const toBeRemoved: IdType[] = summaryIds.filter((id) => {
        return !workspace.networkIds.includes(id)
      })
      removeSummary(toBeRemoved[0])
      return
    }

    // Case 2: network added

    // TODO: Load only diffs
    loadNetworkSummaries()
      .then(() => {})
      .catch((err) => console.error(err))
  }, [workspace.networkIds, credentialInitialized])

  /**
   * Swap the current network, can be an expensive operation
   */
  useEffect(() => {
    if (currentNetworkId === '' || currentNetworkId === undefined) {
      // No need to load new network
      return
    }

    // Update the DB first

    const currentNetworkView: NetworkView = viewModels[currentNetworkId]
    if (currentNetworkView === undefined) {
      loadCurrentNetworkById(currentNetworkId)
        .then(() => {
          navigate(`/${workspace.id}/networks/${currentNetworkId}`)
          console.log('Network loaded for', currentNetworkId)
        })
        .catch((err) => console.error('Failed to load a network:', err))
    } else {
      putNetworkViewToDb(currentNetworkId, currentNetworkView)
        .then(() => {
          console.info('* Network view saved to DB')
          loadCurrentNetworkById(currentNetworkId)
            .then(() => {
              navigate(`/${workspace.id}/networks/${currentNetworkId}`)
              console.log('Network loaded for', currentNetworkId)
            })
            .catch((err) => console.error('Failed to load a network:', err))
        })
        .catch((err) => {
          console.error('Failed to save network view to DB:', err)
        })
    }
  }, [currentNetworkId])

  /**
   * if there is no current network id set, set the first network in the workspace to the current network
   */
  useEffect(() => {
    let curId: IdType = ''
    if (
      currentNetworkId === undefined ||
      currentNetworkId === '' ||
      !workspace.networkIds.includes(currentNetworkId)
    ) {
      if (Object.keys(summaries).length !== 0) {
        curId = Object.keys(summaries)[0]
        setCurrentNetworkId(curId)
      }
    }
  }, [summaries, currentNetworkId])

  // TODO: avoid hardcoding pixel values

  // Return the main component including the network panel, network view, and the table browser
  return (
    <Box
      sx={{
        height: 'calc(100vh - 48px)',
      }}
    >
      <Allotment>
        <Allotment
          vertical
          onChange={(sizes: number[]) => {
            // sizes[0] represents the height of the top pane (network list, network renderer, vizmapper)
            // sizes[1] represents the height of the bottom pane (table browser)
            setAllotmentDimensions([sizes[0], sizes[1]])
            setTableBrowserHeight(sizes[1])
          }}
        >
          <Allotment>
            <Allotment.Pane maxSize={400} preferredSize="20vh">
              <Allotment vertical>
                <Allotment.Pane preferredSize={400}>
                  <NetworkBrowserPanel
                    allotmentDimensions={allotmentDimensions}
                  />
                </Allotment.Pane>
                <Allotment.Pane>
                  <ManualLayoutPanel />
                </Allotment.Pane>
              </Allotment>
            </Allotment.Pane>
            <Allotment.Pane>
              <Outlet />
              <NetworkPanel networkId={currentNetworkId} />
            </Allotment.Pane>
          </Allotment>
          <Allotment.Pane minSize={28} preferredSize={150}>
            <Suspense
              fallback={<div>{`Loading from NDEx`}</div>}
              key={currentNetworkId}
            >
              <TableBrowser
                height={tableBrowserHeight}
                width={tableBrowserWidth}
                currentNetworkId={currentNetworkId}
              />
            </Suspense>
          </Allotment.Pane>
        </Allotment>

        {panels.right === PanelState.OPEN ? (
          <Box sx={{ width: '100%', height: '100%' }}>
            <OpenRightPanelButton
              toOpen={false}
              title="Close panel"
              show={panels.right === PanelState.OPEN}
            />
            <SidePanel />
          </Box>
        ) : null}
      </Allotment>
      <SnackbarMessageList />
      <OpenRightPanelButton
        toOpen={true}
        title="Open panel"
        show={panels.right === PanelState.CLOSED}
      />
    </Box>
  )
}

export default WorkSpaceEditor
