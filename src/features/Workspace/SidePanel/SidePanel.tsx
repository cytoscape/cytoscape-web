import { Box, Tab, Tabs } from '@mui/material'
import { SyntheticEvent, useEffect, useState } from 'react'

import { useNetworkStore } from '../../../data/hooks/stores/NetworkStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { isSubnetwork } from '../../HierarchyViewer/utils/hierarchyUtil'
import { renderPanelContents, usePanelEntries } from './TabContents'

/**
 * The collapsible side panel for extra UI components.
 *
 * Tab selection is tracked by resource identity (string) rather than
 * numeric index, so that adding/removing/hiding panels does not cause
 * the selected tab to silently shift to a different panel.
 */
export const SidePanel = (): JSX.Element => {
  // Track selected tab by resource identity, not numeric index
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  )

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

  // Build merged, ordered, visibility-filtered panel entries
  const entries = usePanelEntries()

  // Resolve selectedResourceId to a numeric index for MUI Tabs
  let resolvedIndex = entries.findIndex(
    (e) => e.resourceId === selectedResourceId,
  )
  if (resolvedIndex < 0) {
    // Selected panel was removed or hidden — fall back to first
    resolvedIndex = 0
  }

  // Keep selectedResourceId in sync when it was null or the entry was removed
  useEffect(() => {
    if (entries.length === 0) return
    const currentEntry = entries.find(
      (e) => e.resourceId === selectedResourceId,
    )
    if (!currentEntry) {
      setSelectedResourceId(entries[0]?.resourceId ?? null)
    }
  }, [entries, selectedResourceId])

  // Helper to find the network ID to activate when clicking Sub Network Viewer tab
  const getNetworkIdToActivate = (): IdType | null => {
    if (
      activeNetworkView &&
      activeNetworkView !== '' &&
      isSubnetwork(activeNetworkView)
    ) {
      return activeNetworkView
    }

    const subnetworks: IdType[] = []
    networks.forEach((network, networkId) => {
      if (isSubnetwork(networkId)) {
        if (
          currentNetworkId &&
          networkId.startsWith(currentNetworkId + '_')
        ) {
          subnetworks.push(networkId)
        }
      }
    })

    if (subnetworks.length > 0) {
      return subnetworks[0]
    }

    if (activeNetworkView && activeNetworkView !== '') {
      return activeNetworkView
    }

    return currentNetworkId && currentNetworkId !== '' ? currentNetworkId : null
  }

  const handleChange = (_event: SyntheticEvent, newValue: number): void => {
    const entry = entries[newValue]
    if (entry) {
      setSelectedResourceId(entry.resourceId)
    }
    // When clicking the "Sub Network Viewer" tab (index 0), activate the network view
    if (newValue === 0) {
      const networkIdToActivate = getNetworkIdToActivate()
      if (networkIdToActivate) {
        setActiveNetworkView(networkIdToActivate)
      }
    }
  }

  const tabContents = renderPanelContents(entries, resolvedIndex)

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
          value={resolvedIndex}
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
          {entries.map((entry, index) => (
            <Tab
              key={entry.resourceId}
              label={entry.label}
              onClick={() => {
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
