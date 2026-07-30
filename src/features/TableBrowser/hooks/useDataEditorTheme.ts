import React from 'react'
import { useTheme } from '@mui/material/styles'

export const useDataEditorTheme = () => {
  const theme = useTheme()
  return React.useMemo(() => {
    return {
      bgHeader: theme.palette.background.default,
      bgHeaderHovered: theme.palette.action.hover,
      bgHeaderHasFocus: theme.palette.action.focus,
      textHeader: theme.palette.text.primary,
      textHeaderSelected: theme.palette.primary.contrastText,
      bgIconHeader: theme.palette.text.disabled,
      fgIconHeader: theme.palette.background.default,
      bgCell: theme.palette.background.paper,
      bgCellMedium: theme.palette.background.paper,
      bgCellLight: theme.palette.background.paper,
      accentColor: theme.palette.primary.main,
      accentLight: theme.palette.action.selected,
      textDark: theme.palette.text.secondary,
      textMedium: theme.palette.text.disabled,
      textLight: theme.palette.text.disabled,
      borderColor: theme.palette.divider,
    }
  }, [theme])
}
