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
  Typography,
} from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'
//@ts-expect-error
import { saveAs } from 'file-saver'
import { useRendererFunctionStore } from '../../../../store/RendererFunctionStore'
import { ExportImageFormatProps } from './ExportNetworkToImageMenuItem'
import { IdType } from '../../../../models/IdType'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'

const MIN_ZOOM = 0
const MAX_ZOOM = 5

type UnitType = 'pixels' | 'inches'

export const PngExportForm = (props: ExportImageFormatProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const [transparentBg, setTransparentBg] = useState(true)
  const [fullBg, setFullBg] = useState(true)
  const [customWidth, setCustomWidth] = useState<number>(0)
  const [customHeight, setCustomHeight] = useState<number>(0)
  const [zoom, setZoom] = useState<number>(2)
  const [unit, setUnit] = useState<UnitType>('pixels')
  const [dpi, setDpi] = useState<number>(72)

  const [widthInches, setWidthInches] = useState<number>(0)
  const [heightInches, setHeightInches] = useState<number>(0)

  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const targetNetworkId: IdType =
    activeNetworkId === undefined || activeNetworkId === ''
      ? currentNetworkId
      : activeNetworkId

  const pngFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportPng', targetNetworkId),
  )
  const widthFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'width', targetNetworkId),
  )
  const heightFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'height', targetNetworkId),
  )

  const maxHeight = heightFunction?.() * MAX_ZOOM
  const maxWidth = widthFunction?.() * MAX_ZOOM
  const maxHeightInches = parseFloat(
    ((heightFunction?.() / dpi) * MAX_ZOOM).toFixed(2),
  )
  const maxWidthInches = parseFloat(
    ((widthFunction?.() / dpi) * MAX_ZOOM).toFixed(2),
  )

  useEffect(() => {
    if (widthFunction && heightFunction) {
      setCustomWidth(Math.round(widthFunction() * zoom))
      setCustomHeight(Math.round(heightFunction() * zoom))
      setWidthInches(parseFloat(Math.round(widthFunction() / dpi).toFixed(2)))
      setHeightInches(parseFloat(Math.round(heightFunction() / dpi).toFixed(2)))
    }
  }, [])

  const handleUnitChange = (e: any) => {
    setUnit(e.target.value)
  }

  // when zoom changes, update the width and height to the corresponding value
  const handleZoomChange = (e: any) => {
    setZoom(e.target.value)
    setCustomWidth(Math.round((widthFunction?.() ?? 0) * e.target.value))
    setCustomHeight(Math.round((heightFunction?.() ?? 0) * e.target.value))

    setWidthInches(
      parseFloat(
        (((widthFunction?.() ?? 0) * e.target.value) / dpi).toFixed(2),
      ),
    )
    setHeightInches(
      parseFloat(
        (((heightFunction?.() ?? 0) * e.target.value) / dpi).toFixed(2),
      ),
    )
  }

  const handleWidthChange = (e: any) => {
    const newWidth = Math.round(
      Math.max(0, Math.min(Number(e.target.value), maxWidth)),
    )
    const newZoom = Math.round(
      Math.min(newWidth / (widthFunction?.() ?? 1), MAX_ZOOM),
    )
    const newHeight = Math.round(
      Math.max(0, Math.min((heightFunction?.() ?? 0) * newZoom), maxHeight),
    )

    const newWidthInches = parseFloat(
      Math.max(0, Math.min((newWidth / dpi) * newZoom), maxWidthInches).toFixed(
        2,
      ),
    )

    const newHeightInches = parseFloat(
      Math.max(
        0,
        Math.min((newHeight / dpi) * newZoom),
        maxHeightInches,
      ).toFixed(2),
    )

    setCustomWidth(newWidth)
    setCustomHeight(newHeight)
    setWidthInches(newWidthInches)
    setHeightInches(newHeightInches)
    setZoom(newZoom)
  }

  const handleHeightChange = (e: any) => {
    const newHeight = Math.round(
      Math.max(0, Math.min(Number(e.target.value), maxHeight)),
    )

    const newZoom = Math.round(
      Math.min(newHeight / (heightFunction?.() ?? 1), MAX_ZOOM),
    )

    const newWidth = Math.round(
      Math.max(0, Math.min((widthFunction?.() ?? 0) * newZoom), maxWidth),
    )

    const newWidthInches = parseFloat(
      Math.max(0, Math.min((newWidth / dpi) * newZoom), maxWidthInches).toFixed(
        2,
      ),
    )

    const newHeightInches = parseFloat(
      Math.max(
        0,
        Math.min((newHeight / dpi) * newZoom),
        maxHeightInches,
      ).toFixed(2),
    )

    setCustomHeight(newHeight)
    setCustomWidth(newWidth)
    setWidthInches(newWidthInches)
    setHeightInches(newHeightInches)
    setZoom(newZoom)
  }

  const handleDpiChange = (e: any) => {
    const newDpi = e.target.value
    const newMaxHeightInches = (heightFunction?.() / newDpi) * MAX_ZOOM
    const newMaxWidthInches = (widthFunction?.() / newDpi) * MAX_ZOOM

    const newWidthInches = parseFloat(
      Math.max(
        0,
        Math.min((customWidth / newDpi) * zoom, newMaxWidthInches),
      ).toFixed(2),
    )

    const newHeightInches = parseFloat(
      Math.max(
        0,
        Math.min((customHeight / newDpi) * zoom, newMaxHeightInches),
      ).toFixed(2),
    )

    setWidthInches(newWidthInches)
    setHeightInches(newHeightInches)
    setDpi(e.target.value)
  }

  const handleWidthInchesChange = (e: any) => {
    const newWidthInches = parseFloat(
      Math.max(0, Math.min(e.target.value, maxWidthInches)).toFixed(2),
    )

    const newZoom = parseFloat(
      ((newWidthInches / maxWidthInches) * MAX_ZOOM).toFixed(2),
    )

    const newWidth = Math.round(
      Math.max(0, Math.min((widthFunction?.() ?? 0) * newZoom), maxWidth),
    )

    const newHeight = Math.round(
      Math.max(0, Math.min((heightFunction?.() ?? 0) * newZoom), maxHeight),
    )

    const newHeightInches = parseFloat(
      Math.max(0, (newZoom / MAX_ZOOM) * maxHeightInches).toFixed(2),
    )

    setCustomWidth(newWidth)
    setCustomHeight(newHeight)
    setWidthInches(newWidthInches)
    setHeightInches(newHeightInches)
    setZoom(newZoom)
  }

  const handleHeightInchesChange = (e: any) => {
    const newHeightInches = parseFloat(
      Math.max(0, Math.min(e.target.value, maxHeightInches)).toFixed(2),
    )

    const newZoom = parseFloat(
      ((newHeightInches / maxHeightInches) * MAX_ZOOM).toFixed(2),
    )

    const newWidth = Math.round(
      Math.max(0, Math.min((widthFunction?.() ?? 0) * newZoom), maxWidth),
    )

    const newHeight = Math.round(
      Math.max(0, Math.min((heightFunction?.() ?? 0) * newZoom), maxHeight),
    )

    const newWidthInches = parseFloat(
      Math.max(0, (newZoom / MAX_ZOOM) * maxWidthInches).toFixed(2),
    )

    setCustomWidth(newWidth)
    setCustomHeight(newHeight)
    setWidthInches(newWidthInches)
    setHeightInches(newHeightInches)
    setZoom(newZoom)
  }
  return (
    <Box sx={{
      mt: 1, height: 500, display: 'flex',
      flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <Box>
        <Box sx={{ mb: 0.25 }}>
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
        <Box sx={{ mb: 1 }}>
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
        <Box sx={{ mb: 1 }} >
          <Typography variant="subtitle1" style={{ margin: '0 0 5px 0' }}>
            File Type
          </Typography>
          <Select
            size="small"
            labelId="label"
            value={unit}
            onChange={handleUnitChange}
          >
            <MenuItem value={'pixels' as UnitType}>Pixels</MenuItem>
            <MenuItem value={'inches' as UnitType}>Inches</MenuItem>
          </Select>
        </Box>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1" style={{ margin: '0 0 7px 0' }}>
            Size
          </Typography>
          {unit === 'pixels' ? (
            <Box>
              <TextField
                size="small"
                sx={{ mr: 1 }}
                label="Width (pixels)"
                onChange={handleWidthChange}
                value={customWidth}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                size="small"
                label="Height (pixels)"
                onChange={handleHeightChange}
                value={customHeight}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
          ) : (
            <Box>
              <TextField
                size="small"
                sx={{ mr: 1 }}
                label="Width (inches)"
                onChange={handleWidthInchesChange}
                value={widthInches}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                size="small"
                label="Height (inches)"
                onChange={handleHeightInchesChange}
                value={heightInches}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <Select
                size="small"
                label="DPI"
                value={dpi}
                onChange={handleDpiChange}
              >
                <MenuItem value={72}>72</MenuItem>
                <MenuItem value={100}>100</MenuItem>
                <MenuItem value={150}>150</MenuItem>
                <MenuItem value={300}>300</MenuItem>
                <MenuItem value={600}>600</MenuItem>
              </Select>
            </Box>
          )}
        </Box>
        <Box>
          <Box>Zoom</Box>
          <Slider
            sx={{ ml: 1.5, width: '85%' }}
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
      <DialogActions sx={{ pr: 1 }}>
        <Button color="secondary" onClick={props.handleClose}>
          Cancel
        </Button>
        <Button
          color="primary"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            const result = await pngFunction?.(
              fullBg,
              customWidth,
              customHeight,
              transparentBg,
            )
            saveAs(result, `${props.fileName}.png`)
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
