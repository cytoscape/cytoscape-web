import { MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'

export const CitationMenuItem = (props: BaseMenuProps): ReactElement => {
  const [open, setOpen] = useState(false)
  const citationText = "Shannon P, Markiel A, Ozier O, Baliga NS, Wang JT, Ramage D, Amin N, Schwikowski B, Ideker T. Cytoscape: a software environment for integrated models of biomolecular interaction networks. Genome Res, 13:11 (2498-504). 2003 Nov. PubMed ID: 14597658."

  const handleOpenDialog = (): void => {
    setOpen(true)
  }

  const handleCloseDialog = (): void => {
    setOpen(false)
    props.handleClose()
  }

  const handleCopyText = (): void => {
    navigator.clipboard.writeText(citationText)
      .then(() => {
        alert('Citation copied to clipboard!')
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err)
      })
  }

  return (
    <>
      <MenuItem onClick={handleOpenDialog}>
        Citation
      </MenuItem>
      <Dialog open={open} onClose={handleCloseDialog}>
        <DialogTitle>Cite Cytoscape Web</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {citationText}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCopyText} color="primary">
            Copy Citation
          </Button>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
