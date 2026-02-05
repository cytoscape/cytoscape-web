import {
  Box,
  Button,
  Checkbox,
  DialogActions,
  FormControlLabel,
} from '@mui/material'
//@ts-expect-error
import { saveAs } from 'file-saver'
import { forwardRef, useImperativeHandle, useState } from 'react'

import { useRendererFunctionStore } from '../../../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../../models/IdType'
import {
  ExportFormRef,
  ExportImageFormatProps,
} from './ExportNetworkToImageMenuItem'

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
