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
    const positions = new Map<IdType, [number, number]>()

    nodeIds.forEach((nodeId, index) => {
      const angle = (2 * Math.PI * index) / nodeIds.length
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      positions.set(nodeId, [x, y])
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

## Summary: Use Case Coverage

| Use Case                            | APIs Used                                                          | Sync/Async                     | Lines of App Code                 |
| ----------------------------------- | ------------------------------------------------------------------ | ------------------------------ | --------------------------------- |
| **A: Network Generator**            | `NetworkApi`, `LayoutApi`, `VisualStyleApi`, `ViewportApi`         | Mixed (layout + fit are async) | ~50                               |
| **B: Custom Layout**                | `ElementApi`, `ViewportApi`                                        | Mixed (fit is async)           | ~30                               |
| **C: Style Modification**           | `VisualStyleApi`, `SelectionApi`                                   | Sync                           | ~80                               |
| **D: Analysis / Annotation**        | `TableApi`, `ElementApi`, `SelectionApi`, `VisualStyleApi`         | Sync                           | ~70                               |
| **E: Data Import/Export**           | `NetworkApi`, `ExportApi`                                          | Sync                           | ~60                               |
| **F: Graph Structure Modification** | `ElementApi`, `TableApi`, `VisualStyleApi`, `ViewportApi`          | Mixed (fit is async)           | ~80                               |
| **G: LLM Agent Relay**              | `NetworkApi`, `ElementApi`, `TableApi`, `LayoutApi`, `ViewportApi` | Mixed (layout + fit are async) | ~150 (relay) + ~50 (Python agent) |

All seven use cases that were **Partial** or **No** in the audit are now fully implementable with the facade API. Key improvements visible in the code:

- **No raw store imports** — every operation goes through `cyweb/*` facade modules
- **Structured error handling** — `ApiResult` discriminated union with `ApiErrorCode` enables programmatic error handling (especially critical for Use Case G)
- **Type-safe visual properties** — `VisualPropertyName` and `ValueTypeName` are imported from `cyweb/ApiTypes`
- **Sync/async clarity** — follows § 1.6 policy: store operations are sync, layout and fit are `Promise`
