import * as React from 'react'
import { Box } from '@mui/material'
import { COLORS } from '../utils/constants'

interface DataTableRowProps {
  children: React.ReactNode
  columns: string[]
  sx?: object
}

/**
 * Reusable table row component for data tables in forms
 */
export const DataTableRow: React.FC<DataTableRowProps> = ({
  children,
  columns,
  sx = {},
}) => {
  const gridTemplateColumns = columns.join(' ')

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        alignItems: 'center',
        p: 0.5,
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 1,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

