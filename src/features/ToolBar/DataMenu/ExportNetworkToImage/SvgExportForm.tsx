import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
//@ts-expect-error no type declarations for file-saver
import { saveAs } from 'file-saver'
import { forwardRef, useImperativeHandle, useState } from 'react'

import { useRendererFunctionStore } from '../../../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../../models/IdType'
import { addSvgCitation } from './citationMetadata'
import { ExportFormRef, ExportImageFormatProps } from './ExportImage'

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
        const result: Blob | undefined = await svgFunction?.(fullBg)
        const svg = addSvgCitation((await result?.text()) ?? '')
        saveAs(
          new Blob([svg], { type: 'image/svg+xml' }),
          `${props.fileName}.svg`,
        )
      },
    }))

    return (
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
    )
  },
)

SvgExportForm.displayName = 'SvgExportForm'

export default SvgExportForm
