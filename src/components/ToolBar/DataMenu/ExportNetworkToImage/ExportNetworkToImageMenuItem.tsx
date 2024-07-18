import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
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
}

type FileType = 'png' | 'pdf' | 'svg'
export const ExportImage = (props: ExportImageProps): ReactElement => {
  const [fileType, setFileType] = useState<FileType>('png')

  const handleChange = (event: any) => {
    setFileType(event.target.value as 'png' | 'pdf' | 'svg')
  }

  const imageExportContentMap = {
    png: <PngExportForm handleClose={props.handleClose} />,
    pdf: <PdfExportForm handleClose={props.handleClose} />,
    svg: <SvgExportForm handleClose={props.handleClose} />,
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
          minHeight: 300,
        },
      }}
      fullWidth
      maxWidth="sm"
      open={props.open}
      onClose={props.handleClose}
    >
      <DialogTitle>Export Network To Image</DialogTitle>
      <DialogContent sx={{ mb: 1 }}>
        <Box sx={{ display: 'inline' }}>
          <Box>File Type</Box>
          <Select
            size="small"
            labelId="label"
            value={fileType}
            label="File type"
            onChange={handleChange}
          >
            <MenuItem value={'png' as FileType}>PNG</MenuItem>
            <MenuItem value={'svg' as FileType}>SVG</MenuItem>
            <MenuItem value={'pdf' as FileType}>PDF</MenuItem>
          </Select>
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
