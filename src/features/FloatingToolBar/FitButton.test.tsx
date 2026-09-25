import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRendererFunctionStore } from '../../data/hooks/stores/RendererFunctionStore'
import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
import { FitButton } from './FitButton'

const TREE_ID = 'tree-network'
const SUB_ID = `${TREE_ID}_subsystem`

const setActiveNetworkView = (id: string): void => {
  useUiStateStore.setState((state) => {
    state.ui.activeNetworkView = id
  })
}

describe('FitButton', () => {
  const fitTree = vi.fn()
  const fitSub = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useRendererFunctionStore.setState({
      rendererFunctions: new Map(),
      rendererFunctionsByNetworkId: new Map(),
    })
    const { setFunction } = useRendererFunctionStore.getState()
    setFunction('cyjs', 'fit', fitTree, TREE_ID)
    setFunction('cyjs', 'fit', fitSub, SUB_ID)
    useWorkspaceStore.setState((state) => {
      state.workspace.currentNetworkId = TREE_ID
    })
  })

  // #762: the TREE VIEW and SUB NETWORK VIEWER toolbars both use the cyjs
  // renderer, so the button must fit its own view, not the active one.
  it('fits its target network while another view is active', () => {
    setActiveNetworkView(SUB_ID)
    render(<FitButton rendererId="cyjs" targetNetworkId={TREE_ID} />)

    fireEvent.click(screen.getByTestId('fit-button'))

    expect(fitTree).toHaveBeenCalledTimes(1)
    expect(fitSub).not.toHaveBeenCalled()
  })

  it('fits the subnetwork target while the tree view is active', () => {
    setActiveNetworkView(TREE_ID)
    render(<FitButton rendererId="cyjs" targetNetworkId={SUB_ID} />)

    fireEvent.click(screen.getByTestId('fit-button'))

    expect(fitSub).toHaveBeenCalledTimes(1)
    expect(fitTree).not.toHaveBeenCalled()
  })

  it('falls back to the active view when no target is given', () => {
    setActiveNetworkView(SUB_ID)
    render(<FitButton rendererId="cyjs" />)

    fireEvent.click(screen.getByTestId('fit-button'))

    expect(fitSub).toHaveBeenCalledTimes(1)
    expect(fitTree).not.toHaveBeenCalled()
  })

  it('uses the renderer-wide function when none is registered for the target', () => {
    const fitCirclePacking = vi.fn()
    useRendererFunctionStore
      .getState()
      .setFunction('circlePacking', 'fit', fitCirclePacking)
    setActiveNetworkView(SUB_ID)
    render(<FitButton rendererId="circlePacking" targetNetworkId={TREE_ID} />)

    fireEvent.click(screen.getByTestId('fit-button'))

    expect(fitCirclePacking).toHaveBeenCalledTimes(1)
    expect(fitTree).not.toHaveBeenCalled()
    expect(fitSub).not.toHaveBeenCalled()
  })
})
