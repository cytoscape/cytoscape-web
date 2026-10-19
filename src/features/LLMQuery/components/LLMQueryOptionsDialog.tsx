import ContentCopy from '@mui/icons-material/ContentCopy'
import Preview from '@mui/icons-material/Preview'
import Refresh from '@mui/icons-material/Refresh'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { listLLMModels } from '../api/chatgpt'
import { getWebGPUSupport, WebGPUSupport } from '../api/webgpu'
import { startWebLLMModelLoad, stopWebLLM } from '../api/webllmSession'
import { LLMModel } from '../model/LLMModel'
import {
  getEndpointError,
  getLLMProvider,
  LLMProviderId,
  providers,
  selectApiKey,
} from '../model/LLMProvider'
import { LLMTemplate, templates } from '../model/LLMTemplate'
import {
  formatModelSize,
  getWebLLMModelOptions,
  WebLLMStatus,
} from '../model/WebLLMModel'
import { useLLMQueryStore } from '../store'
import { LLM_QUERY_TAB_INDEX } from '@/models/UiModel/impl/panelTabs'

// What the dialog says about the selected in-browser model's load state
const describeWebLLMStatus = (
  status: WebLLMStatus,
  modelId: LLMModel,
): string | undefined => {
  if (status.state === 'idle' || status.modelId !== modelId) {
    return undefined
  }
  switch (status.state) {
    case 'loading':
      return `Loading: ${Math.floor(status.progress * 100)}%`
    case 'ready':
      return 'Loaded and ready'
    case 'error':
      return `Failed to load: ${status.message}`
  }
}

interface LLMQueryOptionsDialogProps {
  open: boolean
  handleClose: () => void
}

export const LLMQueryOptionsDialog = (
  props: LLMQueryOptionsDialogProps,
): JSX.Element => {
  const { open, handleClose } = props

  // The Analysis menu keeps this dialog mounted and only toggles `open`, so
  // the dialog is re-created (by key) on every open: it re-seeds from the
  // store, and edits abandoned with Cancel are discarded. The key is stable
  // while closing, so the exit transition still plays. Adjusting state during render
  // (rather than in an effect) means the first opened frame is already fresh.
  const [wasOpen, setWasOpen] = useState(open)
  const [formKey, setFormKey] = useState(0)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setFormKey(formKey + 1)
    }
  }

  return (
    <LLMQueryOptionsDialogContent
      key={formKey}
      open={open}
      handleClose={handleClose}
    />
  )
}

/**
 * The dialog itself. It owns every unsaved field; nothing reaches the store
 * until Confirm. Kept as one component so the Cancel button stays inside the
 * CyDialog block, where the dismissal policy test looks for it.
 */
const LLMQueryOptionsDialogContent = (
  props: LLMQueryOptionsDialogProps,
): JSX.Element => {
  const { open, handleClose } = props

  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const addMessage = useMessageStore((state) => state.addMessage)
  const setLLMModel = useLLMQueryStore((state) => state.setLLMModel)
  const setLLMApiKey = useLLMQueryStore((state) => state.setLLMApiKey)
  const setLLMCustomApiKey = useLLMQueryStore(
    (state) => state.setLLMCustomApiKey,
  )
  const setLLMProvider = useLLMQueryStore((state) => state.setLLMProvider)
  const setLLMBaseUrl = useLLMQueryStore((state) => state.setLLMBaseUrl)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMProvider = useLLMQueryStore((state) => state.LLMProvider)
  const LLMBaseUrl = useLLMQueryStore((state) => state.LLMBaseUrl)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMCustomApiKey = useLLMQueryStore((state) => state.LLMCustomApiKey)
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)
  const setLLMTemplate = useLLMQueryStore((state) => state.setLLMTemplate)
  const webLLMStatus = useLLMQueryStore((state) => state.webLLMStatus)
  const setPanelState = useUiStateStore((state) => state.setPanelState)
  const setActiveNetworkBrowserPanelIndex = useUiStateStore(
    (state) => state.setActiveNetworkBrowserPanelIndex,
  )

  const [localProvider, setLocalProvider] = useState<LLMProviderId>(LLMProvider)
  const [localBaseUrl, setLocalBaseUrl] = useState<string>(LLMBaseUrl)
  const [localLLMModel, setLocalLLMModel] = useState<LLMModel>(LLMModel)
  const [localLLMApiKey, setLocalLLMApiKey] = useState<string>('')
  const [localLLMTemplate, setLocalLLMTemplate] =
    useState<LLMTemplate>(LLMTemplate)
  const [fetchedModels, setFetchedModels] = useState<LLMModel[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)
  // undefined while the WebGPU check has not answered yet
  const [webGPU, setWebGPU] = useState<WebGPUSupport | undefined>(undefined)

  // Bumped whenever the provider or endpoint changes, or the dialog closes, so
  // a model listing requested earlier is dropped when it comes back.
  const refreshRequestRef = useRef(0)
  const invalidateRefresh = (): void => {
    refreshRequestRef.current += 1
    setFetchingModels(false)
  }

  // Closing the dialog abandons a listing that is still in flight, so it
  // cannot raise a toast about a dialog the user has already left. Keyed on
  // `open` rather than on the buttons, so it holds for any close path.
  useEffect(() => {
    if (!open) {
      refreshRequestRef.current += 1
    }
  }, [open])

  const provider = getLLMProvider(localProvider)
  const isWebLLM = provider.runsInBrowser
  const usesEndpoint = localProvider === 'ollama' || localProvider === 'custom'
  const usesApiKey = localProvider === 'openai' || localProvider === 'custom'

  // The in-browser provider needs WebGPU; the check runs once per session
  // and its answer also decides which model builds this GPU can run.
  useEffect(() => {
    if (!isWebLLM) {
      return
    }
    let current = true
    void getWebGPUSupport().then((support) => {
      if (!current) {
        return
      }
      setWebGPU(support)
      const options = support.supported
        ? getWebLLMModelOptions(support.shaderF16)
        : []
      setLocalLLMModel((model) =>
        options.some((m) => m.id === model) ? model : (options[0]?.id ?? ''),
      )
    })
    return () => {
      current = false
    }
  }, [isWebLLM])

  const webLLMOptions =
    webGPU?.supported === true ? getWebLLMModelOptions(webGPU.shaderF16) : []
  const webLLMModelValid = webLLMOptions.some((m) => m.id === localLLMModel)

  // Keys are provider-scoped: a key typed here belongs to the selected
  // provider, a blank field keeps that provider's stored key, and Ollama and
  // WebLLM are never sent one. The OpenAI key must not reach any other endpoint.
  const typedApiKey = localLLMApiKey.trim()
  const effectiveApiKey = !usesApiKey
    ? ''
    : typedApiKey !== ''
      ? typedApiKey
      : selectApiKey(localProvider, {
          openAiKey: LLMApiKey,
          customKey: LLMCustomApiKey,
        })
  const endpointError = usesEndpoint
    ? getEndpointError(localBaseUrl, effectiveApiKey)
    : undefined
  const modelOptions = Array.from(
    new Set([...fetchedModels, ...provider.suggestedModels]),
  )

  const handleProviderChange = (id: LLMProviderId): void => {
    const next = getLLMProvider(id)
    setLocalProvider(next.id)
    setLocalBaseUrl(next.defaultBaseUrl)
    setLocalLLMModel(next.suggestedModels[0] ?? '')
    setFetchedModels([])
    // A key typed for one provider must not be applied to another
    setLocalLLMApiKey('')
    invalidateRefresh()
  }

  const handleBaseUrlChange = (value: string): void => {
    setLocalBaseUrl(value)
    invalidateRefresh()
  }

  const handleRefreshModels = async (): Promise<void> => {
    refreshRequestRef.current += 1
    const requestId = refreshRequestRef.current
    const isCurrent = (): boolean => requestId === refreshRequestRef.current
    setFetchingModels(true)
    try {
      const ids = await listLLMModels({
        apiKey: effectiveApiKey,
        baseUrl: localBaseUrl,
      })
      if (!isCurrent()) {
        return
      }
      setFetchedModels(ids)
      if (ids.length > 0 && !ids.includes(localLLMModel)) {
        setLocalLLMModel(ids[0])
      }
      addMessage({
        message:
          ids.length === 0
            ? 'The endpoint reported no models'
            : `Found ${ids.length} model${ids.length === 1 ? '' : 's'}`,
        duration: 4000,
        severity:
          ids.length === 0 ? MessageSeverity.WARNING : MessageSeverity.INFO,
      })
    } catch (e) {
      if (!isCurrent()) {
        return
      }
      addMessage({
        message: `Could not list models from ${localBaseUrl}: ${
          e instanceof Error ? e.message : String(e)
        }`,
        duration: 8000,
        severity: MessageSeverity.ERROR,
      })
    }
    setFetchingModels(false)
  }

  const copyTextToClipboard = async (text: string): Promise<void> => {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    }
  }

  const handleCopyTemplateClick = (): void => {
    void copyTextToClipboard(localLLMTemplate.rawText).then(() => {
      addMessage({
        message: `LLM prompt copied to clipboard`,
        duration: 4000,
        severity: MessageSeverity.INFO,
      })
    })
  }

  const apiKeyLabel = provider.requiresApiKey ? 'OpenAI API Key' : 'API Key'
  const apiKeyTooltip = provider.requiresApiKey
    ? 'You need to add an API key generated in your PAID account'
    : 'Optional. Sent only to this endpoint, never your OpenAI key.'
  const baseUrlHelp =
    localProvider === 'ollama'
      ? 'Ollama allows localhost origins by default. When this app is served from another host, start Ollama with OLLAMA_ORIGINS set to that origin.'
      : 'Base URL of an OpenAI-compatible chat completions endpoint, e.g. https://host/v1'

  return (
    <CyDialog
      data-testid="llm-query-options-dialog"
      maxWidth="sm"
      fullWidth={true}
      open={open}
    >
      <DialogTitle>LLM Query Options</DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <FormControl sx={{ mb: 2, mt: 1 }} fullWidth>
          <InputLabel>Provider</InputLabel>
          <Select
            data-testid="llm-query-options-provider-select"
            size="small"
            value={localProvider}
            label="Provider"
            onChange={(e) =>
              handleProviderChange(e.target.value as LLMProviderId)
            }
          >
            {providers.map((p) => (
              <MenuItem
                key={p.id}
                value={p.id}
                data-testid={`llm-query-options-provider-${p.id}`}
              >
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {usesEndpoint && (
          <FormControl sx={{ mb: 2 }} fullWidth>
            <TextField
              data-testid="llm-query-options-base-url-input"
              size="small"
              fullWidth
              label="Endpoint URL"
              value={localBaseUrl}
              error={endpointError !== undefined}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
            />
            <FormHelperText error={endpointError !== undefined}>
              {endpointError ?? baseUrlHelp}
            </FormHelperText>
          </FormControl>
        )}
        {isWebLLM && (
          <Box sx={{ mb: 2 }}>
            {webGPU === undefined ? (
              <Alert
                data-testid="llm-query-options-webgpu-checking"
                severity="info"
                icon={<CircularProgress size={20} />}
              >
                Checking whether this browser can run models on the GPU...
              </Alert>
            ) : !webGPU.supported ? (
              <Alert
                data-testid="llm-query-options-webgpu-unsupported"
                severity="warning"
              >
                {webGPU.reason}
              </Alert>
            ) : (
              <Alert
                data-testid="llm-query-options-webgpu-supported"
                severity="info"
              >
                {`Experimental. The model runs on this computer's GPU (${webGPU.adapterName}), so prompts are not sent to any server. It is downloaded from Hugging Face the first time and then cached by the browser. Small in-browser models are less accurate than hosted ones.`}
                {!webGPU.shaderF16 &&
                  ' This GPU does not support 16-bit shaders, so builds that need more GPU memory are offered.'}
              </Alert>
            )}
          </Box>
        )}
        {isWebLLM ? (
          <FormControl
            sx={{ mb: 2 }}
            fullWidth
            disabled={webGPU?.supported !== true}
          >
            <InputLabel>LLM Model</InputLabel>
            <Select
              data-testid="llm-query-options-webllm-model-select"
              size="small"
              label="LLM Model"
              value={webLLMModelValid ? localLLMModel : ''}
              onChange={(e) => setLocalLLMModel(e.target.value)}
            >
              {webLLMOptions.map((m) => (
                <MenuItem
                  key={m.id}
                  value={m.id}
                  data-testid={`llm-query-options-webllm-model-${m.id}`}
                >
                  {`${m.label} (${formatModelSize(m.downloadMB)} download, ~${formatModelSize(m.vramMB)} GPU memory)`}
                </MenuItem>
              ))}
            </Select>
            {webLLMModelValid && (
              <FormHelperText data-testid="llm-query-options-webllm-status">
                {describeWebLLMStatus(webLLMStatus, localLLMModel) ??
                  'Loads in the background after Confirm'}
              </FormHelperText>
            )}
          </FormControl>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Autocomplete
              data-testid="llm-query-options-model-select"
              freeSolo
              fullWidth
              size="small"
              options={modelOptions}
              // Only the typed text is controlled: the model name is whatever
              // the field shows, whether picked from the list or typed.
              inputValue={localLLMModel}
              onInputChange={(_e, value) => setLocalLLMModel(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="LLM Model"
                  inputProps={{
                    ...params.inputProps,
                    'data-testid': 'llm-query-options-model-input',
                  }}
                />
              )}
            />
            {usesEndpoint && (
              <Tooltip title="List the models available at the endpoint">
                <span>
                  <IconButton
                    data-testid="llm-query-options-refresh-models-button"
                    aria-label="refresh models"
                    sx={{ ml: 1 }}
                    disabled={
                      fetchingModels ||
                      localBaseUrl.trim() === '' ||
                      endpointError !== undefined
                    }
                    onClick={() => {
                      void handleRefreshModels()
                    }}
                  >
                    {fetchingModels ? (
                      <CircularProgress size={20} />
                    ) : (
                      <Refresh />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Box>
        )}
        {usesApiKey && (
          <Tooltip title={apiKeyTooltip}>
            <TextField
              data-testid="llm-query-options-api-key-input"
              size="small"
              value={localLLMApiKey}
              fullWidth
              label={apiKeyLabel}
              onChange={(e) => setLocalLLMApiKey(e.target.value)}
            ></TextField>
          </Tooltip>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Prompt</InputLabel>
            <Select
              data-testid="llm-query-options-template-select"
              size="small"
              value={localLLMTemplate.name}
              label="Prompt"
              onChange={(e) => {
                const nextTemplate = templates.find(
                  (t) => t.name === e.target.value,
                )
                if (nextTemplate !== undefined) {
                  setLocalLLMTemplate(nextTemplate)
                }
              }}
            >
              {templates.map((t) => {
                return (
                  <MenuItem key={t.name} value={t.name}>
                    {t.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
          <ButtonGroup size="small" variant="contained" sx={{ ml: 1 }}>
            <Tooltip title="Preview selected prompt">
              <IconButton
                data-testid="llm-query-options-preview-button"
                sx={{
                  color: showTemplatePreview ? 'primary.main' : 'inherit',
                }}
                aria-label="preview"
                onClick={() => {
                  setShowTemplatePreview(!showTemplatePreview)
                }}
              >
                <Preview />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy selected prompt text">
              <IconButton
                data-testid="llm-query-options-copy-button"
                aria-label="copy"
                onClick={handleCopyTemplateClick}
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Box>
        <Box
          sx={{
            mt: 2,
            maxHeight: 300,
            overflowY: 'auto',
            p: 2,
            whiteSpace: 'pre-line',
          }}
        >
          {(showTemplatePreview && localLLMTemplate?.rawText) ?? ''}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          data-testid="llm-query-options-cancel-button"
          variant="outlined"
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          data-testid="llm-query-options-confirm-button"
          variant="contained"
          disabled={
            localLLMModel.trim() === '' ||
            endpointError !== undefined ||
            (isWebLLM && !webLLMModelValid)
          }
          onClick={() => {
            setLLMProvider(localProvider)
            setLLMBaseUrl(localBaseUrl.trim())
            setLLMModel(localLLMModel.trim())
            setLLMTemplate(localLLMTemplate)
            if (typedApiKey !== '') {
              if (localProvider === 'openai') {
                setLLMApiKey(typedApiKey)
              } else if (localProvider === 'custom') {
                setLLMCustomApiKey(typedApiKey)
              }
            }
            if (isWebLLM) {
              // Loads in the background; the LLM Query panel shows progress
              void startWebLLMModelLoad(localLLMModel)
              setPanelState('left', 'open')
              setActiveNetworkBrowserPanelIndex(LLM_QUERY_TAB_INDEX)
            } else {
              // Frees the GPU memory an in-browser model may still hold
              stopWebLLM()
            }
            handleClose()
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </CyDialog>
  )
}
