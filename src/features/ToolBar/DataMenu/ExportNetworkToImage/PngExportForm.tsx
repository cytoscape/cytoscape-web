import LinkIcon from '@mui/icons-material/Link'
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
//@ts-expect-error no type declarations for file-saver
import { saveAs } from 'file-saver'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

import { useRendererFunctionStore } from '../../../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../../models/IdType'
import { addPngCitation } from './citationMetadata'
import { ExportFormRef, ExportImageFormatProps } from './ExportImage'

// 0% would export a 0 × 0 image.
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

type UnitType = 'pixels' | 'inches'

// Clamping to min/max lives in the change handlers, matching the previous
// clamp-on-change behavior.
const NumberField = (props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: string | number) => void
}): JSX.Element => (
  <TextField
    type="number"
    size="small"
    label={props.label}
    value={props.value}
    inputProps={{ min: props.min, max: props.max, step: props.step ?? 1 }}
    onChange={(e) => {
      // A cleared field emits '' which Number() reads as 0, collapsing the
      // size and zoom; keep the previous value until a number is typed.
      if (e.target.value === '') {
        return
      }
      props.onChange(e.target.value)
    }}
    sx={{ width: 110 }}
  />
)

/** Sits between the width and height fields, which always change together. */
const ProportionLink = (): JSX.Element => (
  <Tooltip title="Width and height stay in proportion">
    <LinkIcon
      fontSize="small"
      aria-label="Width and height stay in proportion"
      sx={{ alignSelf: 'center', color: 'text.secondary', mx: -0.5 }}
    />
  </Tooltip>
)

const PngExportForm = forwardRef<ExportFormRef, ExportImageFormatProps>(
  (props, ref) => {
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

    // One-shot init of the size fields when the renderer functions become
    // available. zoom/dpi are the init defaults here; adding them as deps
    // would re-run this and overwrite the values the change handlers just set.
    useEffect(() => {
      if (widthFunction && heightFunction) {
        setCustomWidth(Math.round(widthFunction() * zoom))
        setCustomHeight(Math.round(heightFunction() * zoom))
        setWidthInches(parseFloat((widthFunction() / dpi).toFixed(2)))
        setHeightInches(parseFloat((heightFunction() / dpi).toFixed(2)))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- init keyed on renderer-function availability only
    }, [widthFunction, heightFunction])

    useImperativeHandle(ref, () => ({
      save: async () => {
        const result = await pngFunction?.(
          fullBg,
          customWidth,
          customHeight,
          transparentBg,
        )
        // cy.png() returns a base64 data URI.
        const base64 = typeof result === 'string' ? result.split(',')[1] : ''
        const bytes = Uint8Array.from(atob(base64 ?? ''), (ch) =>
          ch.charCodeAt(0),
        )
        saveAs(
          new Blob([addPngCitation(bytes)], { type: 'image/png' }),
          `${props.fileName}.png`,
        )
      },
    }))

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

    const handleWidthChange = (value: string | number) => {
      const e = Number(value)
      const newWidth = Math.round(Math.max(0, Math.min(e, maxWidth)))
      const newZoom = newWidth / (widthFunction?.() ?? 1)
      const newHeight = Math.round((heightFunction?.() ?? 0) * newZoom)

      setCustomWidth(newWidth)
      setCustomHeight(newHeight)
      setZoom(newZoom)
      setWidthInches(parseFloat((newWidth / dpi).toFixed(2)))
      setHeightInches(parseFloat((newHeight / dpi).toFixed(2)))
    }

    const handleHeightChange = (value: string | number) => {
      const e = Number(value)
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

      const newWidth = Math.round(newWidthInches * newDpi)
      const newHeight = Math.round(newHeightInches * newDpi)

      setCustomWidth(newWidth)
      setCustomHeight(newHeight)
      setWidthInches(newWidthInches)
      setHeightInches(newHeightInches)
      setDpi(newDpi)
    }

    const handleWidthInchesChange = (value: string | number) => {
      const e = Number(value)
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

    const handleHeightInchesChange = (value: string | number) => {
      const e = Number(value)
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
      <Stack spacing={2.5}>
        <FormGroup row sx={{ columnGap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={fullBg}
                onChange={(e) => setFullBg(e.target.checked)}
              />
            }
            label="Export full network image"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
              />
            }
            label="Transparent background"
          />
        </FormGroup>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {unit === 'pixels' ? (
            <>
              <NumberField
                min={0}
                max={maxWidth}
                value={customWidth}
                onChange={handleWidthChange}
                label="Width (px)"
              />
              <ProportionLink />
              <NumberField
                min={0}
                max={maxHeight}
                value={customHeight}
                onChange={handleHeightChange}
                label="Height (px)"
              />
              <FormControl size="small" sx={{ width: 110 }}>
                <InputLabel id="png-units-label">Units</InputLabel>
                <Select
                  labelId="png-units-label"
                  label="Units"
                  value={unit}
                  onChange={handleUnitChange}
                >
                  <MenuItem value={'pixels' as UnitType}>Pixels</MenuItem>
                  <MenuItem value={'inches' as UnitType}>Inches</MenuItem>
                </Select>
              </FormControl>
            </>
          ) : (
            <>
              <NumberField
                min={0}
                max={maxWidthInches}
                step={0.01}
                value={widthInches}
                onChange={handleWidthInchesChange}
                label="Width (in)"
              />
              <ProportionLink />
              <NumberField
                min={0}
                max={maxHeightInches}
                step={0.01}
                value={heightInches}
                onChange={handleHeightInchesChange}
                label="Height (in)"
              />
              <FormControl size="small" sx={{ width: 110 }}>
                <InputLabel id="png-units-label">Units</InputLabel>
                <Select
                  labelId="png-units-label"
                  label="Units"
                  value={unit}
                  onChange={handleUnitChange}
                >
                  <MenuItem value={'pixels' as UnitType}>Pixels</MenuItem>
                  <MenuItem value={'inches' as UnitType}>Inches</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: 90 }}>
                <InputLabel id="dpi-label">DPI</InputLabel>
                <Select
                  defaultValue={72}
                  labelId="dpi-label"
                  label="DPI"
                  onChange={(e) => handleDpiChange(e.target.value as number)}
                >
                  <MenuItem value={72}>72</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                  <MenuItem value={150}>150</MenuItem>
                  <MenuItem value={300}>300</MenuItem>
                  <MenuItem value={600}>600</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Zoom: {Math.round(zoom * 100)}%
          </Typography>
          {/* Inset by half a mark label, so "500%" ends at the gutter. */}
          <Box sx={{ px: 2.5 }}>
            <Slider
              value={zoom}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              onChange={handleZoomChange}
              marks={[MIN_ZOOM, 1, 2, 3, 4, 5].map((value) => ({
                value,
                label: `${Math.round(value * 100)}%`,
              }))}
            />
          </Box>
        </Box>
      </Stack>
    )
  },
)

PngExportForm.displayName = 'PngExportForm'

export default PngExportForm
