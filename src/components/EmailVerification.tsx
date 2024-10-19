import React from 'react'
import { Modal, Box, Button, Typography } from '@mui/material'

interface EmailVerificationModalProps {
  open: boolean
  onVerify: () => void
  onCancel: () => void
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  open,
  onVerify,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      aria-labelledby="email-verification-modal"
      aria-describedby="email-verification-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography id="email-verification-modal" variant="h6" component="h2">
          Email Verification Required0
        </Typography>
        <Typography id="email-verification-description" sx={{ mt: 2 }}>
          Your email is not verified. Please verify your email or log out.
        </Typography>
        <Box mt={3}>
          <Button variant="contained" onClick={onVerify} sx={{ mr: 2 }}>
            Already Verified
          </Button>
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

export default EmailVerificationModal
