import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getHistoryInfo } from '../store/hooks/useUrlNavigation/url-manager'

interface HistoryState {
  browserHistoryLength: number
  internalHistoryLength: number
  currentInternalIndex: number
  canGoBack: boolean
  canGoForward: boolean
  navigationCount: number
  currentPath: string
  currentSearch: string
}

/**
 * Custom hook to monitor React Router and browser history state
 */
export const useHistoryMonitor = (): HistoryState => {
  const location = useLocation()
  const [historyState, setHistoryState] = useState<HistoryState>(() => {
    const info = getHistoryInfo()
    return {
      browserHistoryLength: info.browserHistoryLength,
      internalHistoryLength: info.internalHistoryLength,
      currentInternalIndex: info.currentInternalIndex,
      canGoBack: info.canGoBack,
      canGoForward: info.canGoForward,
      navigationCount: info.navigationCount,
      currentPath: location.pathname,
      currentSearch: location.search,
    }
  })

  useEffect(() => {
    const updateHistoryState = () => {
      const info = getHistoryInfo()
      setHistoryState({
        browserHistoryLength: info.browserHistoryLength,
        internalHistoryLength: info.internalHistoryLength,
        currentInternalIndex: info.currentInternalIndex,
        canGoBack: info.canGoBack,
        canGoForward: info.canGoForward,
        navigationCount: info.navigationCount,
        currentPath: location.pathname,
        currentSearch: location.search,
      })
    }

    // Update on location change
    updateHistoryState()

    // Listen for popstate events (back/forward navigation)
    const handlePopState = () => {
      setTimeout(updateHistoryState, 0) // Slight delay to ensure state is updated
    }

    window.addEventListener('popstate', handlePopState)

    // Also listen for custom navigation events from url-manager
    const handleCustomNavigation = () => {
      setTimeout(updateHistoryState, 0)
    }

    // You can dispatch custom events from url-manager if needed
    window.addEventListener('navigationStateChanged', handleCustomNavigation)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener(
        'navigationStateChanged',
        handleCustomNavigation,
      )
    }
  }, [location])

  return historyState
}
