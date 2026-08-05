import {
  Box,
  Button,
  Chip,
  Popover,
  TextField,
  Typography,
} from '@mui/material'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import SubScript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import isEqual from 'lodash/isEqual'
import { ReactElement, useEffect, useState } from 'react'

import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { useUndoStack } from '../../data/hooks/useUndoStack'
import { IdType } from '../../models'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { removePTags } from '../../utils/removePTags'
import { DescriptionEditor } from './DescriptionEditor'
import NdexNetworkPropertyTable from './NdexNetworkPropertyTable'

interface NetworkPropertyEditorProps {
  anchorEl?: HTMLElement
  onClose: (event: any) => void
  networkId: IdType
}
const NetworkPropertyEditor = (
  props: NetworkPropertyEditorProps,
): ReactElement => {
  const { postEdit } = useUndoStack()
  const { anchorEl, onClose } = props
  const summary = useNetworkSummaryStore(
    (state) => state.summaries[props.networkId],
  )
  const [localSummaryState, setLocalSummaryState] = useState(summary)

  const open = anchorEl !== undefined
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)
  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )

  const editor = useEditor({
    onUpdate: ({ editor }) => {
      // Functional update on purpose: this callback is bound when the editor
      // is created, so spreading a captured `localSummaryState` here would
      // silently revert any field (e.g. the name) edited after that render.
      setLocalSummaryState((previous) => ({
        ...previous,
        description: editor.getHTML(),
      }))
    },
    extensions: [
      StarterKit,
      Underline,
      // openOnClick false so clicking a link keeps editing instead of
      // navigating (matches the behavior of the former Mantine preset).
      Link.configure({ openOnClick: false }),
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: removePTags(localSummaryState.description ?? ''),
  })

  // Sync the draft from the store only when the popover opens. Keying this on
  // `summary` clobbered in-progress edits: any background summary update while
  // the editor is open (layout completion setting hasLayout, a cross-tab
  // echo) replaced the user's draft with the store copy mid-typing.
  useEffect(() => {
    if (open) {
      setLocalSummaryState(summary)
      editor?.commands?.setContent(removePTags(summary.description ?? ''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync only on open/close, not on background summary changes
  }, [open])

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      disableEscapeKeyDown={true}
      hideBackdrop={true}
      onClose={(e) => onClose(e)}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Box
        sx={{
          width: 850,
          height: 810,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            p: 2,
            height: 'calc(100% - 60px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Chip
            sx={{ p: 1, mb: 2, width: 90 }}
            size="small"
            label={
              <Typography variant="caption">
                {localSummaryState.visibility}
              </Typography>
            }
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <TextField
              data-testid="network-property-editor-name-input"
              size="small"
              label="Name"
              sx={{ width: '60%', mr: 1, fontSize: 12 }}
              value={localSummaryState.name}
              onChange={(e) => {
                setLocalSummaryState({
                  ...localSummaryState,
                  name: e.target.value,
                })
              }}
            />
            <TextField
              data-testid="network-property-editor-version-input"
              size="small"
              label="Version"
              sx={{ width: '20%', fontSize: 12 }}
              value={localSummaryState.version ?? ''}
              onChange={(e) => {
                setLocalSummaryState({
                  ...localSummaryState,
                  version: e.target.value,
                })
              }}
            />
          </Box>
          <Typography gutterBottom sx={{ mt: 2 }}>
            Description:
          </Typography>
          <Box
            sx={{
              height: 290,
              overflow: 'hidden',
            }}
          >
            <DescriptionEditor editor={editor} />
          </Box>

          <NdexNetworkPropertyTable
            networkProperties={localSummaryState.properties}
            setNetworkProperties={(nextProperties) => {
              setLocalSummaryState({
                ...localSummaryState,
                properties: nextProperties,
              })
            }}
          />
        </Box>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            data-testid="network-property-editor-cancel-button"
            variant="outlined"
            onClick={(e) => {
              setLocalSummaryState(summary)
              onClose(e)
            }}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            data-testid="network-property-editor-confirm-button"
            variant="contained"
            onClick={(e) => {
              if (isEqual(localSummaryState, summary)) {
                onClose(e)
              } else {
                postEdit(
                  UndoCommandType.SET_NETWORK_SUMMARY,
                  'Update network summary',
                  [localSummaryState.externalId, summary],
                  [localSummaryState.externalId, localSummaryState],
                )
                updateNetworkSummary(
                  localSummaryState.externalId,
                  localSummaryState,
                )
                setNetworkModified(localSummaryState.externalId, true)
                onClose(e)
              }
            }}
          >
            Confirm
          </Button>
        </Box>
      </Box>
    </Popover>
  )
}

export default NetworkPropertyEditor
