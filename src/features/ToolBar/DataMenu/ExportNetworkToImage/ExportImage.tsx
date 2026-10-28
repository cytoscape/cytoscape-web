import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { lazy, ReactElement, Suspense, useRef, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { trackEvent } from '@/data/analytics/trackEvent'
import { logUi } from '@/debug'
import { CITATIONS, shortCitation } from '../../HelpMenu/citations'
import { useCopyCitations } from '../../HelpMenu/useCopyCitations'

// Lazy load export forms - only load when user opens export dialog
const PdfExportForm = lazy(() => import('./PdfExportForm'))
const PngExportForm = lazy(() => import('./PngExportForm'))
const SvgExportForm = lazy(() => import('./SvgExportForm'))

interface ExportImageProps {
  open: boolean
  handleClose: () => void
}

export interface ExportImageFormatProps {
  fileName: string
}

export interface ExportFormRef {
  save: () => Promise<void>
}

const FileTypes = {
  PNG: 'png',
  PDF: 'pdf',
  SVG: 'svg',
} as const

type FileType = (typeof FileTypes)[keyof typeof FileTypes]

const PRIMARY_DOI = CITATIONS[0].bibtex.doi

// Muted so the copy buttons do not compete with Cancel and Confirm.
const citationButtonSx = {
  color: 'text.secondary',
  textTransform: 'none',
  whiteSpace: 'nowrap',
} as const

/**
 * Dialog that exports the current network view as a PNG, SVG or PDF file.
 *
 * It renders the live view of `currentNetworkId`, so callers should only open
 * it for the network that is currently displayed.
 *
 * Its hosts (the Data menu, the summary panel's network menu) keep it mounted
 * and only toggle `open`, so the dialog is re-created (by key) on every open:
 * the file name re-seeds from the network current at that moment, and edits
 * abandoned with Cancel are discarded. The key is stable while closing, so
 * the exit transition still plays.
 */
export const ExportImage = (props: ExportImageProps): ReactElement => {
  const [wasOpen, setWasOpen] = useState(props.open)
  const [formKey, setFormKey] = useState(0)
  if (props.open !== wasOpen) {
    setWasOpen(props.open)
    if (props.open) {
      setFormKey(formKey + 1)
    }
  }

  return <ExportImageContent key={formKey} {...props} />
}

/**
 * The dialog itself. Kept as one component so the Cancel button stays inside
 * the CyDialog block, where the dismissal policy test looks for it.
 */
const ExportImageContent = (props: ExportImageProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const currentNetworkName = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId]?.name,
  )
  const { copyText, copyBibtex } = useCopyCitations()
  const [fileType, setFileType] = useState<FileType>('png')
  const [fileName, setFileName] = useState<string>(
    currentNetworkName ?? 'network',
  )

  const pngFormRef = useRef<ExportFormRef>(null)
  const pdfFormRef = useRef<ExportFormRef>(null)
  const svgFormRef = useRef<ExportFormRef>(null)

  const handleChange = (event: any) => {
    setFileType(event.target.value as FileType)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      // Call the appropriate save function based on file type
      const form = {
        [FileTypes.PNG]: pngFormRef,
        [FileTypes.PDF]: pdfFormRef,
        [FileTypes.SVG]: svgFormRef,
      }[fileType].current
      if (form) {
        await form.save()
        // After the save, so a failed export is not counted.
        trackEvent('image_export', { format: fileType })
      }
    } catch (e) {
      // Logged rather than rethrown: a click handler's rejection has no
      // caller, so it surfaced only as an unhandled rejection.
      logUi.error(`[ExportImage]: Failed to export ${fileType}`, e)
    } finally {
      setLoading(false)
      props.handleClose()
    }
  }

  const imageExportContentMap = {
    png: <PngExportForm ref={pngFormRef} fileName={fileName} />,
    pdf: <PdfExportForm ref={pdfFormRef} fileName={fileName} />,
    svg: <SvgExportForm ref={svgFormRef} fileName={fileName} />,
  }

  const currentExportForm = imageExportContentMap[fileType]

  return (
    <CyDialog
      data-testid="export-network-to-image-dialog"
      PaperProps={{
        sx: {
          height: 'auto',
        },
      }}
      fullWidth
      maxWidth="sm"
      open={props.open}
    >
      <DialogTitle>Export Network To Image</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        {/* Top padding keeps the outlined labels clear of the title. */}
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <FormControl size="small" sx={{ width: 110 }}>
              <InputLabel id="export-image-file-type-label">
                File type
              </InputLabel>
              <Select
                data-testid="export-network-to-image-file-type-select"
                labelId="export-image-file-type-label"
                label="File type"
                value={fileType}
                onChange={handleChange}
              >
                <MenuItem value={'png' as FileType}>PNG</MenuItem>
                <MenuItem value={'svg' as FileType}>SVG</MenuItem>
                <MenuItem value={'pdf' as FileType}>PDF</MenuItem>
              </Select>
            </FormControl>
            <TextField
              data-testid="export-network-to-image-file-name-input"
              size="small"
              type="text"
              label="File name"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value)
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">.{fileType}</InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
          </Box>
          <Suspense fallback={<div>Loading export options...</div>}>
            {currentExportForm}
          </Suspense>
        </Stack>
      </DialogContent>
      {/*
        Static text rather than a post-export notice: export is the step
        before a figure goes into a paper, and a box in a dialog the user
        already opened never interrupts (#883). The reference itself is shown,
        not only a button, so the request reads as a citation rather than a
        footer. The exported file carries the full citation in its metadata
        (citationMetadata.ts).
      */}
      <Box
        data-testid="export-network-to-image-citation"
        // Same 24px gutter as the title, content and actions. Outside
        // DialogContent so the box never scrolls out of view.
        sx={{ px: 3, pt: 1.5 }}
      >
        {/* Outlined and in body text so it never outweighs Confirm. */}
        <Alert
          severity="info"
          variant="outlined"
          icon={<FormatQuoteIcon fontSize="small" />}
          sx={{ py: 0.25, color: 'text.primary' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Publishing this figure? Please cite Cytoscape Web:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {shortCitation()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Link
              data-testid="export-network-to-image-citation-doi"
              variant="body2"
              href={`https://doi.org/${PRIMARY_DOI}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mr: 'auto' }}
            >
              doi:{PRIMARY_DOI}
            </Link>
            <Button
              data-testid="export-network-to-image-copy-citation-button"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={copyText}
              sx={citationButtonSx}
            >
              Citation
            </Button>
            <Button
              data-testid="export-network-to-image-copy-bibtex-button"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={copyBibtex}
              sx={citationButtonSx}
            >
              BibTeX
            </Button>
          </Box>
        </Alert>
      </Box>
      <DialogActions sx={{ px: 3, pt: 1.5, pb: 2 }}>
        <Button
          data-testid="export-network-to-image-cancel-button"
          variant="outlined"
          color="primary"
          onClick={props.handleClose}
        >
          Cancel
        </Button>
        <Button
          data-testid="export-network-to-image-confirm-button"
          variant="contained"
          disabled={loading}
          onClick={handleConfirm}
        >
          Export {fileType.toUpperCase()}
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
