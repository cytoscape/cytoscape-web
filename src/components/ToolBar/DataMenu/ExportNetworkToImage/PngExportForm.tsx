import {
  Box,
  Button,
  Checkbox,
  DialogActions,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
} from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
//@ts-expect-error
import { saveAs } from 'file-saver'
import { useRendererFunctionStore } from '../../../../store/RendererFunctionStore'
import { ExportImageFormatProps } from './ExportNetworkToImageMenuItem'

const MIN_ZOOM = 0
const MAX_ZOOM = 5

export const PngExportForm = (props: ExportImageFormatProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string>('network')
  const [transparentBg, setTransparentBg] = useState(true)
  const [fullBg, setFullBg] = useState(true)
  const [customWidth, setCustomWidth] = useState<number>(0)
  const [customHeight, setCustomHeight] = useState<number>(0)
  const [zoom, setZoom] = useState<number>(2)

  const pngFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportPng'),
  )
  const widthFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'width'),
  )
  const heightFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'height'),
  )

  const maxHeight = heightFunction?.() * MAX_ZOOM
  const maxWidth = widthFunction?.() * MAX_ZOOM

  useEffect(() => {
    if (widthFunction && heightFunction) {
      setCustomWidth(Math.round(widthFunction() * zoom))
      setCustomHeight(Math.round(heightFunction() * zoom))
    }
  }, [])

  // when zoom changes, update the width and height to the corresponding value
  const handleZoomChange = (e: any) => {
    setZoom(e.target.value)
    setCustomWidth(Math.round((widthFunction?.() ?? 0) * e.target.value))
    setCustomHeight(Math.round((heightFunction?.() ?? 0) * e.target.value))
  }

  const handleWidthChange = (e: any) => {
    const newWidth = Math.round(
      Math.max(0, Math.min(Number(e.target.value), maxWidth)),
    )
    const newZoom = Math.round(
      Math.min(newWidth / (widthFunction?.() ?? 1), MAX_ZOOM),
    )
    const newHeight = Math.round((heightFunction?.() ?? 0) * newZoom)

    setCustomWidth(newWidth)
    setCustomHeight(newHeight)
    setZoom(newZoom)
  }

  const handleHeightChange = (e: any) => {
    const newHeight = Math.round(
      Math.max(0, Math.min(Number(e.target.value), maxHeight)),
    )
    const newZoom = Math.round(
      Math.min(newHeight / (heightFunction?.() ?? 1), MAX_ZOOM),
    )
    const newWidth = Math.round((widthFunction?.() ?? 0) * newZoom)

    setCustomHeight(newHeight)
    setCustomWidth(newWidth)
    setZoom(newZoom)
  }
  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ p: 1 }}>
        <TextField
          size="small"
          label="File name"
          type="text"
          value={fileName}
          onChange={(e) => {
            console.log(e.target.value)
            setFileName(e.target.value)
          }}
          InputLabelProps={{
            shrink: true,
          }}
        ></TextField>
      </Box>
      <Box sx={{ p: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={fullBg}
              onChange={(e) => setFullBg(e.target.checked)}
            />
          }
          label="Export full network image"
        />
      </Box>
      <Box sx={{ p: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
            />
          }
          label="Transparent background"
        />
      </Box>
      <Box>
        <Box sx={{ p: 1 }}>
          <TextField
            size="small"
            sx={{ mr: 1 }}
            label="Custom Width"
            onChange={handleWidthChange}
            value={customWidth}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            size="small"
            label="Custom Height"
            onChange={handleHeightChange}
            value={customHeight}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
        <Box sx={{ p: 1 }}>
          <Box>Zoom</Box>
          <Slider
            value={zoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            valueLabelDisplay="auto"
            onChange={(e: any) => handleZoomChange(e)}
            marks={[
              {
                value: MIN_ZOOM,
                label: '0%',
              },
              {
                value: 1,
                label: '100%',
              },
              {
                value: 2,
                label: '200%',
              },
              {
                value: 3,
                label: '300%',
              },
              {
                value: 4,
                label: '400%',
              },
              {
                value: MAX_ZOOM,
                label: '500%',
              },
            ]}
          />
        </Box>
      </Box>
      <DialogActions>
        <Button color="error" onClick={props.handleClose}>
          Cancel
        </Button>
        <Button
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            const result = await pngFunction?.(
              fullBg,
              customWidth,
              customHeight,
              transparentBg,
            )
            saveAs(result, `${fileName}.png`)
            setLoading(false)
            props.handleClose()
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Box>
  )
}
