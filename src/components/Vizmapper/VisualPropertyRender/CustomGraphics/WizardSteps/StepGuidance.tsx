import * as React from 'react'
import { Box, Typography } from '@mui/material'

interface StepGuidanceProps {
  title: string
  description: string
  variant?: 'default' | 'info' | 'warning'
}

export const StepGuidance: React.FC<StepGuidanceProps> = ({
  title,
  description,
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'info':
        return {
          borderColor: 'primary.main',
          bgcolor: 'primary.light',
          color: 'primary.contrastText',
        }
      case 'warning':
        return {
          borderColor: 'warning.main',
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
        }
      default:
        return {
          borderColor: 'grey.300',
          bgcolor: 'grey.50',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderRadius: 1,
        mb: 2,
        ...styles,
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 'medium',
          mb: 0.5,
          color: variant === 'default' ? 'inherit' : styles.color,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.875rem',
          color: variant === 'default' ? 'text.secondary' : styles.color,
        }}
      >
        {description}
      </Typography>
    </Box>
  )
}
