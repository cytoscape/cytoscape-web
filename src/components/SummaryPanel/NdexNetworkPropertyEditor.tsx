import {
  Popover,
  Paper,
  Chip,
  Typography,
  Box,
  TextField,
  Divider,
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

import debounce from 'lodash.debounce'

import { removePTags } from '../../utils/remove-p-tags'
import { ReactElement } from 'react'
import { MantineProvider } from '@mantine/core'
import '@mantine/tiptap/styles.css'
import { useWorkspaceStore } from '../../store/WorkspaceStore'

interface NetworkPropertyEditorProps {
  anchorEl?: HTMLElement
  onClose: (event: any) => void
  summary: NdexNetworkSummary
}
export const NetworkPropertyEditor = (
  props: NetworkPropertyEditorProps,
): ReactElement => {
  const { anchorEl, onClose, summary } = props
  const open = anchorEl !== undefined
  const updateNetworkSummary = useNetworkSummaryStore((state) => state.update)
  const setNetworkModified = useWorkspaceStore(
    (state) => state.setNetworkModified,
  )

  const editor = useEditor({
    onUpdate: debounce(({ editor }) => {
      updateNetworkSummary(summary.externalId, {
        description: editor.getHTML(),
      })
      setNetworkModified(summary.externalId, true)
    }, 200),
    extensions: [
      StarterKit,
      Underline,
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: removePTags(summary.description ?? ''),
  })

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
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
            <Typography variant="caption">{summary.visibility}</Typography>
          }
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <TextField
            size="small"
            label="Name"
            sx={{ width: '60%', mr: 1, fontSize: 12 }}
            value={summary.name}
            onChange={(e) => {
              updateNetworkSummary(summary.externalId, {
                name: e.target.value,
              })
              setNetworkModified(summary.externalId, true)
            }}
          ></TextField>
          <TextField
            size="small"
            label="Version"
            sx={{ width: '20%', fontSize: 12 }}
            value={summary.version}
            onChange={(e) => {
              updateNetworkSummary(summary.externalId, {
                version: e.target.value,
              })
              setNetworkModified(summary.externalId, true)
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
        <NdexNetworkPropertyTable />
      </Paper>
    </Popover>
  )
}
