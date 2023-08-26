import { Box, Tabs, Tab, Typography, Theme, useTheme } from '@mui/material'
import VizmapperView from '../../Vizmapper'
import { useState, useEffect } from 'react'
import ShareIcon from '@mui/icons-material/Share'
import PaletteIcon from '@mui/icons-material/Palette'
import { Summaries as SummaryList } from '../../SummaryPanel'
import { IdType } from '../../../models/IdType'
import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { ChevronLeft } from '@mui/icons-material'

interface NetworkBrowserProps {
  allotmentDimensions: [number, number]
}

/**
 *
 * Panel for showing network list and vizmapper
 *
 * @returns
 */
export const NetworkBrowserPanel = ({
  allotmentDimensions,
}: NetworkBrowserProps): JSX.Element => {
  const theme: Theme = useTheme()
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const activeNetworkViewId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  const [targetNetworkId, setTargetNetworkId] = useState<IdType>('')

  useEffect(() => {
    if (activeNetworkViewId !== '' && activeNetworkViewId !== undefined) {
      setTargetNetworkId(activeNetworkViewId)
    } else {
      setTargetNetworkId(currentNetworkId)
    }
  }, [activeNetworkViewId, currentNetworkId])

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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        <Tabs
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '40px',
            flexGrow: 1,
          }}
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
        <ChevronLeft
          style={{ marginRight: theme.spacing(1), border: '1px solid #999999' }}
        />
      </Box>
      <div hidden={currentTabIndex !== 0}>
        {currentTabIndex === 0 && (
          <Box
            sx={{
              overflow: 'auto',
              // height: '100%',
              // height: allotmentDimensions[0] - 48,
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
              networkId={targetNetworkId}
              height={allotmentDimensions[0]}
            />
          </Box>
        )}
      </div>
    </Box>
  )
}
