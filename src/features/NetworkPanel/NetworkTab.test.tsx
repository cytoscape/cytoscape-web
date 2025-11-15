import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { NetworkTab } from './NetworkTab'

// Mock FloatingToolBar to allow testing click events
const mockFloatingToolBarButtonClick = jest.fn()
jest.mock('../FloatingToolBar/FloatingToolBar', () => ({
  FloatingToolBar: ({ rendererId }: { rendererId: string }) => (
    <div data-testid="floating-toolbar">
      <button
        data-testid="floating-toolbar-button"
        onClick={mockFloatingToolBarButtonClick}
        aria-label="test-button"
      >
        Test Button
      </button>
    </div>
  ),
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
    mockFloatingToolBarButtonClick.mockClear()
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

  describe('FloatingToolBar click behavior', () => {
    it('allows FloatingToolBar button clicks to fire when renderer is inactive', () => {
      renderTab(false)

      const toolbarButton = screen.getByTestId('floating-toolbar-button')
      fireEvent.click(toolbarButton)

      expect(mockFloatingToolBarButtonClick).toHaveBeenCalledTimes(1)
      // handleClick should not be called because FloatingToolBar is outside the renderer Box
      expect(handleClick).not.toHaveBeenCalled()
      // renderer click should not be called either
      expect(rendererClick).not.toHaveBeenCalled()
    })

    it('allows FloatingToolBar button clicks to fire when renderer is active', () => {
      renderTab(true)

      const toolbarButton = screen.getByTestId('floating-toolbar-button')
      fireEvent.click(toolbarButton)

      expect(mockFloatingToolBarButtonClick).toHaveBeenCalledTimes(1)
      // handleClick should not be called because FloatingToolBar is outside the renderer Box
      expect(handleClick).not.toHaveBeenCalled()
      // renderer click should not be called either
      expect(rendererClick).not.toHaveBeenCalled()
    })

    it('blocks renderer component clicks when inactive, but allows FloatingToolBar clicks', () => {
      renderTab(false)

      // Click on renderer - should be blocked
      fireEvent.click(screen.getByTestId('renderer'))
      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(rendererClick).not.toHaveBeenCalled()

      // Reset mocks
      handleClick.mockClear()

      // Click on FloatingToolBar button - should work
      const toolbarButton = screen.getByTestId('floating-toolbar-button')
      fireEvent.click(toolbarButton)
      expect(mockFloatingToolBarButtonClick).toHaveBeenCalledTimes(1)
      expect(handleClick).not.toHaveBeenCalled()
      expect(rendererClick).not.toHaveBeenCalled()
    })

    it('allows both renderer and FloatingToolBar clicks when renderer is active', () => {
      renderTab(true)

      // Click on renderer - should work
      fireEvent.click(screen.getByTestId('renderer'))
      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(rendererClick).toHaveBeenCalledTimes(1)

      // Reset renderer click mock to isolate FloatingToolBar test
      rendererClick.mockClear()

      // Click on FloatingToolBar button - should work independently
      const toolbarButton = screen.getByTestId('floating-toolbar-button')
      fireEvent.click(toolbarButton)
      expect(mockFloatingToolBarButtonClick).toHaveBeenCalledTimes(1)
      // handleClick should not be called because FloatingToolBar is outside the renderer Box
      expect(handleClick).not.toHaveBeenCalled()
      expect(rendererClick).not.toHaveBeenCalled()
    })
  })
})
