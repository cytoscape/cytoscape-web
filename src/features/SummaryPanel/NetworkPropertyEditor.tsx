import '@mantine/tiptap/styles.css'

import { MantineProvider } from '@mantine/core'
import { Link, RichTextEditor } from '@mantine/tiptap'
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Popover,
  TextField,
  Typography,
} from '@mui/material'
import Highlight from '@tiptap/extension-highlight'
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
      setLocalSummaryState({
        ...localSummaryState,
        description: editor.getHTML(),
      })
    },
    extensions: [
      StarterKit,
      Underline,
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: removePTags(localSummaryState.description ?? ''),
  })

  useEffect(() => {
    setLocalSummaryState(summary)
    editor?.commands?.setContent(removePTags(summary.description ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary])

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
      <Paper
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
            ></TextField>
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

          <Typography sx={{ ml: 1.5, pt: 1 }} gutterBottom>
            Description
          </Typography>
          <MantineProvider>
            <style>
              {`
                .mantine-RichTextEditor-toolbar {
                  padding-top: 0 !important;
                  padding-bottom: 0 !important;
                }
              `}
            </style>
            <Box
              sx={{
                height: 290,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <RichTextEditor
                editor={editor}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <RichTextEditor.Toolbar>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                    <RichTextEditor.Highlight />
                    <RichTextEditor.Code />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                    <RichTextEditor.H4 />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Blockquote />
                    <RichTextEditor.Hr />
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                    <RichTextEditor.Subscript />
                    <RichTextEditor.Superscript />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.AlignLeft />
                    <RichTextEditor.AlignCenter />
                    <RichTextEditor.AlignJustify />
                    <RichTextEditor.AlignRight />
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>

                <RichTextEditor.Content
                  style={{ flex: 1, overflowY: 'auto' }}
                />
              </RichTextEditor>
            </Box>
          </MantineProvider>

          <Divider sx={{ mt: 2, mb: 1 }} />
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
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: '#fafafa',
          }}
        >
          <Button
            data-testid="network-property-editor-cancel-button"
            color="primary"
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
      </Paper>
    </Popover>
  )
}

export default NetworkPropertyEditor
