import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { useNetworkStore } from '../../data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useTableStore } from '../../data/hooks/stores/TableStore'
import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { ParsedCommand } from './commandParser'
import { IdType } from '../../models/IdType'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { MessageSeverity } from '../../models/MessageModel'
import { Edge } from '../../models/NetworkModel/Edge'
import { Node } from '../../models/NetworkModel/Node'
import { EdgeView, NodeView } from '../../models/ViewModel'

export interface CommandResult {
  status: 'success' | 'error' | 'warning' | 'info'
  messages: string[]
}

const NAME_COLUMNS = ['name', 'NAME']

const toList = (value?: string): string[] =>
  value
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v !== '')
    : []

const getNameMatch = (row: Record<string, any>): string | undefined => {
  for (const key of NAME_COLUMNS) {
    if (row[key] !== undefined) {
      return row[key]
    }
  }
  return undefined
}

const resolveNetworkId = (
  value: string | undefined,
  currentNetworkId: IdType,
): IdType | undefined => {
  if (value === undefined || value === '' || value.toLowerCase() === 'current') {
    return currentNetworkId
  }

  const networks = useNetworkStore.getState().networks
  if (networks.has(value)) {
    return value
  }

  // Try name lookup via summaries
  const summaries = useNetworkSummaryStore.getState().summaries
  const matchedEntry = Object.entries(summaries).find(
    ([, summary]) => summary.name === value,
  )
  if (matchedEntry !== undefined) {
    return matchedEntry[0]
  }

  return undefined
}

const resolveIdsFromSpec = (
  kind: 'node' | 'edge',
  spec: string | undefined,
  networkId: IdType,
): IdType[] => {
  const networkStore = useNetworkStore.getState()
  const tableStore = useTableStore.getState()
  const viewModel = useViewModelStore.getState().getViewModel(networkId)

  const network = networkStore.networks.get(networkId)
  if (!network) {
    return []
  }

  const allIds =
    kind === 'node'
      ? network.nodes.map((n: Node) => n.id)
      : network.edges.map((e: Edge) => e.id)

  const selection =
    kind === 'node'
      ? viewModel?.selectedNodes ?? []
      : viewModel?.selectedEdges ?? []

  const tableRecord = tableStore.tables[networkId]
  const table =
    kind === 'node' ? tableRecord?.nodeTable : tableRecord?.edgeTable

  const normalizedSpec = spec?.trim().toLowerCase()
  if (!spec || normalizedSpec === '' || normalizedSpec === 'all') {
    return allIds
  }
  if (normalizedSpec === 'selected') {
    return selection
  }
  if (normalizedSpec === 'unselected') {
    const selectionSet = new Set(selection)
    return allIds.filter((id) => !selectionSet.has(id))
  }

  // Attribute-based or name-based
  if (table === undefined) {
    return []
  }

  const results: IdType[] = []
  const tokens = toList(spec)
  tokens.forEach((token) => {
    const hasColon = token.includes(':')
    const [rawKey, ...rest] = token.split(':')
    const value = rest.length > 0 ? rest.join(':') : rawKey
    const column = hasColon ? rawKey : NAME_COLUMNS[0]

    table.rows.forEach((row, id) => {
      const rowValue = hasColon
        ? row[column]
        : getNameMatch(row) ?? row[column]
      if (rowValue !== undefined && String(rowValue) === value) {
        results.push(id)
      }
    })
  })

  return Array.from(new Set(results))
}

const runViewCommand = (
  parsed: ParsedCommand,
  targetNetworkId: IdType,
): CommandResult => {
  const rendererFns = useRendererFunctionStore.getState()
  const fit = rendererFns.getFunction('cyjs', 'fit', targetNetworkId)
  const fitSelected = rendererFns.getFunction(
    'cyjs',
    'fitSelected',
    targetNetworkId,
  )
  const refresh = rendererFns.getFunction('cyjs', 'refresh', targetNetworkId)

  if (parsed.command === 'fit') {
    const target = parsed.args.target ?? 'content'
    if (target === 'selected') {
      if (fitSelected) {
        fitSelected()
        return { status: 'success', messages: ['View fit to selected'] }
      }
      if (fit) {
        fit()
        return {
          status: 'warning',
          messages: ['Selected fit not available; used full fit instead'],
        }
      }
      return { status: 'error', messages: ['Renderer fit function unavailable'] }
    }

    if (fit) {
      fit()
      return { status: 'success', messages: ['View fit to content'] }
    }
    return { status: 'error', messages: ['Renderer fit function unavailable'] }
  }

  if (parsed.command === 'update' || parsed.command === 'refresh') {
    if (refresh) {
      refresh()
      return { status: 'success', messages: ['View refreshed'] }
    }
    return {
      status: 'warning',
      messages: ['Refresh not available for current renderer'],
    }
  }

  return { status: 'error', messages: [`Unknown view command "${parsed.command}"`] }
}

const runNodeList = (
  parsed: ParsedCommand,
  currentNetworkId: IdType,
): CommandResult => {
  if (parsed.subcommand === 'properties') {
    return {
      status: 'info',
      messages: [
        'Editable node properties:',
        '- x (X Location)',
        '- y (Y Location)',
        '- z (Z Location)',
      ],
    }
  }

  const networkId = resolveNetworkId(parsed.args.network, currentNetworkId)
  if (!networkId) {
    return { status: 'error', messages: ['Network not found'] }
  }

  const ids = resolveIdsFromSpec('node', parsed.args.nodelist, networkId)
  if (ids.length === 0) {
    return {
      status: 'warning',
      messages: ['No nodes matched the criteria'],
    }
  }

  return {
    status: 'success',
    messages: ['Found nodes:', ...ids.map((id) => `- ${id}`)],
  }
}

const normalizeProperty = (
  prop: string
): 'x' | 'y' | 'z' | undefined => {
  const p = prop
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\u00A0]/g, ' ')     // NBSP -> space
    .replace(/[_\s]+/g, ' ')       // collapse underscores/whitespace
    .trim()

  if (p === 'x' || p === 'x location') return 'x'
  if (p === 'y' || p === 'y location') return 'y'
  if (p === 'z' || p === 'z location') return 'z'
  console.log(`Unknown property normalization for "${prop}" -> "${p}"`)
  return undefined
}


const runNodeSetProperties = (
  parsed: ParsedCommand,
  currentNetworkId: IdType,
): CommandResult => {
  const networkId = resolveNetworkId(parsed.args.network, currentNetworkId)
  if (!networkId) {
    return { status: 'error', messages: ['Network not found'] }
  }

  const nodeIds = resolveIdsFromSpec('node', parsed.args.nodelist, networkId)
  if (nodeIds.length === 0) {
    return { status: 'warning', messages: ['No nodes matched the criteria'] }
  }

  const propertyListRaw = parsed.args.propertylist ?? ''
  const valueListRaw = parsed.args.valuelist ?? ''
  const props = toList(propertyListRaw)
  const values = toList(valueListRaw)

  if (props.length === 0 || values.length === 0) {
    return {
      status: 'error',
      messages: ['propertyList and valueList are required'],
    }
  }

  if (props.length !== values.length) {
    return {
      status: 'error',
      messages: [
        `propertyList length (${props.length}) does not match valueList length (${values.length})`,
      ],
    }
  }

  const pairs: Array<{ key: 'x' | 'y' | 'z'; value: number }> = []
  for (let i = 0; i < props.length; i++) {
    const key = normalizeProperty(props[i])
    if (!key) {
      return {
        status: 'error',
        messages: [
          `Unknown property "${props[i]}"`,
          'Supported: x (X Location), y (Y Location), z (Z Location)',
        ],
      }
    }
    const num = Number(values[i])
    if (Number.isNaN(num)) {
      return {
        status: 'error',
        messages: [`Value "${values[i]}" is not a number`],
      }
    }
    pairs.push({ key, value: num })
  }

  const viewModelStore = useViewModelStore.getState()
  const updateNodePositions = viewModelStore.updateNodePositions
  const getViewModel = viewModelStore.getViewModel
  const workspaceStore = useWorkspaceStore.getState()

  const currentView = getViewModel(networkId)
  const positionMap: Map<IdType, [number, number, number?]> = new Map()
  nodeIds.forEach((id) => {
    const nodeView = currentView?.nodeViews[id]
    const existingX = nodeView?.x ?? 0
    const existingY = nodeView?.y ?? 0
    const existingZ = nodeView?.z ?? 0
    let x = existingX
    let y = existingY
    let z = existingZ
    pairs.forEach((p) => {
      if (p.key === 'x') x = p.value
      if (p.key === 'y') y = p.value
      if (p.key === 'z') z = p.value
    })
    positionMap.set(id, [x, y, z])
  })

  updateNodePositions(networkId, positionMap)
  workspaceStore.setNetworkModified(networkId, true)

  return {
    status: 'success',
    messages: [
      `Set ${pairs.length} propert${pairs.length === 1 ? 'y' : 'ies'} for ${nodeIds.length} node(s)`,
    ],
  }
}

const runNetworkAdd = (
  parsed: ParsedCommand,
  currentNetworkId: IdType,
): CommandResult => {
  const targetNetworkId = resolveNetworkId(
    parsed.args.network,
    currentNetworkId,
  )

  if (!targetNetworkId) {
    return { status: 'error', messages: ['Target network not found'] }
  }

  const networkStore = useNetworkStore.getState()
  const tableStore = useTableStore.getState()
  const viewModelStore = useViewModelStore.getState()
  const workspaceStore = useWorkspaceStore.getState()

  const targetNetwork = networkStore.networks.get(targetNetworkId)
  if (!targetNetwork) {
    return { status: 'error', messages: ['Target network not loaded'] }
  }

  const sourceNetworkId = currentNetworkId
  const sourceNetwork = networkStore.networks.get(sourceNetworkId)
  if (!sourceNetwork) {
    return { status: 'error', messages: ['Source network not loaded'] }
  }

  const nodeIds = resolveIdsFromSpec(
    'node',
    parsed.args.nodelist,
    sourceNetworkId,
  )
  const edgeIds = resolveIdsFromSpec(
    'edge',
    parsed.args.edgelist,
    sourceNetworkId,
  )

  const nodeIdSet = new Set(nodeIds)
  const nodesToAdd = sourceNetwork.nodes.filter((n) => nodeIdSet.has(n.id))
  const edgeIdSet = new Set(edgeIds)
  const edgesToAdd = sourceNetwork.edges.filter((e) => edgeIdSet.has(e.id))

  if (nodesToAdd.length === 0 && edgesToAdd.length === 0) {
    return { status: 'warning', messages: ['No nodes or edges matched'] }
  }

  // Add network elements
  networkStore.addNodes(targetNetworkId, nodesToAdd.map((n) => n.id))
  networkStore.addEdges(targetNetworkId, edgesToAdd)

  // Add table rows
  const targetTables = tableStore.tables[targetNetworkId]
  const sourceTables = tableStore.tables[sourceNetworkId]
  if (targetTables && sourceTables) {
    const nodeRows: Map<IdType, Record<string, any>> = new Map()
    const edgeRows: Map<IdType, Record<string, any>> = new Map()

    nodesToAdd.forEach((n) => {
      const row = sourceTables.nodeTable.rows.get(n.id)
      if (row) {
        nodeRows.set(n.id, row)
      }
    })
    edgesToAdd.forEach((e) => {
      const row = sourceTables.edgeTable.rows.get(e.id)
      if (row) {
        edgeRows.set(e.id, row)
      }
    })

    if (nodeRows.size > 0) {
      tableStore.editRows(targetNetworkId, TableType.NODE, nodeRows)
    }
    if (edgeRows.size > 0) {
      tableStore.editRows(targetNetworkId, TableType.EDGE, edgeRows)
    }
  }

  // Add view models
  const targetViewModel = viewModelStore.getViewModel(targetNetworkId)
  if (targetViewModel) {
    const nodeViews = nodesToAdd
      .map((n) => viewModelStore.getViewModel(sourceNetworkId)?.nodeViews[n.id])
      .filter((v): v is NodeView => v !== undefined)
    if (nodeViews.length > 0) {
      viewModelStore.addNodeViews(targetNetworkId, nodeViews)
    }

    const edgeViews = edgesToAdd
      .map((e) => viewModelStore.getViewModel(sourceNetworkId)?.edgeViews[e.id])
      .filter((v): v is EdgeView => v !== undefined)
    if (edgeViews.length > 0) {
      viewModelStore.addEdgeViews(targetNetworkId, edgeViews)
    }
  }

  workspaceStore.setNetworkModified(targetNetworkId, true)

  return {
    status: 'success',
    messages: [
      `Added ${nodesToAdd.length} node(s) and ${edgesToAdd.length} edge(s) to ${targetNetworkId}`,
    ],
  }
}

export const executeCommand = (parsed: ParsedCommand): CommandResult => {
  const workspace = useWorkspaceStore.getState().workspace
  const currentNetworkId = workspace.currentNetworkId
  const addMessage = useMessageStore.getState().addMessage

  let result: CommandResult
  switch (parsed.namespace) {
    case 'view':
      result = runViewCommand(parsed, currentNetworkId)
      break
    case 'network':
      if (parsed.command === 'add') {
        result = runNetworkAdd(parsed, currentNetworkId)
      } else {
        result = { status: 'error', messages: [`Unknown network command "${parsed.command}"`] }
      }
      break
    case 'node':
      if (parsed.command === 'list') {
        result = runNodeList(parsed, currentNetworkId)
      } else if (parsed.command === 'set' && parsed.subcommand === 'properties') {
        result = runNodeSetProperties(parsed, currentNetworkId)
      } else {
        result = { status: 'error', messages: [`Unknown node command "${parsed.command}"`] }
      }
      break
    case 'help':
      result = {
        status: 'info',
        messages: [
          'Supported namespaces: view, network, node',
          'view fit content | view fit selected | view update',
          'network add network=<id|name|current> nodeList=<all|selected|...> edgeList=<all|selected|...>',
          'node list network=<id|name|current> nodeList=<all|selected|...>',
          'node list properties',
          'node set properties propertyList=<...> valueList=<...> nodeList=<...> [bypass=true|false]',
        ],
      }
      break
    default:
      result = { status: 'error', messages: ['Unknown command'] }
  }

  // Mirror severe errors to MessageStore
  if (result.status === 'error') {
    addMessage({
      message: result.messages.join('\n'),
      persistent: false,
      severity: MessageSeverity.ERROR,
    })
  }

  return result
}
