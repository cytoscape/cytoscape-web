import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material'
import { ReactElement } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { logUi } from '../../../debug'

interface LicenseDialogProps {
  open: boolean
  onClose: () => void
}

export const LicenseDialog = ({
  open,
  onClose,
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
    onClose()
  }

  const handleCopyText = (): void => {
    navigator.clipboard.writeText(LicenseText).catch((err) => {
      logUi.error(`[${handleCopyText.name}]: Failed to copy text: `, err)
    })
  }

  return (
    <CyDialog
      dismiss="lightweight"
      data-testid="license-dialog"
      open={open}
      onClose={handleCloseDialog}
    >
      <DialogTitle>MIT License</DialogTitle>
      <DialogContent>
        <Paper
          variant="filled"
          sx={{
            my: 1,
            p: 2,
            color: (theme) => theme.palette.text.secondary,
          }}
        >
          <Typography variant="body1" gutterBottom>
            Copyright (c) 2024 The Cytoscape Consortium
          </Typography>
          <Typography variant="body1" gutterBottom>
            Permission is hereby granted, free of charge, to any person
            obtaining a copy of this software and associated documentation files
            (the &quot;Software&quot;), to deal in the Software without
            restriction, including without limitation the rights to use, copy,
            modify, merge, publish, distribute, sublicense, and/or sell copies
            of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
          </Typography>
          <Typography variant="body1" gutterBottom>
            The above copyright notice and this permission notice shall be
            included in all copies or substantial portions of the Software.
          </Typography>
          <Typography variant="body1" gutterBottom>
            THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY
            KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
            NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
            BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
            ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
            CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
            SOFTWARE.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: 2,
            }}
          >
            <Button
              data-testid="license-dialog-copy-button"
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyText}
            >
              Copy License
            </Button>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="license-dialog-close-button"
          variant="contained"
          onClick={handleCloseDialog}
        >
          Close
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
