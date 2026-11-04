import { experimental_extendTheme as extendTheme } from '@mui/material/styles'

import { darkPalette, fontFamily, lightPalette } from './themePalette'

export { darkPalette, lightPalette }

export const theme = extendTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960, // MUI 4 value
      lg: 1280, // MUI 4 value
      xl: 1920, // MUI 4 value
    },
  },
  colorSchemes: {
    light: {
      palette: lightPalette,
    },
    dark: {
      palette: darkPalette,
    },
  },
  typography: {
    fontFamily,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        expandIconWrapper: ({ theme }) => ({
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#3a88fe',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiPaper: {
      variants: [
        {
          props: { variant: 'filled' },
          style: ({ theme }) => ({
            backgroundColor: theme.palette.background.default,
          }),
        },
      ],
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.875em',
          maxWidth: 340,
        },
      },
    },
  },
})
