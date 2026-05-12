import ClearIcon from '@mui/icons-material/Clear'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import RefreshIcon from '@mui/icons-material/Refresh'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Link,
  Tab,
  Tabs,
  TextField,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useRef, useState } from 'react'

import { DEFAULT_MANIFEST_URL } from '../../app-api/constants'
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
    const isDev =
      window.location.hostname === 'localhost' ||
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
  const [refreshing, setRefreshing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
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
        logApp.warn(
          '[AppSettingsDialog]: Failed to parse uploaded manifest:',
          err,
        )
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

  const handleSourceClick = (): void => {
    if (currentSource?.type === 'inline') {
      try {
        setPreviewContent(
          JSON.stringify(JSON.parse(currentSource.content), null, 2),
        )
      } catch {
        setPreviewContent(currentSource.content)
      }
      setPreviewTitle('Uploaded Manifest')
      setPreviewOpen(true)
      return
    }

    const url =
      currentSource === undefined ? DEFAULT_MANIFEST_URL : currentSource.url

    setPreviewTitle(url)
    setPreviewContent('Loading...')
    setPreviewOpen(true)

    fetch(url)
      .then((res) => res.json())
      .then((data) => setPreviewContent(JSON.stringify(data, null, 2)))
      .catch(() => setPreviewContent('Failed to load manifest.'))
  }

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
                <Typography variant="subtitle2">Manifest Source</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
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
                  <Link
                    component="button"
                    variant="body2"
                    onClick={handleSourceClick}
                    sx={{
                      flexGrow: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {sourceLabel}
                  </Link>
                  {currentSource !== undefined && (
                    <Tooltip title="Reset to default">
                      <IconButton size="small" onClick={handleClearSource}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
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
                    sx={{ whiteSpace: 'nowrap', height: 40 }}
                  >
                    Apply
                  </Button>
                  <Tooltip title="Upload manifest file">
                    <IconButton
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        height: 40,
                        width: 40,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <UploadFileIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </Box>
                {fileError !== undefined && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {fileError}
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>
        )}

        {tabIndex === 1 && <ServiceListPanel />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          variant="outlined"
          disabled={refreshing}
          startIcon={
            refreshing ? <CircularProgress size={16} /> : <RefreshIcon />
          }
          onClick={() => {
            setRefreshing(true)
            refreshCatalog().finally(() => setRefreshing(false))
          }}
        >
          Refresh
        </Button>
        <Button
          data-testid="app-settings-dialog-close-button"
          variant="contained"
          onClick={() => setOpenDialog(false)}
        >
          Close
        </Button>
      </DialogActions>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {previewTitle}
          </Typography>
          <Box
            component="pre"
            sx={{
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 400,
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              m: 0,
            }}
          >
            {previewContent}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
