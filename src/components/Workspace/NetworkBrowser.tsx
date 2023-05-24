import { Box, Tabs, Tab, Typography } from '@mui/material'
import VizmapperView from '../Vizmapper'
import { useState } from 'react'
import ShareIcon from '@mui/icons-material/Share'
import PaletteIcon from '@mui/icons-material/Palette'
import { Summaries as SummaryList } from '../SummaryPanel'
import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

interface NetworkBrowserProps {
  allotmentDimensions: [number, number]
}
export const NetworkBrowser = ({
  allotmentDimensions,
}: NetworkBrowserProps): JSX.Element => {
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const summaries: Record<IdType, NdexNetworkSummary> = useNetworkSummaryStore(
    (state) => state.summaries,
  )
  const [currentTabIndex, setCurrentTabIndex] = useState<number>(0)

  const changeTab = (event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTabIndex(newValue)
  }

  return (
    <Box
      sx={{
        height: '100%',
      }}
    >
      <Tabs
        sx={{ display: 'flex', alignItems: 'center', height: '40px' }}
        value={currentTabIndex}
        onChange={changeTab}
      >
        <Tab
          icon={<ShareIcon />}
          iconPosition="start"
          label={<Typography variant="body2">WORKSPACE</Typography>}
        />
        <Tab
          icon={<PaletteIcon />}
          iconPosition="start"
          label={<Typography variant="body2">STYLE</Typography>}
        />
      </Tabs>
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && (
          <Box
            sx={{
              overflow: 'scroll',
              height: allotmentDimensions[0] - 48,
              // need to set a height to enable scroll in the network list
              // 48 is the height of the tool bar
              width: '100%',
              padding: 0,
              margin: 0,
            }}
          >
            <SummaryList summaries={summaries} />
          </Box>
        )}
      </div>
      <div hidden={currentTabIndex !== 1}>
        {currentTabIndex === 1 && (
          <Box>
            {' '}
            <VizmapperView
              currentNetworkId={currentNetworkId}
              height={allotmentDimensions[0]}
            />
          </Box>
        )}
      </div>
    </Box>
  )
}
