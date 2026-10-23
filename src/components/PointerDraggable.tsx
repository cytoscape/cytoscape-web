import {
  cloneElement,
  CSSProperties,
  JSX,
  ReactElement,
  Ref,
  useRef,
} from 'react'
import { DraggableCore, DraggableData } from 'react-draggable'

export interface DragPosition {
  readonly x: number
  readonly y: number
}

/** Limits of the position while dragged; a side left out has no limit */
export interface DragBounds {
  readonly left?: number
  readonly right?: number
  readonly top?: number
  readonly bottom?: number
}

export interface PointerDraggableProps {
  /** Where the element is, as a `translate()` offset */
  position: DragPosition
  /** Called on every pointer move with the position under the pointer */
  onDrag: (position: DragPosition) => void
  onStart?: () => void
  onStop?: () => void
  /** The axes the element moves along (default both) */
  axis?: 'x' | 'y' | 'both'
  /**
   * Limits of the position, or a function that measures them from the
   * element once at each press. A function that returns `null` refuses the
   * drag.
   */
  bounds?: DragBounds | ((node: HTMLElement) => DragBounds | null)
  disabled?: boolean
  /** Selector of the part that starts a drag (default the whole element) */
  handle?: string
  /** Selector of the parts that never start a drag */
  cancel?: string
  /** One element that takes a ref and a style */
  children: ReactElement<{ style?: CSSProperties; ref?: Ref<HTMLElement> }>
}

interface DragStart {
  /** Pointer position at the press, relative to the offset parent */
  pointer: DragPosition
  /** The element's position at the press */
  position: DragPosition
  bounds: DragBounds
}

const clamp = (value: number, min = -Infinity, max = Infinity): number =>
  Math.min(Math.max(value, min), max)

/**
 * Moves its child with the pointer by setting the child's `transform`, like
 * react-draggable's `<Draggable>` with a controlled `position`, but without
 * dropping moves (#887, #901).
 *
 * `<Draggable>` adds each move to its last committed position, and React 18
 * commits mouse-move updates in a later task, so a move that arrives before
 * the commit is lost and the element falls behind the pointer. Here every
 * position is measured from the press: the position at the press plus the
 * pointer's travel since, clamped to `bounds`. A pointer that leaves the
 * bounds moves the element again only once it comes back inside them.
 *
 * The position is controlled: `onDrag` reports where the pointer puts the
 * element, and the element moves when the caller passes that (or its own
 * rounding of it) back as `position`.
 */
export const PointerDraggable = ({
  position,
  onDrag,
  onStart,
  onStop,
  axis = 'both',
  bounds = {},
  disabled,
  handle,
  cancel,
  children,
}: PointerDraggableProps): JSX.Element => {
  // react-draggable falls back to findDOMNode without a ref
  const nodeRef = useRef<HTMLElement>(null)
  const dragStart = useRef<DragStart | null>(null)

  const handleStart = (_e: unknown, data: DraggableData): false | void => {
    const measured =
      typeof bounds === 'function'
        ? nodeRef.current === null
          ? null
          : bounds(nodeRef.current)
        : bounds
    if (measured === null) {
      return false
    }
    dragStart.current = {
      pointer: { x: data.x, y: data.y },
      position,
      bounds: measured,
    }
    onStart?.()
  }

  const handleDrag = (_e: unknown, data: DraggableData): void => {
    const start = dragStart.current
    if (start === null) {
      return
    }
    const { bounds } = start
    onDrag({
      x:
        axis === 'y'
          ? start.position.x
          : clamp(
              start.position.x + data.x - start.pointer.x,
              bounds.left,
              bounds.right,
            ),
      y:
        axis === 'x'
          ? start.position.y
          : clamp(
              start.position.y + data.y - start.pointer.y,
              bounds.top,
              bounds.bottom,
            ),
    })
  }

  const handleStop = (): void => {
    dragStart.current = null
    onStop?.()
  }

  return (
    <DraggableCore
      nodeRef={nodeRef}
      disabled={disabled}
      handle={handle}
      cancel={cancel}
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
    >
      {cloneElement(children, {
        ref: nodeRef,
        style: {
          ...children.props.style,
          transform: `translate(${position.x}px,${position.y}px)`,
        },
      })}
    </DraggableCore>
  )
}
