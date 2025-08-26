import * as React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CustomGraphicsNameType } from '../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { ColorType } from '../../../../models/VisualStyleModel/VisualPropertyValue'
import { AttributeName } from '../../../../models/TableModel/AttributeName'

// Create a test theme
const testTheme = createTheme()

// Test wrapper with theme provider
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <ThemeProvider theme={testTheme}>{children}</ThemeProvider>

// Custom render function with theme provider
export const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper })
}

// Mock data for testing
export const mockPieChartProperties = {
  cy_range: [0, 1],
  cy_colorScheme: 'Sequential1',
  cy_startAngle: 0,
  cy_colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'] as ColorType[],
  cy_dataColumns: ['attribute1', 'attribute2', 'attribute3'] as AttributeName[],
}

export const mockRingChartProperties = {
  cy_range: [0, 1],
  cy_colorScheme: 'Diverging1',
  cy_startAngle: 90,
  cy_holeSize: 0.4,
  cy_colors: ['#FF6B6B', '#4ECDC4'] as ColorType[],
  cy_dataColumns: ['attribute1', 'attribute2'] as AttributeName[],
}

export const mockCustomGraphics = {
  type: 'chart' as const,
  name: CustomGraphicsNameType.PieChart,
  properties: mockPieChartProperties,
}

// Mock network ID
export const mockNetworkId = 'test-network-123'

// Mock table store
export const mockTableStore = {
  tables: {
    'test-network-123': {
      nodeTable: {
        columns: [
          { name: 'attribute1', type: 'number' },
          { name: 'attribute2', type: 'number' },
          { name: 'attribute3', type: 'number' },
          { name: 'textAttribute', type: 'string' },
        ],
        rows: new Map([
          [
            '1',
            {
              attribute1: 10,
              attribute2: 20,
              attribute3: 30,
              textAttribute: 'text',
            },
          ],
          [
            '2',
            {
              attribute1: 15,
              attribute2: 25,
              attribute3: 35,
              textAttribute: 'text2',
            },
          ],
        ]),
      },
    },
  },
}

// Common test helpers
export const clickButton = (text: string) => {
  const button = screen.getByRole('button', { name: text })
  fireEvent.click(button)
}

export const selectOption = (selectLabel: string, optionText: string) => {
  const select = screen.getByLabelText(selectLabel)
  fireEvent.mouseDown(select)
  const option = screen.getByText(optionText)
  fireEvent.click(option)
}

export const changeSlider = (slider: HTMLElement, value: number) => {
  fireEvent.change(slider, { target: { value } })
}

export const changeInput = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } })
}

// Wait for async operations
export const waitForElement = async (text: string) => {
  await waitFor(() => {
    expect(screen.getByText(text)).toBeInTheDocument()
  })
}

export const waitForElementToBeRemoved = async (text: string) => {
  await waitFor(() => {
    expect(screen.queryByText(text)).not.toBeInTheDocument()
  })
}
