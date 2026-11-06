import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Network } from '../../../../models/NetworkModel'
import { CirclePackingRenderer, CP_RENDERER_ID } from './CirclePackingRenderer'

vi.mock('./CirclePackingPanel', () => ({
  CirclePackingPanel: (props: {
    rendererId: string
    network: Network
    initialSize: { w: number; h: number }
    visible: boolean
  }) => (
    <div data-testid="panel">
      {[
        props.rendererId,
        props.network.id,
        props.initialSize.w,
        props.initialSize.h,
        props.visible,
      ].join(' ')}
    </div>
  ),
}))

const network = { id: 'net1', nodes: [], edges: [] } as unknown as Network

describe('CirclePackingRenderer', () => {
  it('is the Cell View', () => {
    expect(CirclePackingRenderer.id).toBe(CP_RENDERER_ID)
    expect(CirclePackingRenderer.name).toBe('Cell View')
  })

  it('renders the lazy panel inside its own Suspense, with what it was given', async () => {
    render(
      CirclePackingRenderer.getComponent(network, { w: 300, h: 200 }, false),
    )

    expect((await screen.findByTestId('panel')).textContent).toBe(
      `${CP_RENDERER_ID} net1 300 200 false`,
    )
  })

  it('defaults to a visible panel with no size', async () => {
    render(CirclePackingRenderer.getComponent(network))

    expect((await screen.findByTestId('panel')).textContent).toBe(
      `${CP_RENDERER_ID} net1 0 0 true`,
    )
  })
})
