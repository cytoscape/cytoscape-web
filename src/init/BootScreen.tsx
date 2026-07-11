import { Box, CircularProgress, Typography } from '@mui/material'
import React from 'react'
import cytoscapeLogo from '../assets/cytoscape.svg'

export declare const REACT_APP_VERSION: string
export declare const REACT_APP_BUILD_TIME: string

export const BootScreen = ({
  loadingMessage,
}: {
  loadingMessage: string
}) => {
  const version =
    typeof REACT_APP_VERSION !== 'undefined' ? REACT_APP_VERSION : 'Unknown'
  
  let buildTime =
    typeof REACT_APP_BUILD_TIME !== 'undefined'
      ? REACT_APP_BUILD_TIME
      : 'Unknown'

  if (buildTime !== 'Unknown') {
    try {
      buildTime = new Date(buildTime).toLocaleString()
    } catch {
      // Keep raw string if parse fails
    }
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif",
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: '10px', md: '20px' },
          flexDirection: { xs: 'column', md: 'row' },
          color: '#495057',
          maxWidth: '90%',
          px: '20px',
        }}
      >
        <Box
          sx={{
            width: { xs: '300px', md: '330px' },
            height: { xs: '300px', md: '330px' },
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src={cytoscapeLogo}
            alt="Cytoscape Logo"
            style={{ width: '100%', height: '100%' }}
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'center',
            width: { xs: '280px', md: '400px' },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 600,
              mb: '15px',
              letterSpacing: '2px',
              height: { xs: '2rem', md: '4rem' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Cytoscape Web
          </Typography>
          <Box sx={{ mb: '20px', textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: '1.5rem',
                color: '#ea9123',
                height: '2.5rem',
                fontWeight: 500,
                mb: '5px',
              }}
            >
              Version {version}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '0.8rem', md: '0.9rem' },
                color: '#666666',
                margin: 0,
                fontWeight: 300,
                opacity: 0.8,
              }}
            >
              Built on: {buildTime}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              mb: { xs: '30px', md: '40px' },
              height: { xs: '1.8rem', md: '2rem' },
            }}
          >
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.2rem' },
                opacity: 0.9,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: { xs: '220px', md: '320px' },
              }}
            >
              {loadingMessage}
            </Typography>
            <CircularProgress size={24} sx={{ color: '#495057' }} />
          </Box>
        </Box>
      </Box>
      <Typography
        sx={{
          mt: '3rem',
          fontSize: '1rem',
          color: '#444444',
          opacity: 0.9,
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Initial loading may take some time
      </Typography>
    </Box>
  )
}
