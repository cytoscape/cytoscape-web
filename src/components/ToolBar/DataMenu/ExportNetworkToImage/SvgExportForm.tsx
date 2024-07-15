import {
  Box,
  Button,
  FormControlLabel,
  Checkbox,
  TextField,
} from '@mui/material'
import { ReactElement, useState } from 'react'
//@ts-expect-error
import { saveAs } from 'file-saver'
import { ExportImageFormatProps } from './ExportNetworkToImageMenuItem'
import { useRendererFunctionStore } from '../../../../store/RendererFunctionStore'

export const SvgExportForm = (props: ExportImageFormatProps): ReactElement => {
  const [loading, setLoading] = useState(false)
  const [fullBg, setFullBg] = useState(true)
  const [fileName, setFileName] = useState<string>('network.svg')

  const svgFunction = useRendererFunctionStore((state) =>
    state.getFunction('cyjs', 'exportSvg'),
  )

  return (
    <Box sx={{ p: 1 }}>
      <Box>
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
      <Button color="error" onClick={props.handleClose}>
        Cancel
      </Button>
      <Button
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          const result = await svgFunction?.()
          const blob = new Blob([result], { type: 'image/svg+xml' })
          saveAs(blob, 'network.svg')
          setLoading(false)
          props.handleClose()
        }}
      >
        Confirm
      </Button>
    </Box>
  )
}
