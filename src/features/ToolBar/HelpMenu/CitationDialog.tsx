import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  Button,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Typography,
} from '@mui/material'
import { ReactElement } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { DialogCloseButton } from '@/components/DialogCloseButton'
import { CITATIONS, type CitationData } from './citations'
import { useCopyCitations } from './useCopyCitations'

const CitationText = ({
  citation,
}: {
  citation: CitationData
}): ReactElement => (
  <Typography variant="body1" color="textSecondary" component="div">
    {citation.authors} {citation.title}
    {citation.journal && (
      <Typography component="span" sx={{ fontStyle: 'italic' }}>
        {citation.journal}
      </Typography>
    )}
    {citation.details}
    {citation.doi && (
      <Link
        href={citation.doi.url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ fontWeight: 'medium' }}
      >
        {citation.doi.text}
      </Link>
    )}
    {citation.doi && '. PMID: '}
    <Link
      href={citation.pmid.url}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ fontWeight: 'medium' }}
    >
      {citation.pmid.id}
    </Link>
    {!citation.doi && '.'}
  </Typography>
)

interface CitationDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Help > Citation. Owned by `HelpMenu`, not by the menu row, so it outlives
 * the menu that opened it (see `LicenseDialog`).
 */
export const CitationDialog = ({
  open,
  onClose,
}: CitationDialogProps): ReactElement => {
  const { copyText, copyBibtex } = useCopyCitations()

  return (
    <CyDialog data-testid="citation-dialog" open={open} maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>Citations</DialogTitle>
      <DialogCloseButton
        data-testid="citation-dialog-close-button"
        onClose={onClose}
      />
      <DialogContent>
        <Paper
          variant="filled"
          sx={{
            my: 1,
            p: 2,
          }}
        >
          {CITATIONS.map((citation, index) => (
            <Box key={index} mb={3}>
              <CitationText citation={citation} />
            </Box>
          ))}
          <Box
            sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}
          >
            <Button
              data-testid="citation-dialog-copy-text-button"
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={copyText}
            >
              Copy Both Citations
            </Button>
            <Button
              data-testid="citation-dialog-copy-bibtex-button"
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={copyBibtex}
            >
              Copy BibTeX
            </Button>
          </Box>
        </Paper>
      </DialogContent>
    </CyDialog>
  )
}
