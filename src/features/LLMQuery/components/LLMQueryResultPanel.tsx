import {
  Box,
  Tooltip,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material'
import { ReactElement, useState, useEffect } from 'react'
import { ValueTypeName } from '../../../models/TableModel'
import {
  serializedStringIsValid,
  deserializeValueList,
  serializeValueList,
} from '../../../models/TableModel/impl/ValueTypeImpl'
import { useMessageStore } from '../../../store/MessageStore'
import { useTableStore } from '../../../store/TableStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { SubsystemTag } from '../../HierarchyViewer/model/HcxMetaTag'
import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { useLLMQueryStore } from '../store'

export const LLMQueryResultPanel = (): ReactElement => {
  const geneQuery = useLLMQueryStore((state) => state.geneQuery)
  const [localQueryValue, setLocalQueryValue] = useState(geneQuery)
  const [hasError, setHasError] = useState(false)
  const loading = useLLMQueryStore((state) => state.loading)
  const LLMResult = useLLMQueryStore((state) => state.LLMResult)

  useEffect(() => {
    setLocalQueryValue(geneQuery)
  }, [geneQuery])

  const handleChange = (value: string): void => {
    setLocalQueryValue(value)
    setHasError(
      !serializedStringIsValid(ValueTypeName.ListString, localQueryValue),
    )
  }

  const setLoading = useLLMQueryStore((state) => state.setLoading)
  const setPanelState = useUiStateStore((state) => state.setPanelState)
  const setActiveNetworkBrowserPanelIndex = useUiStateStore(
    (state) => state.setActiveNetworkBrowserPanelIndex,
  )
  const setGeneQuery = useLLMQueryStore((state) => state.setGeneQuery)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const setLLMResult = useLLMQueryStore((state) => state.setLLMResult)

  const currentNetworkId = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const activeNetworkId = useUiStateStore((state) => state.ui.activeNetworkView)
  const selectedNodes =
    useViewModelStore(
      (state) => state.viewModels[activeNetworkId]?.selectedNodes,
    ) ?? []

  const table = useTableStore(
    (state) => state.tables[activeNetworkId]?.nodeTable,
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const getGeneNames = (): string[] => {
    const currentNetworkIsActive = currentNetworkId === activeNetworkId
    if (table !== undefined) {
      if (currentNetworkIsActive) {
        const geneNames = selectedNodes.map((node) => {
          const row = table.rows.get(node)
          return deserializeValueList(
            ValueTypeName.ListString,
            (row?.[SubsystemTag.memberNames] as string) ?? '',
          )
        })
        return Array.from(new Set(geneNames)) as string[]
      } else {
        const geneNames = selectedNodes.map((node) => {
          const row = table.rows.get(node)
          return row?.name ?? ''
        })
        return Array.from(new Set(geneNames)) as string[]
      }
    }

    return []
  }

  const runLLMQuery = async (): Promise<void> => {
    setLoading(true)
    setPanelState('left', 'open')
    setActiveNetworkBrowserPanelIndex(2)
    const geneNames = getGeneNames()
    setGeneQuery(serializeValueList(geneNames))

    try {
      addMessage({
        message: `Running LLM query...`,
        duration: 6000,
      })
      const LLMResponse = await analyzeSubsystemGeneSet(
        geneNames,
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
            error={hasError}
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
