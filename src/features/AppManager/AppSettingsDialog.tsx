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
import { useContext, useRef, useState } from 'react'

import {
  DEFAULT_MANIFEST_URL,
  EXTERNAL_APPS_ENABLED,
} from '../../app-api/constants'
import { CyDialog } from '@/components/CyDialog'
import { AppConfigContext } from '../../AppConfigContext'

import { useAppStore } from '../../data/hooks/stores/AppStore'
import { logApp } from '../../debug'
import { AppListPanel } from './AppListPanel'
import { useAppManagerCommands } from './AppManagerCommandsContext'
import {
  isAllowedOrigin,
  validateManifestUrl,
  isHostCompatible,
  parseSingleEntryManifest,
} from './install/installGate'
import { parseManifest } from './manifest/parseManifest'
import { ServiceListPanel } from './ServiceListPanel'

interface AppSettingsDialogProps {
  openDialog: boolean
  setOpenDialog: (open: boolean) => void
}

export const AppSettingsDialog = ({
  openDialog,
  setOpenDialog,
}: AppSettingsDialogProps) => {
  const theme: Theme = useTheme()
  const { setManifestSource, refreshCatalog, installApp } =
    useAppManagerCommands()
  const currentSource = useAppStore((state) => state.manifestSource)
  const { appInstallAllowedOrigins, allowsLocalhostAppsOn } =
    useContext(AppConfigContext)

  const [tabIndex, setTabIndex] = useState(0)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState<string | undefined>()
  const [fileError, setFileError] = useState<string | undefined>()
  const [refreshing, setRefreshing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [installUrl, setInstallUrl] = useState('')
  const [installError, setInstallError] = useState<string | undefined>()
  const [installing, setInstalling] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Install a single app from a manifest URL (§12.8). Validates the entry
   * inline through the same trust-boundary gates as installApp, so errors are
   * shown in-place rather than as a toast. Manual installs arrive inactive.
   */
  const handleInstallFromUrl = async (): Promise<void> => {
    const url = installUrl.trim()
    if (url === '') return
    setInstallError(undefined)
    setInstalling(true)
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const data = await response.json()
      const entry = parseSingleEntryManifest(data)
      if (entry === undefined) {
        setInstallError('No valid app entry found in the manifest')
        return
      }
      if (
        !isAllowedOrigin(
          entry.url,
          appInstallAllowedOrigins,
          allowsLocalhostAppsOn,
        )
      ) {
        setInstallError('The app URL is not from an allowed origin')
        return
      }
      if (!isHostCompatible(entry.compatibleHostVersions)) {
        setInstallError('The app is not compatible with this host version')
        return
      }
      await installApp(entry, { activate: false })
      setInstallUrl('')
    } catch (err) {
      setInstallError(
        err instanceof Error ? err.message : 'Failed to install app',
      )
      logApp.warn('[AppSettingsDialog]: Install from URL failed:', err)
    } finally {
      setInstalling(false)
    }
  }

  const handleSetCustomUrl = (): void => {
    if (!EXTERNAL_APPS_ENABLED) return

    const error = validateManifestUrl(urlInput, allowsLocalhostAppsOn)
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
    if (!EXTERNAL_APPS_ENABLED) return

    setManifestSource(undefined)
    setUrlInput('')
    setUrlError(undefined)
    setFileError(undefined)
    void refreshCatalog()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!EXTERNAL_APPS_ENABLED) return

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
    if (!EXTERNAL_APPS_ENABLED) {
      setPreviewTitle('External Apps Disabled')
      setPreviewContent(
        'This standalone build does not load external app manifests or remote plugins.',
      )
      setPreviewOpen(true)
      return
    }

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
    <CyDialog
      dismiss="lightweight"
      data-testid="app-settings-dialog"
      open={openDialog}
      onClose={() => setOpenDialog(false)}
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

            <Box
              sx={{
                mt: 2,
                p: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Install from URL
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  size="small"
                  label="Single-entry manifest URL"
                  value={installUrl}
                  onChange={(e) => {
                    setInstallUrl(e.target.value)
                    setInstallError(undefined)
                  }}
                  error={installError !== undefined}
                  helperText={installError}
                  fullWidth
                  inputProps={{ 'data-testid': 'install-from-url-input' }}
                />
                <Button
                  variant="contained"
                  size="small"
                  data-testid="install-from-url-button"
                  onClick={() => void handleInstallFromUrl()}
                  disabled={installUrl.trim() === '' || installing}
                  startIcon={
                    installing ? <CircularProgress size={16} /> : undefined
                  }
                  sx={{ whiteSpace: 'nowrap', height: 40 }}
                >
                  Install
                </Button>
              </Box>
            </Box>

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
                {!EXTERNAL_APPS_ENABLED && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5 }}
                  >
                    External app loading is disabled in this standalone build.
                  </Typography>
                )}
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
                    {EXTERNAL_APPS_ENABLED ? sourceLabel : 'Standalone build'}
                  </Link>
                  {currentSource !== undefined && (
                    <Tooltip title="Reset to default">
                      <IconButton
                        size="small"
                        onClick={handleClearSource}
                        disabled={!EXTERNAL_APPS_ENABLED}
                      >
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
                    disabled={!EXTERNAL_APPS_ENABLED}
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
                    disabled={!EXTERNAL_APPS_ENABLED || urlInput.trim() === ''}
                    sx={{ whiteSpace: 'nowrap', height: 40 }}
                  >
                    Apply
                  </Button>
                  <Tooltip title="Upload manifest file">
                    <IconButton
                      size="small"
                      disabled={!EXTERNAL_APPS_ENABLED}
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
                    disabled={!EXTERNAL_APPS_ENABLED}
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
          disabled={!EXTERNAL_APPS_ENABLED || refreshing}
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

      <CyDialog
        dismiss="lightweight"
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
      </CyDialog>
    </CyDialog>
  )
}
