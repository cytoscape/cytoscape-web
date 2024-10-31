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
  Typography,
} from '@mui/material'
import { MantineProvider, NumberInput } from '@mantine/core'
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
  const [zoom, setZoom] = useState<number>(1)
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
      setWidthInches(parseFloat((widthFunction() / dpi).toFixed(2)))
      setHeightInches(parseFloat((heightFunction() / dpi).toFixed(2)))
    }
  }, [widthFunction, heightFunction])

  const handleUnitChange = (e: any) => {
    setUnit(e.target.value)
  }

  const handleZoomChange = (e: any, newValue: number | number[]) => {
    const newZoom = Array.isArray(newValue) ? newValue[0] : newValue
    setZoom(newZoom)
    setCustomWidth(Math.round((widthFunction?.() ?? 0) * newZoom))
    setCustomHeight(Math.round((heightFunction?.() ?? 0) * newZoom))
    setWidthInches(
      parseFloat((((widthFunction?.() ?? 0) * newZoom) / dpi).toFixed(2)),
    )
    setHeightInches(
      parseFloat((((heightFunction?.() ?? 0) * newZoom) / dpi).toFixed(2)),
    )
  }

  const handleWidthChange = (e: number) => {
    const newWidth = Math.round(Math.max(0, Math.min(e, maxWidth)))
    const newZoom = newWidth / (widthFunction?.() ?? 1)
    const newHeight = Math.round((heightFunction?.() ?? 0) * newZoom)

    setCustomWidth(newWidth)
    setCustomHeight(newHeight)
    setZoom(newZoom)
    setWidthInches(parseFloat((newWidth / dpi).toFixed(2)))
    setHeightInches(parseFloat((newHeight / dpi).toFixed(2)))
  }

  const handleHeightChange = (e: number) => {
    const newHeight = Math.round(Math.max(0, Math.min(e, maxHeight)))
    const newZoom = newHeight / (heightFunction?.() ?? 1)
    const newWidth = Math.round((widthFunction?.() ?? 0) * newZoom)

    setCustomHeight(newHeight)
    setCustomWidth(newWidth)
    setZoom(newZoom)
    setWidthInches(parseFloat((newWidth / dpi).toFixed(2)))
    setHeightInches(parseFloat((newHeight / dpi).toFixed(2)))
  }

  const handleDpiChange = (e: number) => {
    const newDpi = e
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
    setDpi(newDpi)
  }

  const handleWidthInchesChange = (e: number) => {
    const newWidthInches = parseFloat(
      Math.max(0, Math.min(e, maxWidthInches)).toFixed(2),
    )
    const newZoom = newWidthInches / (maxWidthInches / MAX_ZOOM)
    const newWidth = Math.round((widthFunction?.() ?? 0) * newZoom)
    const newHeight = Math.round((heightFunction?.() ?? 0) * newZoom)

    setCustomWidth(newWidth)
    setCustomHeight(newHeight)
    setZoom(newZoom)
    setWidthInches(newWidthInches)
    setHeightInches(parseFloat((newHeight / dpi).toFixed(2)))
  }

  const handleHeightInchesChange = (e: number) => {
    const newHeightInches = parseFloat(
      Math.max(0, Math.min(e, maxHeightInches)).toFixed(2),
    )
    const newZoom = newHeightInches / (maxHeightInches / MAX_ZOOM)
    const newHeight = Math.round((heightFunction?.() ?? 0) * newZoom)
    const newWidth = Math.round((widthFunction?.() ?? 0) * newZoom)

    setCustomHeight(newHeight)
    setCustomWidth(newWidth)
    setZoom(newZoom)
    setHeightInches(newHeightInches)
    setWidthInches(parseFloat((newWidth / dpi).toFixed(2)))
  }

  return (
    <MantineProvider>
      <Box
        sx={{
          mt: 1,
          height: 425,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
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
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle1" style={{ margin: '0 0 5px 0' }}>
              Units
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
              <Box sx={{ display: 'flex' }}>
                <NumberInput
                  clampBehavior="blur"
                  mr={10}
                  w={100}
                  min={0}
                  max={maxWidth}
                  value={customWidth}
                  onChange={handleWidthChange}
                  label="Width (pixels)"
                />{' '}
                <NumberInput
                  clampBehavior="blur"
                  w={100}
                  mr={10}
                  min={0}
                  max={maxHeight}
                  value={customHeight}
                  onChange={handleHeightChange}
                  label="Height (pixels)"
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <NumberInput
                  clampBehavior="blur"
                  w={100}
                  mr={10}
                  min={0}
                  max={maxWidthInches}
                  value={widthInches}
                  onChange={handleWidthInchesChange}
                  label="Width (inches)"
                />
                <NumberInput
                  clampBehavior="blur"
                  w={100}
                  mr={10}
                  min={0}
                  max={maxHeightInches}
                  value={heightInches}
                  onChange={handleHeightInchesChange}
                  label="Height (inches)"
                />
                <FormControl sx={{ ml: 1, mt: 3 }}>
                  <InputLabel id="dpi-label">DPI</InputLabel>
                  <Select
                    defaultValue={72}
                    labelId="dpi-label"
                    label="DPI"
                    sx={{ width: 100 }}
                    size="small"
                    onChange={(e) => handleDpiChange(e.target.value as number)}
                  >
                    <MenuItem value={72}>72</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={150}>150</MenuItem>
                    <MenuItem value={300}>300</MenuItem>
                    <MenuItem value={600}>600</MenuItem>
                  </Select>
                </FormControl>
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
              onChange={handleZoomChange}
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
    </MantineProvider>
  )
}
