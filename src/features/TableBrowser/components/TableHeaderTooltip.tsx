import { Box, Tooltip, Typography } from '@mui/material'
import * as React from 'react'

import { ValueTypeNameChip } from '../../../components/ValueTypeNameChip'
import { ValueTypeName } from '../../../models/TableModel'
import { valueTypeNameLabel } from '../../../models/TableModel/impl/valueTypeNameDisplay'
import { HeaderTooltipTarget } from '../hooks/useHeaderTooltip'

export interface TableHeaderTooltipColumn {
  title: string
  type?: ValueTypeName
  /** Virtual columns (id, source/target node name) are not real attributes. */
  isVirtual?: boolean
}

export interface TableHeaderTooltipProps {
  target: HeaderTooltipTarget | null
  columns: TableHeaderTooltipColumn[]
}

/**
 * Tooltip for a table browser column header, showing the full column name and
 * its data type. Header text is drawn into the grid canvas and clipped to the
 * column width, so long names are otherwise unreadable.
 *
 * The grid gives us a rectangle rather than a DOM node, so the tooltip is
 * anchored to a virtual element built from those viewport coordinates.
 */
export const TableHeaderTooltip = ({
  target,
  columns,
}: TableHeaderTooltipProps): React.ReactElement => {
  const column = target !== null ? columns[target.columnIndex] : undefined

  const anchorEl = React.useMemo(() => {
    if (target === null) {
      return null
    }
    const { x, y, width, height } = target.bounds
    return {
      getBoundingClientRect: () => new DOMRect(x, y, width, height),
    }
  }, [target])

  const title =
    column === undefined ? (
      ''
    ) : (
      <Box data-testid="table-header-tooltip-content">
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, wordBreak: 'break-word' }}
        >
          {column.title}
        </Typography>
        {column.type !== undefined && column.isVirtual !== true ? (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}
          >
            <ValueTypeNameChip
              type={column.type}
              showTooltip={false}
              colorScheme="dark"
            />
            <Typography variant="caption">
              {valueTypeNameLabel(column.type)}
            </Typography>
          </Box>
        ) : null}
      </Box>
    )

  return (
    <Tooltip
      open={column !== undefined && anchorEl !== null}
      title={title}
      arrow
      placement="bottom-start"
      disableFocusListener
      disableHoverListener
      disableTouchListener
      // The popper overlaps the grid and the toolbar above it. Without this it
      // would swallow clicks on whatever it covers, since hover state comes
      // from the grid rather than from the tooltip itself.
      disableInteractive
      PopperProps={{ anchorEl }}
    >
      <Box
        component="span"
        data-testid="table-header-tooltip-anchor"
        sx={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0 }}
      />
    </Tooltip>
  )
}
