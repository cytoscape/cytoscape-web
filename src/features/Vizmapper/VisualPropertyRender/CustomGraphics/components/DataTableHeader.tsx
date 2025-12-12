import * as React from 'react'
import { Box, Typography, Tooltip } from '@mui/material'

interface DataTableHeaderProps {
  columns: Array<{
    label: string
    tooltip?: string
    width?: string
    align?: 'left' | 'center' | 'right'
  }>
}

/**
 * Reusable table header component for data tables in forms
 */
export const DataTableHeader: React.FC<DataTableHeaderProps> = ({
  columns,
}) => {
  const gridTemplateColumns = columns
    .map((col) => col.width || '1fr')
    .join(' ')

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        gap: 0.5,
        alignItems: 'center',
        px: 0.75,
        py: 0.25,
        bgcolor: 'grey.50',
        borderRadius: 1,
        mb: 0.5,
      }}
    >
      {columns.map((col, index) => {
        const content = (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 'medium',
              color: 'text.secondary',
              textAlign: col.align || 'left',
              ...(col.tooltip && { cursor: 'help' }),
            }}
          >
            {col.label}
          </Typography>
        )

        return (
          <React.Fragment key={index}>
            {col.tooltip ? (
              <Tooltip title={col.tooltip}>{content}</Tooltip>
            ) : (
              content
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}

