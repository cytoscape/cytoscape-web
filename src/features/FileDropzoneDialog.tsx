import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ReactNode, useRef, useState } from 'react'

export interface FileRejection {
  file: File
  errors: Array<{ code: string; message: string }>
}

export interface FileDropzoneProps {
  /** Returns an error to reject the file, or null to accept it. */
  validator: (file: File) => { code: string; message: string } | null
  onDrop: (file: File) => void
  onReject: (rejections: FileRejection[]) => void
  /** data-testid values, kept configurable so existing tests keep working. */
  testIds: { dropzone: string; browseButton: string }
  children: ReactNode
}

/**
 * MUI-based single-file drop area (drag-and-drop plus a Browse button over a
 * hidden file input). Replaces the Mantine Dropzone. The hidden input
 * deliberately lives inside the dropzone element: the e2e specs set files
 * through `[data-testid=...dropzone] input[type=file]`.
 */
export const FileDropzone = (props: FileDropzoneProps): JSX.Element => {
  const { validator, onDrop, onReject, testIds, children } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFiles = (files: File[]): void => {
    if (files.length === 0) {
      return
    }
    if (files.length > 1) {
      onReject(
        files.map((file) => ({
          file,
          errors: [
            {
              code: 'too-many-files',
              message: 'Only one file can be uploaded at a time.',
            },
          ],
        })),
      )
      return
    }
    const file = files[0]
    const error = validator(file)
    if (error !== null) {
      onReject([{ file, errors: [error] }])
      return
    }
    onDrop(file)
  }

  return (
    // The drop area itself carries no button semantics: it wraps the Browse
    // button, and a button inside a button is invalid. Clicking anywhere still
    // opens the picker; Browse is the keyboard entry point.
    <Box
      data-testid={testIds.dropzone}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        handleFiles(Array.from(e.dataTransfer.files))
      }}
      sx={{
        border: '2px dashed',
        borderColor: dragActive ? 'primary.main' : 'divider',
        borderRadius: 1,
        backgroundColor: dragActive ? 'action.hover' : 'transparent',
        cursor: 'pointer',
        minHeight: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        // The input lives inside the clickable Box; without this its own click
        // bubbles back into that handler and re-opens the picker.
        onClick={(e) => {
          e.stopPropagation()
        }}
        onChange={(e) => {
          handleFiles(Array.from(e.target.files ?? []))
          // Allow re-selecting the same file after a rejection.
          e.target.value = ''
        }}
      />
      <Stack alignItems="center" spacing={1.5}>
        <Button
          data-testid={testIds.browseButton}
          variant="contained"
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
        >
          Browse
        </Button>
        {children}
      </Stack>
    </Box>
  )
}

export interface FileDropzoneDialogProps
  extends Omit<FileDropzoneProps, 'testIds'> {
  show: boolean
  handleClose: () => void
  title: string
  testIds: { modal: string; dropzone: string; browseButton: string }
}

/** The drop area wrapped in a modal, for the upload-dialog use cases. */
export const FileDropzoneDialog = (
  props: FileDropzoneDialogProps,
): JSX.Element => {
  const { show, handleClose, title, testIds, ...dropzoneProps } = props
  const theme = useTheme()

  return (
    <Dialog
      data-testid={testIds.modal}
      open={show}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 2000 }}
    >
      <DialogTitle sx={{ color: theme.palette.text.secondary, pr: 6 }}>
        {title}
        <IconButton
          aria-label="Close"
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <FileDropzone
          {...dropzoneProps}
          testIds={{
            dropzone: testIds.dropzone,
            browseButton: testIds.browseButton,
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Small helper for the secondary text lines inside the dropzone. */
export const DropzoneHint = ({
  children,
  dimmed,
}: {
  children: ReactNode
  dimmed?: boolean
}): JSX.Element => (
  <Typography
    variant="body2"
    color={dimmed === true ? 'text.disabled' : 'text.secondary'}
    align="center"
  >
    {children}
  </Typography>
)
