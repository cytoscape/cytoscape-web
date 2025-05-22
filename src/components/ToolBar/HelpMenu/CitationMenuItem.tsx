import {
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Link,
} from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const CitationMenuItem = (props: BaseMenuProps): ReactElement => {
  const [open, setOpen] = useState(false)

  const citationOne =
    'Ono K, Fong D, Gao C, Churas C, Pillich R, Lenkiewicz J, Pratt D, Pico AR, Hanspers K, Xin Y, Morris J, Kucera M, Franz M, Lopes C, Bader G, Ideker T, Chen J. Cytoscape Web: bringing network biology to the browser. Nucleic Acids Res. 2025 May 1:gkaf365. doi: 10.1093/nar/gkaf365. Epub ahead of print. PMID: 40308211.'
  
  const handleOpenDialog = (): void => {
    setOpen(true)
  }

  const handleCloseDialog = (): void => {
    setOpen(false)
    props.handleClose()
  }

  const handleCopyText = (text: string): void => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error('Failed to copy text: ', err)
    })
  }

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>Citation</MenuItem>
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Citations</DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <Typography variant="body1" gutterBottom>
              {citationOne.split('doi: ')[0]}
              <Link
                href="https://academic.oup.com/nar/advance-article/doi/10.1093/nar/gkaf365/8123447"
                target="_blank"
                rel="noopener"
              >
                doi: 10.1093/nar/gkaf365
              </Link>
              . PMID:{' '}
              <Link
                href="https://pubmed.ncbi.nlm.nih.gov/40308211/"
                target="_blank"
                rel="noopener"
              >
                40308211
              </Link>
              .
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleCopyText(citationOne)}
            >
              Copy Citation
            </Button>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
