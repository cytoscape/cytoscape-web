import { Box, Tab, Tabs } from '@mui/material'
import { useRef } from 'react'

import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useContainerSize } from '../../data/hooks/useContainerSize'
import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { NetworkView } from '../../models/ViewModel'
import { NetworkTab } from './NetworkTab'

const TABS_HEIGHT = 40

interface NetworkTabsProps {
  network: Network
  views: NetworkView[]
  renderers: Record<string, Renderer>
  isActive: boolean
  bgColor?: string
  handleClick?: () => void
  setIsActive?: (active: boolean) => void
}

export const NetworkTabs = ({
  network,
  renderers,
  isActive,
  bgColor,
  handleClick,
}: NetworkTabsProps) => {
  const selected = useUiStateStore(
    (state) => state.ui.networkViewUi.activeTabIndex,
  )
  const setSelected = useUiStateStore((state) => state.setNetworkViewTabIndex)

  const customNetworkTabName = useUiStateStore(
    (state) => state.ui.customNetworkTabName,
  )

  const boxRef = useRef<HTMLDivElement>(null)
  const boxSize = useContainerSize(boxRef)

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    // When clicking a tab, always activate the renderer and switch to the clicked tab
    // The isActive state will be set by the useEffect in NetworkPanel based on activeNetworkView
    handleClick?.()
    setSelected(newValue)
  }

  const rendererList = Object.values(renderers)
  // The stored index can name no tab: `?activeNetworkViewTab=` is checked at
  // boot, before the tabs are known. Show the first tab then rather than
  // hiding every renderer (#995). This is display only: the stored index is
  // kept, so a renderer that is briefly missing does not lose the user's tab.
  // Only a click replaces it (see the Tab `onClick` below).
  const shownIndex: number =
    Number.isInteger(selected) &&
    selected >= 0 &&
    selected < rendererList.length
      ? selected
      : 0
  return (
    <Box
      data-testid="network-tabs"
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
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
          flexShrink: 0,
          p: 0,
          m: 0,
          backgroundColor: (theme) => theme.palette.background.subtle,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tabs
          data-testid="network-tabs-list"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyItems: 'center',
            flexGrow: 1,
            minHeight: TABS_HEIGHT,
            '& button': {
              minHeight: TABS_HEIGHT,
            },
          }}
          value={shownIndex}
          onChange={handleChange}
        >
          {rendererList.map((renderer: Renderer, index: number) => {
            let label: string = renderer.name ?? 'Renderer'
            if (customNetworkTabName !== undefined) {
              if (
                customNetworkTabName[renderer.id] !== undefined &&
                customNetworkTabName[renderer.id] !== ''
              ) {
                label = customNetworkTabName[renderer.id]
              }
            }
            return (
              <Tab
                sx={{ height: '40px' }}
                key={index}
                label={label}
                onClick={() => {
                  // When clicking a tab (even if already selected), activate the network view
                  // This handles the case where onChange doesn't fire for already-selected tabs
                  handleClick?.()
                  // The same gap hides a click on the fallback tab: it is
                  // shown as selected while the store still holds the index
                  // that named no tab. Store the click, so the panel does not
                  // jump back to that index once the tab exists (#995).
                  if (selected !== index) {
                    setSelected(index)
                  }
                }}
              />
            )
          })}
        </Tabs>
      </Box>
      {/* minHeight 0: a flex item's default `min-height: auto` keeps it from
          shrinking below its content, and the renderers' canvases are sized in
          pixels — so the table panel growing would push the view out of the
          pane instead of shrinking it. */}
      <Box
        ref={boxRef}
        data-testid="network-tabs-content"
        sx={{ flexGrow: 1, minHeight: 0, width: '100%' }}
      >
        {rendererList.map((renderer: Renderer, index: number) => {
          return (
            <NetworkTab
              key={index}
              network={network}
              renderer={renderer}
              isActive={isActive}
              bgColor={bgColor}
              handleClick={handleClick}
              selected={index === shownIndex}
              boxSize={boxSize}
              hasTab={true}
            />
          )
        })}
      </Box>
    </Box>
  )
}
