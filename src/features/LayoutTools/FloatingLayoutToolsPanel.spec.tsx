import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FloatingLayoutToolsPanel } from './FloatingLayoutToolsPanel'
import { useLayoutToolsPanelStore } from './store/layoutToolsPanelStore'

// Stub the panel body so the test doesn't pull in the Scaling tool's stores.
vi.mock('./LayoutToolsPanel', () => ({
  LayoutToolsPanel: () => <div data-testid="layout-tools-body" />,
}))

// jsdom lays nothing out, so give the network view and the panel the sizes
// the panel reads to stay inside the view: an 800 x 600 view and a 300 x 200
// panel in its lower-left corner, 16 px from the edges.
const VIEW = { width: 800, height: 600 }
const PANEL = { width: 300, height: 200, left: 16, top: 384 }

const renderInView = (): HTMLElement => {
  const { container } = render(
    <div data-testid="network-view">
      <FloatingLayoutToolsPanel />
    </div>,
  )
  const view = container.firstChild as HTMLElement
  const panel = screen.getByTestId('floating-layout-tools-panel')
  const define = (el: HTMLElement, props: Record<string, unknown>): void => {
    Object.entries(props).forEach(([key, value]) =>
      Object.defineProperty(el, key, { configurable: true, value }),
    )
  }
  define(view, { clientWidth: VIEW.width, clientHeight: VIEW.height })
  define(panel, {
    offsetParent: view,
    offsetWidth: PANEL.width,
    offsetHeight: PANEL.height,
    offsetLeft: PANEL.left,
    offsetTop: PANEL.top,
  })
  return panel
}

const press = (target: Element): void => {
  fireEvent.mouseDown(target, { button: 0, clientX: 100, clientY: 100 })
}

/** Moves the pressed pointer by (dx, dy) from where it was pressed */
const moveBy = (dx: number, dy: number): void => {
  document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 100 + dx, clientY: 100 + dy }),
  )
}

const release = (): void => {
  fireEvent.mouseUp(document)
}

/** Presses on `target`, moves the pointer by (dx, dy) and releases it */
const drag = (target: Element, dx: number, dy: number): void => {
  press(target)
  act(() => moveBy(dx, dy))
  release()
}

const offsetOf = (panel: HTMLElement): { x: number; y: number } => {
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
    panel.style.transform,
  )
  expect(match).not.toBeNull()
  return { x: Number(match![1]), y: Number(match![2]) }
}

const handle = (): HTMLElement =>
  screen.getByTestId('floating-layout-tools-drag-handle')

describe('FloatingLayoutToolsPanel (CW-540)', () => {
  afterEach(() => {
    act(() => useLayoutToolsPanelStore.getState().setOpen(false))
  })

  it('renders nothing when the panel is closed', () => {
    useLayoutToolsPanelStore.getState().setOpen(false)
    const { container } = render(<FloatingLayoutToolsPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the layout tools panel when open', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    render(<FloatingLayoutToolsPanel />)
    expect(screen.getByTestId('floating-layout-tools-panel')).toBeTruthy()
    expect(screen.getByTestId('layout-tools-body')).toBeTruthy()
  })

  it('closes when the close button is clicked', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    render(<FloatingLayoutToolsPanel />)

    fireEvent.click(screen.getByTestId('floating-layout-tools-close'))
    expect(useLayoutToolsPanelStore.getState().open).toBe(false)
  })
})

describe('FloatingLayoutToolsPanel dragging (#887)', () => {
  afterEach(() => {
    act(() => useLayoutToolsPanelStore.getState().setOpen(false))
  })

  it('moves when its title bar is dragged', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    const panel = renderInView()

    drag(handle(), 120, -150)
    expect(offsetOf(panel)).toEqual({ x: 120, y: -150 })

    // A second drag starts where the first one left it
    drag(handle(), -20, 30)
    expect(offsetOf(panel)).toEqual({ x: 100, y: -120 })
  })

  it('keeps every move when React commits several at once', () => {
    // React 18 commits mouse-move updates in a later task, so in a browser
    // several moves can arrive before one is committed. One act() batches
    // them the same way. react-draggable's <Draggable> added each move to
    // its last committed position and ended this drag at (10, -10).
    useLayoutToolsPanelStore.getState().setOpen(true)
    const panel = renderInView()

    press(handle())
    act(() => {
      moveBy(10, -10)
      moveBy(20, -20)
      moveBy(30, -30)
    })
    release()
    expect(offsetOf(panel)).toEqual({ x: 30, y: -30 })
  })

  it('stays inside the network view', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    const panel = renderInView()
    const maxX = VIEW.width - PANEL.width - PANEL.left
    const maxY = VIEW.height - PANEL.height - PANEL.top

    // Far past the right and top edges: stops flush with them
    drag(handle(), 5000, -5000)
    expect(offsetOf(panel)).toEqual({ x: maxX, y: -PANEL.top })

    // Far past the left and bottom edges
    drag(handle(), -10000, 10000)
    expect(offsetOf(panel)).toEqual({ x: -PANEL.left, y: maxY })
  })

  it('follows the pointer back only once it returns inside the view', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    const panel = renderInView()
    const maxX = VIEW.width - PANEL.width - PANEL.left

    press(handle())
    act(() => moveBy(maxX + 100, 0))
    expect(offsetOf(panel).x).toBe(maxX)
    // Coming back 50 px leaves the pointer still 50 px past the edge
    act(() => moveBy(maxX + 50, 0))
    expect(offsetOf(panel).x).toBe(maxX)
    act(() => moveBy(maxX - 40, 0))
    expect(offsetOf(panel).x).toBe(maxX - 40)
    release()
  })

  it('does not move when dragged from its body or its close button', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    const panel = renderInView()

    drag(screen.getByTestId('layout-tools-body'), 120, -150)
    drag(screen.getByTestId('floating-layout-tools-close'), 120, -150)
    expect(offsetOf(panel)).toEqual({ x: 0, y: 0 })
    // A press on the close button still closes the panel
    expect(useLayoutToolsPanelStore.getState().open).toBe(true)
    fireEvent.click(screen.getByTestId('floating-layout-tools-close'))
    expect(useLayoutToolsPanelStore.getState().open).toBe(false)
  })

  it('opens in its corner again after being moved and closed', () => {
    useLayoutToolsPanelStore.getState().setOpen(true)
    const panel = renderInView()
    drag(handle(), 120, -150)
    expect(offsetOf(panel)).toEqual({ x: 120, y: -150 })

    fireEvent.click(screen.getByTestId('floating-layout-tools-close'))
    expect(screen.queryByTestId('floating-layout-tools-panel')).toBeNull()

    act(() => useLayoutToolsPanelStore.getState().setOpen(true))
    expect(offsetOf(screen.getByTestId('floating-layout-tools-panel'))).toEqual(
      { x: 0, y: 0 },
    )
  })
})
