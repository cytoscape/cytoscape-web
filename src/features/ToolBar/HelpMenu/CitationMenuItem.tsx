import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Typography,
} from '@mui/material'
import { ReactElement, useMemo, useState } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { logUi } from '../../../debug'
import { MessageSeverity } from '../../../models/MessageModel'
import { BaseMenuItemProps } from '../BaseMenuItemProps'
import { DropdownMenuItem } from '../DropdownMenu'


interface CitationData {
  authors: string
  title: string
  journal?: string
  details: string
  doi?: {
    text: string
    url: string
  }
  pmid: {
    id: string
    url: string
  }
}

const CITATIONS: CitationData[] = [
  {
    authors:
      'Ono K, Fong D, Gao C, Churas C, Pillich R, Lenkiewicz J, Pratt D, Pico AR, Hanspers K, Xin Y, Morris J, Kucera M, Franz M, Lopes C, Bader G, Ideker T, Chen J.',
    title: 'Cytoscape Web: bringing network biology to the browser.',
    journal: 'Nucleic Acids Research',
    details: ', gkaf365. 1 May. 2025, ',
    doi: {
      text: 'doi: 10.1093/nar/gkaf365',
      url: 'https://academic.oup.com/nar/advance-article/doi/10.1093/nar/gkaf365/8123447',
    },
    pmid: {
      id: '40308211',
      url: 'https://pubmed.ncbi.nlm.nih.gov/40308211/',
    },
  },
  {
    authors:
      'Shannon P, Markiel A, Ozier O, Baliga NS, Wang JT, Ramage D, Amin N, Schwikowski B, Ideker T.',
    title:
      'Cytoscape: a software environment for integrated models of biomolecular interaction networks.',
    journal: 'Genome Res',
    details: ', 13:11 (2498-504). 2003 Nov. PMID: ',
    pmid: {
      id: '14597658',
      url: 'https://pubmed.ncbi.nlm.nih.gov/14597658/',
    },
  },
]

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

export const CitationMenuItem = (props: BaseMenuItemProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState(false)
  const addMessage = useMessageStore((state) => state.addMessage)

  const fullCitationsText = useMemo(() => {
    return CITATIONS.map((citation) => {
      let text = `${citation.authors} ${citation.title}`
      if (citation.journal) {
        text += ` ${citation.journal}`
      }
      text += citation.details
      if (citation.doi) {
        text += `${citation.doi.text}. PMID: `
      }
      text += `${citation.pmid.id}.`
      return text
    }).join('\n\n')
  }, [])

  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.onClick()
  }

  const handleCopyAllCitations = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(fullCitationsText)
      addMessage({
        message: 'Citation copied to clipboard!',
        duration: 3000,
        severity: MessageSeverity.INFO,
      })
    } catch (err) {
      logUi.error(
        `[${handleCopyAllCitations.name}]: Failed to copy citations: `,
        err,
      )
      addMessage({
        message: 'Failed to copy citations',
        duration: 3000,
        severity: MessageSeverity.ERROR,
      })
    }
  }

  return (
    <>
      <DropdownMenuItem
        label="Citation"
        icon={<FormatQuoteIcon />}
        onClick={handleOpenDialog}
      />
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            Citations
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pb: 0 }}>
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
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyAllCitations}
              >
                Copy Both Citations
              </Button>
            </Box>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ m: 0, padding: (theme) => theme.spacing(2, 3) }}>
          <Button variant="contained" onClick={handleCloseDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
