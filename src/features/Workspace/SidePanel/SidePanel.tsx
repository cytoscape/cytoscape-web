import { Box, Tab, Tabs } from '@mui/material'
import { SyntheticEvent, useState } from 'react'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { isSubnetwork } from '../../HierarchyViewer/utils/hierarchyUtil'
import { getTabContents } from './TabContents'

/**
 * The collapsible side panel for extra UI components
 *
 */
export const SidePanel = (): JSX.Element => {
  // Selected tab number
  const [value, setValue] = useState(0)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const activeNetworkView = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const setActiveNetworkView = useUiStateStore(
    (state) => state.setActiveNetworkView,
  )
  const networks = useNetworkStore((state) => state.networks)

  // Helper to find the network ID to activate when clicking Sub Network Viewer tab
  const getNetworkIdToActivate = (): IdType | null => {
    // 1. If activeNetworkView is already a subnetwork, use it
    if (
      activeNetworkView &&
      activeNetworkView !== '' &&
      isSubnetwork(activeNetworkView)
    ) {
      return activeNetworkView
    }

    // 2. Look for subnetworks in the store that might be related to current network
    // Subnetworks have format: hierarchyId_subsystemId
    const subnetworks: IdType[] = []
    networks.forEach((network, networkId) => {
      if (isSubnetwork(networkId)) {
        // Check if this subnetwork is related to the current network
        // (starts with currentNetworkId_)
        if (currentNetworkId && networkId.startsWith(currentNetworkId + '_')) {
          subnetworks.push(networkId)
        }
      }
    })

    // If we found subnetworks, use the first one (or could use most recent)
    if (subnetworks.length > 0) {
      return subnetworks[0]
    }

    // 3. Fall back to activeNetworkView if it exists
    if (activeNetworkView && activeNetworkView !== '') {
      return activeNetworkView
    }

    // 4. Finally, fall back to currentNetworkId
    return currentNetworkId && currentNetworkId !== '' ? currentNetworkId : null
  }

  const handleChange = (event: SyntheticEvent, newValue: number): void => {
    setValue(newValue)
    // When clicking the "Sub Network Viewer" tab (index 0), activate the network view
    if (newValue === 0) {
      const networkIdToActivate = getNetworkIdToActivate()
      if (networkIdToActivate) {
        setActiveNetworkView(networkIdToActivate)
      }
    }
  }

  const tabContents = getTabContents(value)

  return (
    <Box
      data-testid="side-panel"
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          p: 0,
          paddingLeft: '2.5em',
          m: 0,
        }}
      >
        <Tabs
          data-testid="side-panel-tabs"
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            display: 'flex',
            alignItems: 'center',
            '& button': {
              height: '2.5em',
              minHeight: '2.5em',
            },
            height: '2.5em',
            minHeight: '2.5em',
            flexGrow: 1,
            margin: 0,
          }}
        >
          {tabContents.map((tabContent, index) => (
            <Tab
              key={index}
              label={tabContent.props.label}
              onClick={() => {
                // When clicking the "Sub Network Viewer" tab (index 0), activate the network view
                // This handles the case where the tab is already selected (onChange won't fire)
                if (index === 0) {
                  const networkIdToActivate = getNetworkIdToActivate()
                  if (networkIdToActivate) {
                    setActiveNetworkView(networkIdToActivate)
                  }
                }
              }}
            />
          ))}
        </Tabs>
      </Box>

      <Box
        sx={{
          width: '100%',
          flexGrow: 1,
        }}
      >
        {tabContents}
      </Box>
    </Box>
  )
}
