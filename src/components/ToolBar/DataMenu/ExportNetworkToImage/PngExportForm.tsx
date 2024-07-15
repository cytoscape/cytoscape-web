import {
  Box,
  Button,
  Checkbox,
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

export const PngExportForm = (props: ExportImageFormatProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState<string>('network.png')
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

  useEffect(() => {
    if (widthFunction && heightFunction) {
      setCustomWidth(widthFunction() * zoom)
      setCustomHeight(heightFunction() * zoom)
    }
  }, [])

  // when zoom changes, update the width and height to the corresponding value
  const handleZoomChange = (e: any) => {
    setZoom(e.target.value)
    setCustomWidth((widthFunction?.() ?? 0) * e.target.value)
    setCustomHeight((heightFunction?.() ?? 0) * e.target.value)
  }
  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ p: 1 }}>
        <TextField
          disabled
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
      <Box>
        <Box sx={{ p: 1 }}>
          <TextField
            size="small"
            sx={{ mr: 1 }}
            id="outlined-number"
            label="Custom Width"
            type="number"
            onChange={(e) => setCustomWidth(Number(e.target.value))}
            value={customWidth}
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            size="small"
            id="outlined-number"
            label="Custom Height"
            type="number"
            onChange={(e) => setCustomHeight(Number(e.target.value))}
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
            min={0}
            max={5}
            step={0.1}
            valueLabelDisplay="auto"
            onChange={(e: any) => handleZoomChange(e)}
            marks={[
              {
                value: 0,
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
                value: 5,
                label: '500%',
              },
            ]}
          />
        </Box>
      </Box>
      <Button color="error" onClick={props.handleClose}>
        Cancel
      </Button>
      <Button
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          const result = await pngFunction?.()
          saveAs(result, 'network.png')
          setLoading(false)
          props.handleClose()
        }}
      >
        Confirm
      </Button>
    </Box>
  )
}
