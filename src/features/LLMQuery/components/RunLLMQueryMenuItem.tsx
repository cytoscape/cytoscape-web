import { MenuItem, Tooltip, Box } from '@mui/material'
import { ReactElement } from 'react'
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { IdType } from '../../../models/IdType'
import { serializeValueList } from '../../../models/TableModel/impl/ValueTypeImpl'
import { useCredentialStore } from '../../../store/CredentialStore'
import { useMessageStore } from '../../../store/MessageStore'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useTableStore } from '../../../store/TableStore'
import { useUiStateStore } from '../../../store/UiStateStore'
import { useViewModelStore } from '../../../store/ViewModelStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import {
  SubsystemTag,
  HcxMetaTag,
} from '../../HierarchyViewer/model/HcxMetaTag'
import { isHCX } from '../../HierarchyViewer/utils/hierarcy-util'
import { analyzeSubsystemGeneSet } from '../api/chatgpt'
import { translateMemberIds } from '../api/translateMemberIds'
import { useLLMQueryStore } from '../store'

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
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)

  const setActiveNetworkBrowserPanelIndex = useUiStateStore(
    (state) => state.setActiveNetworkBrowserPanelIndex,
  )
  const setPanelState = useUiStateStore((state) => state.setPanelState)

  const currentNetworkProperties =
    useNetworkSummaryStore(
      (state) => state.summaries[currentNetworkId]?.properties,
    ) ?? []

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
      // if the current network is the hierarchy i.e. hcx network, then we need to get the gene names from the members/membernames of the selected nodes
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
        })
        return Array.from(new Set(geneNames))
      } else {
        // if the current network is the subsystem network, we need to get the names of the selected nodes
        const geneNames = selectedNodes.map((node) => {
          const row = table.rows.get(node)
          return row?.name ?? ''
        })
        return Array.from(new Set(geneNames)) as string[]
      }
    }

    return []
  }

  const disabled = !isHCX(summary) || loading || LLMApiKey === ''
  const runLLMQuery = async (): Promise<void> => {
    setLoading(true)
    setPanelState('left', 'open')
    setActiveNetworkBrowserPanelIndex(2)
    const geneNames = await getGeneNames()
    setGeneQuery(serializeValueList(geneNames))

    addMessage({
      message: `Running LLM query...`,
      duration: 6000,
    })
    props.handleClose()

    try {
      const message = LLMTemplate.fn(geneNames.join(', '))
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
      : LLMApiKey === ''
      ? 'Enter your Open AI API key in the Analysis -> LLM Query Options menu item to run LLM queries'
      : 'LLM query is only available for HCX networks'
    return (
      <Tooltip title={tooltipTitle}>
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
