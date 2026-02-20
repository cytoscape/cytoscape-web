# Facade API Use Case Examples — Toy Code Samples

**Rev. 1 (2/13/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**

Concrete code samples for each use case from [module-federation-audit.md § 5](module-federation-audit.md) ("Use Case Gap Matrix"), implemented against the facade API defined in [facade-api-specification.md](facade-api-specification.md).

Each example is a self-contained React component that a Module Federation external app could register. All examples import exclusively from `cyweb/*` facade modules — no raw store imports.

**Parent documents:**

- [module-federation-audit.md § 5](module-federation-audit.md) — Use case gap analysis
- [facade-api-specification.md](facade-api-specification.md) — Full facade API specification
- [module-federation-design.md § 2.5](module-federation-design.md) — Revised use case gap matrix

---

## Use Case A: Network Generator App

> **Scenario:** Generate a network from an external data source, apply layout and styling, then fit to viewport.
>
> **APIs used:** `NetworkApi` + `LayoutApi` + `VisualStyleApi` + `ViewportApi`

```typescript
// NetworkGeneratorMenu.tsx — Menu component registered as ComponentType.Menu
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import {
  ApiErrorCode,
  VisualPropertyName,
  ValueTypeName,
} from 'cyweb/ApiTypes'
import type { IdType } from 'cyweb/ApiTypes'
import { MenuItem } from '@mui/material'

export const NetworkGeneratorMenu = (): JSX.Element => {
  const { createNetworkFromEdgeList } = useNetworkApi()
  const { applyLayout } = useLayoutApi()
  const { setDefault, createPassthroughMapping } = useVisualStyleApi()
  const { fit } = useViewportApi()

  const handleGenerate = async (): Promise<void> => {
    // 1. Create network from edge list
    const edgeList: Array<[IdType, IdType, string?]> = [
      ['GeneA', 'GeneB', 'activates'],
      ['GeneB', 'GeneC', 'inhibits'],
      ['GeneC', 'GeneD', 'activates'],
      ['GeneD', 'GeneA', 'binds'],
      ['GeneA', 'GeneC', 'phosphorylates'],
    ]

    const createResult = createNetworkFromEdgeList({
      name: 'Generated Pathway',
      description: 'Auto-generated signaling pathway',
      edgeList,
    })

    if (!createResult.success) {
      console.error('Failed to create network:', createResult.error.message)
      return
    }

    const { networkId } = createResult.data

    // 2. Apply visual styles
    setDefault(networkId, VisualPropertyName.NodeShape, 'ellipse')
    setDefault(networkId, VisualPropertyName.NodeBackgroundColor, '#4A90D9')
    setDefault(networkId, VisualPropertyName.NodeWidth, 60)
    setDefault(networkId, VisualPropertyName.NodeHeight, 60)
    setDefault(networkId, VisualPropertyName.EdgeLineColor, '#999999')
    setDefault(networkId, VisualPropertyName.EdgeWidth, 2)

    // Map node label to name attribute (passthrough)
    createPassthroughMapping(
      networkId,
      VisualPropertyName.NodeLabel,
      'name',
      ValueTypeName.String,
    )

    // 3. Apply layout (async — layout engine is callback-based)
    const layoutResult = await applyLayout(networkId, {
      fitAfterLayout: false, // We'll fit manually after
    })

    if (!layoutResult.success) {
      console.error('Layout failed:', layoutResult.error.message)
    }

    // 4. Fit viewport
    await fit(networkId)
  }

  return (
    <MenuItem onClick={handleGenerate}>Generate Pathway Network</MenuItem>
  )
}
```

---

## Use Case B: Custom Layout Algorithm App

> **Scenario:** Read the current network's topology, compute a custom circular layout, update positions, and fit.
>
> **APIs used:** `ElementApi` (read) + `ViewportApi`

```typescript
// CircularLayoutMenu.tsx — Applies a circular layout to the current network
import { useElementApi } from 'cyweb/ElementApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import type { IdType } from 'cyweb/ApiTypes'
import { MenuItem } from '@mui/material'

export const CircularLayoutMenu = ({
  networkId,
}: {
  networkId: IdType
}): JSX.Element => {
  const { getNode } = useElementApi()
  const { updateNodePositions, fit } = useViewportApi()

  const handleApplyCircularLayout = async (): Promise<void> => {
    // In a real app, you'd get node IDs from the network.
    // Here we assume we know the node IDs.
    const nodeIds: IdType[] = ['GeneA', 'GeneB', 'GeneC', 'GeneD']

    // Compute circular positions
    const radius = 200
    const cx = 0
    const cy = 0
    // PositionRecord (Record, not Map) — JSON-serializable for bridge relay
    const positions: Record<IdType, [number, number]> = {}

    nodeIds.forEach((nodeId, index) => {
      const angle = (2 * Math.PI * index) / nodeIds.length
      positions[nodeId] = [
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
      ]
    })

    // Update positions in bulk
    const result = updateNodePositions(networkId, positions)

    if (!result.success) {
      console.error('Failed to update positions:', result.error.message)
      return
    }

    // Fit viewport to show the new layout
    await fit(networkId)
  }

  return (
    <MenuItem onClick={handleApplyCircularLayout}>
      Apply Circular Layout
    </MenuItem>
  )
}
```

---

## Use Case C: Style Modification App

> **Scenario:** Dynamically change visual styles based on data — map node color to a numeric attribute, set bypasses on selected nodes.
>
> **APIs used:** `VisualStyleApi` + `SelectionApi` + `ApiTypes`

```typescript
// StyleEditorPanel.tsx — Panel component for interactive style editing
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { VisualPropertyName, ValueTypeName } from 'cyweb/ApiTypes'
import type { IdType } from 'cyweb/ApiTypes'
import { Box, Button, Typography } from '@mui/material'

export const StyleEditorPanel = ({
  networkId,
}: {
  networkId: IdType
}): JSX.Element => {
  const {
    setDefault,
    setBypass,
    deleteBypass,
    createDiscreteMapping,
    createContinuousMapping,
    createPassthroughMapping,
  } = useVisualStyleApi()
  const { getSelection } = useSelectionApi()

  // Set a global default node color
  const handleSetDefaultColor = (): void => {
    const result = setDefault(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      '#FF6B6B',
    )
    if (!result.success) {
      console.error(result.error.message)
    }
  }

  // Map node color to a categorical "type" attribute
  const handleCreateDiscreteMapping = (): void => {
    const result = createDiscreteMapping(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      'type', // column name in node table
      ValueTypeName.String,
    )
    if (!result.success) {
      console.error(result.error.message)
    }
  }

  // Map edge width to a numeric "weight" attribute
  const handleCreateContinuousMapping = (): void => {
    const result = createContinuousMapping(
      networkId,
      VisualPropertyName.EdgeWidth,
      'double', // visual property value type
      'weight', // column name in edge table
      [0.0, 1.0, 5.0, 10.0], // attribute value breakpoints
      ValueTypeName.Double,
    )
    if (!result.success) {
      console.error(result.error.message)
    }
  }

  // Passthrough: show "name" attribute as node label
  const handleCreatePassthrough = (): void => {
    createPassthroughMapping(
      networkId,
      VisualPropertyName.NodeLabel,
      'name',
      ValueTypeName.String,
    )
  }

  // Highlight currently selected nodes with a bypass
  const handleHighlightSelected = (): void => {
    const selResult = getSelection(networkId)
    if (!selResult.success) {
      console.error(selResult.error.message)
      return
    }

    const { selectedNodes } = selResult.data

    if (selectedNodes.length === 0) {
      return
    }

    // Set a bright yellow bypass on selected nodes
    setBypass(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      selectedNodes,
      '#FFD700',
    )

    // Also increase their size
    setBypass(networkId, VisualPropertyName.NodeWidth, selectedNodes, 80)
    setBypass(networkId, VisualPropertyName.NodeHeight, selectedNodes, 80)
  }

  // Remove all color bypasses from selected nodes
  const handleClearBypasses = (): void => {
    const selResult = getSelection(networkId)
    if (!selResult.success) return

    const { selectedNodes } = selResult.data
    if (selectedNodes.length === 0) return

    deleteBypass(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      selectedNodes,
    )
    deleteBypass(networkId, VisualPropertyName.NodeWidth, selectedNodes)
    deleteBypass(networkId, VisualPropertyName.NodeHeight, selectedNodes)
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6">Style Editor</Typography>

      <Typography variant="subtitle2">Defaults</Typography>
      <Button onClick={handleSetDefaultColor}>Set Red Default</Button>

      <Typography variant="subtitle2">Mappings</Typography>
      <Button onClick={handleCreateDiscreteMapping}>
        Color by Type (Discrete)
      </Button>
      <Button onClick={handleCreateContinuousMapping}>
        Width by Weight (Continuous)
      </Button>
      <Button onClick={handleCreatePassthrough}>
        Label = Name (Passthrough)
      </Button>

      <Typography variant="subtitle2">Bypasses</Typography>
      <Button onClick={handleHighlightSelected}>Highlight Selected</Button>
      <Button onClick={handleClearBypasses}>Clear Bypasses</Button>
    </Box>
  )
}
```

---

## Use Case D: Analysis / Annotation App

> **Scenario:** Perform a simple degree analysis on the network, write results as a new column, select high-degree nodes, and style them.
>
> **APIs used:** `TableApi` + `ElementApi` + `SelectionApi` + `VisualStyleApi`

```typescript
// DegreeAnalysisMenu.tsx — Runs degree analysis and annotates the network
import { useTableApi } from 'cyweb/TableApi'
import { useElementApi } from 'cyweb/ElementApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import {
  ValueTypeName,
  VisualPropertyName,
  ApiErrorCode,
} from 'cyweb/ApiTypes'
import type { IdType } from 'cyweb/ApiTypes'
import { MenuItem } from '@mui/material'

export const DegreeAnalysisMenu = ({
  networkId,
  nodeIds,
  edgeData,
}: {
  networkId: IdType
  nodeIds: IdType[]
  edgeData: Array<{ edgeId: IdType; sourceId: IdType; targetId: IdType }>
}): JSX.Element => {
  const { createColumn, setValue, setValues } = useTableApi()
  const { getEdge } = useElementApi()
  const { exclusiveSelect } = useSelectionApi()
  const { setBypass, createContinuousMapping } = useVisualStyleApi()

  const handleDegreeAnalysis = (): void => {
    // 1. Create a new column for degree values
    const colResult = createColumn(
      networkId,
      'node',
      'degree',
      ValueTypeName.Integer,
      0,
    )

    if (!colResult.success) {
      // Column may already exist — that's okay for re-analysis
      if (colResult.error.code !== ApiErrorCode.InvalidInput) {
        console.error('Failed to create column:', colResult.error.message)
        return
      }
    }

    // 2. Compute degree for each node
    const degreeCounts = new Map<IdType, number>()
    for (const nodeId of nodeIds) {
      degreeCounts.set(nodeId, 0)
    }

    for (const { sourceId, targetId } of edgeData) {
      degreeCounts.set(sourceId, (degreeCounts.get(sourceId) ?? 0) + 1)
      degreeCounts.set(targetId, (degreeCounts.get(targetId) ?? 0) + 1)
    }

    // 3. Write degree values back to the table using batch update
    const cellEdits = Array.from(degreeCounts.entries()).map(
      ([nodeId, degree]) => ({
        id: nodeId,
        column: 'degree',
        value: degree,
      }),
    )

    const writeResult = setValues(networkId, 'node', cellEdits)
    if (!writeResult.success) {
      console.error('Failed to write degrees:', writeResult.error.message)
      return
    }

    // 4. Select high-degree nodes (degree >= 3)
    const highDegreeNodes = Array.from(degreeCounts.entries())
      .filter(([, degree]) => degree >= 3)
      .map(([nodeId]) => nodeId)

    if (highDegreeNodes.length > 0) {
      exclusiveSelect(networkId, highDegreeNodes, [])
    }

    // 5. Map node size to degree via continuous mapping
    createContinuousMapping(
      networkId,
      VisualPropertyName.NodeWidth,
      'double',
      'degree',
      [1, 3, 5, 10],
      ValueTypeName.Integer,
    )

    createContinuousMapping(
      networkId,
      VisualPropertyName.NodeHeight,
      'double',
      'degree',
      [1, 3, 5, 10],
      ValueTypeName.Integer,
    )

    // 6. Highlight hub nodes with a color bypass
    if (highDegreeNodes.length > 0) {
      setBypass(
        networkId,
        VisualPropertyName.NodeBackgroundColor,
        highDegreeNodes,
        '#E74C3C',
      )
    }
  }

  return (
    <MenuItem onClick={handleDegreeAnalysis}>
      Run Degree Analysis & Annotate
    </MenuItem>
  )
}
```

---

## Use Case E: Data Import/Export App

> **Scenario:** Import a network from CX2 data (with validation), and export the current network back to CX2 for download.
>
> **APIs used:** `NetworkApi` + `ExportApi`

```typescript
// ImportExportPanel.tsx — Panel for CX2 import and export
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useExportApi } from 'cyweb/ExportApi'
import { ApiErrorCode } from 'cyweb/ApiTypes'
import type { IdType, Cx2 } from 'cyweb/ApiTypes'
import { Box, Button, Typography } from '@mui/material'
import { useRef } from 'react'

export const ImportExportPanel = ({
  networkId,
}: {
  networkId: IdType | undefined
}): JSX.Element => {
  const { createNetworkFromCx2 } = useNetworkApi()
  const { exportToCx2 } = useExportApi()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Import ---
  const handleImport = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    let cxData: Cx2

    try {
      cxData = JSON.parse(text) as Cx2
    } catch {
      console.error('Invalid JSON file')
      return
    }

    // Facade validates CX2 internally via validateCX2()
    const result = createNetworkFromCx2({
      cxData,
      navigate: true,
      addToWorkspace: true,
    })

    if (!result.success) {
      if (result.error.code === ApiErrorCode.InvalidCx2) {
        console.error('Invalid CX2 data:', result.error.message)
      } else {
        console.error('Import failed:', result.error.message)
      }
      return
    }

    console.log('Imported network:', result.data.networkId)
  }

  // --- Export ---
  const handleExport = (): void => {
    if (!networkId) {
      console.error('No network selected')
      return
    }

    const result = exportToCx2(networkId, {
      networkName: 'exported-network',
    })

    if (!result.success) {
      console.error('Export failed:', result.error.message)
      return
    }

    // Download as JSON file
    const cx2Json = JSON.stringify(result.data, null, 2)
    const blob = new Blob([cx2Json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'network.cx2'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6">CX2 Import / Export</Typography>

      <input
        ref={fileInputRef}
        type="file"
        accept=".cx2,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      <Button variant="outlined" onClick={handleImport}>
        Import CX2 File
      </Button>

      <Button
        variant="outlined"
        onClick={handleExport}
        disabled={!networkId}
      >
        Export Current Network to CX2
      </Button>
    </Box>
  )
}
```

---

## Use Case F: Graph Structure Modification App

> **Scenario:** Modify the topology of an existing network — add nodes, add edges between them, set attributes, apply style, and clean up via delete.
>
> **APIs used:** `ElementApi` + `TableApi` + `VisualStyleApi` + `ViewportApi`

```typescript
// GraphEditorPanel.tsx — Interactive graph structure editor
import { useElementApi } from 'cyweb/ElementApi'
import { useTableApi } from 'cyweb/TableApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import { VisualPropertyName, ValueTypeName } from 'cyweb/ApiTypes'
import type { IdType } from 'cyweb/ApiTypes'
import { Box, Button, Typography } from '@mui/material'
import { useState } from 'react'

export const GraphEditorPanel = ({
  networkId,
}: {
  networkId: IdType
}): JSX.Element => {
  const { createNode, createEdge, deleteNodes, deleteEdges } = useElementApi()
  const { setValue, createColumn } = useTableApi()
  const { setBypass } = useVisualStyleApi()
  const { fit } = useViewportApi()
  const [addedNodeIds, setAddedNodeIds] = useState<IdType[]>([])
  const [addedEdgeIds, setAddedEdgeIds] = useState<IdType[]>([])

  // Add a cluster of interconnected nodes
  const handleAddCluster = async (): Promise<void> => {
    const nodeCount = 5
    const newNodeIds: IdType[] = []
    const newEdgeIds: IdType[] = []

    // Ensure a "cluster" column exists
    createColumn(networkId, 'node', 'cluster', ValueTypeName.String, '')

    // 1. Create nodes in a grid pattern
    for (let i = 0; i < nodeCount; i++) {
      const x = (i % 3) * 100
      const y = Math.floor(i / 3) * 100

      const result = createNode(networkId, [x, y], {
        attributes: { name: `New-${i}` },
        autoSelect: false,
      })

      if (result.success) {
        newNodeIds.push(result.data.nodeId)

        // Set cluster attribute
        setValue(
          networkId,
          'node',
          result.data.nodeId,
          'cluster',
          'added-cluster',
        )
      }
    }

    // 2. Connect nodes in a chain
    for (let i = 0; i < newNodeIds.length - 1; i++) {
      const result = createEdge(
        networkId,
        newNodeIds[i],
        newNodeIds[i + 1],
        {
          attributes: { interaction: 'connects' },
          autoSelect: false,
        },
      )

      if (result.success) {
        newEdgeIds.push(result.data.edgeId)
      }
    }

    // 3. Style the new nodes with a bypass
    if (newNodeIds.length > 0) {
      setBypass(
        networkId,
        VisualPropertyName.NodeBackgroundColor,
        newNodeIds,
        '#2ECC71',
      )
      setBypass(
        networkId,
        VisualPropertyName.NodeBorderColor,
        newNodeIds,
        '#27AE60',
      )
      setBypass(
        networkId,
        VisualPropertyName.NodeBorderWidth,
        newNodeIds,
        3,
      )
    }

    setAddedNodeIds((prev) => [...prev, ...newNodeIds])
    setAddedEdgeIds((prev) => [...prev, ...newEdgeIds])

    // 4. Fit viewport to include new nodes
    await fit(networkId)
  }

  // Delete all nodes added by this editor (cascade deletes edges too)
  const handleDeleteAdded = async (): Promise<void> => {
    if (addedNodeIds.length === 0) return

    const result = deleteNodes(networkId, addedNodeIds)

    if (result.success) {
      console.log(
        `Deleted ${result.data.deletedNodeCount} nodes, ` +
          `${result.data.deletedEdgeCount} edges (cascaded)`,
      )
      setAddedNodeIds([])
      setAddedEdgeIds([])
      await fit(networkId)
    } else {
      console.error('Delete failed:', result.error.message)
    }
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6">Graph Editor</Typography>
      <Button variant="outlined" onClick={handleAddCluster}>
        Add 5-Node Cluster
      </Button>
      <Button
        variant="outlined"
        color="error"
        onClick={handleDeleteAdded}
        disabled={addedNodeIds.length === 0}
      >
        Delete Added Nodes ({addedNodeIds.length})
      </Button>
    </Box>
  )
}
```

---

## Use Case G: LLM Agent-Driven Network Generation App

> **Scenario:** A relay app receives commands from an LLM agent via WebSocket, translates them into facade API calls, and returns structured results so the agent can iterate.
>
> **APIs used:** `NetworkApi` + `ElementApi` + `TableApi` + `LayoutApi` + `ViewportApi` + `ApiTypes`

```typescript
// AgentRelayPanel.tsx — WebSocket relay between LLM agent and Cytoscape Web
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useElementApi } from 'cyweb/ElementApi'
import { useTableApi } from 'cyweb/TableApi'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import { ApiErrorCode, ValueTypeName } from 'cyweb/ApiTypes'
import type { ApiResult, IdType } from 'cyweb/ApiTypes'
import { Box, Button, Typography } from '@mui/material'
import { useEffect, useRef, useState, useCallback } from 'react'

// --- Agent command protocol ---

interface AgentCommand {
  id: string
  action: string
  params: Record<string, unknown>
}

interface AgentResponse {
  id: string
  success: boolean
  data?: unknown
  error?: { code: string; message: string }
}

// Convert any ApiResult to an AgentResponse
function toAgentResponse(
  commandId: string,
  result: ApiResult<unknown>,
): AgentResponse {
  if (result.success) {
    return { id: commandId, success: true, data: result.data }
  }
  return {
    id: commandId,
    success: false,
    error: { code: result.error.code, message: result.error.message },
  }
}

export const AgentRelayPanel = (): JSX.Element => {
  const { createNetworkFromEdgeList } = useNetworkApi()
  const { createNode, createEdge } = useElementApi()
  const { setValue, createColumn } = useTableApi()
  const { applyLayout } = useLayoutApi()
  const { fit } = useViewportApi()

  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-49), msg])
  }, [])

  // Dispatch a single agent command to the appropriate facade API
  const handleCommand = useCallback(
    async (cmd: AgentCommand): Promise<AgentResponse> => {
      switch (cmd.action) {
        // ── Network creation ──
        case 'createNetwork': {
          const result = createNetworkFromEdgeList({
            name: (cmd.params.name as string) ?? 'Agent Network',
            edgeList:
              (cmd.params.edgeList as Array<[IdType, IdType, string?]>) ?? [],
          })
          return toAgentResponse(cmd.id, result)
        }

        // ── Node creation ──
        case 'addNode': {
          const networkId = cmd.params.networkId as IdType
          const position = (cmd.params.position as [number, number]) ?? [0, 0]
          const attributes =
            (cmd.params.attributes as Record<string, unknown>) ?? {}

          const result = createNode(networkId, position, {
            attributes,
            autoSelect: false,
          })
          return toAgentResponse(cmd.id, result)
        }

        // ── Edge creation ──
        case 'addEdge': {
          const networkId = cmd.params.networkId as IdType
          const sourceId = cmd.params.sourceId as IdType
          const targetId = cmd.params.targetId as IdType

          const result = createEdge(networkId, sourceId, targetId, {
            attributes:
              (cmd.params.attributes as Record<string, unknown>) ?? {},
            autoSelect: false,
          })
          return toAgentResponse(cmd.id, result)
        }

        // ── Set attribute ──
        case 'setAttribute': {
          const networkId = cmd.params.networkId as IdType
          const tableType = (cmd.params.tableType as 'node' | 'edge') ?? 'node'
          const elementId = cmd.params.elementId as IdType
          const column = cmd.params.column as string
          const value = cmd.params.value

          const result = setValue(networkId, tableType, elementId, column, value)
          return toAgentResponse(cmd.id, result)
        }

        // ── Create column ──
        case 'createColumn': {
          const networkId = cmd.params.networkId as IdType
          const tableType = (cmd.params.tableType as 'node' | 'edge') ?? 'node'
          const columnName = cmd.params.columnName as string
          const dataType =
            (cmd.params.dataType as ValueTypeName) ?? ValueTypeName.String
          const defaultValue = cmd.params.defaultValue ?? ''

          const result = createColumn(
            networkId,
            tableType,
            columnName,
            dataType,
            defaultValue,
          )
          return toAgentResponse(cmd.id, result)
        }

        // ── Layout ──
        case 'applyLayout': {
          const networkId = cmd.params.networkId as IdType
          const result = await applyLayout(networkId, {
            fitAfterLayout: true,
          })
          return toAgentResponse(cmd.id, result)
        }

        // ── Fit ──
        case 'fit': {
          const networkId = cmd.params.networkId as IdType
          const result = await fit(networkId)
          return toAgentResponse(cmd.id, result)
        }

        default:
          return {
            id: cmd.id,
            success: false,
            error: {
              code: ApiErrorCode.InvalidInput,
              message: `Unknown action: ${cmd.action}`,
            },
          }
      }
    },
    [
      createNetworkFromEdgeList,
      createNode,
      createEdge,
      setValue,
      createColumn,
      applyLayout,
      fit,
    ],
  )

  // WebSocket connection management
  const handleConnect = useCallback(() => {
    const ws = new WebSocket('ws://localhost:8765')

    ws.onopen = () => {
      setConnected(true)
      appendLog('Connected to agent')
    }

    ws.onmessage = async (event) => {
      const cmd = JSON.parse(event.data as string) as AgentCommand
      appendLog(`← ${cmd.action} (${cmd.id})`)

      const response = await handleCommand(cmd)
      ws.send(JSON.stringify(response))

      appendLog(
        `→ ${response.success ? 'OK' : 'FAIL'} (${cmd.id})` +
          (!response.success ? ` [${response.error?.code}]` : ''),
      )
    }

    ws.onclose = () => {
      setConnected(false)
      appendLog('Disconnected')
    }

    wsRef.current = ws
  }, [handleCommand, appendLog])

  const handleDisconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6">LLM Agent Relay</Typography>

      {connected ? (
        <Button variant="outlined" color="error" onClick={handleDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button variant="outlined" onClick={handleConnect}>
          Connect to Agent (ws://localhost:8765)
        </Button>
      )}

      <Box
        sx={{
          mt: 1,
          p: 1,
          maxHeight: 300,
          overflow: 'auto',
          bgcolor: 'grey.100',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </Box>
    </Box>
  )
}
```

### Agent-Side Usage (Python)

The LLM agent sends JSON commands over WebSocket and receives structured results:

```python
import asyncio
import json
import uuid
import websockets

async def build_network():
    async with websockets.connect("ws://localhost:8765") as ws:
        # 1. Create a network
        cmd_id = str(uuid.uuid4())
        await ws.send(json.dumps({
            "id": cmd_id,
            "action": "createNetwork",
            "params": {
                "name": "Agent-Generated Network",
                "edgeList": [
                    ["A", "B", "activates"],
                    ["B", "C", "inhibits"],
                    ["C", "A", "binds"],
                ]
            }
        }))
        resp = json.loads(await ws.recv())

        if not resp["success"]:
            print(f"Failed: {resp['error']['code']}: {resp['error']['message']}")
            return

        network_id = resp["data"]["networkId"]
        print(f"Created network: {network_id}")

        # 2. Add a node incrementally
        cmd_id = str(uuid.uuid4())
        await ws.send(json.dumps({
            "id": cmd_id,
            "action": "addNode",
            "params": {
                "networkId": network_id,
                "position": [300, 150],
                "attributes": {"name": "D"}
            }
        }))
        resp = json.loads(await ws.recv())

        if resp["success"]:
            node_id = resp["data"]["nodeId"]
            print(f"Added node: {node_id}")

            # 3. Connect new node
            cmd_id = str(uuid.uuid4())
            await ws.send(json.dumps({
                "id": cmd_id,
                "action": "addEdge",
                "params": {
                    "networkId": network_id,
                    "sourceId": "A",
                    "targetId": node_id,
                    "attributes": {"interaction": "regulates"}
                }
            }))
            resp = json.loads(await ws.recv())
            print(f"Edge result: {resp['success']}")

        # 4. Apply layout
        cmd_id = str(uuid.uuid4())
        await ws.send(json.dumps({
            "id": cmd_id,
            "action": "applyLayout",
            "params": {"networkId": network_id}
        }))
        resp = json.loads(await ws.recv())
        print(f"Layout: {'OK' if resp['success'] else resp['error']['code']}")

asyncio.run(build_network())
```

---

## Use Case G (Variant): Chrome Extension MCP Bridge — Vanilla JS

> **Scenario:** A Chrome extension content script uses `window.CyWebApi` directly (no React, no
> Module Federation) to relay MCP commands from Claude Code. The extension background script
> receives commands via `chrome.runtime.onMessage` from a local MCP Bridge Server, and the content
> script executes them against Cytoscape Web.
>
> **Access path:** `window.CyWebApi` global — no bundler or React required
>
> **Architecture:**
> ```
> Claude Code → MCP Bridge Server (localhost Node.js)
>                   ↕ chrome.runtime messaging
>               Extension Background Script
>                   ↕ chrome.tabs.sendMessage / onMessage
>               Content Script (this file) injected into Cytoscape Web page
>                   ↕ window.CyWebApi
>               Cytoscape Web Core
> ```

### Content Script: `content-script.js`

```javascript
// content-script.js — Injected into the Cytoscape Web page by the extension
// No React, no bundler. Accesses window.CyWebApi directly.

/** Wait for Cytoscape Web to initialize the API */
function onApiReady(callback) {
  if (window.CyWebApi) {
    callback(window.CyWebApi)
  } else {
    window.addEventListener('cywebapi:ready', () => callback(window.CyWebApi), { once: true })
  }
}

/**
 * Dispatch a single MCP tool call to the appropriate CyWebApi method.
 * All responses are plain JSON — no Map, no class instances.
 *
 * @param {string} tool   - MCP tool name (e.g. 'create_network')
 * @param {object} args   - Tool arguments
 * @returns {Promise<{success: boolean, data?: unknown, error?: {code: string, message: string}}>}
 */
async function dispatchTool(api, tool, args) {
  switch (tool) {
    // ── Network ──────────────────────────────────────────────────────────────
    case 'create_network': {
      const result = api.network.createNetworkFromEdgeList({
        name: args.name ?? 'Untitled',
        description: args.description,
        edgeList: args.edgeList ?? [],
      })
      return toResponse(result)
    }

    case 'delete_network': {
      return toResponse(api.network.deleteNetwork(args.networkId))
    }

    // ── Elements ─────────────────────────────────────────────────────────────
    case 'create_node': {
      const result = api.element.createNode(
        args.networkId,
        args.position ?? [0, 0],
        { attributes: args.attributes ?? {}, autoSelect: false },
      )
      return toResponse(result)
    }

    case 'create_edge': {
      const result = api.element.createEdge(
        args.networkId,
        args.sourceId,
        args.targetId,
        { attributes: args.attributes ?? {}, autoSelect: false },
      )
      return toResponse(result)
    }

    case 'delete_nodes': {
      return toResponse(api.element.deleteNodes(args.networkId, args.nodeIds))
    }

    case 'get_node': {
      return toResponse(api.element.getNode(args.networkId, args.nodeId))
    }

    // ── Table ─────────────────────────────────────────────────────────────────
    case 'set_value': {
      return toResponse(
        api.table.setValue(args.networkId, args.tableType, args.elementId, args.column, args.value),
      )
    }

    case 'get_row': {
      return toResponse(api.table.getRow(args.networkId, args.tableType, args.elementId))
    }

    case 'create_column': {
      return toResponse(
        api.table.createColumn(args.networkId, args.tableType, args.columnName, args.dataType, args.defaultValue ?? ''),
      )
    }

    // ── Layout ───────────────────────────────────────────────────────────────
    case 'apply_layout': {
      // Returns Promise<ApiResult> — await is required
      const result = await api.layout.applyLayout(args.networkId, {
        algorithmName: args.algorithmName,
        fitAfterLayout: args.fitAfterLayout ?? true,
      })
      return toResponse(result)
    }

    case 'get_available_layouts': {
      return toResponse(api.layout.getAvailableLayouts())
    }

    // ── Viewport ─────────────────────────────────────────────────────────────
    case 'fit': {
      return toResponse(await api.viewport.fit(args.networkId))
    }

    case 'get_node_positions': {
      // PositionRecord return is plain JSON — no Map conversion needed
      return toResponse(api.viewport.getNodePositions(args.networkId, args.nodeIds))
    }

    case 'update_node_positions': {
      // args.positions is Record<nodeId, [x, y]> — plain JSON from MCP
      return toResponse(api.viewport.updateNodePositions(args.networkId, args.positions))
    }

    // ── Visual Style ──────────────────────────────────────────────────────────
    case 'set_default': {
      return toResponse(api.visualStyle.setDefault(args.networkId, args.vpName, args.vpValue))
    }

    case 'set_bypass': {
      return toResponse(
        api.visualStyle.setBypass(args.networkId, args.vpName, args.elementIds, args.vpValue),
      )
    }

    // ── Export ────────────────────────────────────────────────────────────────
    case 'export_cx2': {
      return toResponse(api.export.exportToCx2(args.networkId))
    }

    // ── Selection ─────────────────────────────────────────────────────────────
    case 'get_selection': {
      return toResponse(api.selection.getSelection(args.networkId))
    }

    case 'exclusive_select': {
      return toResponse(
        api.selection.exclusiveSelect(args.networkId, args.nodeIds ?? [], args.edgeIds ?? []),
      )
    }

    default:
      return { success: false, error: { code: 'INVALID_INPUT', message: `Unknown tool: ${tool}` } }
  }
}

/** Normalize ApiResult into a plain JSON-serializable response */
function toResponse(result) {
  if (result.success) {
    return { success: true, data: result.data ?? null }
  }
  return { success: false, error: { code: result.error.code, message: result.error.message } }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

onApiReady((api) => {
  // Listen for MCP tool calls relayed from the extension background script
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'MCP_TOOL_CALL') return false

    const { callId, tool, args } = message
    dispatchTool(api, tool, args).then((response) => {
      sendResponse({ callId, ...response })
    })

    return true // Keep message channel open for async response
  })

  // Signal readiness to background script
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' })
})
```

### Background Script: `background.js` (Service Worker)

```javascript
// background.js — Extension service worker
// Bridges the MCP Bridge Server (WebSocket) and the Cytoscape Web tab (content script)

const MCP_BRIDGE_URL = 'ws://localhost:8765'
let ws = null
let cywebTabId = null

/** Find the tab running Cytoscape Web */
async function findCyWebTab() {
  const tabs = await chrome.tabs.query({ url: '*://*.ndexbio.org/*' })
  if (tabs.length === 0) {
    // Also check localhost for development
    const devTabs = await chrome.tabs.query({ url: 'http://localhost:5500/*' })
    return devTabs[0]?.id ?? null
  }
  return tabs[0]?.id ?? null
}

/** Forward a tool call to the content script and await the result */
async function callContentScript(tool, args, callId) {
  if (!cywebTabId) {
    cywebTabId = await findCyWebTab()
    if (!cywebTabId) {
      return { callId, success: false, error: { code: 'OPERATION_FAILED', message: 'Cytoscape Web tab not found' } }
    }
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      cywebTabId,
      { type: 'MCP_TOOL_CALL', callId, tool, args },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ callId, success: false, error: { code: 'OPERATION_FAILED', message: chrome.runtime.lastError.message } })
        } else {
          resolve({ callId, ...response })
        }
      },
    )
  })
}

/** Connect to local MCP Bridge Server */
function connectToMcpBridge() {
  ws = new WebSocket(MCP_BRIDGE_URL)

  ws.onmessage = async (event) => {
    const { callId, tool, args } = JSON.parse(event.data)
    const result = await callContentScript(tool, args, callId)
    ws.send(JSON.stringify(result))
  }

  ws.onclose = () => {
    ws = null
    setTimeout(connectToMcpBridge, 3000) // Reconnect after 3s
  }
}

// Initialize on extension startup
chrome.runtime.onInstalled.addListener(connectToMcpBridge)
chrome.runtime.onStartup.addListener(connectToMcpBridge)
```

### MCP Bridge Server (Node.js): `mcp-bridge.js`

```javascript
// mcp-bridge.js — Local Node.js process: Claude Code ↔ WebSocket ↔ Extension
// Run with: node mcp-bridge.js
// Configure in ~/.mcp.json: { "cytoscape-web": { "command": "node", "args": ["path/to/mcp-bridge.js"] } }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebSocketServer } from 'ws'
import { z } from 'zod'

const server = new McpServer({ name: 'cytoscape-web', version: '1.0.0' })
const wss = new WebSocketServer({ port: 8765 })
let extensionSocket = null

// Accept connection from the Chrome extension background script
wss.on('connection', (ws) => {
  extensionSocket = ws
  ws.on('close', () => { extensionSocket = null })
})

/** Send a tool call to the extension and wait for the response */
function callExtension(tool, args) {
  return new Promise((resolve, reject) => {
    if (!extensionSocket) {
      reject(new Error('Chrome extension not connected. Open Cytoscape Web and install the extension.'))
      return
    }
    const callId = Math.random().toString(36).slice(2)
    extensionSocket.send(JSON.stringify({ callId, tool, args }))

    const onMessage = (data) => {
      const msg = JSON.parse(data)
      if (msg.callId !== callId) return
      extensionSocket.off('message', onMessage)
      resolve(msg)
    }
    extensionSocket.on('message', onMessage)
    setTimeout(() => { extensionSocket.off('message', onMessage); reject(new Error('Timeout')) }, 30000)
  })
}

// Register MCP tools — one per CyWebApi operation
server.tool('create_network', { name: z.string(), edgeList: z.array(z.tuple([z.string(), z.string(), z.string().optional()])) },
  async ({ name, edgeList }) => {
    const result = await callExtension('create_network', { name, edgeList })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool('create_node', { networkId: z.string(), position: z.tuple([z.number(), z.number()]).optional(), attributes: z.record(z.unknown()).optional() },
  async (args) => {
    const result = await callExtension('create_node', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool('apply_layout', { networkId: z.string(), algorithmName: z.string().optional() },
  async (args) => {
    const result = await callExtension('apply_layout', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool('get_node_positions', { networkId: z.string(), nodeIds: z.array(z.string()) },
  async (args) => {
    // Returns PositionRecord: { nodeId: [x, y] } — plain JSON, no conversion needed
    const result = await callExtension('get_node_positions', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool('export_cx2', { networkId: z.string() },
  async (args) => {
    const result = await callExtension('export_cx2', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ... additional tools for each CyWebApi operation

const transport = new StdioServerTransport()
await server.connect(transport)
```

### Claude Code Side (`.mcp.json`)

```json
{
  "mcpServers": {
    "cytoscape-web": {
      "command": "node",
      "args": ["/path/to/cytoscape-web-mcp/mcp-bridge.js"]
    }
  }
}
```

### Key Design Points of the Vanilla JS Variant

| Concern | React variant (Use Case G original) | Vanilla JS / Extension variant |
| ------- | ------------------------------------ | ------------------------------ |
| API access | `useXxxApi()` hooks inside React component | `window.CyWebApi.xxx` in content script |
| React required | Yes | **No** |
| Module Federation required | Yes | **No** |
| WebSocket location | In browser (Adapter App React component) | In extension background script (Service Worker) |
| Cross-origin issue | HTTPS→ws://localhost blocked by Mixed Content | Extension `host_permissions` bypasses Private Network Access |
| Position type | `Record<IdType, [x, y]>` (JSON-ready) | Same — no `Map` conversion needed |
| `apply_layout` async | `await` in React `useCallback` | `await` in `dispatchTool` |
| `cywebapi:ready` guard | Not needed (React hook lifecycle manages timing) | Required — content script may load before Cytoscape Web |

---

## Summary: Use Case Coverage

| Use Case                            | APIs Used                                                          | Sync/Async                     | Lines of App Code                         |
| ----------------------------------- | ------------------------------------------------------------------ | ------------------------------ | ----------------------------------------- |
| **A: Network Generator**            | `NetworkApi`, `LayoutApi`, `VisualStyleApi`, `ViewportApi`         | Mixed (layout + fit are async) | ~50                                       |
| **B: Custom Layout**                | `ElementApi`, `ViewportApi`                                        | Mixed (fit is async)           | ~30                                       |
| **C: Style Modification**           | `VisualStyleApi`, `SelectionApi`                                   | Sync                           | ~80                                       |
| **D: Analysis / Annotation**        | `TableApi`, `ElementApi`, `SelectionApi`, `VisualStyleApi`         | Sync                           | ~70                                       |
| **E: Data Import/Export**           | `NetworkApi`, `ExportApi`                                          | Sync                           | ~60                                       |
| **F: Graph Structure Modification** | `ElementApi`, `TableApi`, `VisualStyleApi`, `ViewportApi`          | Mixed (fit is async)           | ~80                                       |
| **G: LLM Agent Relay (React)**      | `NetworkApi`, `ElementApi`, `TableApi`, `LayoutApi`, `ViewportApi` | Mixed (layout + fit are async) | ~150 (relay) + ~50 (Python agent)         |
| **G: LLM Agent Relay (Vanilla JS)** | `window.CyWebApi.*` (all domains)                                  | Mixed (layout + fit are async) | ~130 (content script) + ~80 (background) + ~80 (MCP bridge) |

All seven use cases that were **Partial** or **No** in the audit are now fully implementable with the facade API. Key improvements visible in the code:

- **No raw store imports** — every operation goes through `cyweb/*` facade modules or `window.CyWebApi`
- **Structured error handling** — `ApiResult` discriminated union with `ApiErrorCode` enables programmatic error handling (especially critical for Use Case G)
- **Type-safe visual properties** — `VisualPropertyName` and `ValueTypeName` are imported from `cyweb/ApiTypes`
- **Sync/async clarity** — follows § 1.6 policy: store operations are sync, layout and fit are `Promise`
- **JSON-serializable positions** — `PositionRecord` (not `Map`) flows through WebSocket and MCP without conversion
