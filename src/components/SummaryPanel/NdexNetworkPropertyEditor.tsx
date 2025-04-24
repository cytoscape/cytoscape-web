import {
  Popover,
  Paper,
  Chip,
  Typography,
  Box,
  TextField,
  Divider,
  Button,
} from '@mui/material'
import NdexNetworkPropertyTable from './NdexNetworkPropertyTable'
import { useNetworkSummaryStore } from '../../store/NetworkSummaryStore'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { RichTextEditor, Link } from '@mantine/tiptap'
import { useEditor } from '@tiptap/react'
import Highlight from '@tiptap/extension-highlight'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Superscript from '@tiptap/extension-superscript'
import SubScript from '@tiptap/extension-subscript'

import { removePTags } from '../../utils/remove-p-tags'
import { ReactElement, useEffect, useState } from 'react'
import { MantineProvider } from '@mantine/core'
import '@mantine/tiptap/styles.css'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useUndoStack } from '../../task/UndoStack'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import _ from 'lodash'
import { IdType } from '../../models'

interface NetworkPropertyEditorProps {
  anchorEl?: HTMLElement
  onClose: (event: any) => void
  networkId: IdType
}
export const NetworkPropertyEditor = (
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
          p: 2,
          width: 800,
          height: 800,
          overflowY: 'scroll',
        }}
      >
        <Chip
          sx={{ p: 1, mb: 2 }}
          size="small"
          label={
            <Typography variant="caption">
              {localSummaryState.visibility}
            </Typography>
          }
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <TextField
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
          <RichTextEditor editor={editor}>
            <RichTextEditor.Toolbar sticky stickyOffset={60}>
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

            <RichTextEditor.Content />
          </RichTextEditor>
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
        <Divider sx={{ mt: 2, mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
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
              if (_.isEqual(localSummaryState, summary)) {
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
