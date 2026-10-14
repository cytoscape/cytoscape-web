import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../../data/hooks/stores/NetworkSummaryStore'
import { useRendererStore } from '../../../data/hooks/stores/RendererStore'
import { useUiStateStore } from '../../../data/hooks/stores/UiStateStore'
import { useViewModelStore } from '../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../data/hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../../../data/hooks/stores/WorkspaceStore'
import { useCreateNode } from '../../../data/hooks/useCreateNode'
import { CreateNodeMenuItem } from './CreateNodeMenuItem'

vi.mock('../../../data/hooks/stores/NetworkSummaryStore')
vi.mock('../../../data/hooks/stores/RendererStore')
vi.mock('../../../data/hooks/stores/UiStateStore')
vi.mock('../../../data/hooks/stores/ViewModelStore')
vi.mock('../../../data/hooks/stores/VisualStyleStore')
vi.mock('../../../data/hooks/stores/WorkspaceStore')
vi.mock('../../../data/hooks/useCreateNode')

type Mock = import('vitest').Mock

const createNodeMock = vi.fn()
const onClickMock = vi.fn()

/**
 * Configure every store the menu item reads from. `currentNetworkId` is the
 * knob that CW-682 is about: an empty string means "no network is loaded".
 */
const setupStores = (currentNetworkId: string): void => {
  ;(useCreateNode as unknown as Mock).mockReturnValue({
    createNode: createNodeMock,
  })
  ;(useWorkspaceStore as unknown as Mock).mockImplementation((selector) =>
    selector({ workspace: { currentNetworkId } }),
  )
  ;(useUiStateStore as unknown as Mock).mockImplementation((selector) =>
    selector({
      ui: {
        activeNetworkView: '',
        visualStyleOptions: {},
      },
    }),
  )
  ;(useViewModelStore as unknown as Mock).mockImplementation((selector) =>
    selector({ getViewModel: () => undefined }),
  )
  ;(useNetworkSummaryStore as unknown as Mock).mockImplementation((selector) =>
    selector({ summaries: {} }),
  )
  ;(useRendererStore as unknown as Mock).mockImplementation((selector) =>
    selector({ getViewport: () => undefined }),
  )
  ;(useVisualStyleStore as unknown as Mock).mockImplementation((selector) =>
    selector({ visualStyles: {} }),
  )
}

describe('CreateNodeMenuItem (CW-682)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing when clicked while no network is loaded', () => {
    setupStores('')

    render(<CreateNodeMenuItem onClick={onClickMock} />)

    fireEvent.click(screen.getByText('Create Node'))

    // The item must be disabled with no network, so clicking is a no-op.
    expect(createNodeMock).not.toHaveBeenCalled()
    expect(onClickMock).not.toHaveBeenCalled()
  })

  it('creates a node when clicked while a network is loaded', () => {
    setupStores('net1')

    render(<CreateNodeMenuItem onClick={onClickMock} />)

    fireEvent.click(screen.getByText('Create Node'))

    expect(createNodeMock).toHaveBeenCalledTimes(1)
    expect(createNodeMock).toHaveBeenCalledWith(
      'net1',
      expect.any(Array),
      expect.objectContaining({ attributes: {} }),
    )
    expect(onClickMock).toHaveBeenCalledTimes(1)
  })
})
