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

export const theme = createTheme({
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
