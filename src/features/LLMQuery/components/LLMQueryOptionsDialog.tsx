import ContentCopy from '@mui/icons-material/ContentCopy'
import Preview from '@mui/icons-material/Preview'
import Refresh from '@mui/icons-material/Refresh'
import {
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
import { useState } from 'react'

import { CyDialog } from '@/components/CyDialog'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { listLLMModels } from '../api/chatgpt'
import { LLMModel } from '../model/LLMModel'
import { getLLMProvider, LLMProviderId, providers } from '../model/LLMProvider'
import { LLMTemplate, templates } from '../model/LLMTemplate'
import { useLLMQueryStore } from '../store'

interface LLMQueryOptionsDialogProps {
  open: boolean
  handleClose: () => void
}

export const LLMQueryOptionsDialog = (
  props: LLMQueryOptionsDialogProps,
): JSX.Element => {
  const { open, handleClose } = props

  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const addMessage = useMessageStore((state) => state.addMessage)
  const setLLMModel = useLLMQueryStore((state) => state.setLLMModel)
  const setLLMApiKey = useLLMQueryStore((state) => state.setLLMApiKey)
  const setLLMProvider = useLLMQueryStore((state) => state.setLLMProvider)
  const setLLMBaseUrl = useLLMQueryStore((state) => state.setLLMBaseUrl)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMProvider = useLLMQueryStore((state) => state.LLMProvider)
  const LLMBaseUrl = useLLMQueryStore((state) => state.LLMBaseUrl)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)
  const setLLMTemplate = useLLMQueryStore((state) => state.setLLMTemplate)

  const [localProvider, setLocalProvider] = useState<LLMProviderId>(LLMProvider)
  const [localBaseUrl, setLocalBaseUrl] = useState<string>(LLMBaseUrl)
  const [localLLMModel, setLocalLLMModel] = useState<LLMModel>(LLMModel)
  const [localLLMApiKey, setLocalLLMApiKey] = useState<string>('')
  const [localLLMTemplate, setLocalLLMTemplate] =
    useState<LLMTemplate>(LLMTemplate)
  const [fetchedModels, setFetchedModels] = useState<LLMModel[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)

  const provider = getLLMProvider(localProvider)
  const modelOptions = Array.from(
    new Set([...fetchedModels, ...provider.suggestedModels]),
  )

  const handleProviderChange = (id: LLMProviderId): void => {
    const next = getLLMProvider(id)
    setLocalProvider(next.id)
    setLocalBaseUrl(next.defaultBaseUrl)
    setLocalLLMModel(next.suggestedModels[0] ?? '')
    setFetchedModels([])
  }

  const handleRefreshModels = async (): Promise<void> => {
    setFetchingModels(true)
    try {
      const ids = await listLLMModels({
        apiKey: localLLMApiKey !== '' ? localLLMApiKey : LLMApiKey,
        baseUrl: localBaseUrl,
      })
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
    : 'Optional. Ollama ignores it; other endpoints may require one.'
  const baseUrlHelp =
    localProvider === 'ollama'
      ? 'Ollama allows localhost origins by default. When this app is served from another host, start Ollama with OLLAMA_ORIGINS set to that origin.'
      : 'Base URL of an OpenAI-compatible chat completions endpoint, e.g. http://host:8000/v1'

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
        {localProvider !== 'openai' && (
          <FormControl sx={{ mb: 2 }} fullWidth>
            <TextField
              data-testid="llm-query-options-base-url-input"
              size="small"
              fullWidth
              label="Endpoint URL"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
            />
            <FormHelperText>{baseUrlHelp}</FormHelperText>
          </FormControl>
        )}
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
          {localProvider !== 'openai' && (
            <Tooltip title="List the models available at the endpoint">
              <span>
                <IconButton
                  data-testid="llm-query-options-refresh-models-button"
                  aria-label="refresh models"
                  sx={{ ml: 1 }}
                  disabled={fetchingModels || localBaseUrl.trim() === ''}
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
          disabled={localLLMModel.trim() === ''}
          onClick={() => {
            setLLMProvider(localProvider)
            setLLMBaseUrl(localBaseUrl.trim())
            setLLMModel(localLLMModel.trim())
            setLLMTemplate(localLLMTemplate)
            if (localLLMApiKey !== '') {
              setLLMApiKey(localLLMApiKey)
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
