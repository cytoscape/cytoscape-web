/**
 * The app's colours and font, as plain values with no MUI import, so pages
 * outside the MUI tree (the embed, src/embed/) match the app's look.
 * src/theme.ts builds the MUI theme from these.
 */

export const lightPalette = {
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
    subtle: '#e6eaed',
  },
  action: {
    hover: 'rgba(31, 120, 180, 0.1)',
    selected: 'rgba(31, 120, 180, 0.2)',
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.9)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.25)',
  },
}

export const darkPalette = {
  primary: {
    main: '#3a88fe',
    light: '#a7c1de',
  },
  secondary: {
    main: '#3a88fe',
  },
  background: {
    default: '#1e1e1e',
    paper: '#252525',
    header: '#333333',
  },
  action: {
    hover: 'rgba(167, 193, 222, 0.1)',
    selected: 'rgba(167, 193, 222, 0.2)',
  },
  divider: 'rgba(116, 116, 116, 0.4)',
  text: {
    primary: '#d5d5d5',
    secondary: 'rgba(255, 255, 255, 0.5)',
    disabled: 'rgba(255, 255, 255, 0.25)',
  },
}

export const fontFamily = 'Open Sans, Helvetica Neue, Helvetica, sans-serif'
