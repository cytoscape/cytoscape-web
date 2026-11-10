import { act, render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Network } from '../../../../models/NetworkModel'
import { CirclePackingRenderer, CP_RENDERER_ID } from './CirclePackingRenderer'

// Holds the panel's import back until a test releases it. React.lazy keeps the
// result for good, so only the first render in this file can see it pending.
const panelImport = vi.hoisted(() => {
  let release = (): void => {}
  const loaded = new Promise<void>((resolve) => {
    release = resolve
  })
  return { loaded, release }
})

vi.mock('./CirclePackingPanel', async () => {
  await panelImport.loaded
  return {
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
  }
})

const network = { id: 'net1', nodes: [], edges: [] } as unknown as Network

describe('CirclePackingRenderer', () => {
  // An unguarded lazy component suspends to the app-level boundary, and that
  // hide and reveal corrupts allotment's split-view state (#696).
  it('keeps its loading state inside its own Suspense', async () => {
    try {
      render(
        <Suspense fallback={<div data-testid="ancestor-fallback" />}>
          {CirclePackingRenderer.getComponent(network)}
        </Suspense>,
      )

      await act(async () => {
        await Promise.resolve()
      })
      expect(screen.queryByTestId('ancestor-fallback')).toBeNull()
      expect(screen.queryByTestId('panel')).toBeNull()
    } finally {
      panelImport.release()
    }

    await screen.findByTestId('panel')
    expect(screen.queryByTestId('ancestor-fallback')).toBeNull()
  })

  it('is the Cell View', () => {
    expect(CirclePackingRenderer.id).toBe(CP_RENDERER_ID)
    expect(CirclePackingRenderer.name).toBe('Cell View')
  })

  it('renders the lazy panel with what it was given', async () => {
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
