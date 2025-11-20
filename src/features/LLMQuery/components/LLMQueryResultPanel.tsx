import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Tooltip,
} from '@mui/material'
import { ReactElement, useEffect, useState } from 'react'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { MessageSeverity } from '../../../models/MessageModel'
import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { useLLMQueryStore } from '../store'

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
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)
  const setLLMResult = useLLMQueryStore((state) => state.setLLMResult)
  const addMessage = useMessageStore((state) => state.addMessage)

  const runLLMQuery = async (): Promise<void> => {
    setLoading(true)
    setPanelState('left', 'open')
    setActiveNetworkBrowserPanelIndex(2)

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
      const LLMResponse = await analyzeSubsystemGeneSet(
        message,
        LLMApiKey,
        LLMModel,
        false,
      )

      setLLMResult(LLMResponse)
    } catch (e) {
      addMessage({
        message: `Error querying LLM model: ${e.message as string}`,
        duration: 6000,
        severity: MessageSeverity.ERROR,
      })

      setLLMResult('')
    }
    setLoading(false)
  }

  const disabled = loading || LLMApiKey === '' || localQueryValue === ''

  const regenerateResponseButton = disabled ? (
    <Tooltip
      title={
        loading
          ? 'Loading LLM Response'
          : 'Enter your Open AI API key in the Analysis -> LLM Query Options menu item to run LLM queries'
      }
    >
      <Box>
        <Button size="small" disabled={disabled} variant="outlined">
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
      <Box>
        <Tooltip title="enter a comma space seperated list of gene names e.g. 'FOXA1, HNF1A, PDX1' ">
          <TextField
            data-testid="llm-query-gene-input"
            size="small"
            fullWidth
            label="Gene Query"
            value={localQueryValue}
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
          <Box sx={{ ml: 2 }}>{`Model: ${LLMModel}`}</Box>
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
