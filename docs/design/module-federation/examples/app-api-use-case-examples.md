# App API Use Case Examples — Toy Code Samples

- **Rev. 1 (2/13/2026): Keiichiro ONO and Claude Code w/ Opus 4.6**
- **Rev. 2 (3/5/2026): Keiichiro ONO and Claude Code w/ Sonnet 4.6 — Updated to Phase 1 final implementation**

Concrete code samples for each use case from [module-federation-audit.md § 5](../module-federation-audit.md) ("Use Case Gap Matrix"), implemented against the app API defined in [app-api-specification.md](../specifications/app-api-specification.md).

Each example is a self-contained React component that a Module Federation external app could register. All examples import exclusively from `cyweb/*` app API modules — no raw store imports.

**Rev. 2 Changes:**

- Fixed Use Case A: `addToWorkspace: true` is required for the network to appear in the workspace and for `fit` to work
- Fixed Use Case B: removed unused `useElementApi` import
- Updated Use Case G (React): added `workspace` commands (`get_workspace`, `switch_network`)
- Updated Use Case G (Vanilla JS): added workspace tools, and extended Chrome extension to subscribe to `cywebapi:ready` event
- **New Use Case H:** Event-Driven Real-Time Dashboard (`useCyWebEvent` + `WorkspaceApi`)
- **New Use Case I:** Non-React App with Lifecycle Hooks (`CyAppWithLifecycle` + `window.CyWebApi`)
- Updated Summary table

**Parent documents:**

- [module-federation-audit.md § 5](../module-federation-audit.md) — Use case gap analysis
- [app-api-specification.md](../specifications/app-api-specification.md) — Full app API specification
- [module-federation-design.md § 2.5](../module-federation-design.md) — Revised use case gap matrix

---

## Use Case A: Network Generator App

> **Scenario:** Generate a network from an external data source, apply layout and styling, then fit to viewport.
>
> **APIs used:** `NetworkApi` + `LayoutApi` + `VisualStyleApi` + `ViewportApi`

**Rev. 2 fix:** `addToWorkspace: true` is required so the network is added to WorkspaceStore.
Without it, the network is created in the core stores but never displayed. The `fit` call
(which calls the renderer) would also fail because no view is mounted for the network.

```typescript
// NetworkGeneratorMenu.tsx — Menu component registered as ComponentType.Menu
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import {
  VisualPropertyName,
  ValueTypeName,
} from 'cyweb/ApiTypes'
import type { IdType } from 'cyweb/ApiTypes'
import { MenuItem } from '@mui/material'

export const NetworkGeneratorMenu = (): JSX.Element => {
  const networkApi = useNetworkApi()
  const layoutApi = useLayoutApi()
  const visualStyleApi = useVisualStyleApi()
  const viewportApi = useViewportApi()

  const handleGenerate = async (): Promise<void> => {
    // 1. Create network from edge list and add it to the workspace
    const edgeList: Array<[IdType, IdType, string?]> = [
      ['GeneA', 'GeneB', 'activates'],
      ['GeneB', 'GeneC', 'inhibits'],
      ['GeneC', 'GeneD', 'activates'],
      ['GeneD', 'GeneA', 'binds'],
      ['GeneA', 'GeneC', 'phosphorylates'],
    ]

    const createResult = networkApi.createNetworkFromEdgeList({
      name: 'Generated Pathway',
      description: 'Auto-generated signaling pathway',
      edgeList,
      // addToWorkspace must be true for the network to appear and for fit to work
      addToWorkspace: true,
    })

    if (!createResult.success) {
      console.error('Failed to create network:', createResult.error.message)
      return
    }

    const { networkId } = createResult.data

    // 2. Apply visual styles
    visualStyleApi.setDefault(networkId, VisualPropertyName.NodeShape, 'ellipse')
    visualStyleApi.setDefault(networkId, VisualPropertyName.NodeBackgroundColor, '#4A90D9')
    visualStyleApi.setDefault(networkId, VisualPropertyName.NodeWidth, 60)
    visualStyleApi.setDefault(networkId, VisualPropertyName.NodeHeight, 60)
    visualStyleApi.setDefault(networkId, VisualPropertyName.EdgeLineColor, '#999999')
    visualStyleApi.setDefault(networkId, VisualPropertyName.EdgeWidth, 2)

    // Map node label to name attribute (passthrough)
    // Note: createNetworkFromEdgeList already creates this mapping automatically,
    // but calling it again is a no-op if the mapping already exists.
    visualStyleApi.createPassthroughMapping(
      networkId,
      VisualPropertyName.NodeLabel,
      'name',
      ValueTypeName.String,
    )

    // 3. Apply layout (async — layout engine is callback-based)
    //    applyLayout dispatches layout:started and layout:completed events.
    const layoutResult = await layoutApi.applyLayout(networkId, {
      fitAfterLayout: false, // We'll fit manually after
    })

    if (!layoutResult.success) {
      console.error('Layout failed:', layoutResult.error.message)
    }

    // 4. Fit viewport
    await viewportApi.fit(networkId)
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
> **APIs used:** `ViewportApi`

**Rev. 2 fix:** Removed unused `useElementApi` import. In a complete implementation the
node IDs would be obtained from the host (e.g., passed as a prop or read from a store),
not from `ElementApi.getNode`.

```typescript
// CircularLayoutMenu.tsx — Applies a circular layout to the current network
import { useViewportApi } from 'cyweb/ViewportApi'
import type { IdType } from 'cyweb/ApiTypes'
import { MenuItem } from '@mui/material'

export const CircularLayoutMenu = ({
  networkId,
  nodeIds,
}: {
  networkId: IdType
  nodeIds: IdType[]
}): JSX.Element => {
  const viewportApi = useViewportApi()

  const handleApplyCircularLayout = async (): Promise<void> => {
    // Compute circular positions
    const radius = 200
    const cx = 0
    const cy = 0

    // PositionRecord is a plain object (Record, not Map) — JSON-serializable.
    const positions: Record<IdType, [number, number]> = {}
    nodeIds.forEach((nodeId, index) => {
      const angle = (2 * Math.PI * index) / nodeIds.length
      positions[nodeId] = [
        cx + radius * Math.cos(angle),
        cy + radius * Math.sin(angle),
      ]
    })

    // Update positions in bulk
    const result = viewportApi.updateNodePositions(networkId, positions)

    if (!result.success) {
      console.error('Failed to update positions:', result.error.message)
      return
    }

    // Fit viewport to show the new layout
    await viewportApi.fit(networkId)
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

All `VisualStyleApi` write operations automatically trigger `style:changed` events via the
Event Bus (the VisualStyleStore subscription in `initEventBus` fires on any property change).

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
  const visualStyleApi = useVisualStyleApi()
  const selectionApi = useSelectionApi()

  // Set a global default node color
  const handleSetDefaultColor = (): void => {
    const result = visualStyleApi.setDefault(
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
    const result = visualStyleApi.createDiscreteMapping(
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
    const result = visualStyleApi.createContinuousMapping(
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
    visualStyleApi.createPassthroughMapping(
      networkId,
      VisualPropertyName.NodeLabel,
      'name',
      ValueTypeName.String,
    )
  }

  // Remove the edge width mapping
  const handleRemoveMapping = (): void => {
    visualStyleApi.removeMapping(networkId, VisualPropertyName.EdgeWidth)
  }

  // Highlight currently selected nodes with a bypass
  const handleHighlightSelected = (): void => {
    const selResult = selectionApi.getSelection(networkId)
    if (!selResult.success) {
      console.error(selResult.error.message)
      return
    }

    const { selectedNodes } = selResult.data

    if (selectedNodes.length === 0) {
      return
    }

    // Set a bright yellow bypass on selected nodes
    visualStyleApi.setBypass(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      selectedNodes,
      '#FFD700',
    )

    // Also increase their size
    visualStyleApi.setBypass(networkId, VisualPropertyName.NodeWidth, selectedNodes, 80)
    visualStyleApi.setBypass(networkId, VisualPropertyName.NodeHeight, selectedNodes, 80)
  }

  // Remove all color bypasses from selected nodes
  const handleClearBypasses = (): void => {
    const selResult = selectionApi.getSelection(networkId)
    if (!selResult.success) return

    const { selectedNodes } = selResult.data
    if (selectedNodes.length === 0) return

    visualStyleApi.deleteBypass(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      selectedNodes,
    )
    visualStyleApi.deleteBypass(networkId, VisualPropertyName.NodeWidth, selectedNodes)
    visualStyleApi.deleteBypass(networkId, VisualPropertyName.NodeHeight, selectedNodes)
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
      <Button onClick={handleRemoveMapping}>
        Remove Edge Width Mapping
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
> **APIs used:** `TableApi` + `SelectionApi` + `VisualStyleApi`

`TableApi.setValues` triggers `data:changed` automatically. `SelectionApi.exclusiveSelect`
triggers `selection:changed` automatically.

```typescript
// DegreeAnalysisMenu.tsx — Runs degree analysis and annotates the network
import { useTableApi } from 'cyweb/TableApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import {
  ValueTypeName,
  VisualPropertyName,
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
  const tableApi = useTableApi()
  const selectionApi = useSelectionApi()
  const visualStyleApi = useVisualStyleApi()

  const handleDegreeAnalysis = (): void => {
    // 1. Create a new column for degree values (ok if it already exists)
    tableApi.createColumn(
      networkId,
      'node',
      'degree',
      ValueTypeName.Integer,
      0,
    )

    // 2. Compute degree for each node
    const degreeCounts = new Map<IdType, number>()
    for (const nodeId of nodeIds) {
      degreeCounts.set(nodeId, 0)
    }

    for (const { sourceId, targetId } of edgeData) {
      degreeCounts.set(sourceId, (degreeCounts.get(sourceId) ?? 0) + 1)
      degreeCounts.set(targetId, (degreeCounts.get(targetId) ?? 0) + 1)
    }

    // 3. Write degree values back using batch CellEdit
    //    CellEdit uses `id` (not `row`) to identify the element.
    const cellEdits = Array.from(degreeCounts.entries()).map(
      ([nodeId, degree]) => ({
        id: nodeId,
        column: 'degree',
        value: degree,
      }),
    )

    const writeResult = tableApi.setValues(networkId, 'node', cellEdits)
    if (!writeResult.success) {
      console.error('Failed to write degrees:', writeResult.error.message)
      return
    }

    // 4. Select high-degree nodes (degree >= 3)
    const highDegreeNodes = Array.from(degreeCounts.entries())
      .filter(([, degree]) => degree >= 3)
      .map(([nodeId]) => nodeId)

    if (highDegreeNodes.length > 0) {
      selectionApi.exclusiveSelect(networkId, highDegreeNodes, [])
    }

    // 5. Map node size to degree via continuous mapping
    visualStyleApi.createContinuousMapping(
      networkId,
      VisualPropertyName.NodeWidth,
      'double',
      'degree',
      [1, 3, 5, 10],
      ValueTypeName.Integer,
    )

    visualStyleApi.createContinuousMapping(
      networkId,
      VisualPropertyName.NodeHeight,
      'double',
      'degree',
      [1, 3, 5, 10],
      ValueTypeName.Integer,
    )

    // 6. Highlight hub nodes with a color bypass
    if (highDegreeNodes.length > 0) {
      visualStyleApi.setBypass(
        networkId,
        VisualPropertyName.NodeBackgroundColor,
        highDegreeNodes,
        '#E74C3C',
      )
    }
  }

  return (
    <MenuItem onClick={handleDegreeAnalysis}>
      Run Degree Analysis &amp; Annotate
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
  const networkApi = useNetworkApi()
  const exportApi = useExportApi()
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

    // App API validates CX2 internally via validateCX2().
    // navigate: true (default) sets the new network as current.
    // addToWorkspace: true (default) adds it to the workspace.
    const result = networkApi.createNetworkFromCx2({
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

    const result = exportApi.exportToCx2(networkId, {
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
  const elementApi = useElementApi()
  const tableApi = useTableApi()
  const visualStyleApi = useVisualStyleApi()
  const viewportApi = useViewportApi()
  const [addedNodeIds, setAddedNodeIds] = useState<IdType[]>([])
  const [addedEdgeIds, setAddedEdgeIds] = useState<IdType[]>([])

  // Add a cluster of interconnected nodes
  const handleAddCluster = async (): Promise<void> => {
    const nodeCount = 5
    const newNodeIds: IdType[] = []
    const newEdgeIds: IdType[] = []

    // Ensure a "cluster" column exists
    tableApi.createColumn(networkId, 'node', 'cluster', ValueTypeName.String, '')

    // 1. Create nodes in a grid pattern
    for (let i = 0; i < nodeCount; i++) {
      const x = (i % 3) * 100
      const y = Math.floor(i / 3) * 100

      const result = elementApi.createNode(networkId, [x, y], {
        attributes: { name: `New-${i}` },
        autoSelect: false,
      })

      if (result.success) {
        newNodeIds.push(result.data.nodeId)

        // Set cluster attribute
        tableApi.setValue(
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
      const result = elementApi.createEdge(
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
      visualStyleApi.setBypass(
        networkId,
        VisualPropertyName.NodeBackgroundColor,
        newNodeIds,
        '#2ECC71',
      )
      visualStyleApi.setBypass(
        networkId,
        VisualPropertyName.NodeBorderColor,
        newNodeIds,
        '#27AE60',
      )
      visualStyleApi.setBypass(
        networkId,
        VisualPropertyName.NodeBorderWidth,
        newNodeIds,
        3,
      )
    }

    setAddedNodeIds((prev) => [...prev, ...newNodeIds])
    setAddedEdgeIds((prev) => [...prev, ...newEdgeIds])

    // 4. Fit viewport to include new nodes
    await viewportApi.fit(networkId)
  }

  // Delete all nodes added by this editor (cascade deletes edges too)
  const handleDeleteAdded = async (): Promise<void> => {
    if (addedNodeIds.length === 0) return

    const result = elementApi.deleteNodes(networkId, addedNodeIds)

    if (result.success) {
      console.log(
        `Deleted ${result.data.deletedNodeCount} nodes, ` +
          `${result.data.deletedEdgeCount} edges (cascaded)`,
      )
      setAddedNodeIds([])
      setAddedEdgeIds([])
      await viewportApi.fit(networkId)
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

> **Scenario:** A relay app receives commands from an LLM agent via WebSocket, translates them into app API calls, and returns structured results so the agent can iterate.
>
> **APIs used:** `NetworkApi` + `ElementApi` + `TableApi` + `LayoutApi` + `ViewportApi` + `WorkspaceApi` + `ApiTypes`

**Rev. 2 update:** Added `get_workspace` and `switch_network` commands using `WorkspaceApi`.

```typescript
// AgentRelayPanel.tsx — WebSocket relay between LLM agent and Cytoscape Web
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useElementApi } from 'cyweb/ElementApi'
import { useTableApi } from 'cyweb/TableApi'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useViewportApi } from 'cyweb/ViewportApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
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
  const networkApi = useNetworkApi()
  const elementApi = useElementApi()
  const tableApi = useTableApi()
  const layoutApi = useLayoutApi()
  const viewportApi = useViewportApi()
  const workspaceApi = useWorkspaceApi()

  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const appendLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-49), msg])
  }, [])

  // Dispatch a single agent command to the appropriate app API
  const handleCommand = useCallback(
    async (cmd: AgentCommand): Promise<AgentResponse> => {
      switch (cmd.action) {
        // ── Workspace ──
        case 'getWorkspace': {
          const result = workspaceApi.getWorkspaceInfo()
          return toAgentResponse(cmd.id, result)
        }

        case 'getNetworkList': {
          const result = workspaceApi.getNetworkList()
          return toAgentResponse(cmd.id, result)
        }

        case 'switchNetwork': {
          const result = workspaceApi.switchCurrentNetwork(cmd.params.networkId as IdType)
          return toAgentResponse(cmd.id, result)
        }

        // ── Network creation ──
        case 'createNetwork': {
          const result = networkApi.createNetworkFromEdgeList({
            name: (cmd.params.name as string) ?? 'Agent Network',
            edgeList:
              (cmd.params.edgeList as Array<[IdType, IdType, string?]>) ?? [],
            addToWorkspace: true,
          })
          return toAgentResponse(cmd.id, result)
        }

        case 'deleteNetwork': {
          const result = networkApi.deleteNetwork(cmd.params.networkId as IdType)
          return toAgentResponse(cmd.id, result)
        }

        // ── Node creation ──
        case 'addNode': {
          const networkId = cmd.params.networkId as IdType
          const position = (cmd.params.position as [number, number]) ?? [0, 0]
          const attributes =
            (cmd.params.attributes as Record<string, unknown>) ?? {}

          const result = elementApi.createNode(networkId, position, {
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

          const result = elementApi.createEdge(networkId, sourceId, targetId, {
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

          const result = tableApi.setValue(networkId, tableType, elementId, column, value)
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

          const result = tableApi.createColumn(
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
          const result = await layoutApi.applyLayout(networkId, {
            algorithmName: cmd.params.algorithmName as string | undefined,
            fitAfterLayout: true,
          })
          return toAgentResponse(cmd.id, result)
        }

        // ── Fit ──
        case 'fit': {
          const networkId = cmd.params.networkId as IdType
          const result = await viewportApi.fit(networkId)
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
    [networkApi, elementApi, tableApi, layoutApi, viewportApi, workspaceApi],
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
        # 0. Query workspace state
        cmd_id = str(uuid.uuid4())
        await ws.send(json.dumps({
            "id": cmd_id,
            "action": "getWorkspace",
            "params": {}
        }))
        resp = json.loads(await ws.recv())
        if resp["success"]:
            print(f"Workspace: {resp['data']['name']}, networks: {resp['data']['networkCount']}")

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
>
> ```
> Claude Code → MCP Bridge Server (localhost Node.js)
>                   ↕ chrome.runtime messaging
>               Extension Background Script
>                   ↕ chrome.tabs.sendMessage / onMessage
>               Content Script (this file) injected into Cytoscape Web page
>                   ↕ window.CyWebApi
>               Cytoscape Web Core
> ```

**Rev. 2 update:** Added `workspace` tools (`get_workspace`, `get_network_list`, `switch_network`).
Also added event subscription example in the `onApiReady` bootstrap.

### Content Script: `content-script.js`

```javascript
// content-script.js — Injected into the Cytoscape Web page by the extension
// No React, no bundler. Accesses window.CyWebApi directly.

/** Wait for Cytoscape Web to initialize the API */
function onApiReady(callback) {
  if (window.CyWebApi) {
    callback(window.CyWebApi)
  } else {
    window.addEventListener('cywebapi:ready', () => callback(window.CyWebApi), {
      once: true,
    })
  }
}

/**
 * Dispatch a single MCP tool call to the appropriate CyWebApi method.
 * All responses are plain JSON — no Map, no class instances.
 *
 * @param {object} api  - window.CyWebApi
 * @param {string} tool - MCP tool name (e.g. 'create_network')
 * @param {object} args - Tool arguments
 * @returns {Promise<{success: boolean, data?: unknown, error?: {code: string, message: string}}>}
 */
async function dispatchTool(api, tool, args) {
  switch (tool) {
    // ── Workspace ─────────────────────────────────────────────────────────────
    case 'get_workspace': {
      return toResponse(api.workspace.getWorkspaceInfo())
    }

    case 'get_network_list': {
      return toResponse(api.workspace.getNetworkList())
    }

    case 'switch_network': {
      return toResponse(api.workspace.switchCurrentNetwork(args.networkId))
    }

    // ── Network ──────────────────────────────────────────────────────────────
    case 'create_network': {
      const result = api.network.createNetworkFromEdgeList({
        name: args.name ?? 'Untitled',
        description: args.description,
        edgeList: args.edgeList ?? [],
        addToWorkspace: true,
      })
      return toResponse(result)
    }

    case 'create_network_from_cx2': {
      const result = api.network.createNetworkFromCx2({
        cxData: args.cxData,
        navigate: args.navigate ?? true,
        addToWorkspace: args.addToWorkspace ?? true,
      })
      return toResponse(result)
    }

    case 'delete_network': {
      return toResponse(api.network.deleteNetwork(args.networkId))
    }

    case 'delete_current_network': {
      return toResponse(api.network.deleteCurrentNetwork())
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

    case 'get_edge': {
      return toResponse(api.element.getEdge(args.networkId, args.edgeId))
    }

    // ── Table ─────────────────────────────────────────────────────────────────
    case 'get_value': {
      return toResponse(
        api.table.getValue(
          args.networkId,
          args.tableType,
          args.elementId,
          args.column,
        ),
      )
    }

    case 'get_row': {
      return toResponse(
        api.table.getRow(args.networkId, args.tableType, args.elementId),
      )
    }

    case 'set_value': {
      return toResponse(
        api.table.setValue(
          args.networkId,
          args.tableType,
          args.elementId,
          args.column,
          args.value,
        ),
      )
    }

    case 'set_values': {
      // args.cellEdits: Array<{ id, column, value }>
      return toResponse(
        api.table.setValues(args.networkId, args.tableType, args.cellEdits),
      )
    }

    case 'create_column': {
      return toResponse(
        api.table.createColumn(
          args.networkId,
          args.tableType,
          args.columnName,
          args.dataType,
          args.defaultValue ?? '',
        ),
      )
    }

    // ── Selection ─────────────────────────────────────────────────────────────
    case 'get_selection': {
      return toResponse(api.selection.getSelection(args.networkId))
    }

    case 'exclusive_select': {
      return toResponse(
        api.selection.exclusiveSelect(
          args.networkId,
          args.nodeIds ?? [],
          args.edgeIds ?? [],
        ),
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
      return toResponse(
        api.viewport.getNodePositions(args.networkId, args.nodeIds),
      )
    }

    case 'update_node_positions': {
      // args.positions is Record<nodeId, [x, y]> — plain JSON from MCP
      return toResponse(
        api.viewport.updateNodePositions(args.networkId, args.positions),
      )
    }

    // ── Visual Style ──────────────────────────────────────────────────────────
    case 'set_default': {
      return toResponse(
        api.visualStyle.setDefault(args.networkId, args.vpName, args.vpValue),
      )
    }

    case 'set_bypass': {
      return toResponse(
        api.visualStyle.setBypass(
          args.networkId,
          args.vpName,
          args.elementIds,
          args.vpValue,
        ),
      )
    }

    case 'delete_bypass': {
      return toResponse(
        api.visualStyle.deleteBypass(
          args.networkId,
          args.vpName,
          args.elementIds,
        ),
      )
    }

    // ── Export ────────────────────────────────────────────────────────────────
    case 'export_cx2': {
      return toResponse(
        api.export.exportToCx2(args.networkId, {
          networkName: args.networkName,
        }),
      )
    }

    default:
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: `Unknown tool: ${tool}` },
      }
  }
}

/** Normalize ApiResult into a plain JSON-serializable response */
function toResponse(result) {
  if (result.success) {
    return { success: true, data: result.data ?? null }
  }
  return {
    success: false,
    error: { code: result.error.code, message: result.error.message },
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

onApiReady((api) => {
  // Optional: subscribe to CyWeb events and forward them to the background script
  window.addEventListener('network:switched', (e) => {
    chrome.runtime.sendMessage({
      type: 'CYWEB_EVENT',
      event: 'network:switched',
      detail: e.detail,
    })
  })
  window.addEventListener('selection:changed', (e) => {
    chrome.runtime.sendMessage({
      type: 'CYWEB_EVENT',
      event: 'selection:changed',
      detail: e.detail,
    })
  })
  window.addEventListener('data:changed', (e) => {
    chrome.runtime.sendMessage({
      type: 'CYWEB_EVENT',
      event: 'data:changed',
      detail: e.detail,
    })
  })

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
      return {
        callId,
        success: false,
        error: {
          code: 'OPERATION_FAILED',
          message: 'Cytoscape Web tab not found',
        },
      }
    }
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      cywebTabId,
      { type: 'MCP_TOOL_CALL', callId, tool, args },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            callId,
            success: false,
            error: {
              code: 'OPERATION_FAILED',
              message: chrome.runtime.lastError.message,
            },
          })
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

// Forward CyWeb events from content script to MCP Bridge Server
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CYWEB_EVENT' && ws?.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'EVENT',
        event: message.event,
        detail: message.detail,
      }),
    )
  }
})

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
  ws.on('close', () => {
    extensionSocket = null
  })
  // Forward CyWeb events from extension to any attached MCP clients
  ws.on('message', (data) => {
    const msg = JSON.parse(data)
    if (msg.type === 'EVENT') {
      // Could emit to MCP resource subscribers here
      console.error(`[event] ${msg.event}:`, JSON.stringify(msg.detail))
    }
  })
})

/** Send a tool call to the extension and wait for the response */
function callExtension(tool, args) {
  return new Promise((resolve, reject) => {
    if (!extensionSocket) {
      reject(
        new Error(
          'Chrome extension not connected. Open Cytoscape Web and install the extension.',
        ),
      )
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
    setTimeout(() => {
      extensionSocket.off('message', onMessage)
      reject(new Error('Timeout'))
    }, 30000)
  })
}

// Register MCP tools — one per CyWebApi operation
server.tool('get_workspace', {}, async () => {
  const result = await callExtension('get_workspace', {})
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})

server.tool('get_network_list', {}, async () => {
  const result = await callExtension('get_network_list', {})
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})

server.tool(
  'switch_network',
  { networkId: z.string() },
  async ({ networkId }) => {
    const result = await callExtension('switch_network', { networkId })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)

server.tool(
  'create_network',
  {
    name: z.string(),
    edgeList: z.array(z.tuple([z.string(), z.string(), z.string().optional()])),
  },
  async ({ name, edgeList }) => {
    const result = await callExtension('create_network', { name, edgeList })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)

server.tool(
  'create_node',
  {
    networkId: z.string(),
    position: z.tuple([z.number(), z.number()]).optional(),
    attributes: z.record(z.unknown()).optional(),
  },
  async (args) => {
    const result = await callExtension('create_node', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)

server.tool(
  'apply_layout',
  {
    networkId: z.string(),
    algorithmName: z.string().optional(),
  },
  async (args) => {
    const result = await callExtension('apply_layout', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)

server.tool(
  'get_node_positions',
  {
    networkId: z.string(),
    nodeIds: z.array(z.string()),
  },
  async (args) => {
    // Returns PositionRecord: { nodeId: [x, y] } — plain JSON, no conversion needed
    const result = await callExtension('get_node_positions', args)
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  },
)

server.tool('export_cx2', { networkId: z.string() }, async (args) => {
  const result = await callExtension('export_cx2', args)
  return { content: [{ type: 'text', text: JSON.stringify(result) }] }
})

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

| Concern                    | React variant (Use Case G original)              | Vanilla JS / Extension variant                               |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| API access                 | `useXxxApi()` hooks inside React component       | `window.CyWebApi.xxx` in content script                      |
| React required             | Yes                                              | **No**                                                       |
| Module Federation required | Yes                                              | **No**                                                       |
| WebSocket location         | In browser (Adapter App React component)         | In extension background script (Service Worker)              |
| Cross-origin issue         | HTTPS→ws://localhost blocked by Mixed Content    | Extension `host_permissions` bypasses Private Network Access |
| Position type              | `Record<IdType, [x, y]>` (JSON-ready)            | Same — no `Map` conversion needed                            |
| `apply_layout` async       | `await` in React `useCallback`                   | `await` in `dispatchTool`                                    |
| `cywebapi:ready` guard     | Not needed (React hook lifecycle manages timing) | **Required** — content script may load before Cytoscape Web  |
| Event Bus                  | `useCyWebEvent` hook                             | `window.addEventListener` + forward to background            |

---

## Use Case H: Event-Driven Real-Time Dashboard

> **Scenario:** A panel app displays real-time statistics about the current network and workspace.
> It subscribes to CyWeb events to keep its display current without polling.
>
> **APIs used:** `WorkspaceApi` + `SelectionApi` + `useCyWebEvent` (Event Bus)

This example demonstrates the Event Bus pattern: using `useCyWebEvent` with stable
`useCallback` references to subscribe to multiple event types in a single component.

**Important:** Wrap all `useCyWebEvent` handlers in `useCallback` (or define them as stable
references outside the component). An unstable handler reference causes the hook to
re-subscribe on every render.

```typescript
// NetworkDashboardPanel.tsx — Real-time network statistics panel
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useCyWebEvent } from 'cyweb/EventBus'
import type { IdType } from 'cyweb/ApiTypes'
import { Box, Typography, Divider, Chip, Stack } from '@mui/material'
import { useState, useEffect, useCallback } from 'react'

interface NetworkStats {
  networkId: IdType
  name: string
  nodeCount: number
  edgeCount: number
  isModified: boolean
}

interface SelectionStats {
  selectedNodes: number
  selectedEdges: number
}

export const NetworkDashboardPanel = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const selectionApi = useSelectionApi()

  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [networkCount, setNetworkCount] = useState<number>(0)
  const [currentNetwork, setCurrentNetwork] = useState<NetworkStats | null>(null)
  const [selection, setSelection] = useState<SelectionStats>({ selectedNodes: 0, selectedEdges: 0 })
  const [lastEvent, setLastEvent] = useState<string>('—')
  const [layoutRunning, setLayoutRunning] = useState(false)
  const [pendingDataChange, setPendingDataChange] = useState(false)

  // Load initial workspace state
  const refreshWorkspace = useCallback(() => {
    const wsInfo = workspaceApi.getWorkspaceInfo()
    if (!wsInfo.success) return

    setWorkspaceName(wsInfo.data.name)
    setNetworkCount(wsInfo.data.networkCount)

    const currentId = wsInfo.data.currentNetworkId
    if (!currentId) {
      setCurrentNetwork(null)
      return
    }

    const summary = workspaceApi.getNetworkSummary(currentId)
    if (summary.success) {
      setCurrentNetwork({
        networkId: currentId,
        name: summary.data.name,
        nodeCount: summary.data.nodeCount,
        edgeCount: summary.data.edgeCount,
        isModified: summary.data.isModified,
      })
    }

    const sel = selectionApi.getSelection(currentId)
    if (sel.success) {
      setSelection({
        selectedNodes: sel.data.selectedNodes.length,
        selectedEdges: sel.data.selectedEdges.length,
      })
    }
  }, [workspaceApi, selectionApi])

  useEffect(() => {
    refreshWorkspace()
  }, [refreshWorkspace])

  // ── Event Bus subscriptions ──────────────────────────────────────────────

  // When a network is added: refresh workspace
  const handleNetworkCreated = useCallback(({ networkId }: { networkId: IdType }) => {
    setLastEvent(`network:created — ${networkId}`)
    refreshWorkspace()
  }, [refreshWorkspace])
  useCyWebEvent('network:created', handleNetworkCreated)

  // When a network is removed: refresh workspace
  const handleNetworkDeleted = useCallback(({ networkId }: { networkId: IdType }) => {
    setLastEvent(`network:deleted — ${networkId}`)
    refreshWorkspace()
  }, [refreshWorkspace])
  useCyWebEvent('network:deleted', handleNetworkDeleted)

  // When the active network changes: refresh workspace and clear selection
  const handleNetworkSwitched = useCallback(
    ({ networkId, previousId }: { networkId: IdType; previousId: IdType }) => {
      setLastEvent(`network:switched → ${networkId}`)
      setSelection({ selectedNodes: 0, selectedEdges: 0 })
      refreshWorkspace()
    },
    [refreshWorkspace],
  )
  useCyWebEvent('network:switched', handleNetworkSwitched)

  // When selection changes: update selection stats
  const handleSelectionChanged = useCallback(
    ({ selectedNodes, selectedEdges }: { networkId: IdType; selectedNodes: IdType[]; selectedEdges: IdType[] }) => {
      setSelection({ selectedNodes: selectedNodes.length, selectedEdges: selectedEdges.length })
      setLastEvent(`selection:changed — ${selectedNodes.length}N ${selectedEdges.length}E`)
    },
    [],
  )
  useCyWebEvent('selection:changed', handleSelectionChanged)

  // When layout starts/completes: show running indicator
  const handleLayoutStarted = useCallback(({ algorithm }: { networkId: IdType; algorithm: string }) => {
    setLayoutRunning(true)
    setLastEvent(`layout:started — ${algorithm}`)
  }, [])
  useCyWebEvent('layout:started', handleLayoutStarted)

  const handleLayoutCompleted = useCallback(({ algorithm }: { networkId: IdType; algorithm: string }) => {
    setLayoutRunning(false)
    setLastEvent(`layout:completed — ${algorithm}`)
    // Refresh summary (node count may not change, but isModified might)
    refreshWorkspace()
  }, [refreshWorkspace])
  useCyWebEvent('layout:completed', handleLayoutCompleted)

  // When data changes: flash indicator
  const handleDataChanged = useCallback(
    ({ tableType, rowIds }: { networkId: IdType; tableType: 'node' | 'edge'; rowIds: IdType[] }) => {
      setPendingDataChange(true)
      setLastEvent(
        rowIds.length > 0
          ? `data:changed — ${rowIds.length} ${tableType} rows`
          : `data:changed — ${tableType} schema`,
      )
      // Refresh summary to update nodeCount/edgeCount if rows were added/removed
      refreshWorkspace()
      setTimeout(() => setPendingDataChange(false), 1000)
    },
    [refreshWorkspace],
  )
  useCyWebEvent('data:changed', handleDataChanged)

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h6">Network Dashboard</Typography>

      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">Workspace:</Typography>
        <Typography variant="body2">{workspaceName || '—'}</Typography>
        <Chip label={`${networkCount} networks`} size="small" />
      </Stack>

      <Divider />

      {currentNetwork ? (
        <>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" fontWeight="bold">
              {currentNetwork.name}
            </Typography>
            {currentNetwork.isModified && (
              <Chip label="modified" size="small" color="warning" />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {currentNetwork.nodeCount} nodes · {currentNetwork.edgeCount} edges
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Selected: {selection.selectedNodes}N {selection.selectedEdges}E
          </Typography>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No network selected
        </Typography>
      )}

      <Divider />

      <Stack direction="row" spacing={1} alignItems="center">
        {layoutRunning && <Chip label="layout running…" size="small" color="info" />}
        {pendingDataChange && <Chip label="data changed" size="small" color="success" />}
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Last event: {lastEvent}
      </Typography>
    </Box>
  )
}
```

---

## Use Case I: Non-React App with App Lifecycle Hooks

> **Scenario:** An external app that does not use React components (e.g., a data pipeline
> script, a visualization library, or a D3.js-based panel) uses `CyAppWithLifecycle` to
> run initialization logic when activated and clean up when deactivated.
>
> **APIs used:** `window.CyWebApi` (via `AppContext.apis`) + App Lifecycle (`mount`/`unmount`)

This example shows how to use `CyAppWithLifecycle` to:

- Run one-time initialization in `mount()` using the pre-built `context.apis`
- Subscribe to CyWeb events using `window.addEventListener` (Vanilla JS, no React)
- Clean up all listeners and state in `unmount()`

```typescript
// my-pipeline-app.ts — A non-React app registered via Module Federation
// This app exposes no panel or menu components — it runs silently in the background.

import type { CyAppWithLifecycle, AppContext, IdType } from 'cyweb/ApiTypes'
import { ComponentType } from 'cyweb/ApiTypes' // if needed for component registration

// ── Internal state ───────────────────────────────────────────────────────────

let cleanupFns: Array<() => void> = []

// ── App definition ───────────────────────────────────────────────────────────

export const MyPipelineApp: CyAppWithLifecycle = {
  name: 'my-pipeline-app',

  // No React component registrations — this is a headless app.
  // components: [],

  /**
   * Called when the app is activated (after React components are registered).
   * context.apis is the same object as window.CyWebApi at runtime.
   * If this returns a Promise, the host awaits it before marking the app as ready.
   */
  async mount(context: AppContext): Promise<void> {
    const { apis } = context

    // 1. Read initial workspace state
    const wsInfo = apis.workspace.getWorkspaceInfo()
    if (wsInfo.success) {
      console.log(
        `[pipeline] Workspace: ${wsInfo.data.name} (${wsInfo.data.networkCount} networks)`,
      )
    }

    // 2. If a network is already open, run initial analysis
    const currentIdResult = apis.workspace.getCurrentNetworkId()
    if (currentIdResult.success) {
      await runAnalysis(apis, currentIdResult.data.networkId)
    }

    // 3. Subscribe to events using window.addEventListener (no React, no useCyWebEvent)

    // Re-run analysis when the active network changes
    const onNetworkSwitched = async (e: Event): Promise<void> => {
      const { networkId } = (
        e as CustomEvent<{ networkId: IdType; previousId: IdType }>
      ).detail
      if (networkId) {
        await runAnalysis(apis, networkId)
      }
    }
    window.addEventListener('network:switched', onNetworkSwitched)
    cleanupFns.push(() =>
      window.removeEventListener('network:switched', onNetworkSwitched),
    )

    // Re-run analysis when table data changes in any network
    const onDataChanged = async (e: Event): Promise<void> => {
      const { networkId, tableType, rowIds } = (
        e as CustomEvent<{
          networkId: IdType
          tableType: 'node' | 'edge'
          rowIds: IdType[]
        }>
      ).detail

      // Only react to node data changes with actual row mutations
      if (tableType === 'node' && rowIds.length > 0) {
        await runAnalysis(apis, networkId)
      }
    }
    window.addEventListener('data:changed', onDataChanged)
    cleanupFns.push(() =>
      window.removeEventListener('data:changed', onDataChanged),
    )

    console.log('[pipeline] App mounted and subscribed to events')
  },

  /**
   * Called when the app is deactivated or the page is unloaded.
   * Must clean up all listeners, timers, DOM nodes, and async tasks.
   * Always called, even on page reload.
   */
  unmount(): void {
    for (const cleanup of cleanupFns) {
      cleanup()
    }
    cleanupFns = []
    console.log('[pipeline] App unmounted, all listeners removed')
  },
}

// ── Domain logic ─────────────────────────────────────────────────────────────

/**
 * Example analysis: compute node degree and write it to the 'pipeline_degree' column.
 */
async function runAnalysis(
  apis: AppContext['apis'],
  networkId: IdType,
): Promise<void> {
  // Ensure the output column exists
  apis.table.createColumn(networkId, 'node', 'pipeline_degree', 'integer', 0)

  // Get current selection to find "interesting" nodes
  const sel = apis.selection.getSelection(networkId)
  if (!sel.success) return

  const targetNodes = sel.data.selectedNodes

  if (targetNodes.length === 0) return

  // Compute a simple score: sum of selected neighbors (toy example)
  const scores = targetNodes.map((nodeId, i) => ({
    id: nodeId,
    column: 'pipeline_degree',
    value: i + 1, // placeholder — real app would use graph topology
  }))

  const writeResult = apis.table.setValues(networkId, 'node', scores)
  if (!writeResult.success) {
    console.error(
      '[pipeline] Failed to write scores:',
      writeResult.error.message,
    )
    return
  }

  // Apply layout after analysis (optional)
  const layoutResult = await apis.layout.applyLayout(networkId, {
    fitAfterLayout: true,
  })
  if (!layoutResult.success) {
    console.warn('[pipeline] Layout failed:', layoutResult.error.message)
  }

  console.log(
    `[pipeline] Analysis complete for ${networkId}: ${targetNodes.length} nodes updated`,
  )
}
```

### Key Lifecycle Design Points

| Concern                             | Guidance                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `mount()` can be async              | If it returns a `Promise`, the host awaits it. Use `async/await` freely.                                        |
| `context.apis` vs `window.CyWebApi` | They are the same object. Prefer `context.apis` inside `mount()` for testability.                               |
| Event subscriptions                 | Use `window.addEventListener` in `mount()` and remove them in `unmount()`. Track cleanup functions explicitly.  |
| No React?                           | `CyAppWithLifecycle` extends `CyApp`. You can register zero React components and use the lifecycle hooks alone. |
| `unmount()` is always called        | Including on page reload. Do not rely on browser unload events — use `unmount()` exclusively for cleanup.       |
| Re-entrancy                         | `mount()` is called at most once per activation. `unmount()` is called at most once per deactivation.           |

---

## Summary: Use Case Coverage

| Use Case                            | APIs Used                                                                          | Sync/Async                     |
| ----------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| **A: Network Generator**            | `NetworkApi`, `LayoutApi`, `VisualStyleApi`, `ViewportApi`                         | Mixed (layout + fit are async) |
| **B: Custom Layout**                | `ViewportApi`                                                                      | Mixed (fit is async)           |
| **C: Style Modification**           | `VisualStyleApi`, `SelectionApi`                                                   | Sync                           |
| **D: Analysis / Annotation**        | `TableApi`, `SelectionApi`, `VisualStyleApi`                                       | Sync                           |
| **E: Data Import/Export**           | `NetworkApi`, `ExportApi`                                                          | Sync                           |
| **F: Graph Structure Modification** | `ElementApi`, `TableApi`, `VisualStyleApi`, `ViewportApi`                          | Mixed (fit is async)           |
| **G: LLM Agent Relay (React)**      | `NetworkApi`, `ElementApi`, `TableApi`, `LayoutApi`, `ViewportApi`, `WorkspaceApi` | Mixed                          |
| **G: LLM Agent Relay (Vanilla JS)** | `window.CyWebApi.*` (all domains)                                                  | Mixed (layout + fit are async) |
| **H: Event-Driven Dashboard**       | `WorkspaceApi`, `SelectionApi`, `useCyWebEvent`                                    | Sync (reads only)              |
| **I: Non-React App w/ Lifecycle**   | `window.CyWebApi` via `AppContext.apis`, lifecycle hooks                           | Mixed                          |

All seven use cases that were **Partial** or **No** in the audit are now fully implementable
with the app API. Key design properties visible across the examples:

- **No raw store imports** — every operation goes through `cyweb/*` app API modules or `window.CyWebApi`
- **Structured error handling** — `ApiResult` discriminated union with `ApiErrorCode` enables programmatic error handling (especially critical for Use Cases G and I)
- **Type-safe visual properties** — `VisualPropertyName` and `ValueTypeName` are imported from `cyweb/ApiTypes`
- **Sync/async clarity** — store operations are sync; `layout.applyLayout` and `viewport.fit` are `Promise`-based
- **Event Bus** — `useCyWebEvent` (React) and `window.addEventListener` (Vanilla JS) provide the same typed events
- **Stable handler references** — `useCallback` is required for `useCyWebEvent` handlers to avoid re-subscribing on each render
- **App lifecycle** — `mount`/`unmount` enable headless apps with proper initialization and cleanup, even without React components
