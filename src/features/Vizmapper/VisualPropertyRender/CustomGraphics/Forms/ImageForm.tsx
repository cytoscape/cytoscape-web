import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import ImageIcon from '@mui/icons-material/Image'
import LinkIcon from '@mui/icons-material/Link'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import * as React from 'react'

import { IMAGE_CONSTANTS } from '../utils/constants'

type ImageInputMode = 'url' | 'upload'

interface ImageFormProps {
  url: string
  onUpdate: (url: string) => void
}

/** Detect mode from the current URL value */
const detectMode = (url: string): ImageInputMode => {
  if (url.startsWith('data:')) return 'upload'
  return 'url'
}

/** Extract a human-readable filename from a data URI or URL */
const getDisplayName = (url: string): string => {
  if (url.startsWith('data:')) {
    // Try to extract MIME type for display
    const match = url.match(/^data:(image\/[^;,]+)/)
    if (match) {
      const ext = match[1].split('/')[1]?.replace('svg+xml', 'svg') ?? 'image'
      return `Uploaded image (${ext.toUpperCase()})`
    }
    return 'Uploaded image'
  }
  try {
    const pathname = new URL(url).pathname
    return pathname.split('/').pop() ?? url
  } catch {
    return url
  }
}

export const ImageForm: React.FC<ImageFormProps> = ({ url, onUpdate }) => {
  const [mode, setMode] = React.useState<ImageInputMode>(() => detectMode(url))
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Sync mode when external url changes (e.g. when editing existing graphic)
  React.useEffect(() => {
    setMode(detectMode(url))
  }, [url])

  const handleModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: ImageInputMode | null,
  ) => {
    if (newMode !== null) {
      setMode(newMode)
      setError(null)
    }
  }

  /** Validate and read a file, converting it to a data URI */
  const processFile = (file: File) => {
    setError(null)

    // Validate type
    if (
      !IMAGE_CONSTANTS.ACCEPTED_TYPES.includes(
        file.type as (typeof IMAGE_CONSTANTS.ACCEPTED_TYPES)[number],
      )
    ) {
      setError(
        `Unsupported file type "${file.type || 'unknown'}". Accepted: PNG, JPEG, SVG, GIF, WebP.`,
      )
      return
    }

    // Validate size
    if (file.size > IMAGE_CONSTANTS.MAX_FILE_SIZE_BYTES) {
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${IMAGE_CONSTANTS.MAX_FILE_SIZE_LABEL}.`,
      )
      return
    }

    setIsLoading(true)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string
      onUpdate(dataUri)
      setIsLoading(false)
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
      setIsLoading(false)
    }
    reader.readAsDataURL(file)
  }

  // --- Drag and drop handlers ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    onUpdate('')
    setError(null)
  }

  const hasUploadedImage = mode === 'upload' && url.startsWith('data:')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Mode toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Choose how to provide your image:
        </Typography>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          size="small"
        >
          <ToggleButton value="url">
            <LinkIcon sx={{ mr: 0.5, fontSize: 18 }} />
            URL
          </ToggleButton>
          <ToggleButton value="upload">
            <CloudUploadIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Upload
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* URL mode */}
      {mode === 'url' && (
        <TextField
          label="Image URL"
          value={url.startsWith('data:') ? '' : url}
          onChange={(e) => onUpdate(e.target.value)}
          fullWidth
          variant="outlined"
          placeholder="https://example.com/image.png"
          helperText="Enter the URL of an image (HTTPS recommended)"
        />
      )}

      {/* Upload mode */}
      {mode === 'upload' && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_CONSTANTS.ACCEPTED_EXTENSIONS}
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          {hasUploadedImage ? (
            // Show uploaded image preview with remove button
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <img
                  src={url}
                  alt="Uploaded"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getDisplayName(url)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click remove to clear, or drop a new file to replace.
                </Typography>
              </Box>
              <Tooltip title="Remove image">
                <IconButton
                  onClick={handleRemove}
                  size="small"
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            // Drop zone
            <Box
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                p: 4,
                borderRadius: 2,
                border: 2,
                borderStyle: 'dashed',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                bgcolor: isDragOver
                  ? 'action.hover'
                  : 'background.default',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: 140,
                '&:hover': {
                  borderColor: 'primary.light',
                  bgcolor: 'action.hover',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={32} />
              ) : (
                <>
                  <ImageIcon
                    sx={{
                      fontSize: 40,
                      color: isDragOver
                        ? 'primary.main'
                        : 'text.disabled',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {isDragOver
                      ? 'Drop image here'
                      : 'Drag & drop an image, or click to browse'}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    PNG, JPEG, SVG, GIF, WebP •{' '}
                    Max {IMAGE_CONSTANTS.MAX_FILE_SIZE_LABEL}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </>
      )}

      {/* Error display */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  )
}
