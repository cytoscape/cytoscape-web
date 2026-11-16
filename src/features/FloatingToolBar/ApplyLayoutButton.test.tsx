// #964: every canvas registers its own 'fit', and setFunction also writes it
// to the renderer-wide slot, which therefore holds whichever canvas registered
// last. The floating toolbar's Apply Layout button must fit the network it
// laid out — the one drawn in its own view.

import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import type { LayoutAlgorithm, LayoutEngine } from '../../models/LayoutModel'
import { ApplyLayoutButton } from './ApplyLayoutButton'

vi.mock('../../data/hooks/stores/LayoutStore', async () => {
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

vi.mock('../../data/hooks/stores/NetworkStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  const network = (id: string) => ({ id, nodes: [{ id: 'n1' }], edges: [] })
  return {
    useNetworkStore: create(() => ({
      networks: new Map([
        ['net1', network('net1')],
        ['net2', network('net2')],
      ]),
    })),
  }
})

vi.mock('../../data/hooks/stores/ViewModelStore', async () => {
  const { create } = await vi.importActual<typeof import('zustand')>('zustand')
  return {
    useViewModelStore: create(() => ({
      getViewModel: () => ({ nodeViews: {} }),
      updateNodePositions: vi.fn(),
    })),
  }
})

vi.mock('../../data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ postEdit: vi.fn() }),
}))

const circle: LayoutAlgorithm = {
  name: 'circle',
  engineName: 'core',
  displayName: 'Circle',
  type: 'geometric',
  description: '',
  parameters: {},
}

describe('ApplyLayoutButton', () => {
  const fitNet1 = vi.fn()
  const fitNet2 = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    const apply = vi.fn(
      (_n: unknown, _e: unknown, afterLayout: (p: Map<string, any>) => void) =>
        afterLayout(new Map([['n1', [1, 2]]])),
    )
    useLayoutStore.setState({
      layoutEngines: [
        {
          name: 'core',
          defaultAlgorithmName: 'circle',
          algorithms: { circle },
          apply,
        },
      ],
      preferredLayout: circle,
    } as any)
    useWorkspaceStore.setState((state) => {
      state.workspace.currentNetworkId = 'net2'
    })
    useRendererFunctionStore.setState({
      rendererFunctions: new Map(),
      rendererFunctionsByNetworkId: new Map(),
    })
    const { setFunction } = useRendererFunctionStore.getState()
    setFunction('cyjs', 'fit', fitNet1, 'net1')
    setFunction('cyjs', 'fit', fitNet2, 'net2')
  })

  const click = async (): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('apply-layout-button'))
    })
  }

  it('fits its target network, not the canvas registered last', async () => {
    render(<ApplyLayoutButton rendererId="cyjs" targetNetworkId="net1" />)

    await click()

    expect(fitNet1).toHaveBeenCalledTimes(1)
    expect(fitNet2).not.toHaveBeenCalled()
  })

  it('fits the current network when no target is given', async () => {
    useRendererFunctionStore
      .getState()
      .setFunction('cyjs', 'fit', fitNet1, 'net1')
    render(<ApplyLayoutButton rendererId="cyjs" />)

    await click()

    expect(fitNet2).toHaveBeenCalledTimes(1)
    expect(fitNet1).not.toHaveBeenCalled()
  })
})
