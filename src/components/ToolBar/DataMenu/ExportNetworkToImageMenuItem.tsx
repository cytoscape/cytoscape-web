import { Button, Dialog, MenuItem } from '@mui/material'
import { ReactElement, useRef, useState } from 'react'
import { BaseMenuProps } from '../BaseMenuProps'
//@ts-expect-error
import { saveAs } from 'file-saver'

import { useRendererStore } from '../../../store/RendererStore'
import { Renderer } from '../../../models/RendererModel/Renderer'
import { useRendererFunctionStore } from '../../../store/RendererFunctionStore'

interface ExportImageProps {
  open: boolean
  handleClose: () => void
}
export const ExportImage = (props: ExportImageProps): ReactElement => {
  const renderers: Record<string, Renderer> = useRendererStore(
    (state) => state.renderers,
  )

  const pngFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportPng'),
  )
  const pdfFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportPdf'),
  )
  const svgFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportSvg'),
  )

  console.log(renderers)

  return (
    <Dialog
      onKeyDown={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      PaperProps={{
        sx: {
          minHeight: 600,
        },
      }}
      fullWidth={true}
      maxWidth="lg"
      open={props.open}
      onClose={props.handleClose}
    >
      <Button
        onClick={() => {
          saveAs(pngFunction?.(), 'test.png')
        }}
      >
        Export to PNG
      </Button>
      <Button
        onClick={async () => {
          const result = await pdfFunction?.()
          console.log(pdfFunction)
          console.log(result)
          saveAs(result, 'test.pdf')
        }}
      >
        Export to PDF
      </Button>
      <Button
        onClick={async () => {
          const result = await svgFunction?.()
          console.log(svgFunction)
          console.log(result)
          saveAs(result, 'test.svg')
        }}
      >
        Export to PDF
      </Button>
    </Dialog>
  )
}

export const ExportImageMenuItem = (props: BaseMenuProps): ReactElement => {
  const [show, setShow] = useState(false)

  const menuItem = (
    <MenuItem component="label" onClick={() => setShow(true)}>
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
