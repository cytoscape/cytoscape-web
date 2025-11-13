import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { NetworkTab } from './NetworkTab'
import { Renderer } from '../../models/RendererModel/Renderer'
import { Network } from '../../models/NetworkModel'

// Mock FloatingToolBar to avoid importing @cosmograph/cosmos which uses ES modules
jest.mock('../FloatingToolBar/FloatingToolBar', () => ({
  FloatingToolBar: () => null,
}))

describe('NetworkTab click behavior', () => {
  const mockNetwork: Network = {
    id: 'test-network',
    nodes: [],
    edges: [],
  }

  const rendererClick = jest.fn()
  const handleClick = jest.fn()

  const testRenderer: Renderer = {
    id: 'test-renderer',
    name: 'Test Renderer',
    getComponent: () => (
      <div data-testid="renderer" onClick={rendererClick}>
        Renderer content
      </div>
    ),
  }

  const renderTab = (isActive: boolean) =>
    render(
      <NetworkTab
        network={mockNetwork}
        renderer={testRenderer}
        isActive={isActive}
        selected={true}
        handleClick={handleClick}
      />,
    )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('activates the renderer without triggering renderer click handlers on first click', () => {
    renderTab(false)

    fireEvent.click(screen.getByTestId('renderer'))

    expect(handleClick).toHaveBeenCalledTimes(1)
    expect(rendererClick).not.toHaveBeenCalled()
  })

  it('allows renderer click handlers once the view is active', () => {
    const { rerender } = renderTab(false)
    fireEvent.click(screen.getByTestId('renderer'))
    rerender(
      <NetworkTab
        network={mockNetwork}
        renderer={testRenderer}
        isActive={true}
        selected={true}
        handleClick={handleClick}
      />,
    )

    fireEvent.click(screen.getByTestId('renderer'))

    expect(handleClick).toHaveBeenCalledTimes(2)
    expect(rendererClick).toHaveBeenCalledTimes(1)
  })
})
