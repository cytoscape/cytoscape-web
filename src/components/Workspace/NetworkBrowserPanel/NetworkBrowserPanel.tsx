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
import { ChevronLeft, ChevronRight } from '@mui/icons-material'
import { Ui } from '../../../models/UiModel'
import { PanelState } from '../../../models/UiModel/PanelState'
import { Panel } from '../../../models/UiModel/Panel'
import { isHCX } from '../../../features/HierarchyViewer/utils/hierarchy-util'
import { LLMQueryResultPanel } from '../../../features/LLMQuery/components'
import llmLogo from '../../../assets/openai.svg'
import { WorkspaceNamePanel } from './WorkspaceNamePanel'

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
  const buttonStyle = {
    marginRight: theme.spacing(1),
    border: '1px solid #999999',
  }

  const ui: Ui = useUiStateStore((state) => state.ui)
  const { panels } = ui
  const setPanelState: (panel: Panel, panelState: PanelState) => void =
    useUiStateStore((state) => state.setPanelState)

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

  const currentTabIndex = useUiStateStore(
    (state) => state.ui.networkBrowserPanelUi.activeTabIndex,
  )
  const setCurrentTabIndex = useUiStateStore(
    (state) => state.setActiveNetworkBrowserPanelIndex,
  )

  const changeTab = (event: React.SyntheticEvent, newValue: number): void => {
    setCurrentTabIndex(newValue)
  }
  const summary = summaries[currentNetworkId]

  const showLLMQueryPanel = isHCX(summary)

  return (
    <Box
      sx={{
        p: 0,
        margin: 0,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
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
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '2.5em',
            minHeight: '2.5em',
            flexGrow: 1,
          }}
          value={currentTabIndex}
          onChange={changeTab}
        >
          <Tab
            sx={{ height: '2.5em', minHeight: '2.5em' }}
            icon={<ShareIcon />}
            iconPosition="start"
            label={<Typography variant="body2">WORKSPACE</Typography>}
          />
          <Tab
            sx={{ height: '2.5em', minHeight: '2.5em' }}
            icon={<PaletteIcon />}
            iconPosition="start"
            label={<Typography variant="body2">STYLE</Typography>}
          />
          {showLLMQueryPanel && (
            <Tab
              sx={{ height: '2.5em', minHeight: '2.5em' }}
              icon={
                <img
                  height="25"
                  width="25"
                  style={{ fill: 'gray' }}
                  src={llmLogo}
                />
              }
              iconPosition="start"
              label={<Typography variant="body2">LLM QUERY</Typography>}
            />
          )}
        </Tabs>
        {panels.left === PanelState.OPEN ? (
          <ChevronLeft
            style={buttonStyle}
            onClick={() => setPanelState(Panel.LEFT, PanelState.CLOSED)}
          />
        ) : (
          <ChevronRight
            style={buttonStyle}
            onClick={() => setPanelState(Panel.LEFT, PanelState.OPEN)}
          />
        )}
      </Box>
      <Box hidden={currentTabIndex !== 0}>
        <WorkspaceNamePanel />
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          width: '100%',
          height: '100%',
          overflowY: 'auto',
        }}
        hidden={currentTabIndex !== 0}
      >
        {currentTabIndex === 0 && <SummaryList summaries={summaries} />}
      </Box>
      <Box hidden={currentTabIndex !== 1}>
        {currentTabIndex === 1 && (
          <VizmapperView
            networkId={targetNetworkId}
            height={allotmentDimensions[0]}
          />
        )}
      </Box>
      <Box hidden={currentTabIndex !== 2}>
        {currentTabIndex === 2 && (
          <LLMQueryResultPanel height={allotmentDimensions[0]} />
        )}
      </Box>
    </Box>
  )
}
