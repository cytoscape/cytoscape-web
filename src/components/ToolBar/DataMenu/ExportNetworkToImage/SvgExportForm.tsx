import {
  Box,
  Button,
  FormControlLabel,
  Checkbox,
  DialogActions,
} from '@mui/material'
import { forwardRef, useImperativeHandle, useState } from 'react'
//@ts-expect-error
import { saveAs } from 'file-saver'
import {
  ExportFormRef,
  ExportImageFormatProps,
} from './ExportNetworkToImageMenuItem'
import { useRendererFunctionStore } from '../../../../store/RendererFunctionStore'
import { IdType } from '../../../../models/IdType'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'

export const SvgExportForm = forwardRef<ExportFormRef, ExportImageFormatProps>(
  (props, ref) => {
    const [fullBg, setFullBg] = useState(true)

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

    const svgFunction = useRendererFunctionStore((state) =>
      state.getFunction('cyjs', 'exportSvg', targetNetworkId),
    )

    useImperativeHandle(ref, () => ({
      save: async () => {
        const result = await svgFunction?.(fullBg)
        const blob = new Blob([result], { type: 'image/svg+xml' })
        saveAs(blob, `${props.fileName}.svg`)
      },
    }))

    return (
      <Box
        sx={{
          mt: 1,
          height: 425,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box>
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
      </Box>
    )
  },
)
