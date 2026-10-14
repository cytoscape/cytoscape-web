import CodeIcon from '@mui/icons-material/Code'
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter'
import FormatAlignJustifyIcon from '@mui/icons-material/FormatAlignJustify'
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft'
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatClearIcon from '@mui/icons-material/FormatClear'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import FormatQuoteIcon from '@mui/icons-material/FormatQuote'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import HighlightIcon from '@mui/icons-material/Highlight'
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule'
import InsertLinkIcon from '@mui/icons-material/InsertLink'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS'
import SubscriptIcon from '@mui/icons-material/Subscript'
import SuperscriptIcon from '@mui/icons-material/Superscript'
import {
  Box,
  Button,
  Divider,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { Editor, EditorContent } from '@tiptap/react'
import {
  MouseEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useReducer,
  useState,
} from 'react'

/**
 * MUI toolbar + content surface over a headless tiptap editor. Replaces
 * Mantine's RichTextEditor chrome, which was the only reason @mantine/tiptap
 * and its @mantine/core peer shipped with the app.
 */

interface ControlProps {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
}

const ToolbarControl = ({
  title,
  active,
  disabled,
  onClick,
  children,
}: ControlProps): ReactElement => (
  <Tooltip title={title}>
    <span>
      <IconButton
        size="small"
        disabled={disabled}
        onClick={onClick}
        sx={{
          borderRadius: 0.5,
          color: active === true ? 'primary.main' : 'text.secondary',
          backgroundColor: active === true ? 'action.selected' : 'transparent',
        }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
)

const GroupDivider = (): ReactElement => (
  <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />
)

export const DescriptionEditor = ({
  editor,
}: {
  editor: Editor | null
}): ReactElement => {
  // tiptap mutates the editor in place; re-render on its transactions so the
  // active states in the toolbar track the selection.
  const [, forceUpdate] = useReducer((tick: number) => tick + 1, 0)
  useEffect(() => {
    if (editor === null) {
      return
    }
    editor.on('transaction', forceUpdate)
    return () => {
      editor.off('transaction', forceUpdate)
    }
  }, [editor])

  const [linkAnchorEl, setLinkAnchorEl] = useState<HTMLButtonElement | null>(
    null,
  )
  const [linkUrl, setLinkUrl] = useState('')

  const applyLink = (): void => {
    if (editor === null) {
      return
    }
    if (linkUrl.trim() !== '') {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl.trim() })
        .run()
    }
    setLinkAnchorEl(null)
    setLinkUrl('')
  }

  if (editor === null) {
    return <Box sx={{ height: '100%' }} />
  }

  const heading = (level: 1 | 2 | 3 | 4): ReactElement => (
    <ToolbarControl
      key={level}
      title={`Heading ${level}`}
      active={editor.isActive('heading', { level })}
      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, width: 20 }}>
        H{level}
      </Typography>
    </ToolbarControl>
  )

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          px: 0.5,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <ToolbarControl
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlinedIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughSIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          <FormatClearIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Highlight"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <HighlightIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Code"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <CodeIcon fontSize="small" />
        </ToolbarControl>

        <GroupDivider />
        {[1, 2, 3, 4].map((level) => heading(level as 1 | 2 | 3 | 4))}

        <GroupDivider />
        <ToolbarControl
          title="Blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <FormatQuoteIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <HorizontalRuleIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Ordered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Subscript"
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <SubscriptIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Superscript"
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <SuperscriptIcon fontSize="small" />
        </ToolbarControl>

        <GroupDivider />
        <ToolbarControl
          title="Add link"
          active={editor.isActive('link')}
          onClick={(event) => {
            setLinkUrl((editor.getAttributes('link').href as string) ?? '')
            setLinkAnchorEl(event.currentTarget)
          }}
        >
          <InsertLinkIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Remove link"
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <LinkOffIcon fontSize="small" />
        </ToolbarControl>

        <GroupDivider />
        <ToolbarControl
          title="Align left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <FormatAlignLeftIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <FormatAlignCenterIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Justify"
          active={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <FormatAlignJustifyIcon fontSize="small" />
        </ToolbarControl>
        <ToolbarControl
          title="Align right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <FormatAlignRightIcon fontSize="small" />
        </ToolbarControl>
      </Box>

      <Popover
        open={linkAnchorEl !== null}
        anchorEl={linkAnchorEl}
        onClose={() => setLinkAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            autoFocus
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyLink()
              }
            }}
          />
          <Button size="small" variant="contained" onClick={applyLink}>
            Apply
          </Button>
        </Box>
      </Popover>

      <Box
        onClick={() => editor.chain().focus().run()}
        sx={{
          flex: 1,
          overflowY: 'auto',
          cursor: 'text',
          px: 1.5,
          // tiptap renders into a .ProseMirror element; give it sane
          // defaults now that Mantine's stylesheet is gone.
          '& .ProseMirror': {
            outline: 'none',
            minHeight: '100%',
            fontSize: 14,
          },
          '& .ProseMirror blockquote': {
            borderLeft: (theme) => `3px solid ${theme.palette.divider}`,
            ml: 0,
            pl: 1.5,
            color: 'text.secondary',
          },
        }}
      >
        <EditorContent editor={editor} style={{ height: '100%' }} />
      </Box>
    </Box>
  )
}
