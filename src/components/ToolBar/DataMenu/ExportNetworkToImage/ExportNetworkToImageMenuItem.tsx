import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { ReactElement, useRef, useState } from 'react'
import { BaseMenuProps } from '../../BaseMenuProps'
import { useNetworkSummaryStore } from '../../../../store/NetworkSummaryStore'
import { PdfExportForm } from './PdfExportForm'
import { PngExportForm } from './PngExportForm'
import { SvgExportForm } from './SvgExportForm'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'

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
    <Dialog
      onKeyDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      PaperProps={{
        sx: {
          height: 'auto',
        },
      }}
      fullWidth
      maxWidth="sm"
      open={props.open}
      onClose={props.handleClose}
    >
      <DialogTitle>Export Network To Image</DialogTitle>
      <DialogContent sx={{ pl: 4, pr: 0, pb: 0.5 }}>
        <Box sx={{ display: 'inline' }}>
          <Typography variant="subtitle1" style={{ margin: '5px 0 5px 0' }}>
            File Type
          </Typography>
          <Select
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
        {currentExportForm}
      </DialogContent>
      <DialogActions sx={{ pr: 1 }}>
        <Button color="primary" onClick={props.handleClose}>
          Cancel
        </Button>
        <Button
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
          disabled={loading}
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const ExportImageMenuItem = (props: BaseMenuProps): ReactElement => {
  const [show, setShow] = useState(false)

  const networkIds = useWorkspaceStore((state) => state.workspace.networkIds)
  const menuItem = (
    <MenuItem
      disabled={networkIds.length === 0}
      component="label"
      onClick={() => setShow(true)}
    >
      Network to Image...
    </MenuItem>
  )

  return (
    <>
      {menuItem}
      <ExportImage open={show} handleClose={() => setShow(false)} />
    </>
  )
}
