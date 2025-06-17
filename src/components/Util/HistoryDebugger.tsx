import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Paper, Divider } from '@mui/material'
import {
  clearBrowserHistory,
  clearInternalHistory,
  resetNavigationToRoot,
  getHistoryInfo,
} from '../../store/hooks/useUrlNavigation/url-manager'

export const HistoryDebugger = (): JSX.Element => {
  const [historyLength, setHistoryLength] = useState(window.history.length)
  const [navigationCount, setNavigationCount] = useState(0)
  const [internalHistoryLength, setInternalHistoryLength] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  // Update history length whenever location changes
  useEffect(() => {
    setHistoryLength(window.history.length)
    setNavigationCount((prev) => prev + 1)

    // Update internal history length
    const historyInfo = getHistoryInfo()
    setInternalHistoryLength(historyInfo.internalHistoryLength)
  }, [location])

  // Listen for popstate events (back/forward button presses)
  useEffect(() => {
    const handlePopState = () => {
      setHistoryLength(window.history.length)
      console.log('PopState event - History length:', window.history.length)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const canGoBack = window.history.length > 1

  const handleClearBrowserHistory = () => {
    const success = clearBrowserHistory()
    if (success) {
      setHistoryLength(window.history.length)
      console.log('Browser history cleared')
    }
  }

  const handleClearInternalHistory = () => {
    clearInternalHistory()
    setInternalHistoryLength(0)
    console.log('Internal history cleared')
  }

  const handleResetToRoot = () => {
    resetNavigationToRoot()
    setHistoryLength(window.history.length)
    setInternalHistoryLength(0)
    console.log('Navigation reset to root')
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 10,
        right: 10,
        p: 2,
        zIndex: 9999,
        minWidth: 280,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <Typography variant="h6" gutterBottom>
        History Debug Info
      </Typography>

      <Typography variant="body2">
        <strong>Browser History Length:</strong> {historyLength}
      </Typography>

      <Typography variant="body2">
        <strong>Internal History Length:</strong> {internalHistoryLength}
      </Typography>

      <Typography variant="body2">
        <strong>Navigation Count:</strong> {navigationCount}
      </Typography>

      <Typography variant="body2">
        <strong>Current Path:</strong> {location.pathname}
      </Typography>

      <Typography variant="body2">
        <strong>Can Go Back:</strong> {canGoBack ? 'Yes' : 'No'}
      </Typography>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexDirection: 'column' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(-1)}
          disabled={!canGoBack}
        >
          Go Back
        </Button>

        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const historyInfo = getHistoryInfo()
            console.log('Current history state:', historyInfo)
          }}
        >
          Log History Info
        </Button>

        <Button
          size="small"
          variant="outlined"
          color="warning"
          onClick={handleClearBrowserHistory}
        >
          Clear Browser History
        </Button>

        <Button
          size="small"
          variant="outlined"
          color="secondary"
          onClick={handleClearInternalHistory}
        >
          Clear Internal History
        </Button>

        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={handleResetToRoot}
        >
          Reset to Root
        </Button>
      </Box>
    </Paper>
  )
}
