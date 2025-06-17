import { Box, Tab, Tabs } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { NetworkView } from '../../models/ViewModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { NetworkTab } from './NetworkTab'
import { Network } from '../../models/NetworkModel'
import { useUiStateStore } from '../../store/UiStateStore'
import { useSearchParams } from 'react-router-dom'

interface NetworkTabsProps {
  network: Network
  views: NetworkView[]
  renderers: Record<string, Renderer>
  isActive: boolean
  bgColor?: string
  handleClick?: () => void
}

/**
 * URL search parameter key for the active network view
 * This is used to store the active tab index in the URL
 * so that it can be restored when the user navigates back to this page
 * or refreshes the page.
 */
const ACTIVE_NETWORK_VIEW = 'activenetworkview'

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
  const [searchParams] = useSearchParams()

  const customNetworkTabName = useUiStateStore(
    (state) => state.ui.customNetworkTabName,
  )

  const boxRef = useRef<HTMLDivElement>(null)
  const [boxSize, setBoxSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  })

  useEffect(() => {
    const boxElement = boxRef.current
    if (boxElement) {
      window.requestAnimationFrame(() => {
        const rect = boxElement.getBoundingClientRect()
        // console.log(`box Width: ${rect.width}, box Height: ${rect.height}`)
        if (rect.width !== 0 && rect.height !== 0) {
          setBoxSize({ w: rect.width, h: rect.height })
        }
      })
    }
  }, [])

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelected(newValue)

    // Update URL search parameter with the selected tab ID
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set(ACTIVE_NETWORK_VIEW, newValue.toString())
    // setSearchParams(newSearchParams, { replace: true })
  }

  // Read tab ID from URL on initial render and set it as the selected view
  useEffect(() => {
    const tabParam = searchParams.get(ACTIVE_NETWORK_VIEW)
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam, 10)
      const rendererList = Object.values(renderers)
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex < rendererList.length) {
        setSelected(tabIndex)
      }
    }
  }, [])

  const rendererList = Object.values(renderers)
  return (
    <Box
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
          p: 0,
          m: 0,
        }}
      >
        <Tabs
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
          }}
          value={selected}
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
            return <Tab sx={{ height: '40px' }} key={index} label={label} />
          })}
        </Tabs>
      </Box>
      <Box ref={boxRef} sx={{ flexGrow: 1, width: '100%' }}>
        {rendererList.map((renderer: Renderer, index: number) => {
          return (
            <NetworkTab
              key={index}
              network={network}
              renderer={renderer}
              isActive={isActive}
              bgColor={bgColor}
              handleClick={handleClick}
              selected={index === selected}
              boxSize={boxSize}
              hasTab={true}
            />
          )
        })}
      </Box>
    </Box>
  )
}
