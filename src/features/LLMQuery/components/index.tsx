import { ReactElement, useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@mui/material'
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { isHCX } from '../../HierarchyViewer/utils/hierarcy-util'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useTableStore } from '../../../store/TableStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { IdType } from '../../../models/IdType'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { useLLMQueryStore } from '../store'
import {
  HcxMetaTag,
  SubsystemTag,
} from '../../HierarchyViewer/model/HcxMetaTag'
import {
  deserializeValueList,
  serializeValueList,
  serializedStringIsValid,
} from '../../../models/TableModel/impl/ValueTypeImpl'
import { ValueTypeName } from '../../../models/TableModel'
import { LLMModel, models } from '../model/LLMModel'
import { useMessageStore } from '../../../store/MessageStore'
import { translateMemberIds } from '../api/translateMemberIds'
import { useCredentialStore } from '../../../store/CredentialStore'

export const MEMBER_NAMES_KEY = ''

export const RunLLMQueryMenuItem = (props: BaseMenuProps): ReactElement => {
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const loading = useLLMQueryStore((state) => state.loading)
  const setLoading = useLLMQueryStore((state) => state.setLoading)
  const setLLMResult = useLLMQueryStore((state) => state.setLLMResult)
  const setGeneQuery = useLLMQueryStore((state) => state.setGeneQuery)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)

  const setActiveNetworkBrowserPanelIndex = useUiStateStore(
    (state) => state.setActiveNetworkBrowserPanelIndex,
  )
  const setPanelState = useUiStateStore((state) => state.setPanelState)

  const currentNetworkProperties = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId].properties,
  )

  const selectedNodes =
    useViewModelStore(
      (state) => state.viewModels[activeNetworkId]?.selectedNodes,
    ) ?? []

  const table = useTableStore(
    (state) => state.tables[activeNetworkId]?.nodeTable,
  )
  const addMessage = useMessageStore((state) => state.addMessage)
  const getToken = useCredentialStore((state) => state.getToken)

  const getGeneNames = async (): Promise<string[]> => {
    const currentNetworkIsActive = currentNetworkId === activeNetworkId
    if (table !== undefined) {
      if (currentNetworkIsActive) {
        const geneNames: string[] = []
        selectedNodes.forEach(async (node) => {
          const row = table.rows.get(node)
          const members = row?.[SubsystemTag.members]
          const memberNames = row?.[SubsystemTag.memberNames]

          const parentInteractionNetworkId = currentNetworkProperties.find(
            (p) => p.predicateString === HcxMetaTag.interactionNetworkUUID,
          )?.value

          if (members !== undefined) {
            const token = await getToken()
            const names = await translateMemberIds({
              networkUUID: parentInteractionNetworkId as string,
              ids: members as string[],
              accessToken: token,
            })

            names.forEach((n) => geneNames.push(n))
            geneNames.push(...names)
          } else {
            if (memberNames !== undefined) {
              geneNames.push(...(memberNames as string[]))
            }
          }

          return deserializeValueList(
            ValueTypeName.ListString,
            (row?.[SubsystemTag.memberNames] as string) ?? '',
          )
        })
        return Array.from(new Set(geneNames))
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

  const disabled = !isHCX(summary) || loading
  const runLLMQuery = async (): Promise<void> => {
    setLoading(true)
    setPanelState('left', 'open')
    setActiveNetworkBrowserPanelIndex(2)
    const geneNames = await getGeneNames()
    setGeneQuery(serializeValueList(geneNames))

    addMessage({
      message: `Running LLM query...`,
      duration: 2000,
    })

    try {
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
        duration: 3000,
      })

      setLLMResult('')
    }
    setLoading(false)

    props.handleClose()
  }

  const menuItem = (
    <MenuItem disabled={disabled} onClick={runLLMQuery}>
      Run LLM Query
    </MenuItem>
  )
  if (!disabled) {
    return menuItem
  } else {
    const tooltipTitle = loading
      ? 'Generating response...'
      : 'LLM query is only available for HCX networks'
    return (
      <Tooltip title={tooltipTitle}>
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}

export const LLMQueryOptionsMenuItem = (props: BaseMenuProps): ReactElement => {
  const loading = useLLMQueryStore((state) => state.loading)
  const setLLMModel = useLLMQueryStore((state) => state.setLLMModel)
  const setLLMApiKey = useLLMQueryStore((state) => state.setLLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)

  const [showDialog, setShowDialog] = useState(false)
  const [localLLMModel, setLocalLLMModel] = useState<LLMModel>(LLMModel)
  const [localLLMApiKey, setLocalLLMApiKey] = useState<string>(LLMApiKey)
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const disabled = !isHCX(summary) || loading

  const menuItem = (
    <MenuItem disabled={disabled} onClick={() => setShowDialog(true)}>
      LLM Query Options
    </MenuItem>
  )

  const dialog = (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={showDialog}
      onClose={props.handleClose}
    >
      <DialogTitle>LLM Query Options</DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
          <InputLabel>LLM Model</InputLabel>
          <Select
            size="small"
            value={localLLMModel}
            label="LLM Model"
            onChange={(e) => setLocalLLMModel(e.target.value)}
          >
            {models.map((m) => {
              return (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <TextField
          size="small"
          value={localLLMApiKey}
          fullWidth
          label="OpenAI API Key"
          onChange={(e) => setLocalLLMApiKey(e.target.value)}
        ></TextField>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setShowDialog(false)
            setLLMModel(localLLMModel)
            setLLMApiKey(localLLMApiKey)
          }}
        >
          Confirm
        </Button>
        <Button color="error" onClick={props.handleClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )

  if (!disabled) {
    return (
      <>
        {menuItem}
        {dialog}
      </>
    )
  } else {
    const tooltipTitle = loading
      ? 'Generating response...'
      : 'LLM query is only available for HCX networks'
    return (
      <Tooltip title={tooltipTitle}>
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}

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
        duration: 2000,
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
        duration: 3000,
      })

      setLLMResult('')
    }
    setLoading(false)
  }

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
          <Button
            size="small"
            disabled={loading}
            variant="outlined"
            onClick={runLLMQuery}
          >
            Regenerate response
          </Button>
          <Box>{`Model: ${LLMModel}`}</Box>
        </Box>
      </Box>
      <Box>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CircularProgress size="small" sx={{ mr: 1 }} />
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
