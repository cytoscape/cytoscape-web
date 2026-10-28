import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
//@ts-expect-error no type declarations for file-saver
import { saveAs } from 'file-saver'
import { forwardRef, useImperativeHandle, useState } from 'react'

import { useRendererFunctionStore } from '../../../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../../models/IdType'
import { addPdfCitation } from './citationMetadata'
import { ExportFormRef, ExportImageFormatProps } from './ExportImage'

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

const PAPER_SIZE_LABELS: Record<PaperSize, string> = {
  LETTER: 'Letter',
  LEGAL: 'Legal',
  TABLOID: 'Tabloid',
  A0: 'A0',
  A1: 'A1',
  A2: 'A2',
  A3: 'A3',
  A4: 'A4',
  A5: 'A5',
  CUSTOM: 'Custom',
}

const ORIENTATION_LABELS: Record<Orientation, string> = {
  PORTRAIT: 'Portrait',
  LANDSCAPE: 'Landscape',
}

const PdfExportForm = forwardRef<ExportFormRef, ExportImageFormatProps>(
  (props, ref) => {
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

    useImperativeHandle(ref, () => ({
      save: async () => {
        const result = await pdfFunction?.(
          fullBg,
          paperSize,
          orientation,
          margin,
          paperSize === PaperSize.CUSTOM ? customWidth : undefined,
          paperSize === PaperSize.CUSTOM ? customHeight : undefined,
        )
        const bytes = new Uint8Array((await result?.arrayBuffer()) ?? [])
        saveAs(
          new Blob([addPdfCitation(bytes)], { type: 'application/pdf' }),
          `${props.fileName}.pdf`,
        )
      },
    }))

    return (
      <Stack spacing={2.5}>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={fullBg}
                onChange={(e) => setFullBg(e.target.checked)}
              />
            }
            label="Export full network image"
          />
        </FormGroup>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <FormControl size="small" sx={{ width: 140 }}>
            <InputLabel id="pdf-paper-size-label">Paper size</InputLabel>
            <Select
              labelId="pdf-paper-size-label"
              label="Paper size"
              value={paperSize}
              onChange={handlePaperSizeChange}
            >
              {Object.values(PaperSize).map((size) => (
                <MenuItem key={size} value={size}>
                  {PAPER_SIZE_LABELS[size]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 140 }}>
            <InputLabel id="pdf-orientation-label">Orientation</InputLabel>
            <Select
              labelId="pdf-orientation-label"
              label="Orientation"
              value={orientation}
              onChange={handleOrientationChange}
            >
              {Object.values(Orientation).map((value) => (
                <MenuItem key={value} value={value}>
                  {ORIENTATION_LABELS[value]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* pdfkit measures in PostScript points, 72 to the inch. */}
          <TextField
            size="small"
            type="number"
            label="Margin"
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            InputProps={{
              endAdornment: <InputAdornment position="end">pt</InputAdornment>,
            }}
            sx={{ width: 110 }}
          />
        </Box>
        {paperSize === PaperSize.CUSTOM && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              type="number"
              label="Page width"
              value={customWidth}
              onChange={(e) => setCustomWidth(Number(e.target.value))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">in</InputAdornment>
                ),
              }}
              sx={{ width: 140 }}
            />
            <TextField
              size="small"
              type="number"
              label="Page height"
              value={customHeight}
              onChange={(e) => setCustomHeight(Number(e.target.value))}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">in</InputAdornment>
                ),
              }}
              sx={{ width: 140 }}
            />
          </Box>
        )}
      </Stack>
    )
  },
)

PdfExportForm.displayName = 'PdfExportForm'

export default PdfExportForm
