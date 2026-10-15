import { Box, Button, Divider, Typography } from '@mui/material'
import { type ReactElement, useMemo, useState } from 'react'

import { layoutApi } from '@/app-api/core/layoutApi'
import { Scaling } from '@/features/LayoutTools/Scaling'
import type { IdType } from '@/models/IdType'

/**
 * Every layout the Layout menu offers, as buttons, plus the Layout Tools
 * scaling sliders. The list comes from the layout engine registry, so a new
 * algorithm appears here without a manual edit.
 */
export const DemoLayoutPanel = ({
  networkId,
}: {
  networkId: IdType
}): ReactElement => {
  const [running, setRunning] = useState<string | undefined>()
  const layouts = useMemo(() => {
    const result = layoutApi.getAvailableLayouts()
    return result.success ? result.data.layouts : []
  }, [])

  const apply = (algorithmName: string): void => {
    setRunning(algorithmName)
    void layoutApi
      .applyLayout(networkId, { algorithmName })
      .finally(() => setRunning(undefined))
  }

  return (
    <Box sx={{ p: 1.5, overflowY: 'auto', height: '100%' }}>
      <Typography variant="subtitle2" gutterBottom>
        Layout
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {layouts.map((layout) => (
          <Button
            key={`${layout.engineName}-${layout.algorithmName}`}
            size="small"
            variant="outlined"
            disabled={running !== undefined}
            onClick={() => apply(layout.algorithmName)}
            title={layout.description}
            data-testid={`manual-demo-layout-${layout.algorithmName}`}
          >
            {layout.displayName}
          </Button>
        ))}
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" gutterBottom>
        Layout Tools
      </Typography>
      <Scaling networkId={networkId} />
    </Box>
  )
}
