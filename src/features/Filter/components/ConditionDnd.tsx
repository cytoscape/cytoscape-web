import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Paper, Typography } from '@mui/material'
import { createContext, ReactNode, useContext, useState } from 'react'

import type {
  CompositeFilterNode,
  FilterNodePath,
} from '@/models/FilterModel/FilterTree'
import {
  canDropCondition,
  ConditionDropTarget,
  getNodeAt,
  moveCondition,
} from '@/models/FilterModel/impl/filterTreeImpl'

import { describeCondition, pathKey } from '../utils/filterTabUtil'

/**
 * Drag and drop of conditions, as in Cytoscape Desktop's Filter panel: drag a
 * condition by its handle into a gap (move), onto a group or a topology
 * condition (add at its end), or onto another condition (group the two).
 * The tree edit is moveCondition; see ConditionDropTarget.
 *
 * Built on @dnd-kit/core: its pointer sensor handles mouse, pen and touch
 * (tablets), and its keyboard sensor lets a focused handle be moved with the
 * arrow keys (Space to pick up and drop, Escape to cancel).
 */

interface ConditionDndState {
  readonly root: CompositeFilterNode
  // The condition being dragged, if any
  readonly activePath: FilterNodePath | undefined
}

const ConditionDndContext = createContext<ConditionDndState | undefined>(
  undefined,
)

const dragId = (path: FilterNodePath): string => `drag:${pathKey(path)}`

const dropId = (target: ConditionDropTarget): string =>
  target.kind === 'gap'
    ? `gap:${pathKey(target.parentPath)}:${target.index}`
    : `${target.kind}:${pathKey(target.path)}`

/**
 * Drop targets nest (a condition inside a group inside the root), and the
 * pointer is over all of them at once: the innermost, smallest one wins. The
 * keyboard sensor has no pointer, so it uses the nearest target.
 */
const innermostTarget: CollisionDetection = (args) => {
  if (args.pointerCoordinates === null) {
    return closestCenter(args)
  }
  const hits = pointerWithin(args)
  const area = (id: string | number): number => {
    const rect = args.droppableRects.get(id)
    return rect === undefined ? Infinity : rect.width * rect.height
  }
  return [...hits].sort((a, b) => area(a.id) - area(b.id))
}

interface ConditionDndProviderProps {
  root: CompositeFilterNode
  onRootChange: (root: CompositeFilterNode) => void
  children: ReactNode
}

export const ConditionDndProvider = ({
  root,
  onRootChange,
  children,
}: ConditionDndProviderProps): JSX.Element => {
  const [activePath, setActivePath] = useState<FilterNodePath | undefined>()
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so a tap or click on
    // the handle is not a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const onDragStart = (event: DragStartEvent): void => {
    setActivePath(event.active.data.current?.path as FilterNodePath)
  }
  const onDragEnd = (event: DragEndEvent): void => {
    const sourcePath = event.active.data.current?.path as
      | FilterNodePath
      | undefined
    const target = event.over?.data.current?.target as
      | ConditionDropTarget
      | undefined
    setActivePath(undefined)
    if (sourcePath === undefined || target === undefined) return
    const moved = moveCondition(root, sourcePath, target)
    if (moved !== root) onRootChange(moved)
  }

  const activeNode =
    activePath === undefined ? undefined : getNodeAt(root, activePath)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={innermostTarget}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActivePath(undefined)}
    >
      <ConditionDndContext.Provider value={{ root, activePath }}>
        {children}
      </ConditionDndContext.Provider>
      <DragOverlay>
        {activeNode !== undefined && (
          <Paper
            elevation={4}
            data-testid="filter-condition-drag-preview"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              cursor: 'grabbing',
            }}
          >
            <DragIndicatorIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {describeCondition(activeNode)}
            </Typography>
          </Paper>
        )}
      </DragOverlay>
    </DndContext>
  )
}

const useDndState = (): ConditionDndState => {
  const state = useContext(ConditionDndContext)
  if (state === undefined) {
    throw new Error('Condition drag and drop needs a ConditionDndProvider')
  }
  return state
}

/**
 * Make a condition draggable. Spread `handleProps` on its handle, and pass
 * `setNodeRef` to the element that is the condition.
 */
export const useConditionDrag = (path: FilterNodePath) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({ id: dragId(path), data: { path } })
  return {
    setNodeRef,
    isDragging,
    handleProps: {
      ref: setActivatorNodeRef,
      ...attributes,
      ...listeners,
    },
  }
}

/**
 * Make an element a drop target. It accepts the dragged condition only when
 * the drop would change the filter (canDropCondition); `isOver` is true only
 * then.
 */
export const useConditionDrop = (target: ConditionDropTarget) => {
  const { root, activePath } = useDndState()
  const disabled =
    activePath === undefined || !canDropCondition(root, activePath, target)
  const { setNodeRef, isOver } = useDroppable({
    id: dropId(target),
    data: { target },
    disabled,
  })
  return {
    setNodeRef,
    isOver: isOver && !disabled,
    isDragging: activePath !== undefined,
  }
}
