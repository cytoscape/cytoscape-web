import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { lazy, ReactElement, Suspense, useRef, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'

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

/**
 * Dialog that exports the current network view as a PNG, SVG or PDF file.
 *
 * It renders the live view of `currentNetworkId`, so callers should only open
 * it for the network that is currently displayed.
 */
export const ExportImage = (props: ExportImageProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const currentNetworkName = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId]?.name,
  )
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
      if (fileType === FileTypes.PNG && pngFormRef.current) {
        await pngFormRef.current.save()
      } else if (fileType === FileTypes.PDF && pdfFormRef.current) {
        await pdfFormRef.current.save()
      } else if (fileType === FileTypes.SVG && svgFormRef.current) {
        await svgFormRef.current.save()
      }
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
      <DialogContent sx={{ pl: 4, pr: 0, pb: 0.5 }}>
        <Box sx={{ display: 'inline' }}>
          <Typography variant="subtitle1" style={{ margin: '5px 0 5px 0' }}>
            File Type
          </Typography>
          <Select
            data-testid="export-network-to-image-file-type-select"
            size="small"
            labelId="label"
            value={fileType}
            onChange={handleChange}
          >
            <MenuItem value={'png' as FileType}>PNG</MenuItem>
            <MenuItem value={'svg' as FileType}>SVG</MenuItem>
            <MenuItem value={'pdf' as FileType}>PDF</MenuItem>
          </Select>
          <Typography variant="subtitle1" style={{ margin: '5px 0 5px 0' }}>
            File Name
          </Typography>
          <TextField
            data-testid="export-network-to-image-file-name-input"
            size="small"
            type="text"
            value={fileName}
            onChange={(e) => {
              setFileName(e.target.value)
            }}
            InputLabelProps={{
              shrink: true,
            }}
            sx={{ width: 300 }}
          ></TextField>
        </Box>
        <Suspense fallback={<div>Loading export options...</div>}>
          {currentExportForm}
        </Suspense>
      </DialogContent>
      <DialogActions sx={{ pr: 1 }}>
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
          Confirm
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
