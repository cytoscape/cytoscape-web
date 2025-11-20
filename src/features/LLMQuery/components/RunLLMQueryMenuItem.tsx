import { Box, MenuItem, Tooltip } from '@mui/material'
import { ReactElement } from 'react'

import { fetchGeneNamesFromIds } from '../../../data/external-api/ndex'
import { useCredentialStore } from '../../../data/hooks/stores/CredentialStore'
import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../data/hooks/stores/TableStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { serializeValueList } from '../../../models/TableModel/impl/valueTypeImpl'
import { NetworkView } from '../../../models/ViewModel'
import {
  HcxMetaTag,
  SubsystemTag,
} from '../../HierarchyViewer/model/HcxMetaTag'
import { isHCX } from '../../HierarchyViewer/utils/hierarchyUtil'
import { BaseMenuProps } from '../../ToolBar/BaseMenuProps'
import { analyzeSubsystemGeneSet } from '../api/chatgpt'
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

  const viewModel: NetworkView | undefined = useViewModelStore((state) =>
    state.getViewModel(currentNetworkId),
  )
  const selectedNodes = viewModel?.selectedNodes ?? []

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

        for (let i = 0; i < selectedNodes.length; i++) {
          const node = selectedNodes[i]
          const row = table.rows.get(node)
          const members = row?.[SubsystemTag.members]
          const memberNames = row?.[SubsystemTag.memberNames]

          const parentInteractionNetworkId = currentNetworkProperties.find(
            (p) => p.predicateString === HcxMetaTag.interactionNetworkUUID,
          )?.value

          if (members !== undefined) {
            const token = await getToken()
            const names = await fetchGeneNamesFromIds(
              parentInteractionNetworkId as string,
              members as string[],
              token,
            )

            geneNames.push(...names)
          } else {
            if (memberNames !== undefined) {
              geneNames.push(...(memberNames as string[]))
            }
          }
        }

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

    let geneNames: string[] = []
    try {
      geneNames = await getGeneNames()
    } catch (e) {
      addMessage({
        message: `Failed to get gene symbols for the selected subsystem nodes from NDEx server.  The visibility of the network in the ${
          HcxMetaTag.interactionNetworkUUID
        } attribute is most likely private. Error message: ${
          e.message as string
        }`,
        duration: 8000,
        severity: MessageSeverity.ERROR,
      })
      setLoading(false)
      setLLMResult('')
      return
    }

    if (geneNames.length === 0) {
      addMessage({
        message: `No gene symbols found for the selected subsystem nodes.  Make sure the ${SubsystemTag.members} or ${SubsystemTag.memberNames} column is defined for the selected nodes.`,
        duration: 8000,
        severity: MessageSeverity.WARNING,
      })
      setLoading(false)
      setLLMResult('')
      return
    }

    setGeneQuery(serializeValueList(geneNames))

    addMessage({
      message: `Running LLM query...`,
      duration: 6000,
      severity: MessageSeverity.INFO,
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
        severity: MessageSeverity.ERROR,
      })

      setLLMResult('')
    }
    setLoading(false)
  }

  const menuItem = (
    <MenuItem
      data-testid="run-llm-query-menu-item"
      disabled={disabled}
      onClick={runLLMQuery}
    >
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
      <Tooltip arrow title={tooltipTitle} placement="right">
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
