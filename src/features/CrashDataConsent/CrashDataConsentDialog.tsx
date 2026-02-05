/**
 * Crash Data Consent Dialog
 *
 * One-time dialog to inform users about crash data collection.
 * Opt-out model: Data collection is enabled by default, users can decline if they choose.
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material'
import React from 'react'
import { useCrashDataConsent } from '../../data/hooks/useCrashDataConsent'

interface CrashDataConsentDialogProps {
  open: boolean
  onClose: () => void
}

export const CrashDataConsentDialog: React.FC<CrashDataConsentDialogProps> = ({
  open,
  onClose,
}) => {
  const { accept, decline } = useCrashDataConsent()

  // In opt-out model, closing the dialog without action means consent is granted
  const handleClose = () => {
    accept() // Auto-accept on close (opt-out behavior)
    onClose()
  }

  const handleDecline = () => {
    decline()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Help Improve Cytoscape Web</DialogTitle>
      <DialogContent>
        <Typography variant="body1" paragraph>
          Cytoscape Web collects crash data to help us improve the application.
          When an error occurs, we automatically send a diagnostic report
          (including database snapshot) to our servers to help us debug the
          issue.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Data collection is enabled by default.</strong> All reports
          are sent anonymously and help us identify and fix bugs faster. You can
          opt out at any time using the button below.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" component="div">
            <strong>What we collect:</strong>
            <ul style={{ marginTop: '8px', marginBottom: '8px' }}>
              <li>Error message and stack trace</li>
              <li>Database snapshot (or partial snapshot if too large)</li>
              <li>Browser and system information</li>
            </ul>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDecline} color="inherit">
          Opt Out
        </Button>
        <Button onClick={handleClose} variant="contained" color="primary">
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  )
}

