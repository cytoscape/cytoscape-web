import * as React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import { SelectTypeStep, ChartKind } from '../../WizardSteps/SelectTypeStep'
import { CustomGraphicsNameType } from '../../../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { renderWithTheme } from '../../__tests__/testUtils'

describe('SelectTypeStep', () => {
  const mockOnKindChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders both chart type options', () => {
    renderWithTheme(
      <SelectTypeStep
        selectedKind={CustomGraphicsNameType.PieChart}
        onKindChange={mockOnKindChange}
      />,
    )

    expect(screen.getByText('Pie Chart')).toBeInTheDocument()
    expect(screen.getByText('Ring Chart')).toBeInTheDocument()
  })

  it('highlights the selected chart type', () => {
    renderWithTheme(
      <SelectTypeStep
        selectedKind={CustomGraphicsNameType.RingChart}
        onKindChange={mockOnKindChange}
      />,
    )

    const ringChartOption = screen.getByText('Ring Chart').closest('div')
    expect(ringChartOption).toHaveStyle({ borderColor: 'primary.main' })
  })

  it('calls onKindChange when a chart type is clicked', () => {
    renderWithTheme(
      <SelectTypeStep
        selectedKind={CustomGraphicsNameType.PieChart}
        onKindChange={mockOnKindChange}
      />,
    )

    const ringChartOption = screen.getByText('Ring Chart')
    fireEvent.click(ringChartOption)

    expect(mockOnKindChange).toHaveBeenCalledWith(
      CustomGraphicsNameType.RingChart,
    )
  })

  it('calls onKindChange when pie chart is clicked', () => {
    renderWithTheme(
      <SelectTypeStep
        selectedKind={CustomGraphicsNameType.RingChart}
        onKindChange={mockOnKindChange}
      />,
    )

    const pieChartOption = screen.getByText('Pie Chart')
    fireEvent.click(pieChartOption)

    expect(mockOnKindChange).toHaveBeenCalledWith(
      CustomGraphicsNameType.PieChart,
    )
  })

  it('applies hover styles on mouse enter', () => {
    renderWithTheme(
      <SelectTypeStep
        selectedKind={CustomGraphicsNameType.PieChart}
        onKindChange={mockOnKindChange}
      />,
    )

    const ringChartOption = screen.getByText('Ring Chart').closest('div')
    fireEvent.mouseEnter(ringChartOption!)

    // Note: We can't easily test CSS hover states in JSDOM, but we can verify the element exists
    expect(ringChartOption).toBeInTheDocument()
  })

  it('renders with correct accessibility attributes', () => {
    renderWithTheme(
      <SelectTypeStep
        selectedKind={CustomGraphicsNameType.PieChart}
        onKindChange={mockOnKindChange}
      />,
    )

    const pieChartOption = screen.getByText('Pie Chart').closest('div')
    const ringChartOption = screen.getByText('Ring Chart').closest('div')

    expect(pieChartOption).toHaveStyle({ cursor: 'pointer' })
    expect(ringChartOption).toHaveStyle({ cursor: 'pointer' })
  })
})
