import { Tab, Tabs } from '@mui/material'
import Box from '@mui/material/Box'
import React from 'react'

import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { IdType } from '../../models/IdType'
import ConsoleTab from '../Console/ConsoleTab'
import TableBrowser from '../TableBrowser/TableBrowser'

interface BottomPanelTabsProps {
  currentNetworkId: IdType
  tableBrowserHeight: number
  setTableBrowserHeight: (height: number) => void
  activeNetworkView?: IdType
}

/**
 * Bottom panel tabs hosting the existing TableBrowser and the new Console tab.
 */
export const BottomPanelTabs = ({
  currentNetworkId,
  tableBrowserHeight,
  setTableBrowserHeight,
  activeNetworkView,
}: BottomPanelTabsProps): React.ReactElement => {
  const bottomPanelUi = useUiStateStore((state) => state.ui.bottomPanelUi)
  const setBottomPanelTabIndex = useUiStateStore(
    (state) => state.setBottomPanelTabIndex,
  )

  const activeTabIndex = bottomPanelUi?.activeTabIndex ?? 0

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          p: 0,
          m: 0,
        }}
      >
        <Tabs
          value={activeTabIndex}
          onChange={(event, newValue) => setBottomPanelTabIndex(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          data-testid="bottom-panel-tabs"
          sx={{
            '& button': {
              height: '2.5em',
              minHeight: '2.5em',
            },
            height: '2.5em',
            minHeight: '2.5em',
            flexGrow: 1,
          }}
        >
          <Tab label="Tables" />
          <Tab label="Console" />
        </Tabs>
      </Box>
      <Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
        {activeTabIndex === 0 ? (
          <TableBrowser
            setHeight={setTableBrowserHeight}
            height={tableBrowserHeight}
            currentNetworkId={
              activeNetworkView === undefined || activeNetworkView === ''
                ? currentNetworkId
                : activeNetworkView
            }
          />
        ) : (
          <ConsoleTab />
        )}
      </Box>
    </Box>
  )
}

export default BottomPanelTabs
