import React from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

interface EmailVerificationModalProps {
  onVerify: () => void
  onCancel: () => void
  userName: string
  userEmail: string
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  onVerify,
  onCancel,
  userName,
  userEmail,
}) => {
  return (
    <Dialog
      open={true}
      aria-labelledby="email-verification-title"
      aria-describedby="email-verification-description"
    >
      <DialogTitle id="email-verification-title">
        {'Email Verification Required' +
          (userName ? ' for User: ' + userName : '')}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          id="email-verification-description-1"
          sx={{
            display: 'block',
            width: '100%',
            textAlign: 'justify',
            marginBottom: 1,
          }}
        >
          {'Please check the email address ' +
            (userEmail ? userEmail : 'associated with your username') +
            ' to verify your account.'}
        </DialogContentText>
        <DialogContentText
          id="email-verification-description-2"
          sx={{ display: 'block', width: '100%', textAlign: 'justify' }}
        >
          Refresh the page once verified. Alternatively, logout and browse
          Cytoscape-Web as a anonymous user.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onVerify} color="primary">
          Already Verified
        </Button>
        <Button onClick={onCancel} color="error">
          Log Out
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EmailVerificationModal
