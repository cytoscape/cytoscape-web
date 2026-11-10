import { Box, Button, Typography } from '@mui/material'
import { type ReactElement, useState } from 'react'

import { CyWebApi } from '@/app-api/core'
import type { IdType } from '@/models/IdType'

interface ApiExample {
  label: string
  /** The code a developer would write, shown verbatim. */
  code: string
  run: (networkId: IdType) => Promise<unknown> | unknown
}

/**
 * Canned App API calls on the demo network. Each button runs the code it
 * shows through the same `CyWebApi` object apps and `window.CyWebApi` get,
 * and prints the `ApiResult` it returns.
 */
const EXAMPLES: ApiExample[] = [
  {
    label: 'Apply the Grid layout',
    code: `await CyWebApi.layout.applyLayout(networkId, {
  algorithmName: 'grid',
})`,
    run: (networkId) =>
      CyWebApi.layout.applyLayout(networkId, { algorithmName: 'grid' }),
  },
  {
    label: 'Label nodes with their common name',
    code: `CyWebApi.visualStyle.createPassthroughMapping(
  networkId, 'nodeLabel', 'COMMON', 'string',
)`,
    run: (networkId) =>
      CyWebApi.visualStyle.createPassthroughMapping(
        networkId,
        'nodeLabel',
        'COMMON',
        'string',
      ),
  },
  {
    label: 'Select the neighbors of the selection',
    code: `const { selectedNodes } =
  CyWebApi.selection.getSelection(networkId).data
const neighbors = selectedNodes.flatMap(
  (id) => CyWebApi.element.getConnectedNodes(networkId, id).data.nodeIds,
)
CyWebApi.selection.additiveSelect(networkId, neighbors, [])`,
    run: (networkId) => {
      const selection = CyWebApi.selection.getSelection(networkId)
      if (!selection.success) return selection
      const neighbors = selection.data.selectedNodes.flatMap((id) => {
        const connected = CyWebApi.element.getConnectedNodes(networkId, id)
        return connected.success ? connected.data.nodeIds : []
      })
      return CyWebApi.selection.additiveSelect(networkId, neighbors, [])
    },
  },
  {
    label: 'Paint every node orange',
    code: `CyWebApi.visualStyle.setDefault(
  networkId, 'nodeBackgroundColor', '#F28E2B',
)`,
    run: (networkId) =>
      CyWebApi.visualStyle.setDefault(
        networkId,
        'nodeBackgroundColor',
        '#F28E2B',
      ),
  },
]

export const DemoApiPanel = ({
  networkId,
}: {
  networkId: IdType
}): ReactElement => {
  const [result, setResult] = useState<{ label: string; text: string }>()

  const run = async (example: ApiExample): Promise<void> => {
    try {
      const value = await example.run(networkId)
      setResult({
        label: example.label,
        text: JSON.stringify(value, null, 2),
      })
    } catch (cause) {
      setResult({ label: example.label, text: String(cause) })
    }
  }

  return (
    <Box sx={{ p: 1.5, overflowY: 'auto', height: '100%' }}>
      {EXAMPLES.map((example) => (
        <Box key={example.label} sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void run(example)}
            data-testid="manual-demo-api-run"
          >
            {example.label}
          </Button>
          <Box
            component="pre"
            sx={{
              m: 0,
              mt: 0.75,
              p: 1,
              fontSize: '0.75rem',
              borderRadius: 1,
              bgcolor: 'action.hover',
              overflowX: 'auto',
            }}
          >
            {example.code}
          </Box>
        </Box>
      ))}
      {result !== undefined ? (
        <Box data-testid="manual-demo-api-result">
          <Typography variant="caption" color="text.secondary">
            Result of “{result.label}”
          </Typography>
          <Box
            component="pre"
            sx={{ m: 0, p: 1, fontSize: '0.75rem', overflowX: 'auto' }}
          >
            {result.text}
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}
