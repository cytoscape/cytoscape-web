import * as React from 'react'
import { Box } from '@mui/material'
import { COLORS } from '../utils/constants'

interface FormSectionProps {
  children: React.ReactNode
  sx?: object
}

/**
 * Reusable form section wrapper with consistent border and padding styling
 */
export const FormSection: React.FC<FormSectionProps> = ({
  children,
  sx = {},
}) => {
  return (
    <Box
      sx={{
        border: `1px solid ${COLORS.BORDER}`,
        borderRadius: 1,
        p: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

