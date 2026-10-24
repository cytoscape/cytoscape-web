import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  DragPosition,
  PointerDraggable,
  PointerDraggableProps,
} from './PointerDraggable'

/** Holds the position the way a caller does: whatever onDrag reports */
const Controlled = (
  props: Omit<PointerDraggableProps, 'position' | 'onDrag' | 'children'> & {
    onDrag?: (position: DragPosition) => void
  },
): JSX.Element => {
  const [position, setPosition] = useState<DragPosition>({ x: 0, y: 0 })
  return (
    <PointerDraggable
      {...props}
      position={position}
      onDrag={(next) => {
        props.onDrag?.(next)
        setPosition(next)
      }}
    >
      <div data-testid="moved" style={{ color: 'red' }}>
        <span className="grip" data-testid="grip" />
        <button data-testid="button" />
      </div>
    </PointerDraggable>
  )
}

const moved = (): HTMLElement => screen.getByTestId('moved')

const positionOf = (): DragPosition => {
  const match = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(
    moved().style.transform,
  )
  expect(match).not.toBeNull()
  return { x: Number(match![1]), y: Number(match![2]) }
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

const drag = (target: Element, dx: number, dy: number): void => {
  press(target)
  act(() => moveBy(dx, dy))
  release()
}

describe('PointerDraggable (#901)', () => {
  it('places its child at the position and keeps the child’s style', () => {
    render(<Controlled />)
    expect(positionOf()).toEqual({ x: 0, y: 0 })
    expect(moved().style.color).toBe('red')
  })

  it('moves with the pointer, and the next drag starts where it stopped', () => {
    render(<Controlled />)

    drag(moved(), 40, -25)
    expect(positionOf()).toEqual({ x: 40, y: -25 })

    drag(moved(), -10, 5)
    expect(positionOf()).toEqual({ x: 30, y: -20 })
  })

  it('keeps every move when React commits several at once', () => {
    render(<Controlled />)

    press(moved())
    act(() => {
      moveBy(10, 10)
      moveBy(20, 20)
      moveBy(30, 30)
    })
    release()
    expect(positionOf()).toEqual({ x: 30, y: 30 })
  })

  it('stays inside its bounds and follows back once the pointer returns', () => {
    render(
      <Controlled bounds={{ left: -10, right: 50, top: -20, bottom: 0 }} />,
    )

    press(moved())
    act(() => moveBy(500, 500))
    expect(positionOf()).toEqual({ x: 50, y: 0 })
    // Still past the edges: stays put
    act(() => moveBy(60, 10))
    expect(positionOf()).toEqual({ x: 50, y: 0 })
    act(() => moveBy(45, -5))
    expect(positionOf()).toEqual({ x: 45, y: -5 })
    act(() => moveBy(-500, -500))
    expect(positionOf()).toEqual({ x: -10, y: -20 })
    release()
  })

  it('measures bounds given as a function once, at the press', () => {
    let right = 50
    const measure = vi.fn((node: HTMLElement) => {
      expect(node).toBe(moved())
      return { right }
    })
    render(<Controlled bounds={measure} />)

    press(moved())
    expect(measure).toHaveBeenCalledTimes(1)
    // A change after the press applies from the next drag on
    right = 20
    act(() => moveBy(100, 0))
    act(() => moveBy(200, 0))
    release()
    expect(measure).toHaveBeenCalledTimes(1)
    expect(positionOf()).toEqual({ x: 50, y: 0 })

    drag(moved(), 100, 0)
    expect(measure).toHaveBeenCalledTimes(2)
    // Starts at 50, already past the new right edge: pulled back to it
    expect(positionOf()).toEqual({ x: 20, y: 0 })
  })

  it('does not start a drag when the bounds function returns null', () => {
    const onStart = vi.fn()
    const onDrag = vi.fn()
    render(<Controlled bounds={() => null} onStart={onStart} onDrag={onDrag} />)

    drag(moved(), 40, 25)
    expect(onStart).not.toHaveBeenCalled()
    expect(onDrag).not.toHaveBeenCalled()
    expect(positionOf()).toEqual({ x: 0, y: 0 })
  })

  it.each([
    ['x', { x: 40, y: 0 }],
    ['y', { x: 0, y: 25 }],
  ] as const)('moves along %s only when told to', (axis, expected) => {
    render(<Controlled axis={axis} />)

    drag(moved(), 40, 25)
    expect(positionOf()).toEqual(expected)
  })

  it('starts a drag only from the handle, never from a cancelled part', () => {
    const onDrag = vi.fn()
    render(<Controlled handle=".grip" cancel="button" onDrag={onDrag} />)

    drag(screen.getByTestId('button'), 40, 25)
    drag(moved(), 40, 25)
    expect(onDrag).not.toHaveBeenCalled()

    drag(screen.getByTestId('grip'), 40, 25)
    expect(positionOf()).toEqual({ x: 40, y: 25 })
  })

  it('does nothing while disabled', () => {
    const onDrag = vi.fn()
    const onStart = vi.fn()
    render(<Controlled disabled onDrag={onDrag} onStart={onStart} />)

    drag(moved(), 40, 25)
    expect(onStart).not.toHaveBeenCalled()
    expect(onDrag).not.toHaveBeenCalled()
    expect(positionOf()).toEqual({ x: 0, y: 0 })
  })

  it('reports the start and the end of a drag', () => {
    const onStart = vi.fn()
    const onStop = vi.fn()
    render(<Controlled onStart={onStart} onStop={onStop} />)

    press(moved())
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStop).not.toHaveBeenCalled()
    release()
    expect(onStop).toHaveBeenCalledTimes(1)
  })
})
