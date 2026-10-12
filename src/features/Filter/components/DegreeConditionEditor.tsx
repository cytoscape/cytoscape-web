import { Box, MenuItem, Select, Typography } from '@mui/material'
import { useMemo } from 'react'

import {
  DegreeEdgeType,
  DegreeFilterNode,
  FilterPredicate,
} from '@/models/FilterModel/FilterTree'
import { computeDegreeRange } from '@/models/FilterModel/impl/filterTreeImpl'
import type { Network } from '@/models/NetworkModel/Network'

import { RangeInput } from './RangeInput'

interface DegreeConditionEditorProps {
  node: DegreeFilterNode
  network: Network
  testId: string
  onChange: (node: DegreeFilterNode) => void
}

const EDGE_TYPE_LABELS: ReadonlyArray<readonly [DegreeEdgeType, string]> = [
  [DegreeEdgeType.ANY, 'In + Out'],
  [DegreeEdgeType.INCOMING, 'In'],
  [DegreeEdgeType.OUTGOING, 'Out'],
]

/**
 * Editor of a degree condition (Cytoscape Desktop's DegreeFilterView). The
 * range is unset until the user changes it, and an unset range accepts every
 * node.
 */
export const DegreeConditionEditor = ({
  node,
  network,
  testId,
  onChange,
}: DegreeConditionEditorProps): JSX.Element => {
  const bounds = useMemo(
    () => computeDegreeRange(network, node.edgeType),
    [network, node.edgeType],
  )
  const predicate =
    node.predicate === FilterPredicate.IS_NOT_BETWEEN
      ? FilterPredicate.IS_NOT_BETWEEN
      : FilterPredicate.BETWEEN

  return (
    <Box
      data-testid={testId}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">Degree</Typography>
        <Select
          size="small"
          value={node.edgeType}
          inputProps={{
            'aria-label': 'Edges',
            'data-testid': `${testId}-edge-type`,
          }}
          onChange={(event) =>
            onChange({
              ...node,
              edgeType: event.target.value as DegreeEdgeType,
            })
          }
        >
          {EDGE_TYPE_LABELS.map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
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
          <MenuItem value={FilterPredicate.BETWEEN}>is</MenuItem>
          <MenuItem value={FilterPredicate.IS_NOT_BETWEEN}>is not</MenuItem>
        </Select>
      </Box>
      <RangeInput
        value={node.criterion ?? [bounds.min, bounds.max]}
        bounds={bounds}
        integer
        testId={`${testId}-range`}
        onChange={(next) => onChange({ ...node, predicate, criterion: next })}
      />
    </Box>
  )
}
