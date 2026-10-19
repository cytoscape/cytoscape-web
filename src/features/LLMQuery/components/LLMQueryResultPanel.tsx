import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  TextField,
  Tooltip,
} from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { queryLLM } from '../api/queryLLM'
import { getWebLLMBlocker } from '../api/webllmSession'
import { isLLMConfigured, selectApiKey } from '../model/LLMProvider'
import { findWebLLMModel, WebLLMStatus } from '../model/WebLLMModel'
import { useLLMQueryStore } from '../store'
import { LLM_QUERY_TAB_INDEX } from '@/models/UiModel/impl/panelTabs'

/**
 * Whether the panel can query, and if not, why. Gene Query stays editable
 * while an in-browser model loads, so the list is ready when the model is.
 */
type PanelSetup =
  | { readonly kind: 'ready' }
  | { readonly kind: 'unconfigured' }
  | {
      readonly kind: 'webllm-loading'
      readonly label: string
      readonly progress: number
      readonly text: string
    }
  | { readonly kind: 'webllm-blocked'; readonly message: string }

const getPanelSetup = (
  configured: boolean,
  isWebLLM: boolean,
  status: WebLLMStatus,
  modelId: string,
): PanelSetup => {
  if (!configured) {
    return { kind: 'unconfigured' }
  }
  if (!isWebLLM) {
    return { kind: 'ready' }
  }
  if (status.state === 'loading' && status.modelId === modelId) {
    return {
      kind: 'webllm-loading',
      label: findWebLLMModel(modelId)?.label ?? modelId,
      progress: status.progress,
      text: status.text,
    }
  }
  const blocker = getWebLLMBlocker(status, modelId)
  return blocker === undefined
    ? { kind: 'ready' }
    : { kind: 'webllm-blocked', message: blocker }
}

/** Explains what stops the panel from querying, with a way to fix it. */
const SetupNotice = (props: {
  setup: PanelSetup
  onOpenOptions: () => void
}): ReactElement | null => {
  const { setup, onOpenOptions } = props
  switch (setup.kind) {
    case 'ready':
      return null
    case 'unconfigured':
      return (
        <Alert
          data-testid="llm-query-setup-needed"
          severity="info"
          sx={{ mb: 2 }}
        >
          <Box sx={{ mb: 1 }}>
            No LLM provider is set up yet. Use OpenAI with your API key, a local
            Ollama server, or an experimental model that runs in this browser.
          </Box>
          <Button
            data-testid="llm-query-select-provider-button"
            size="small"
            variant="contained"
            onClick={onOpenOptions}
          >
            Select LLM Provider
          </Button>
        </Alert>
      )
    case 'webllm-loading': {
      const percent = Math.floor(setup.progress * 100)
      return (
        <Box data-testid="llm-query-webllm-progress" sx={{ mb: 2 }}>
          <Box sx={{ fontSize: 14 }}>
            {`Loading ${setup.label}: ${percent}%. You can enter genes while it loads.`}
          </Box>
          <LinearProgress
            variant="determinate"
            value={percent}
            aria-label={`Loading ${setup.label}`}
            sx={{ my: 0.5 }}
          />
          <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{setup.text}</Box>
        </Box>
      )
    }
    case 'webllm-blocked':
      return (
        <Alert
          data-testid="llm-query-webllm-error"
          severity="error"
          sx={{ mb: 2 }}
        >
          <Box sx={{ mb: 1 }}>{setup.message}</Box>
          <Button
            data-testid="llm-query-open-options-button"
            size="small"
            variant="outlined"
            color="inherit"
            onClick={onOpenOptions}
          >
            Open LLM Query Options
          </Button>
        </Alert>
      )
  }
}

export const LLMQueryResultPanel = (props: {
  height?: number
}): ReactElement => {
  const geneQuery = useLLMQueryStore((state) => state.geneQuery)
  const [localQueryValue, setLocalQueryValue] = useState(geneQuery)
  const loading = useLLMQueryStore((state) => state.loading)
  const LLMResult = useLLMQueryStore((state) => state.LLMResult)

  useEffect(() => {
    setLocalQueryValue(geneQuery)
  }, [geneQuery])

  const handleChange = (value: string): void => {
    setLocalQueryValue(value)
  }

  const setLoading = useLLMQueryStore((state) => state.setLoading)
  const setPanelState = useUiStateStore((state) => state.setPanelState)
  const setActiveNetworkBrowserPanelIndex = useUiStateStore(
    (state) => state.setActiveNetworkBrowserPanelIndex,
  )
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMCustomApiKey = useLLMQueryStore((state) => state.LLMCustomApiKey)
  const LLMProvider = useLLMQueryStore((state) => state.LLMProvider)
  const LLMBaseUrl = useLLMQueryStore((state) => state.LLMBaseUrl)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)
  const webLLMStatus = useLLMQueryStore((state) => state.webLLMStatus)
  const setLLMResult = useLLMQueryStore((state) => state.setLLMResult)
  const setOptionsDialogOpen = useLLMQueryStore(
    (state) => state.setOptionsDialogOpen,
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const runLLMQuery = async (): Promise<void> => {
    setLoading(true)
    setPanelState('left', 'open')
    setActiveNetworkBrowserPanelIndex(LLM_QUERY_TAB_INDEX)

    if (localQueryValue === '') {
      addMessage({
        message: `Unable to send query to the LLM model.  The query string is empty.`,
        duration: 5000,
        severity: MessageSeverity.WARNING,
      })
      setLLMResult('')
      setLoading(false)
      return
    }
    try {
      addMessage({
        message: `Running LLM query...`,
        duration: 3000,
        severity: MessageSeverity.INFO,
      })
      const message = LLMTemplate.fn(localQueryValue)
      const LLMResponse = await queryLLM(message, {
        provider: LLMProvider,
        apiKey: providerApiKey,
        baseUrl: LLMBaseUrl,
        model: LLMModel,
      })

      setLLMResult(LLMResponse)
    } catch (e) {
      addMessage({
        message: `Error querying LLM model: ${e instanceof Error ? e.message : String(e)}`,
        duration: 6000,
        severity: MessageSeverity.ERROR,
      })

      setLLMResult('')
    }
    setLoading(false)
  }

  // Keys are provider-scoped: the OpenAI key must never reach another endpoint
  const providerApiKey = selectApiKey(LLMProvider, {
    openAiKey: LLMApiKey,
    customKey: LLMCustomApiKey,
  })
  const setup = getPanelSetup(
    isLLMConfigured(LLMProvider, providerApiKey, LLMBaseUrl),
    LLMProvider === 'webllm',
    webLLMStatus,
    LLMModel,
  )
  // Nothing to edit a query for until a provider can run it, but a loading
  // in-browser model will be able to, so the field stays open meanwhile
  const geneInputDisabled =
    setup.kind === 'unconfigured' || setup.kind === 'webllm-blocked'
  const disabled = loading || setup.kind !== 'ready' || localQueryValue === ''
  const disabledReason = loading
    ? 'Loading LLM Response'
    : setup.kind === 'unconfigured'
      ? 'Select an LLM provider first'
      : setup.kind === 'webllm-loading'
        ? `Loading ${setup.label} (${Math.floor(setup.progress * 100)}%)...`
        : setup.kind === 'webllm-blocked'
          ? setup.message
          : 'Enter a list of genes to query'

  const regenerateResponseButton = disabled ? (
    <Tooltip title={disabledReason}>
      <Box>
        <Button
          data-testid="llm-query-regenerate-button-disabled"
          size="small"
          disabled={disabled}
          variant="outlined"
        >
          Regenerate response
        </Button>
      </Box>
    </Tooltip>
  ) : (
    <Button
      data-testid="llm-query-regenerate-button"
      size="small"
      disabled={loading}
      variant="outlined"
      onClick={runLLMQuery}
    >
      Regenerate response
    </Button>
  )

  return (
    <Box
      data-testid="llm-query-result-panel"
      sx={{
        overflow: 'scroll',
        width: '100%',
        height: props.height === undefined ? '100%' : props.height - 100,
        p: 1,
      }}
    >
      <SetupNotice
        setup={setup}
        onOpenOptions={() => setOptionsDialogOpen(true)}
      />
      <Box>
        <Tooltip title="enter a comma space seperated list of gene names e.g. 'FOXA1, HNF1A, PDX1' ">
          <TextField
            data-testid="llm-query-gene-input"
            size="small"
            fullWidth
            label="Gene Query"
            value={localQueryValue}
            disabled={geneInputDisabled}
            onChange={(e) => handleChange(e.target.value)}
          />
        </Tooltip>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1,
            mb: 1,
          }}
        >
          {regenerateResponseButton}
          {setup.kind !== 'unconfigured' && (
            <Box sx={{ ml: 2 }}>{`Model: ${LLMModel}`}</Box>
          )}
        </Box>
      </Box>
      <Box>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 5 }}>
            <CircularProgress
              size="small"
              sx={{ mr: 1, height: 25, width: 25 }}
            />
            <Box>Loading LLM Query Result...</Box>
          </Box>
        ) : LLMResult !== '' ? (
          <Box sx={{ p: 1 }}>
            <Box sx={{ whiteSpace: 'pre-line' }}>{LLMResult}</Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
