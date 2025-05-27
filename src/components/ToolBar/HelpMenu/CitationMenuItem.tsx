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
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Example icon
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
import { useMessageStore } from '../../../store/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'


export const CitationMenuItem = (props: BaseMenuProps): ReactElement => {
  const [openDialog, setOpenDialog] = useState(false)

  const addMessage = useMessageStore((state) => state.addMessage)

  const citationOneFull =
    'Ono K, Fong D, Gao C, Churas C, Pillich R, Lenkiewicz J, Pratt D, Pico AR, Hanspers K, Xin Y, Morris J, Kucera M, Franz M, Lopes C, Bader G, Ideker T, Chen J. Cytoscape Web: bringing network biology to the browser. Nucleic Acids Research, gkaf365. 1 May. 2025, doi: 10.1093/nar/gkaf365. PMID: 40308211.'
  const citationTwoFull =
    'Shannon P, Markiel A, Ozier O, Baliga NS, Wang JT, Ramage D, Amin N, Schwikowski B, Ideker T. Cytoscape: a software environment for integrated models of biomolecular interaction networks. Genome Res, 13:11 (2498-504). 2003 Nov. PMID: 14597658.'

  // --- Parts for Citation One ---
  const journalNameToItalicize = "Nucleic Acids Research"; // Updated full name
  const doiLinkText = "doi: 10.1093/nar/gkaf365";
  const doiUrl = "https://academic.oup.com/nar/advance-article/doi/10.1093/nar/gkaf365/8123447";
  const pmidTextOne = "40308211";
  const pmidUrlOne = "https://pubmed.ncbi.nlm.nih.gov/40308211/";

  // 1. Part before the journal name
  const citationOnePart1 = citationOneFull.substring(0, citationOneFull.indexOf(journalNameToItalicize));

  // 2. Part after journal name, before DOI link
  const textAfterJournalBeforeDoi = citationOneFull.substring(
    citationOneFull.indexOf(journalNameToItalicize) + journalNameToItalicize.length,
    citationOneFull.indexOf(doiLinkText)
  );

  // 3. Part after DOI link, before PMID
  const textAfterDoiBeforePmid = citationOneFull.substring(
    citationOneFull.indexOf(doiLinkText) + doiLinkText.length,
    citationOneFull.indexOf(pmidTextOne)
  );

  // 4. Part after PMID
  const textAfterPmidOne = citationOneFull.substring(
    citationOneFull.indexOf(pmidTextOne) + pmidTextOne.length
  );
  // --- End Parts for Citation One ---

  // --- Parts for Citation Two ---
  const pmidTextTwo = "14597658";
  const pmidUrlTwo = "https://pubmed.ncbi.nlm.nih.gov/14597658/";
  const citationTwoPart1 = citationTwoFull.substring(0, citationTwoFull.indexOf(pmidTextTwo));
  const citationTwoPart2 = citationTwoFull.substring(citationTwoFull.indexOf(pmidTextTwo) + pmidTextTwo.length);
  // --- End Parts for Citation Two ---


  const handleOpenDialog = (): void => {
    setOpenDialog(true)
  }

  const handleCloseDialog = (): void => {
    setOpenDialog(false)
    props.handleClose()
  }

  const handleCopyAllCitations = (): void => {
    const allCitations = `${citationOneFull}\n\n${citationTwoFull}` // Use full citation strings
    navigator.clipboard.writeText(allCitations)
      .then(() => {
        setSnackbarOpen(true) // Show success feedback
        addMessage({
          message: 'Citation copied to clipboard!',
          duration: 3000,
          severity: MessageSeverity.INFO
        })
      })
      .catch((err) => {
        console.error('Failed to copy citations: ', err)
        // Optionally, show an error Snackbar here
      })
  }


  return (
    <>
      <MenuItem onClick={handleOpenDialog}>Citation</MenuItem>
     <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Citations
            </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={3}>
            <Typography variant="body1" gutterBottom component="div">
              {citationOnePart1}
              <Typography component="span" sx={{ fontStyle: 'italic' }}>
                {journalNameToItalicize}
              </Typography>
              {textAfterJournalBeforeDoi}
              <Link
                href={doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 'medium' }}
              >
                {doiLinkText}
              </Link>
              {textAfterDoiBeforePmid}
              <Link
                href={pmidUrlOne}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 'medium' }}
              >
                {pmidTextOne}
              </Link>
              {textAfterPmidOne}
            </Typography>
          </Box>

          <Box mb={3}>
            <Typography variant="body1" gutterBottom component="div">
              {citationTwoPart1}
              <Link
                href={pmidUrlTwo}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 'medium' }}
              >
                {pmidTextTwo}
              </Link>
              {citationTwoPart2}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb:1 }}>
            <Button
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyAllCitations}
            >
              Copy Both Citations
            </Button>
          </Box>

        </DialogContent>

        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button onClick={handleCloseDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
