import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { Alert, Box, Button, Paper, Typography } from '@mui/material'
import { type ReactElement, useEffect, useState } from 'react'

import { networkApi } from '@/app-api/core/networkApi'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { logUi } from '@/debug'
import { DefaultRenderer } from '@/features/DefaultRenderer'
import VizmapperView from '@/features/Vizmapper'
import type { IdType } from '@/models/IdType'
import { sandboxReady } from '../sandbox'

/** Bundled networks a demo can start from. */
const FIXTURES = {
  // galFiltered, trimmed to 10 nodes; carries gal80Rexp and gal80Rsig.
  'gal-filtered': () =>
    import('@/assets/networks/gal-filtered-chart.cx2?raw').then(
      (m) => m.default,
    ),
} as const

export type LiveDemoFixture = keyof typeof FIXTURES
export type LiveDemoPanel = 'renderer' | 'style'

export interface LiveDemoProps {
  fixture?: LiveDemoFixture
  panels?: LiveDemoPanel[]
  height?: number
  caption?: string
}

type DemoState =
  | { kind: 'loading' }
  | { kind: 'ready'; networkId: IdType }
  | { kind: 'unavailable' }
  | { kind: 'failed'; message: string }

const STYLE_PANEL_WIDTH = 420
const DEFAULT_HEIGHT = 520

const DemoNetwork = ({ networkId }: { networkId: IdType }): ReactElement => {
  const network = useNetworkStore((state) => state.networks.get(networkId))
  if (network === undefined) {
    return <></>
  }
  return DefaultRenderer.getComponent(network, undefined, true, false)
}

export default function LiveDemoBody({
  fixture = 'gal-filtered',
  panels = ['renderer', 'style'],
  height = DEFAULT_HEIGHT,
  caption,
}: LiveDemoProps): ReactElement {
  const [state, setState] = useState<DemoState>({ kind: 'loading' })
  // Bumped by Reset: the effect below deletes the network and loads a fresh
  // copy of the fixture.
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    let cancelled = false
    let createdId: IdType | undefined

    const load = async (): Promise<void> => {
      if (!(await sandboxReady())) {
        if (!cancelled) setState({ kind: 'unavailable' })
        return
      }
      const raw = await FIXTURES[fixture]()
      if (cancelled) return
      const result = networkApi.createNetworkFromCx2({
        cxData: JSON.parse(raw),
      })
      if (!result.success) {
        logUi.warn('[LiveDemo] fixture failed to load', result.error)
        setState({ kind: 'failed', message: result.error.message })
        return
      }
      createdId = result.data.networkId
      useUiStateStore.getState().setActiveNetworkView(createdId)
      setState({ kind: 'ready', networkId: createdId })
    }

    setState({ kind: 'loading' })
    load().catch((cause: unknown) => {
      logUi.warn('[LiveDemo] fixture failed to load', cause)
      if (!cancelled) setState({ kind: 'failed', message: String(cause) })
    })

    return () => {
      cancelled = true
      if (createdId !== undefined) {
        networkApi.deleteNetwork(createdId)
      }
    }
  }, [fixture, generation])

  if (state.kind === 'unavailable') {
    return (
      <Alert severity="info" sx={{ my: 3 }} data-testid="manual-live-demo">
        Live demos run only in the manual (/manual), where they cannot change
        your workspace.
      </Alert>
    )
  }
  if (state.kind === 'failed') {
    return (
      <Alert severity="warning" sx={{ my: 3 }} data-testid="manual-live-demo">
        The live demo could not start: {state.message}
      </Alert>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{ my: 3, overflow: 'hidden' }}
      data-testid="manual-live-demo"
      data-network-id={state.kind === 'ready' ? state.networkId : undefined}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" sx={{ flex: 1 }}>
          {caption ??
            'Live demo — try it. Changes stay in this tab and never touch your workspace.'}
        </Typography>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => setGeneration((g) => g + 1)}
          data-testid="manual-live-demo-reset"
        >
          Reset
        </Button>
      </Box>
      {/* Side by side on wide screens; stacked, renderer first, on phones. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          height: { xs: height * 2, md: height },
        }}
      >
        {state.kind === 'ready' ? (
          <>
            {panels.includes('renderer') ? (
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 0,
                  position: 'relative',
                }}
                data-testid="manual-live-demo-renderer"
              >
                <DemoNetwork networkId={state.networkId} />
              </Box>
            ) : null}
            {panels.includes('style') ? (
              <Box
                sx={{
                  width: {
                    xs: '100%',
                    md: panels.includes('renderer')
                      ? STYLE_PANEL_WIDTH
                      : '100%',
                  },
                  height: { xs: height, md: 'auto' },
                  flexShrink: 0,
                  borderLeft: {
                    xs: 0,
                    md: panels.includes('renderer') ? 1 : 0,
                  },
                  borderTop: { xs: panels.includes('renderer') ? 1 : 0, md: 0 },
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
                data-testid="manual-live-demo-style"
              >
                <VizmapperView networkId={state.networkId} height={height} />
              </Box>
            ) : null}
          </>
        ) : null}
      </Box>
    </Paper>
  )
}
