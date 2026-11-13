import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import KeyOffIcon from '@mui/icons-material/KeyOff'
import PreviewIcon from '@mui/icons-material/Preview'
import RefreshIcon from '@mui/icons-material/Refresh'
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
import { MessageSeverity } from '../../../models/MessageModel'
import { listLLMModels } from '../api/chatgpt'
import { getModelNameError, LLMModel } from '../model/LLMModel'
import {
  endpointOrigin,
  getApiKeyError,
  getEndpointError,
  getLLMProvider,
  LLMProviderId,
  providers,
  selectApiKey,
} from '../model/LLMProvider'
import { LLMTemplate, templates } from '../model/LLMTemplate'
import { hasEnteredLLMApiKey, useLLMQueryStore } from '../store'
import { useHydrateLLMQueryOptions } from '../store/useHydrateLLMQueryOptions'

// Present for password managers only: they file a saved secret under a
// username, and offer nothing for a password field that has none beside it.
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  margin: -1,
} as const

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
  //
  // The saved options are read from the profile database after mount. A
  // read that lands while the dialog is open updates the form in place (see
  // the content), so what the user typed is never discarded.
  useHydrateLLMQueryOptions()
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
  const setLLMOptions = useLLMQueryStore((state) => state.setLLMOptions)
  const setLLMApiKey = useLLMQueryStore((state) => state.setLLMApiKey)
  const setLLMCustomApiKey = useLLMQueryStore(
    (state) => state.setLLMCustomApiKey,
  )
  const clearLLMApiKey = useLLMQueryStore((state) => state.clearLLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMProvider = useLLMQueryStore((state) => state.LLMProvider)
  const LLMBaseUrl = useLLMQueryStore((state) => state.LLMBaseUrl)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMCustomApiKey = useLLMQueryStore((state) => state.LLMCustomApiKey)
  const LLMCustomApiKeyOrigin = useLLMQueryStore(
    (state) => state.LLMCustomApiKeyOrigin,
  )
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

  // The saved options can arrive after the form was seeded with the
  // defaults. Provider, endpoint and model follow them until the user
  // changes one of the three; those three go together, since a model or
  // endpoint is chosen for a provider. Other fields, a typed key included,
  // are untouched. Without this, a key typed before the read landed would
  // leave the defaults in the form, and Confirm would save them over the
  // options just read.
  const [optionsEdited, setOptionsEdited] = useState(false)
  const [seededOptions, setSeededOptions] = useState({
    provider: LLMProvider,
    baseUrl: LLMBaseUrl,
    model: LLMModel,
  })
  if (
    !optionsEdited &&
    (seededOptions.provider !== LLMProvider ||
      seededOptions.baseUrl !== LLMBaseUrl ||
      seededOptions.model !== LLMModel)
  ) {
    setSeededOptions({
      provider: LLMProvider,
      baseUrl: LLMBaseUrl,
      model: LLMModel,
    })
    setLocalProvider(LLMProvider)
    setLocalBaseUrl(LLMBaseUrl)
    setLocalLLMModel(LLMModel)
    setFetchedModels([])
  }
  const onOptionsEdit = (): void => {
    if (!optionsEdited) {
      setOptionsEdited(true)
    }
  }

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
  // Keys are provider-scoped: a key typed here belongs to the selected
  // provider, a blank field keeps that provider's stored key, and Ollama is
  // never sent one. The OpenAI key must not reach any other endpoint.
  //
  // The custom key is also bound to the endpoint it was entered for. While
  // the endpoint field points at another origin, the stored key is not this
  // form's to use: the model listing below goes out before Confirm, to
  // whatever URL is typed.
  const storedKeys = { LLMApiKey, LLMCustomApiKey }
  const customKeyIsForThisEndpoint =
    LLMCustomApiKeyOrigin === endpointOrigin(localBaseUrl)
  const storedApiKey =
    localProvider === 'custom' && !customKeyIsForThisEndpoint
      ? ''
      : selectApiKey(localProvider, {
          openAiKey: LLMApiKey,
          customKey: LLMCustomApiKey,
        })
  const typedApiKey = localLLMApiKey.trim()
  const effectiveApiKey =
    localProvider === 'ollama'
      ? ''
      : typedApiKey !== ''
        ? typedApiKey
        : storedApiKey

  // What Confirm will forget (the store does the forgetting, in
  // `setLLMOptions`). Said here first, so a key never disappears, or stays,
  // without the user having been told.
  const keysToForget: string[] = []
  if (localProvider !== 'openai' && hasEnteredLLMApiKey('openai', storedKeys)) {
    keysToForget.push('your OpenAI API key')
  }
  if (
    hasEnteredLLMApiKey('custom', storedKeys) &&
    (localProvider !== 'custom' || !customKeyIsForThisEndpoint)
  ) {
    keysToForget.push(
      LLMCustomApiKeyOrigin === ''
        ? 'the API key of the custom endpoint'
        : `the API key entered for ${LLMCustomApiKeyOrigin}`,
    )
  }
  const endpointError =
    localProvider === 'openai'
      ? undefined
      : getEndpointError(localBaseUrl, effectiveApiKey)
  // The same limits the saved row has, so what is confirmed here can always
  // be read back after a reload.
  const modelError = getModelNameError(localLLMModel)
  // And the limit of what the tab keeps: a longer key would be accepted here
  // and then be gone after a reload.
  const apiKeyError = getApiKeyError(typedApiKey)
  const modelOptions = Array.from(
    new Set([...fetchedModels, ...provider.suggestedModels]),
  )

  const handleProviderChange = (id: LLMProviderId): void => {
    onOptionsEdit()
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
    onOptionsEdit()
    setLocalBaseUrl(value)
    invalidateRefresh()
  }

  const handleRefreshModels = async (): Promise<void> => {
    onOptionsEdit()
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

  // Forgetting a key is the one edit that does not wait for Confirm. It is
  // how a key leaves this tab without closing it, and a user who clicks it
  // and then cancels must not be left with the key still in place.
  const keyEntered = hasEnteredLLMApiKey(localProvider, storedKeys)
  const handleForgetKeyClick = (): void => {
    clearLLMApiKey(localProvider)
    setLocalLLMApiKey('')
    addMessage({
      message: `${provider.label} API key forgotten`,
      duration: 4000,
      severity: MessageSeverity.INFO,
    })
  }

  const apiKeyLabel = provider.requiresApiKey ? 'OpenAI API Key' : 'API Key'
  const apiKeyHelp =
    (keyEntered && storedApiKey !== ''
      ? 'A key is set for this tab. Leave this blank to keep it. '
      : "Kept for this tab only: it survives a reload, and this app's copy is removed when you close the tab. A copy your password manager saved stays there. ") +
    'Use a dedicated key with only the permissions it needs and a spending limit.'
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
        {localProvider !== 'openai' && (
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
            onInputChange={(_e, value) => {
              // Autocomplete also reports the value it already shows; only a
              // change is an edit.
              if (value !== localLLMModel) {
                onOptionsEdit()
              }
              setLocalLLMModel(value)
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="LLM Model"
                // A blank name only disables Confirm, as before; a name that
                // is too long says why.
                error={localLLMModel.trim() !== '' && modelError !== undefined}
                helperText={
                  localLLMModel.trim() !== '' ? modelError : undefined
                }
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
                  disabled={
                    fetchingModels ||
                    localBaseUrl.trim() === '' ||
                    endpointError !== undefined ||
                    apiKeyError !== undefined
                  }
                  onClick={() => {
                    void handleRefreshModels()
                  }}
                >
                  {fetchingModels ? (
                    <CircularProgress size={20} />
                  ) : (
                    <RefreshIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
        {localProvider !== 'ollama' && (
          // A real form with a username beside the password, which is what a
          // password manager needs before it offers to save or fill the key.
          // Whether it does is up to the browser; the masking does not depend
          // on it. Submitting does nothing: Confirm saves.
          <Box
            component="form"
            autoComplete="on"
            onSubmit={(e) => e.preventDefault()}
            sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
          >
            <Box
              component="input"
              type="text"
              name="username"
              autoComplete="username"
              value={`${provider.label} API key`}
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              sx={visuallyHidden}
            />
            <Tooltip title={apiKeyTooltip}>
              <TextField
                data-testid="llm-query-options-api-key-input"
                size="small"
                type="password"
                name="password"
                autoComplete="current-password"
                value={localLLMApiKey}
                fullWidth
                label={apiKeyLabel}
                error={apiKeyError !== undefined}
                helperText={apiKeyError ?? apiKeyHelp}
                onChange={(e) => {
                  setLocalLLMApiKey(e.target.value)
                }}
              ></TextField>
            </Tooltip>
            {keyEntered && (
              <Button
                data-testid="llm-query-options-forget-key-button"
                variant="outlined"
                color="warning"
                startIcon={<KeyOffIcon />}
                sx={{ flexShrink: 0, mt: 0.25 }}
                onClick={handleForgetKeyClick}
              >
                Forget key
              </Button>
            )}
          </Box>
        )}

        {keysToForget.length > 0 && (
          <Alert
            data-testid="llm-query-options-forget-warning"
            severity="warning"
            sx={{ mt: 1 }}
          >
            Confirming will forget {keysToForget.join(' and ')}. A key is kept
            only for the provider and endpoint it was entered for.
          </Alert>
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
                <PreviewIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy selected prompt text">
              <IconButton
                data-testid="llm-query-options-copy-button"
                aria-label="copy"
                onClick={handleCopyTemplateClick}
              >
                <ContentCopyIcon />
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
            modelError !== undefined ||
            endpointError !== undefined ||
            apiKeyError !== undefined
          }
          onClick={() => {
            // Options first: the store forgets any key that is not for this
            // provider and endpoint, and a key typed here is then bound to
            // the endpoint just saved.
            setLLMOptions({
              provider: localProvider,
              baseUrl: localBaseUrl.trim(),
              model: localLLMModel.trim(),
            })
            setLLMTemplate(localLLMTemplate)
            if (typedApiKey !== '') {
              if (localProvider === 'openai') {
                setLLMApiKey(typedApiKey)
              } else if (localProvider === 'custom') {
                setLLMCustomApiKey(typedApiKey)
              }
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
