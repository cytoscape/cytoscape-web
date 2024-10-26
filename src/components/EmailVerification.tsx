import React from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface EmailVerificationModalProps {
  open: boolean
  onVerify: () => void
  onCancel: () => void
  userName: string
  userEmail: string
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  open,
  onVerify,
  onCancel,
  userName,
  userEmail,
}) => {
  return (
    <Dialog
      open={open}
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
          Refresh the page once verified. Alternatively, logout and browse NDEx
          as a anonymous user.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onVerify}>Already Verified</Button>
        <Button onClick={onCancel}>Log Out</Button>
      </DialogActions>
    </Dialog>
  )
}

export default EmailVerificationModal
