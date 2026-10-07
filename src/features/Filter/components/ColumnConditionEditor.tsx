import { Box, MenuItem, Select, TextField, Typography } from '@mui/material'
import { useMemo } from 'react'

import {
  ColumnFilterNode,
  ColumnFilterTarget,
  FilterPredicate,
  NumberRangeCriterion,
} from '@/models/FilterModel/FilterTree'
import {
  columnFilterFor,
  columnKindOf,
  computeColumnRange,
} from '@/models/FilterModel/impl/filterTreeImpl'
import { toNumericBounds } from '@/models/FilterModel/impl/predicates'
import type { Table } from '@/models/TableModel/Table'
import { ValueTypeName } from '@/models/TableModel/ValueTypeName'

import {
  ColumnOption,
  columnOptionKey,
  isRangePredicate,
  listColumnOptions,
  numericPredicateOptions,
  STRING_PREDICATE_LABELS,
  toRangeCriterion,
} from '../utils/filterTabUtil'
import { NumberField, RangeInput } from './RangeInput'

interface ColumnConditionEditorProps {
  node: ColumnFilterNode
  nodeTable: Table
  edgeTable: Table
  testId: string
  onChange: (node: ColumnFilterNode) => void
}

const NO_COLUMN = ''

const isIntegerType = (type: ValueTypeName): boolean =>
  type === ValueTypeName.Integer ||
  type === ValueTypeName.Long ||
  type === ValueTypeName.ListInteger ||
  type === ValueTypeName.ListLong

/**
 * Editor of a column condition: the column, then a comparison that fits the
 * column's type (Cytoscape Desktop's ColumnFilterView)
 */
export const ColumnConditionEditor = ({
  node,
  nodeTable,
  edgeTable,
  testId,
  onChange,
}: ColumnConditionEditorProps): JSX.Element => {
  const options: ColumnOption[] = useMemo(
    () => listColumnOptions(nodeTable, edgeTable),
    [nodeTable, edgeTable],
  )
  const selectedKey =
    node.columnName === null
      ? NO_COLUMN
      : columnOptionKey(node.target, node.columnName)
  const selected: ColumnOption | undefined = options.find(
    (option) => option.key === selectedKey,
  )
  const table = node.target === ColumnFilterTarget.EDGES ? edgeTable : nodeTable
  const range = useMemo(
    () =>
      selected === undefined
        ? undefined
        : computeColumnRange(table, selected.column.name),
    [selected, table],
  )

  const pickColumn = (key: string): void => {
    const option = options.find((candidate) => candidate.key === key)
    if (option === undefined) return
    const optionTable =
      option.target === ColumnFilterTarget.EDGES ? edgeTable : nodeTable
    onChange(
      columnFilterFor(
        option.column,
        option.target,
        computeColumnRange(optionTable, option.column.name),
      ),
    )
  }

  const columnSelect = (
    <Select
      size="small"
      value={selectedKey}
      displayEmpty
      sx={{ flex: '1 1 10em', minWidth: 0 }}
      inputProps={{ 'aria-label': 'Column', 'data-testid': `${testId}-column` }}
      onChange={(event) => pickColumn(event.target.value)}
    >
      <MenuItem value={NO_COLUMN} disabled>
        Choose column...
      </MenuItem>
      {selected === undefined && node.columnName !== null && (
        // An imported condition on a column this network does not have
        <MenuItem value={selectedKey} disabled>
          {`${node.target === ColumnFilterTarget.EDGES ? 'Edge' : 'Node'}: ${node.columnName}`}
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem key={option.key} value={option.key}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  )

  if (selected === undefined) {
    return (
      <Box data-testid={testId} sx={{ display: 'flex', width: '100%' }}>
        {columnSelect}
      </Box>
    )
  }

  const { type } = selected.column
  const kind = columnKindOf(type)
  const isList = type.startsWith('list_of_')

  const anyMatchSelect = isList && kind !== 'boolean' && (
    <Select
      size="small"
      value={node.anyMatch ? 'any' : 'every'}
      inputProps={{
        'aria-label': 'List elements',
        'data-testid': `${testId}-any-match`,
      }}
      onChange={(event) =>
        onChange({ ...node, anyMatch: event.target.value === 'any' })
      }
    >
      <MenuItem value="any">any element</MenuItem>
      <MenuItem value="every">every element</MenuItem>
    </Select>
  )

  let comparison: JSX.Element | null = null
  if (kind === 'boolean') {
    comparison = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">is</Typography>
        <Select
          size="small"
          value={node.criterion === false ? 'false' : 'true'}
          inputProps={{
            'aria-label': 'Value',
            'data-testid': `${testId}-boolean`,
          }}
          onChange={(event) =>
            onChange({
              ...node,
              predicate: FilterPredicate.IS,
              criterion: event.target.value === 'true',
            })
          }
        >
          <MenuItem value="true">true</MenuItem>
          <MenuItem value="false">false</MenuItem>
        </Select>
      </Box>
    )
  } else if (kind === 'string') {
    const predicate = STRING_PREDICATE_LABELS.some(
      ([candidate]) => candidate === node.predicate,
    )
      ? (node.predicate as FilterPredicate)
      : FilterPredicate.CONTAINS
    comparison = (
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}
      >
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
          {STRING_PREDICATE_LABELS.map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
        <TextField
          size="small"
          value={typeof node.criterion === 'string' ? node.criterion : ''}
          sx={{ flex: '1 1 6em', minWidth: 0 }}
          inputProps={{
            'aria-label': 'Text',
            'data-testid': `${testId}-text`,
          }}
          onChange={(event) =>
            onChange({ ...node, predicate, criterion: event.target.value })
          }
        />
      </Box>
    )
  } else if (kind === 'number') {
    const integer = isIntegerType(type)
    const bounds = range ?? { min: 0, max: 0 }
    const current: NumberRangeCriterion = toNumericBounds(node.criterion) ?? [
      bounds.min,
      bounds.max,
    ]
    const predicate = node.predicate ?? FilterPredicate.BETWEEN
    const isRange = isRangePredicate(predicate)
    // Only "is" / "is not" can be picked; the condition's own single-value
    // predicate stays listed while it uses one (see numericPredicateOptions)
    const setPredicate = (next: FilterPredicate): void => {
      if (next === predicate) return
      const criterion = isRange
        ? current
        : toRangeCriterion(predicate, current[0], bounds)
      onChange({ ...node, predicate: next, criterion })
    }
    comparison = (
      <Box sx={{ width: '100%' }}>
        <Select
          size="small"
          value={predicate}
          inputProps={{
            'aria-label': 'Comparison',
            'data-testid': `${testId}-predicate`,
          }}
          onChange={(event) =>
            setPredicate(event.target.value as FilterPredicate)
          }
        >
          {numericPredicateOptions(predicate).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
        {isRange ? (
          <RangeInput
            value={current}
            bounds={bounds}
            integer={integer}
            testId={`${testId}-range`}
            onChange={(next) => onChange({ ...node, criterion: next })}
          />
        ) : (
          <Box sx={{ mt: 1 }}>
            <NumberField
              value={current[0]}
              integer={integer}
              label="Value"
              testId={`${testId}-value`}
              onCommit={(next) => onChange({ ...node, criterion: next })}
            />
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box
      data-testid={testId}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}
    >
      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>{columnSelect}</Box>
      {anyMatchSelect !== false && (
        <Box sx={{ display: 'flex', gap: 1 }}>{anyMatchSelect}</Box>
      )}
      {comparison}
    </Box>
  )
}
