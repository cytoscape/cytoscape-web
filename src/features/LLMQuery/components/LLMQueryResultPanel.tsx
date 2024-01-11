import {
  Box,
  Tooltip,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'
// import { useMessageStore } from '../../../store/MessageStore'
// import { useUiStateStore } from '../../../store/UiStateStore'
import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { useLLMQueryStore } from '../store'

import { PluginArgs } from '../../../store/plugins/PluginArgs'

export interface LLMQueryResultPanelProps {
  pluginArgs: PluginArgs
}

export const LLMQueryResultPanel = (
  props: LLMQueryResultPanelProps,
): ReactElement => {
  const { useUiStateStore, useMessageStore } = props.pluginArgs
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
  const setPanelState = useUiStateStore((state: any) => state.setPanelState)
  const setActiveNetworkBrowserPanelIndex = useUiStateStore(
    (state: any) => state.setActiveNetworkBrowserPanelIndex,
  )
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)
  const setLLMResult = useLLMQueryStore((state) => state.setLLMResult)
  const addMessage = useMessageStore((state: any) => state.addMessage)

  const runLLMQuery = async (): Promise<void> => {
    setLoading(true)
    setPanelState('left', 'open')
    setActiveNetworkBrowserPanelIndex(2)
    try {
      addMessage({
        message: `Running LLM query...`,
        duration: 6000,
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
        duration: 10000,
      })

      setLLMResult('')
    }
    setLoading(false)
  }

  const disabled = loading || LLMApiKey === ''

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
      size="small"
      disabled={loading}
      variant="outlined"
      onClick={runLLMQuery}
    >
      Regenerate response
    </Button>
  )

  return (
    <Box sx={{ p: 1 }}>
      <Box>
        <Tooltip title="enter a comma space seperated list of gene names e.g. 'FOXA1, HNF1A, PDX1' ">
          <TextField
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
          }}
        >
          {regenerateResponseButton}
          <Box>{`Model: ${LLMModel}`}</Box>
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
