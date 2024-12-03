import {
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material'
import { ReactElement, useState } from 'react'

interface LicenseDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export const LicenseDialog = ({
  open,
  setOpen,
}: LicenseDialogProps): ReactElement => {
  const LicenseText = `
  MIT License
  
  Copyright (c) 2024 The Cytoscape Consortium
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  `

  const handleCloseDialog = (): void => {
    setOpen(false)
  }

  const handleCopyText = (): void => {
    navigator.clipboard.writeText(LicenseText).catch((err) => {
      console.error('Failed to copy text: ', err)
    })
  }

  return (
    <Dialog open={open} onClose={handleCloseDialog}>
      <DialogTitle>License</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          This software is provided under the MIT License, granting you the
          freedom to use, copy, modify, and distribute it for personal or
          commercial purposes.
        </Typography>
        <Typography variant="body1" gutterBottom>
          Click "Copy License" to view or share the full license terms.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} color="primary">
          Close
        </Button>
        <Button
          onClick={handleCopyText}
          sx={{
            color: '#FFFFFF',
            backgroundColor: '#337ab7',
            '&:hover': {
              backgroundColor: '#285a9b',
            },
            '&:disabled': {
              backgroundColor: 'transparent',
            },
          }}
        >
          Copy License
        </Button>
      </DialogActions>
    </Dialog>
  )
}
