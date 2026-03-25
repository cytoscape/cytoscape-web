import ClearIcon from '@mui/icons-material/Clear'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useRef, useState } from 'react'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import { logApp } from '../../debug'
import { AppListPanel } from './AppListPanel'
import { useAppManagerCommands } from './AppManagerCommandsContext'
import { parseManifest } from './manifest/parseManifest'
import { ServiceListPanel } from './ServiceListPanel'

interface AppSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
}

/**
 * Validate a custom manifest URL.
 * In production, only https: is allowed. In dev, http: is also permitted.
 */
function validateManifestUrl(input: string): string | undefined {
  try {
    const parsed = new URL(input, window.location.origin)
    const isDev = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    if (parsed.protocol === 'https:') return undefined
    if (isDev && parsed.protocol === 'http:') return undefined
    return 'URL must use HTTPS protocol'
  } catch {
    return 'Invalid URL format'
  }
}

export const AppSettingsDialog = ({
  openDialog,
  setOpenDialog,
}: AppSettingsDialogProps) => {
  const theme: Theme = useTheme()
  const { setManifestSource, refreshCatalog } = useAppManagerCommands()
  const currentSource = useAppStore((state) => state.manifestSource)

  const [tabIndex, setTabIndex] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState<string | undefined>()
  const [fileError, setFileError] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSetCustomUrl = (): void => {
    const error = validateManifestUrl(urlInput)
    if (error !== undefined) {
      setUrlError(error)
      return
    }
    const resolved = new URL(urlInput, window.location.origin).href
    setManifestSource({ type: 'url', url: resolved })
    setUrlError(undefined)
    void refreshCatalog()
  }

  const handleClearSource = (): void => {
    setManifestSource(undefined)
    setUrlInput('')
    setUrlError(undefined)
    setFileError(undefined)
    void refreshCatalog()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file === undefined) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      try {
        const data = JSON.parse(content)
        const entries = parseManifest(data)
        if (entries.length === 0) {
          setFileError('No valid entries found in manifest file')
          return
        }
        setManifestSource({ type: 'inline', content })
        setFileError(undefined)
        void refreshCatalog()
      } catch (err) {
        setFileError('Failed to parse manifest file')
        logApp.warn('[AppSettingsDialog]: Failed to parse uploaded manifest:', err)
      }
    }
    reader.readAsText(file)
    // Reset file input so re-uploading the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const sourceLabel =
    currentSource === undefined
      ? 'Default (apps.json)'
      : currentSource.type === 'url'
        ? currentSource.url
        : 'Uploaded file'

  return (
    <Dialog
      data-testid="app-settings-dialog"
      open={openDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 480 },
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="fullWidth"
        >
          <Tab label="Apps" />
          <Tab label="Service Apps" />
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 2, pb: 1 }}>
        {tabIndex === 0 && (
          <Box>
            <AppListPanel />

            <Accordion
              disableGutters
              elevation={0}
              sx={{
                mt: 2,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">Manifest Source</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sourceLabel}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {currentSource !== undefined && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1.5,
                      p: 1,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        flexGrow: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Current: {sourceLabel}
                    </Typography>
                    <Tooltip title="Reset to default">
                      <IconButton size="small" onClick={handleClearSource}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <TextField
                    size="small"
                    label="Custom manifest URL"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value)
                      setUrlError(undefined)
                    }}
                    error={urlError !== undefined}
                    helperText={urlError}
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSetCustomUrl}
                    disabled={urlInput.trim() === ''}
                    sx={{ whiteSpace: 'nowrap', mt: '4px' }}
                  >
                    Apply
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<UploadFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload manifest
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  {fileError !== undefined && (
                    <Typography variant="caption" color="error">
                      {fileError}
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {tabIndex === 1 && <ServiceListPanel />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          data-testid="app-settings-dialog-close-button"
          variant="contained"
          onClick={() => setOpenDialog(false)}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
