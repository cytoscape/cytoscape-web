import { createTheme } from '@mui/material/styles';

const _breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,  // MUI 4 value
    lg: 1280, // MUI 4 value
    xl: 1920, // MUI 4 value
  },
};

const _tooltipOverrides = {
  styleOverrides: {
    tooltip: {
      fontSize: "0.85em",
      maxWidth: 340,
    },
  },
};
const _touchRippleOverrides = {
  styleOverrides: {
    root: {
      display: 'none !important',
    },
  },
};

//==[ Light ]=========================================================================================================

export const lightTheme = createTheme({
  breakpoints: _breakpoints,
  palette: {
    mode: 'light',
    primary: {
      // https://maketintsandshades.com/#colors=4B99DE&hashtag=0&steps=10
      main: '#3c7ab2',
      light: '#a5ccef',
      dark: '#264d6f',
    },
    secondary: {
      // https://maketintsandshades.com/#colors=ea9123&hashtag=0&steps=10
      main: '#ea9123',
      light: '#f5c891',
      dark: '#754912',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    action: {
      hover: 'rgba(31, 120, 180, 0.1)',
      selected: 'rgba(31, 120, 180, 0.2)',
    },
    text: {
      secondary: 'rgba(0, 0, 0, 0.7)',
      disabled: 'rgba(0, 0, 0, 0.4)',
    },
  },
  typography: {
    fontFamily: 'Open Sans, Helvetica Neue, Helvetica, sans-serif',
  },
  components: {
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#3a88fe',
          textDecoration: 'none',
          "&:hover": {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiTooltip: _tooltipOverrides,
    MuiTouchRipple: _touchRippleOverrides,
  },
});

//==[ Dark ]==========================================================================================================

/*
 * See https://v4.mui.com/customization/palette/#dark-mode
 *
 * You can use these tools to customize the app's theme:
 *   https://colorffy.com/dark-theme-generator
 *   https://v4.mui.com/customization/color/#picking-colors
 */
export const darkTheme = createTheme({
  breakpoints: _breakpoints,
  palette: {
    mode: 'dark',
    primary: {
      main: '#3a88fe',
      light: '#a7c1de',
    },
    secondary: {
      main: '#3a88fe',
    },
    background: {
      default: '#121212',
      paper: '#242424',
    },
    action: {
      hover: 'rgba(167, 193, 222, 0.1)',
      selected: 'rgba(167, 193, 222, 0.2)',
    },
    divider: 'rgba(116, 116, 116, 0.4)',
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.8)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
  },
  typography: {
    fontFamily: 'Open Sans, Helvetica Neue, Helvetica, sans-serif'
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#242424',
          backgroundImage: 'none',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(1px)',
        },
        invisible: {
          backdropFilter: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          border: '1px solid rgba(116, 116, 116, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paperAnchorTop: {
          background: 'rgba(18, 18, 18, 0.66)',
          backdropFilter: 'blur(8px)',
        },
        paperAnchorRight: {
          background: 'rgba(18, 18, 18, 0.66)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#6194c5',
          textDecoration: 'none',
          "&:hover": {
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          background: 'rgba(30, 30, 30, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(116, 116, 116, 0.3)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        valueLabel: {
          color: 'rgba(102, 102, 102, 0.9)',
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: '#e5e5e5',
          border: '1px solid rgba(116, 116, 116, 0.4)',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(167, 193, 222, 0.2)',
          },
        },
      },
    },
    MuiTooltip: _tooltipOverrides,
    MuiTouchRipple: _touchRippleOverrides,
  },
});

export function currentTheme() {
  // Check the user's OS/browser theme preference
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDarkMode ? darkTheme : lightTheme;
}