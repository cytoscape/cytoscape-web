import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'

import {
  CompositeFilterNode,
  FilterNode,
  FilterNodePath,
  FilterPredicate,
  FilterTypeId,
  MatchType,
  ParentFilterNode,
  TopologyFilterNode,
} from '@/models/FilterModel/FilterTree'
import {
  appendChild,
  createColumnFilter,
  createCompositeFilter,
  createDegreeFilter,
  createTopologyFilter,
  removeNodeAt,
  replaceNodeAt,
  setMatchType,
} from '@/models/FilterModel/impl/filterTreeImpl'
import type { Network } from '@/models/NetworkModel/Network'
import type { Table } from '@/models/TableModel/Table'

import { pathKey } from '../utils/filterTabUtil'
import { ColumnConditionEditor } from './ColumnConditionEditor'
import { useConditionDrag, useConditionDrop } from './ConditionDnd'
import { DegreeConditionEditor } from './DegreeConditionEditor'

/**
 * What every condition editor of one filter needs
 */
export interface ConditionEditorContext {
  readonly root: CompositeFilterNode
  readonly network: Network
  readonly nodeTable: Table
  readonly edgeTable: Table
  // Validation warnings by condition path (see warningsByPath)
  readonly warnings: ReadonlyMap<string, string[]>
  readonly onRootChange: (root: CompositeFilterNode) => void
}

const testIdOf = (path: FilterNodePath): string =>
  path.length === 0
    ? 'filter-condition-root'
    : `filter-condition-${path.join('-')}`

const ADD_MENU: ReadonlyArray<readonly [string, string, () => FilterNode]> = [
  ['column', 'Column filter', createColumnFilter],
  ['degree', 'Degree filter', createDegreeFilter],
  ['topology', 'Topology filter', createTopologyFilter],
  ['group', 'Group', () => createCompositeFilter()],
]

interface AddConditionButtonProps {
  tooltip: string
  testId: string
  onAdd: (node: FilterNode) => void
}

const AddConditionButton = ({
  tooltip,
  testId,
  onAdd,
}: AddConditionButtonProps): JSX.Element => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          size="small"
          aria-label={tooltip}
          data-testid={testId}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <AddCircleOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        {ADD_MENU.map(([key, label, create]) => (
          <MenuItem
            key={key}
            data-testid={`${testId}-${key}`}
            onClick={() => {
              setAnchor(null)
              onAdd(create())
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

interface TopologyHeaderProps {
  node: TopologyFilterNode
  testId: string
  onChange: (node: TopologyFilterNode) => void
}

// Parses an integer field: empty is null (not set yet)
const toInteger = (text: string, min: number): number | null | undefined => {
  if (text.trim() === '') return null
  const parsed = Number(text)
  return Number.isInteger(parsed) && parsed >= min ? parsed : undefined
}

/**
 * "Nodes with [at least] [n] neighbours within distance [d]"
 * (Cytoscape Desktop's TopologyFilterView)
 */
const TopologyHeader = ({
  node,
  testId,
  onChange,
}: TopologyHeaderProps): JSX.Element => {
  const predicate =
    node.predicate === FilterPredicate.LESS_THAN
      ? FilterPredicate.LESS_THAN
      : FilterPredicate.GREATER_THAN_OR_EQUAL
  const integerField = (
    value: number | null,
    min: number,
    label: string,
    fieldTestId: string,
    set: (next: number | null) => void,
  ): JSX.Element => (
    <TextField
      size="small"
      value={value ?? ''}
      sx={{ width: '5em' }}
      inputProps={{
        'aria-label': label,
        'data-testid': fieldTestId,
        inputMode: 'numeric',
        min,
      }}
      onChange={(event) => {
        const next = toInteger(event.target.value, min)
        if (next !== undefined) set(next)
      }}
    />
  )
  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
    >
      <Typography variant="body2">Nodes with</Typography>
      <Select
        size="small"
        value={predicate}
        inputProps={{
          'aria-label': 'Comparison',
          'data-testid': `${testId}-predicate`,
        }}
        onChange={(event) =>
          onChange({
            ...node,
            predicate: event.target.value as FilterPredicate,
          })
        }
      >
        <MenuItem value={FilterPredicate.GREATER_THAN_OR_EQUAL}>
          at least
        </MenuItem>
        <MenuItem value={FilterPredicate.LESS_THAN}>less than</MenuItem>
      </Select>
      {integerField(
        node.threshold,
        0,
        'Neighbours',
        `${testId}-threshold`,
        (threshold) => onChange({ ...node, threshold }),
      )}
      <Typography variant="body2">neighbours within distance</Typography>
      {integerField(
        node.distance,
        1,
        'Distance',
        `${testId}-distance`,
        (distance) => onChange({ ...node, distance }),
      )}
    </Box>
  )
}

interface ConditionRowProps {
  node: FilterNode
  path: FilterNodePath
  context: ConditionEditorContext
}

const ConditionRow = ({
  node,
  path,
  context,
}: ConditionRowProps): JSX.Element => {
  const { root, onRootChange, warnings } = context
  const testId = testIdOf(path)
  const messages = warnings.get(pathKey(path))
  const onChange = (next: FilterNode): void =>
    onRootChange(replaceNodeAt(root, path, next))
  const drag = useConditionDrag(path)
  // Dropping another condition here groups the two; a group row is not a
  // target itself (its condition list is, see ConditionList)
  const drop = useConditionDrop({ kind: 'condition', path })
  const setRowRef = (element: HTMLElement | null): void => {
    drag.setNodeRef(element)
    drop.setNodeRef(element)
  }

  let editor: JSX.Element
  switch (node.type) {
    case FilterTypeId.Column:
      editor = (
        <ColumnConditionEditor
          node={node}
          nodeTable={context.nodeTable}
          edgeTable={context.edgeTable}
          testId={testId}
          onChange={onChange}
        />
      )
      break
    case FilterTypeId.Degree:
      editor = (
        <DegreeConditionEditor
          node={node}
          network={context.network}
          testId={testId}
          onChange={onChange}
        />
      )
      break
    default:
      editor = <ConditionList parent={node} path={path} context={context} />
  }

  return (
    <Box
      ref={setRowRef}
      data-testid={`${testId}-row`}
      data-drop-over={drop.isOver || undefined}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.5,
        borderRadius: 1,
        // The condition stays in place, faded, while its preview is dragged
        opacity: drag.isDragging ? 0.4 : 1,
        bgcolor: drop.isOver ? 'action.selected' : undefined,
      }}
    >
      <Tooltip title="Remove this condition">
        <IconButton
          size="small"
          aria-label="Remove this condition"
          data-testid={`${testId}-remove`}
          onClick={() => onRootChange(removeNodeAt(root, path))}
        >
          <RemoveCircleOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Drag this condition to another condition to group them, or drop it in a gap to reorder.">
        <Box
          component="span"
          aria-label="Move this condition"
          data-testid={`${testId}-drag`}
          {...drag.handleProps}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            mt: 0.75,
            color: 'action.active',
            cursor: 'grab',
            borderRadius: 1,
            // Let the pointer sensor have touch moves on the handle, rather
            // than the browser scrolling the panel
            touchAction: 'none',
            '&:focus-visible': {
              outline: (theme) => `2px solid ${theme.palette.primary.main}`,
            },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      </Tooltip>
      {messages !== undefined && (
        <Tooltip
          title={
            <Box>
              <Typography variant="caption" component="div">
                Filter cannot be applied to this network:
              </Typography>
              {messages.map((message) => (
                <Typography key={message} variant="caption" component="div">
                  {message}
                </Typography>
              ))}
            </Box>
          }
        >
          {/* Focusable, with the reasons as its label, so keyboard and
              screen reader users get them too (the tooltip opens on focus) */}
          <Box
            component="span"
            role="img"
            tabIndex={0}
            aria-label={`Filter cannot be applied to this network: ${messages.join('; ')}`}
            data-testid={`${testId}-warning`}
            sx={{
              display: 'inline-flex',
              mt: 1,
              borderRadius: '50%',
              '&:focus-visible': {
                outline: (theme) => `2px solid ${theme.palette.primary.main}`,
              },
            }}
          >
            <WarningAmberIcon color="warning" fontSize="small" aria-hidden />
          </Box>
        </Tooltip>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>{editor}</Box>
    </Box>
  )
}

interface ConditionGapProps {
  parentPath: FilterNodePath
  index: number
}

/**
 * The space before a condition (or after the last): dropping a condition
 * here moves it there. A line marks it while a drop would land in it.
 */
const ConditionGap = ({
  parentPath,
  index,
}: ConditionGapProps): JSX.Element => {
  const { setNodeRef, isOver } = useConditionDrop({
    kind: 'gap',
    parentPath,
    index,
  })
  return (
    <Box
      ref={setNodeRef}
      data-testid={`${testIdOf(parentPath)}-gap-${index}`}
      // Set while a drop would land here; e2e drags wait for it, as a user
      // waits for the line, before releasing (see filter-tab.spec.ts)
      data-drop-over={isOver || undefined}
      // A constant height: drop targets are measured when a drag starts
      sx={{ height: 8, display: 'flex', alignItems: 'center' }}
    >
      <Box
        sx={{
          height: 3,
          width: '100%',
          borderRadius: 1,
          bgcolor: isOver ? 'primary.main' : 'transparent',
        }}
      />
    </Box>
  )
}

interface ConditionListProps {
  parent: ParentFilterNode
  path: FilterNodePath
  context: ConditionEditorContext
}

/**
 * The conditions of a group (or the neighbour conditions of a topology
 * condition), with how they combine and a button to add one (Cytoscape
 * Desktop's CompositeFilterPanel). Nested groups are drawn with a dashed
 * border.
 */
export const ConditionList = ({
  parent,
  path,
  context,
}: ConditionListProps): JSX.Element => {
  const { root, onRootChange } = context
  const testId = testIdOf(path)
  const isRoot = path.length === 0
  const isTopology = parent.type === FilterTypeId.Topology
  // As in Cytoscape Desktop: a nested group always shows how it combines;
  // the root and a topology condition only once there is something to combine
  const showMatchType = (!isRoot && !isTopology) || parent.children.length > 1
  // Dropping a condition on the list adds it at its end
  const drop = useConditionDrop({ kind: 'group', path })

  return (
    <Box
      ref={drop.setNodeRef}
      data-testid={isRoot ? 'filter-conditions' : testId}
      data-drop-over={drop.isOver || undefined}
      sx={{
        width: '100%',
        borderRadius: 1,
        bgcolor: drop.isOver ? 'action.hover' : undefined,
        ...(isRoot || isTopology
          ? {}
          : {
              border: (theme) => `1px dashed ${theme.palette.divider}`,
              borderRadius: 1,
              px: 1,
            }),
      }}
    >
      {isTopology && (
        <TopologyHeader
          node={parent}
          testId={testId}
          onChange={(node) => onRootChange(replaceNodeAt(root, path, node))}
        />
      )}
      {isTopology && parent.children.length > 0 && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          where the neighbours match:
        </Typography>
      )}
      {showMatchType && (
        <Select
          size="small"
          value={parent.matchType}
          sx={{ my: 0.5 }}
          inputProps={{
            'aria-label': 'Combine conditions',
            'data-testid': `${testId}-match-type`,
          }}
          onChange={(event) =>
            onRootChange(
              setMatchType(root, path, event.target.value as MatchType),
            )
          }
        >
          <MenuItem value={MatchType.ALL}>Match all (AND)</MenuItem>
          <MenuItem value={MatchType.ANY}>Match any (OR)</MenuItem>
        </Select>
      )}
      {parent.children.map((child, index) => (
        // Conditions have no id; an index key re-creates editors after a
        // removal or a move, which is what keeps their local text in step
        <Box key={`${index}:${child.type}`}>
          <ConditionGap parentPath={path} index={index} />
          <ConditionRow
            node={child}
            path={[...path, index]}
            context={context}
          />
        </Box>
      ))}
      {parent.children.length > 0 && (
        <ConditionGap parentPath={path} index={parent.children.length} />
      )}
      <AddConditionButton
        tooltip={
          isTopology ? 'Add neighbour condition...' : 'Add new condition...'
        }
        testId={`${testId}-add`}
        onAdd={(node) => onRootChange(appendChild(root, path, node))}
      />
    </Box>
  )
}
