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
//@ts-expect-error
import { saveAs } from 'file-saver'

import { useRendererStore } from '../../../../store/RendererStore'
import { Renderer } from '../../../../models/RendererModel/Renderer'
import { useRendererFunctionStore } from '../../../../store/RendererFunctionStore'
import { PdfExportForm } from './PdfExportForm'
import { PngExportForm } from './PngExportForm'
import { SvgExportForm } from './SvgExportForm'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'

interface ExportImageProps {
  open: boolean
  handleClose: () => void
}

export interface ExportImageFormatProps {
  handleClose: () => void
  fileName: string
}

type FileType = 'png' | 'pdf' | 'svg'
export const ExportImage = (props: ExportImageProps): ReactElement => {
  const [fileType, setFileType] = useState<FileType>('png')
  const [fileName, setFileName] = useState<string>('network')
  const handleChange = (event: any) => {
    setFileType(event.target.value as 'png' | 'pdf' | 'svg')
  }

  const imageExportContentMap = {
    png: <PngExportForm handleClose={props.handleClose} fileName={fileName} />,
    pdf: <PdfExportForm handleClose={props.handleClose} fileName={fileName} />,
    svg: <SvgExportForm handleClose={props.handleClose} fileName={fileName} />,
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
          ></TextField>
        </Box>
        {currentExportForm}
      </DialogContent>
    </Dialog>
  )
}

export const ExportImageMenuItem = (props: BaseMenuProps): ReactElement => {
  const [show, setShow] = useState(false)

  const workspace = useWorkspaceStore((state) => state.workspace)
  const menuItem = (
    <MenuItem
      disabled={workspace.networkIds.length === 0}
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
