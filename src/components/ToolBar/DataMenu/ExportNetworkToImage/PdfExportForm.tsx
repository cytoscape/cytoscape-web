import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Checkbox,
  TextField,
  DialogActions,
  Typography,
} from '@mui/material'
import { ReactElement, useState } from 'react'
//@ts-expect-error
import { saveAs } from 'file-saver'
import { useRendererFunctionStore } from '../../../../store/RendererFunctionStore'
import { ExportImageFormatProps } from './ExportNetworkToImageMenuItem'
import { IdType } from '../../../../models/IdType'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'

export const PaperSize = {
  LETTER: 'LETTER',
  LEGAL: 'LEGAL',
  TABLOID: 'TABLOID',
  A0: 'A0',
  A1: 'A1',
  A2: 'A2',
  A3: 'A3',
  A4: 'A4',
  A5: 'A5',
  CUSTOM: 'CUSTOM',
} as const

export type PaperSize = (typeof PaperSize)[keyof typeof PaperSize]

export const Orientation = {
  PORTRAIT: 'PORTRAIT',
  LANDSCAPE: 'LANDSCAPE',
} as const
export type Orientation = (typeof Orientation)[keyof typeof Orientation]

export const PdfExportForm = (props: ExportImageFormatProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const [fullBg, setFullBg] = useState(true)
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.LETTER)
  const [orientation, setOrientation] = useState<Orientation>(
    Orientation.PORTRAIT,
  )
  const [customWidth, setCustomWidth] = useState<number>(0)
  const [customHeight, setCustomHeight] = useState<number>(0)
  const [margin, setMargin] = useState<number>(52)

  const handlePaperSizeChange = (event: any) => {
    setPaperSize(event.target.value)
  }

  const handleOrientationChange = (event: any) => {
    setOrientation(event.target.value)
  }

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

  const pdfFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportPdf', targetNetworkId),
  )

  return (
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
        <Box sx={{ mb: 1 }}>
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
          <FormControl variant="outlined">
            <Typography variant="subtitle1" style={{ margin: '0 0 5px 0' }}>
              Paper Size
            </Typography>
            <Select
              size="small"
              labelId="label"
              value={paperSize}
              onChange={handlePaperSizeChange}
            >
              {Object.keys(PaperSize).map((key) => (
                <MenuItem key={key} value={key as PaperSize}>
                  {key}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        {paperSize === PaperSize.CUSTOM && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle1" style={{ margin: '0 0 7px 0' }}>
              Size
            </Typography>
            <TextField
              size="small"
              sx={{ mr: 1 }}
              id="outlined-number"
              label="Width (inches)"
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
              label="Height (inches)"
              type="number"
              onChange={(e) => setCustomHeight(Number(e.target.value))}
              value={customHeight}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        )}

        <Box sx={{ mb: 1 }}>
          <FormControl variant="outlined">
            <Typography variant="subtitle1" style={{ margin: '0 0 5px 0' }}>
              Orientation
            </Typography>
            <Select
              size="small"
              labelId="label"
              value={orientation}
              onChange={handleOrientationChange}
            >
              {Object.keys(Orientation).map((key) => (
                <MenuItem key={key} value={key as Orientation}>
                  {key}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle1" style={{ margin: '0 0 5px 0' }}>
            Margin
          </Typography>
          <TextField
            size="small"
            id="outlined-number"
            type="number"
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
      </Box>
      <DialogActions sx={{ pr: 1 }}>
        <Button color="primary" onClick={props.handleClose}>
          Cancel
        </Button>
        <Button
          disabled={loading}
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
          onClick={async () => {
            setLoading(true)
            const result = await pdfFunction?.(
              fullBg,
              paperSize,
              orientation,
              margin,
              paperSize === PaperSize.CUSTOM ? customWidth : undefined,
              paperSize === PaperSize.CUSTOM ? customHeight : undefined,
            )
            saveAs(result, `${props.fileName}.pdf`)
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
