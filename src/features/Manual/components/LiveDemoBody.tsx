import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import {
  lazy,
  type ReactElement,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { networkApi } from '@/app-api/core/networkApi'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useNetworkSummaryStore } from '@/data/hooks/stores/NetworkSummaryStore'
import { useUiStateStore } from '@/data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { logUi } from '@/debug'
import { DefaultRenderer } from '@/features/DefaultRenderer'
import { FloatingToolBar } from '@/features/FloatingToolBar'
import VizmapperView from '@/features/Vizmapper'
import type { IdType } from '@/models/IdType'
import { sandboxReady } from '../sandbox'
import { useDemoSlot } from './DemoSlot'
import { DemoApiPanel } from './demo/DemoApiPanel'
import { DemoLayoutPanel } from './demo/DemoLayoutPanel'
import { DemoUrlPanel } from './demo/DemoUrlPanel'

// Heavy editor parts load only when a demo uses them.
const TableBrowser = lazy(() => import('@/features/TableBrowser/TableBrowser'))
const FilterTab = lazy(() => import('@/features/Filter'))
const MergeNetworkDialogHost = lazy(() =>
  import('@/features/ToolBar/ToolsMenu/MergeNetworkDialogHost').then((m) => ({
    default: m.MergeNetworkDialogHost,
  })),
)
const ExportImage = lazy(() =>
  import('@/features/ToolBar/DataMenu/ExportNetworkToImage/ExportImage').then(
    (m) => ({ default: m.ExportImage }),
  ),
)

/** Bundled networks a demo can load. */
const FIXTURES = {
  // galFiltered, trimmed to 10 nodes; carries gal80Rexp and gal80Rsig.
  'gal-filtered': () =>
    import('@/assets/networks/gal-filtered-chart.cx2?raw').then(
      (m) => m.default,
    ),
  // 6 nodes; 4 share names with gal-filtered, for the merge demo.
  'hsf1-neighborhood': () =>
    import('@/assets/networks/hsf1-neighborhood.cx2?raw').then(
      (m) => m.default,
    ),
} as const

export type LiveDemoFixture = keyof typeof FIXTURES

/**
 * Parts of the editor a demo can show. `renderer` and `toolbar` sit in the
 * main area; `style`, `filter`, `layout`, `api` and `url` share a side panel
 * as tabs; `table` runs along the bottom.
 */
export type LiveDemoPanel =
  | 'renderer'
  | 'toolbar'
  | 'style'
  | 'filter'
  | 'layout'
  | 'api'
  | 'url'
  | 'table'

/** Editor dialogs a demo can open from its header. */
export type LiveDemoAction = 'merge' | 'exportImage'

export interface LiveDemoProps {
  /** Loaded into the sandbox workspace in order; the first one is shown. */
  fixtures?: LiveDemoFixture[]
  panels?: LiveDemoPanel[]
  actions?: LiveDemoAction[]
  /** Height of the renderer row, in pixels. */
  height?: number
  caption?: string
  /**
   * Fill the parent's height instead of using `height`, with the parts
   * stacked: renderer, then side panel, then table. Set by LiveDemo when the
   * demo renders in the `split` layout's pinned column.
   */
  fill?: boolean
}

type DemoState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable' }
  | { kind: 'failed'; message: string }

/** Tabs below or beside the renderer. `table` joins them in `fill` mode. */
type SidePanel = Extract<
  LiveDemoPanel,
  'style' | 'filter' | 'layout' | 'api' | 'url' | 'table'
>

const SIDE_PANELS: readonly SidePanel[] = [
  'style',
  'filter',
  'layout',
  'api',
  'url',
]
const SIDE_PANEL_LABELS: Record<SidePanel, string> = {
  style: 'Style',
  filter: 'Filter',
  layout: 'Layout',
  api: 'App API',
  url: 'Link',
  table: 'Table',
}

const SIDE_PANEL_WIDTH = 420
const DEFAULT_HEIGHT = 520
const TABLE_HEIGHT = 300
const TAB_STRIP_HEIGHT = 36

const DemoNetwork = ({ networkId }: { networkId: IdType }): ReactElement => {
  const network = useNetworkStore((state) => state.networks.get(networkId))
  if (network === undefined) {
    return <></>
  }
  return DefaultRenderer.getComponent(network, undefined, true, false)
}

/** The element's current height in pixels, kept up to date as it resizes. */
const useElementHeight = (): [
  (element: HTMLElement | null) => void,
  number,
] => {
  const [height, setHeight] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)
  // Stable, so React does not detach and reattach it on every render.
  const ref = useCallback((element: HTMLElement | null): void => {
    observer.current?.disconnect()
    if (element === null) return
    observer.current = new ResizeObserver(([entry]) =>
      setHeight(Math.floor(entry.contentRect.height)),
    )
    observer.current.observe(element)
  }, [])
  return [ref, height]
}

const Lazy = ({ children }: { children: ReactNode }): ReactElement => (
  <Suspense fallback={null}>{children}</Suspense>
)

/** Switches the shown network when the demo holds more than one. */
const NetworkPicker = ({ shownId }: { shownId: IdType }): ReactElement => {
  const networkIds = useWorkspaceStore((s) => s.workspace.networkIds)
  const summaries = useNetworkSummaryStore((s) => s.summaries)
  if (networkIds.length < 2) return <></>
  return (
    <Select
      size="small"
      value={networkIds.includes(shownId) ? shownId : ''}
      onChange={(event) => {
        const id = event.target.value
        useWorkspaceStore.getState().setCurrentNetworkId(id)
        useUiStateStore.getState().setActiveNetworkView(id)
      }}
      sx={{ fontSize: '0.8rem', maxWidth: 260 }}
      data-testid="manual-live-demo-network-picker"
    >
      {networkIds.map((id) => (
        <MenuItem key={id} value={id}>
          {summaries[id]?.name ?? id}
        </MenuItem>
      ))}
    </Select>
  )
}

export default function LiveDemoBody({
  fixtures = ['gal-filtered'],
  panels = ['renderer', 'style'],
  actions = [],
  height = DEFAULT_HEIGHT,
  caption,
  fill = false,
}: LiveDemoProps): ReactElement {
  const { expanded, setExpanded } = useDemoSlot()
  const [sideRef, sideHeight] = useElementHeight()
  const [state, setState] = useState<DemoState>({ kind: 'loading' })
  // Bumped by Reset: the effect below empties the demo workspace and loads
  // the fixtures again.
  const [generation, setGeneration] = useState(0)
  const [openAction, setOpenAction] = useState<LiveDemoAction | undefined>()
  // In the pinned column (`fill`) the table is one more tab instead of a
  // third stacked area: three stacked areas leave each too short to use.
  const sidePanels: SidePanel[] = [
    ...SIDE_PANELS.filter((p) => panels.includes(p)),
    ...(fill && panels.includes('table') ? (['table'] as const) : []),
  ]
  const [sideTab, setSideTab] = useState<SidePanel | undefined>(sidePanels[0])

  // The shown network follows the workspace's current network, so a merge
  // result or a picker choice appears in the renderer.
  const shownId = useWorkspaceStore((s) => s.workspace.currentNetworkId)
  const fixtureKey = fixtures.join(',')

  useEffect(() => {
    let cancelled = false
    let loaded = false

    const load = async (): Promise<void> => {
      if (!(await sandboxReady())) {
        if (!cancelled) setState({ kind: 'unavailable' })
        return
      }
      const raws = await Promise.all(
        fixtureKey
          .split(',')
          .map((name) => FIXTURES[name as LiveDemoFixture]()),
      )
      if (cancelled) return
      // Load in reverse, so the first fixture ends up current.
      for (const raw of [...raws].reverse()) {
        const result = networkApi.createNetworkFromCx2({
          cxData: JSON.parse(raw),
        })
        if (!result.success) {
          logUi.warn('[LiveDemo] fixture failed to load', result.error)
          setState({ kind: 'failed', message: result.error.message })
          return
        }
      }
      loaded = true
      useUiStateStore
        .getState()
        .setActiveNetworkView(
          useWorkspaceStore.getState().workspace.currentNetworkId,
        )
      setState({ kind: 'ready' })
    }

    setState({ kind: 'loading' })
    load().catch((cause: unknown) => {
      logUi.warn('[LiveDemo] fixture failed to load', cause)
      if (!cancelled) setState({ kind: 'failed', message: String(cause) })
    })

    return () => {
      cancelled = true
      // Everything in this workspace belongs to the demo: the fixtures and
      // whatever the reader made from them (a merge result). Safe only
      // because sandboxReady() confirmed the manual's sandbox database.
      if (loaded) {
        networkApi.deleteAllNetworks()
      }
    }
  }, [fixtureKey, generation])

  useEffect(() => {
    if (state.kind === 'ready' && shownId !== '') {
      useUiStateStore.getState().setActiveNetworkView(shownId)
    }
  }, [state.kind, shownId])

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

  const ready = state.kind === 'ready' && shownId !== ''
  const showRenderer = panels.includes('renderer')
  const showTable = panels.includes('table')

  return (
    <Paper
      variant="outlined"
      sx={
        fill
          ? {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }
          : { my: 3, overflow: 'hidden' }
      }
      data-testid="manual-live-demo"
      data-network-id={ready ? shownId : undefined}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="caption" sx={{ flex: '1 1 240px' }}>
          {caption ??
            'Live demo — try it. Changes stay in this tab and never touch your workspace.'}
        </Typography>
        {ready ? <NetworkPicker shownId={shownId} /> : null}
        {actions.includes('merge') ? (
          <Button
            size="small"
            variant="contained"
            disabled={!ready}
            onClick={() => setOpenAction('merge')}
            data-testid="manual-live-demo-merge"
          >
            Merge Networks…
          </Button>
        ) : null}
        {actions.includes('exportImage') ? (
          <Button
            size="small"
            variant="contained"
            disabled={!ready}
            onClick={() => setOpenAction('exportImage')}
            data-testid="manual-live-demo-export"
          >
            Export Network to Image…
          </Button>
        ) : null}
        {fill ? (
          <Button
            size="small"
            startIcon={expanded ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
            onClick={() => setExpanded(!expanded)}
            data-testid="manual-live-demo-expand"
          >
            {expanded ? 'Shrink' : 'Expand'}
          </Button>
        ) : null}
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
        sx={
          fill
            ? {
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 0',
                minHeight: 0,
              }
            : {
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                height: {
                  xs:
                    showRenderer && sidePanels.length > 0 ? height * 2 : height,
                  md: height,
                },
              }
        }
      >
        {ready && showRenderer ? (
          <Box
            sx={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}
            data-testid="manual-live-demo-renderer"
          >
            <DemoNetwork networkId={shownId} />
            {panels.includes('toolbar') ? (
              <FloatingToolBar
                rendererId={DefaultRenderer.id}
                targetNetworkId={shownId}
                viewNetworkId={shownId}
              />
            ) : null}
          </Box>
        ) : null}
        {ready && sideTab !== undefined ? (
          <Box
            sx={
              fill
                ? {
                    flex: '1 1 0',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: showRenderer ? 1 : 0,
                    borderColor: 'divider',
                    overflow: 'hidden',
                  }
                : {
                    width: {
                      xs: '100%',
                      md: showRenderer ? SIDE_PANEL_WIDTH : '100%',
                    },
                    height: { xs: showRenderer ? height : '100%', md: 'auto' },
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: { xs: 0, md: showRenderer ? 1 : 0 },
                    borderTop: { xs: showRenderer ? 1 : 0, md: 0 },
                    borderColor: 'divider',
                    overflow: 'hidden',
                  }
            }
            data-testid="manual-live-demo-side"
          >
            {sidePanels.length > 1 ? (
              <Tabs
                value={sideTab}
                onChange={(_e, value: SidePanel) => setSideTab(value)}
                variant="scrollable"
                sx={{
                  minHeight: TAB_STRIP_HEIGHT,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}
              >
                {sidePanels.map((panel) => (
                  <Tab
                    key={panel}
                    value={panel}
                    label={SIDE_PANEL_LABELS[panel]}
                    sx={{ minHeight: TAB_STRIP_HEIGHT, py: 0 }}
                    data-testid={`manual-live-demo-tab-${panel}`}
                  />
                ))}
              </Tabs>
            ) : null}
            <Box
              ref={sideRef}
              sx={{ flex: 1, minHeight: 0, position: 'relative' }}
              data-testid={`manual-live-demo-${sideTab}`}
            >
              {sideTab === 'style' ? (
                <VizmapperView
                  networkId={shownId}
                  height={
                    fill
                      ? sideHeight
                      : height - (sidePanels.length > 1 ? TAB_STRIP_HEIGHT : 0)
                  }
                />
              ) : null}
              {sideTab === 'filter' ? (
                <Lazy>
                  <FilterTab networkId={shownId} />
                </Lazy>
              ) : null}
              {sideTab === 'layout' ? (
                <DemoLayoutPanel networkId={shownId} />
              ) : null}
              {sideTab === 'api' ? <DemoApiPanel networkId={shownId} /> : null}
              {sideTab === 'url' ? <DemoUrlPanel networkId={shownId} /> : null}
              {sideTab === 'table' ? (
                <Box
                  data-testid="manual-live-demo-table"
                  sx={{ height: '100%' }}
                >
                  <Lazy>
                    <TableBrowser
                      currentNetworkId={shownId}
                      height={sideHeight}
                      setHeight={() => undefined}
                    />
                  </Lazy>
                </Box>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Box>

      {ready && showTable && !fill ? (
        <Box
          sx={{ height: TABLE_HEIGHT, borderTop: 1, borderColor: 'divider' }}
          data-testid="manual-live-demo-table"
        >
          <Lazy>
            <TableBrowser
              currentNetworkId={shownId}
              height={TABLE_HEIGHT}
              // The demo's table has a fixed height; ignore resize requests.
              setHeight={() => undefined}
            />
          </Lazy>
        </Box>
      ) : null}

      {openAction === 'merge' ? (
        <Lazy>
          <MergeNetworkDialogHost
            handleClose={() => setOpenAction(undefined)}
          />
        </Lazy>
      ) : null}
      {actions.includes('exportImage') ? (
        <Lazy>
          <ExportImage
            open={openAction === 'exportImage'}
            handleClose={() => setOpenAction(undefined)}
          />
        </Lazy>
      ) : null}
    </Paper>
  )
}
