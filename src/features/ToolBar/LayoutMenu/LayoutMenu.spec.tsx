// src/features/ToolBar/LayoutMenu/LayoutMenu.spec.tsx
//
// Layout algorithms registered by apps ('layout-algorithm' resources, #734)
// are ordinary engines in LayoutStore, so the menu renders them like core
// algorithms — but in their own block: after the core rows, before "Layout
// Tools", a divider on each side, sorted by label, with service apps routed
// to the Layout root inside the same block. A failing engine must not leave
// the running flag stuck.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from '@/data/hooks/stores/LayoutStore'
import { useWorkspaceStore } from '@/data/hooks/stores/WorkspaceStore'
import { isAppLayoutEnabled } from '@/app-api/core/appLayoutEngine'
import { useServiceAppMenu } from '../AppMenu/useServiceAppMenu'
import { DropdownMenuItem } from '../DropdownMenu'
import type { LayoutAlgorithm } from '@/models/LayoutModel/LayoutAlgorithm'
import type { LayoutEngine } from '@/models/LayoutModel/LayoutEngine'
import { LayoutMenu } from './index'

// ── Store doubles (real zustand stores with the slice the menu reads) ────

vi.mock('@/data/hooks/stores/LayoutStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useLayoutStore: create<any>((set: any) => ({
      layoutEngines: [] as LayoutEngine[],
      preferredLayout: undefined as unknown as LayoutAlgorithm,
      isRunning: false,
      setIsRunning: (isRunning: boolean) => set({ isRunning }),
    })),
  }
})

vi.mock('@/data/hooks/stores/NetworkStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useNetworkStore: create(() => ({
      networks: new Map([
        [
          'net1',
          { id: 'net1', nodes: [{ id: 'n1' }, { id: 'n2' }], edges: [] },
        ],
      ]),
    })),
  }
})

vi.mock('@/data/hooks/stores/NetworkSummaryStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return { useNetworkSummaryStore: create(() => ({ summaries: {} })) }
})

vi.mock('@/data/hooks/stores/RendererFunctionStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useRendererFunctionStore: create(() => ({ getFunction: () => undefined })),
  }
})

vi.mock('@/data/hooks/stores/UiStateStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useUiStateStore: create(() => ({
      ui: { activeNetworkView: '', networkViewUi: { activeTabIndex: 0 } },
    })),
  }
})

vi.mock('@/data/hooks/stores/ViewModelStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useViewModelStore: create(() => ({
      getViewModel: () => ({ nodeViews: {}, selectedNodes: [] }),
      updateNodePositions: vi.fn(),
    })),
  }
})

vi.mock('@/data/hooks/stores/WorkspaceStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useWorkspaceStore: create(() => ({
      workspace: { currentNetworkId: 'net1', networkIds: ['net1'] },
    })),
  }
})

vi.mock('../../LayoutTools/store/layoutToolsPanelStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return { useLayoutToolsPanelStore: create(() => ({ toggle: vi.fn() })) }
})

vi.mock('@/data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ postEdit: vi.fn() }),
}))
vi.mock('../../HierarchyViewer/utils/hierarchyUtil', () => ({
  isHCX: () => false,
}))
vi.mock('./LayoutOptionDialog', () => ({ LayoutOptionDialog: () => null }))
vi.mock('../AppMenu/useServiceAppMenu', () => ({
  useServiceAppMenu: vi.fn(() => ({
    menuItems: [],
    dialogs: null,
    handleRun: vi.fn(),
  })),
}))
vi.mock('@/app-api/core/perAppApis', () => ({
  buildPerAppApis: vi.fn((appId: string) => ({ boundTo: appId })),
}))
vi.mock('@/app-api/core/appLayoutEngine', () => ({
  isAppLayoutEnabled: vi.fn(() => true),
  getAppLayoutMeta: vi.fn((name: string) => {
    const [appId, id] = name.split('::')
    return id === undefined ? undefined : { appId, id }
  }),
}))
vi.mock('@/debug', () => ({
  logUi: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// ── Fixtures ────────────────────────────────────────────────────────────

const makeAlgorithm = (
  engineName: string,
  name: string,
  displayName: string,
  extra: Partial<LayoutAlgorithm> = {},
): LayoutAlgorithm => ({
  name,
  engineName,
  displayName,
  type: 'other',
  description: `${displayName} description`,
  parameters: {},
  ...extra,
})

const coreAlgorithms = {
  circle: makeAlgorithm('core', 'circle', 'Circle', { type: 'geometric' }),
  dagre: makeAlgorithm('core', 'dagre', 'Hierarchical (DAGRE)', {
    type: 'hierarchical',
  }),
}

const makeCoreEngine = (apply = vi.fn()): LayoutEngine => ({
  name: 'core',
  defaultAlgorithmName: 'circle',
  algorithms: coreAlgorithms,
  apply,
})

const makeAppEngine = (
  appId: string,
  algorithms: LayoutAlgorithm[],
  apply: LayoutEngine['apply'] = vi.fn(),
): LayoutEngine => ({
  name: appId,
  appId,
  defaultAlgorithmName: algorithms[0].name,
  algorithms: Object.fromEntries(algorithms.map((a) => [a.name, a])),
  apply,
})

const seedEngines = (engines: LayoutEngine[]): void => {
  useLayoutStore.setState({
    layoutEngines: engines,
    preferredLayout: coreAlgorithms.circle,
    isRunning: false,
  } as any)
}

const openMenu = (): void => {
  fireEvent.click(screen.getByTestId('toolbar-layout-menu-menu-button'))
}

/** True when `a` comes before `b` in document order. */
const isBefore = (a: Element, b: Element): boolean =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

/** The MUI dividers (hr) rendered inside the open menu. */
const dividers = (): Element[] =>
  Array.from(document.querySelectorAll('hr.MuiDivider-root'))

/** Whether some divider sits between `a` and `b` in document order. */
const hasDividerBetween = (a: Element, b: Element): boolean =>
  dividers().some((hr) => isBefore(a, hr) && isBefore(hr, b))

describe('LayoutMenu app algorithms', () => {
  beforeEach(() => {
    vi.mocked(isAppLayoutEnabled).mockReturnValue(true)
    vi.mocked(useServiceAppMenu).mockReturnValue({
      menuItems: [],
      dialogs: null,
      handleRun: vi.fn(),
    })
    useWorkspaceStore.setState({
      workspace: { currentNetworkId: 'net1', networkIds: ['net1'] },
    } as any)
    seedEngines([makeCoreEngine()])
  })

  it('renders the menu exactly as before when no app has registered a layout', () => {
    render(<LayoutMenu />)
    openMenu()

    expect(screen.getByTestId('layout-menu-item-core-circle')).toBeTruthy()
    expect(screen.getByTestId('layout-menu-layout-tools')).toBeTruthy()
    expect(screen.queryByTestId(/layout-menu-item-appX/)).toBeNull()
    // Apply Default | core (circle | dagre, grouped by type) | Layout Tools
    expect(dividers()).toHaveLength(3)
  })

  it('renders app rows in a block between the core algorithms and Layout Tools, with dividers', () => {
    seedEngines([
      makeCoreEngine(),
      makeAppEngine('appX', [makeAlgorithm('appX', 'appX::row', 'Row Layout')]),
    ])
    render(<LayoutMenu />)
    openMenu()

    const lastCore = screen.getByTestId('layout-menu-item-core-dagre')
    const appRow = screen.getByTestId('layout-menu-item-appX-row')
    const tools = screen.getByTestId('layout-menu-layout-tools')

    expect(appRow.textContent).toBe('Row Layout')
    expect(isBefore(lastCore, appRow)).toBe(true)
    expect(isBefore(appRow, tools)).toBe(true)
    expect(hasDividerBetween(lastCore, appRow)).toBe(true)
    expect(hasDividerBetween(appRow, tools)).toBe(true)
    expect(dividers()).toHaveLength(4)
  })

  it('sorts app rows by label across apps, with app id as the tiebreak', () => {
    seedEngines([
      makeCoreEngine(),
      makeAppEngine('zeta', [
        makeAlgorithm('zeta', 'zeta::b', 'Beta Layout'),
        makeAlgorithm('zeta', 'zeta::same', 'Same Label'),
      ]),
      makeAppEngine('alpha', [
        makeAlgorithm('alpha', 'alpha::a', 'Alpha Layout'),
        makeAlgorithm('alpha', 'alpha::same', 'Same Label'),
      ]),
    ])
    render(<LayoutMenu />)
    openMenu()

    const ids = [
      'layout-menu-item-alpha-a',
      'layout-menu-item-zeta-b',
      'layout-menu-item-alpha-same',
      'layout-menu-item-zeta-same',
    ].map((id) => screen.getByTestId(id))
    for (let i = 0; i < ids.length - 1; i++) {
      expect(isBefore(ids[i], ids[i + 1])).toBe(true)
    }
  })

  it('greys out a row whose isEnabled says no, or whose threshold is exceeded', () => {
    vi.mocked(isAppLayoutEnabled).mockImplementation(
      (name: string) => name !== 'appX::off',
    )
    seedEngines([
      makeCoreEngine(),
      makeAppEngine('appX', [
        makeAlgorithm('appX', 'appX::on', 'On'),
        makeAlgorithm('appX', 'appX::off', 'Off'),
        makeAlgorithm('appX', 'appX::small', 'Small only', { threshold: 1 }),
      ]),
    ])
    render(<LayoutMenu />)
    openMenu()

    expect(
      screen
        .getByTestId('layout-menu-item-appX-on')
        .getAttribute('aria-disabled'),
    ).toBeNull()
    expect(
      screen
        .getByTestId('layout-menu-item-appX-off')
        .getAttribute('aria-disabled'),
    ).toBe('true')
    expect(
      screen
        .getByTestId('layout-menu-item-appX-small')
        .getAttribute('aria-disabled'),
    ).toBe('true')
    // isEnabled received the app's per-app API object
    expect(isAppLayoutEnabled).toHaveBeenCalledWith('appX::off', {
      boundTo: 'appX',
    })
  })

  it('runs the app engine with the network id on click and closes the menu', async () => {
    const apply = vi.fn(() => Promise.resolve())
    const algorithm = makeAlgorithm('appX', 'appX::row', 'Row Layout')
    seedEngines([makeCoreEngine(), makeAppEngine('appX', [algorithm], apply)])
    render(<LayoutMenu />)
    openMenu()

    fireEvent.click(screen.getByTestId('layout-menu-item-appX-row'))

    expect(apply).toHaveBeenCalledTimes(1)
    const [nodes, edges, afterLayout, calledAlgorithm, networkId] = apply.mock
      .calls[0] as unknown as Parameters<LayoutEngine['apply']>
    expect(nodes).toEqual([{ id: 'n1' }, { id: 'n2' }])
    expect(edges).toEqual([])
    expect(typeof afterLayout).toBe('function')
    expect(calledAlgorithm).toBe(algorithm)
    expect(networkId).toBe('net1')
    expect(useLayoutStore.getState().isRunning).toBe(true)
    await waitFor(() =>
      expect(screen.queryByTestId('layout-menu-item-appX-row')).toBeNull(),
    )
  })

  it('resets the running flag when the app engine rejects', async () => {
    const apply = vi.fn(() => Promise.reject(new Error('boom')))
    seedEngines([
      makeCoreEngine(),
      makeAppEngine(
        'appX',
        [makeAlgorithm('appX', 'appX::row', 'Row Layout')],
        apply,
      ),
    ])
    render(<LayoutMenu />)
    openMenu()

    await act(async () => {
      fireEvent.click(screen.getByTestId('layout-menu-item-appX-row'))
    })

    await waitFor(() => expect(useLayoutStore.getState().isRunning).toBe(false))
  })

  it('places service apps routed to the Layout root inside the block, after the app rows', () => {
    vi.mocked(useServiceAppMenu).mockReturnValue({
      menuItems: [
        {
          template: (
            <DropdownMenuItem dataTestId="svc-item" label="Remote Layout" />
          ),
        },
      ],
      dialogs: null,
      handleRun: vi.fn(),
    })
    seedEngines([
      makeCoreEngine(),
      makeAppEngine('appX', [makeAlgorithm('appX', 'appX::row', 'Row Layout')]),
    ])
    render(<LayoutMenu />)
    openMenu()

    const appRow = screen.getByTestId('layout-menu-item-appX-row')
    const svc = screen.getByTestId('svc-item')
    const tools = screen.getByTestId('layout-menu-layout-tools')
    expect(isBefore(appRow, svc)).toBe(true)
    expect(isBefore(svc, tools)).toBe(true)
    expect(hasDividerBetween(appRow, svc)).toBe(false)
    expect(hasDividerBetween(svc, tools)).toBe(true)
  })

  it('disables app rows with the global reason when no network view is active', () => {
    useWorkspaceStore.setState({
      workspace: { currentNetworkId: '', networkIds: ['net1'] },
    } as any)
    seedEngines([
      makeCoreEngine(),
      makeAppEngine('appX', [makeAlgorithm('appX', 'appX::row', 'Row Layout')]),
    ])
    render(<LayoutMenu />)
    openMenu()

    const row = screen.getByTestId('layout-menu-item-appX-row')
    expect(row.getAttribute('aria-disabled')).toBe('true')
    expect(row.parentElement?.getAttribute('aria-label')).toBe(
      'Layouts are disabled since the network view is empty',
    )
  })
})
