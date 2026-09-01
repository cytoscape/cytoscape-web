import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import PaletteIcon from '@mui/icons-material/Palette'
import ShareIcon from '@mui/icons-material/Share'
import {
  Box,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material'
import { lazy, Suspense, useEffect, useState } from 'react'

import llmLogo from '../../../assets/openai.svg'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { Ui } from '../../../models/UiModel'
import { Panel } from '../../../models/UiModel/Panel'
import { PanelState } from '../../../models/UiModel/PanelState'
import { isHCX } from '../../HierarchyViewer/utils/hierarchyUtil'
import { NetworkSearchBar } from '../../NetworkSearch'
import { prefetchOnIdle } from '@/utils/idlePrefetch'
import { Summaries as SummaryList } from '../../SummaryPanel'
import { WorkspaceNamePanel } from './WorkspaceNamePanel'

// Lazy tab contents: Vizmapper alone drags in visx, d3 and react-color, so
// keeping these out of the eager workspace chunk is one of the largest
// cold-load wins. Module scope keeps component identity stable.
const loadVizmapper = () => import('@/features/Vizmapper')
const VizmapperView = lazy(loadVizmapper)
const LLMQueryResultPanel = lazy(() =>
  import('@/features/LLMQuery/components/LLMQueryResultPanel').then((m) => ({
    default: m.LLMQueryResultPanel,
  })),
)

const tabContentFallback = (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
    }}
  >
    <CircularProgress size={24} />
  </Box>
)

const TABS_HEIGHT = 40

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

  const summaries: Record<IdType, NetworkSummary> = useNetworkSummaryStore(
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

  // Warm the STYLE tab's chunk during idle time so the first click doesn't
  // stall on a network fetch.
  useEffect(() => prefetchOnIdle(loadVizmapper), [])
  const summary = summaries[currentNetworkId]

  const showLLMQueryPanel = isHCX(summary)

  return (
    <Box
      data-testid="network-browser-panel"
      sx={{
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: '100%',
          height: '100%',
          p: 0,
          m: 0,
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyItems: 'center',
            width: '100%',
            p: 0,
            m: 0,
            backgroundColor: (theme) => theme.palette.background.subtle,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Tabs
            data-testid="network-browser-panel-tabs"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyItems: 'center',
              flexGrow: 1,
              height: TABS_HEIGHT,
              minHeight: TABS_HEIGHT,
              '& button': {
                minHeight: TABS_HEIGHT,
                height: TABS_HEIGHT,
              },
            }}
            value={currentTabIndex}
            onChange={changeTab}
          >
            <Tab
              data-testid="network-browser-panel-workspace-tab"
              icon={<ShareIcon />}
              iconPosition="start"
              label="WORKSPACE"
            />
            <Tab
              data-testid="network-browser-panel-style-tab"
              icon={<PaletteIcon />}
              iconPosition="start"
              label="STYLE"
            />
            {showLLMQueryPanel && (
              <Tab
                data-testid="network-browser-panel-llm-query-tab"
                icon={
                  <img
                    height="25"
                    width="25"
                    style={{ fill: 'gray' }}
                    src={llmLogo}
                  />
                }
                iconPosition="start"
                label="LLM QUERY"
              />
            )}
          </Tabs>
          {panels.left === PanelState.OPEN ? (
            <Tooltip title="Close panel">
              <IconButton
                data-testid="network-browser-panel-close-button"
                sx={{
                  width: 32,
                  height: 32,
                  mr: 1,
                  color: (theme) => theme.palette.text.secondary,
                  '&:hover': {
                    color: (theme) => theme.palette.text.primary,
                    backgroundColor: 'transparent',
                  },
                }}
                onClick={() => setPanelState(Panel.LEFT, PanelState.CLOSED)}
              >
                <ChevronLeft />
              </IconButton>
            </Tooltip>
          ) : (
            <ChevronRight
              data-testid="network-browser-panel-open-button"
              sx={{
                mr: 1,
                color: (theme) => theme.palette.text.secondary,
                '&:hover': {
                  color: (theme) => theme.palette.text.primary,
                },
              }}
              onClick={() => setPanelState(Panel.LEFT, PanelState.OPEN)}
            />
          )}
        </Box>
        <Box hidden={currentTabIndex !== 0} sx={{ width: '100%' }}>
          <NetworkSearchBar />
        </Box>
        <Box
          hidden={currentTabIndex !== 0}
          sx={{
            width: '100%',
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          <WorkspaceNamePanel />
        </Box>
        <Box
          sx={{
            flexGrow: 1,
            height: '100%',
            width: '100%',
            overflowY: 'auto',
          }}
          hidden={currentTabIndex !== 0}
        >
          {currentTabIndex === 0 && <SummaryList />}
        </Box>
        <Box
          hidden={currentTabIndex !== 1}
          sx={{
            flexGrow: 1,
            height: '100%',
            width: '100%',
            overflowY: 'auto',
          }}
        >
          {currentTabIndex === 1 && (
            <Suspense fallback={tabContentFallback}>
              <VizmapperView
                networkId={targetNetworkId}
                height={allotmentDimensions[0]}
              />
            </Suspense>
          )}
        </Box>
        <Box hidden={currentTabIndex !== 2}>
          {currentTabIndex === 2 && (
            <Suspense fallback={tabContentFallback}>
              <LLMQueryResultPanel height={allotmentDimensions[0]} />
            </Suspense>
          )}
        </Box>
      </Box>
    </Box>
  )
}
