import '@testing-library/jest-dom'

// Mock Material-UI theme
jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  createTheme: jest.fn(() => ({
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#f50057' },
      grey: { 50: '#fafafa', 100: '#f5f5f5', 300: '#e0e0e0', 400: '#bdbdbd' },
      text: { primary: '#000000', secondary: '#666666' },
      action: { selected: 'rgba(25, 118, 210, 0.08)' },
    },
    spacing: (factor) => `${8 * factor}px`,
  })),
}))

// Mock Material-UI icons
jest.mock('@mui/icons-material/PieChart', () => 'PieChartIcon')
jest.mock('@mui/icons-material/DonutLarge', () => 'DonutLargeIcon')
jest.mock('@mui/icons-material/Delete', () => 'DeleteIcon')
jest.mock('@mui/icons-material/Add', () => 'AddIcon')
jest.mock('@mui/icons-material/InfoOutlined', () => 'InfoOutlinedIcon')
jest.mock('@mui/icons-material/ListAlt', () => 'ListAltIcon')
jest.mock('@mui/icons-material/Palette', () => 'PaletteIcon')
jest.mock('@mui/icons-material/Settings', () => 'SettingsIcon')
jest.mock('@mui/icons-material/Visibility', () => 'VisibilityIcon')
jest.mock('@mui/icons-material/ArrowUpward', () => 'ArrowUpwardIcon')
jest.mock('@mui/icons-material/ArrowDownward', () => 'ArrowDownwardIcon')

// Mock chart render components
jest.mock('../PieChartRender', () => ({
  PieChartRender: ({ properties, size, showLabels }) => (
    <div
      data-testid="pie-chart"
      data-properties={JSON.stringify(properties)}
      data-size={size}
      data-show-labels={showLabels}
    >
      Pie Chart Preview
    </div>
  ),
}))

jest.mock('../RingChartRender', () => ({
  RingChartRender: ({ properties, size, showLabels }) => (
    <div
      data-testid="ring-chart"
      data-properties={JSON.stringify(properties)}
      data-size={size}
      data-show-labels={showLabels}
    >
      Ring Chart Preview
    </div>
  ),
}))

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console warnings during tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
