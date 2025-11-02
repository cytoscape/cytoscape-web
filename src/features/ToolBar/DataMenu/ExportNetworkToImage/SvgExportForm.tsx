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
import { useRendererFunctionStore } from '../../../../hooks/stores/RendererFunctionStore'
import { IdType } from '../../../../models/IdType'
import { useUiStateStore } from '../../../../hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../../hooks/stores/WorkspaceStore'

const SvgExportForm = forwardRef<ExportFormRef, ExportImageFormatProps>(
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
        saveAs(result, `${props.fileName}.svg`)
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

export default SvgExportForm
