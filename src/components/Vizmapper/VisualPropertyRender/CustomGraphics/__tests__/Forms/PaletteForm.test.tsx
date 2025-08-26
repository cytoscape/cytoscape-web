import * as React from 'react'
import { screen, fireEvent } from '@testing-library/react'
import { PaletteForm } from '../../Forms/PaletteForm'
import { ColorType } from '../../../../../../../models/VisualStyleModel/VisualPropertyValue'
import { AttributeName } from '../../../../../../../models/TableModel/AttributeName'
import { renderWithTheme } from '../../__tests__/testUtils'

describe('PaletteForm', () => {
  const mockOnUpdate = jest.fn()
  const defaultProps = {
    colorScheme: 'Sequential1',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'] as ColorType[],
    dataColumns: ['attribute1', 'attribute2', 'attribute3'] as AttributeName[],
    onUpdate: mockOnUpdate,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with title', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    expect(screen.getByText('Color Palette')).toBeInTheDocument()
  })

  it('renders guidance when hideGuidance is false', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    expect(screen.getByText('Step 2: Choose Color Palette')).toBeInTheDocument()
    expect(
      screen.getByText(/Optionally Select a color palette/),
    ).toBeInTheDocument()
  })

  it('hides guidance when hideGuidance is true', () => {
    renderWithTheme(<PaletteForm {...defaultProps} hideGuidance={true} />)

    expect(
      screen.queryByText('Step 2: Choose Color Palette'),
    ).not.toBeInTheDocument()
  })

  it('renders palette dropdown with current selection', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    expect(select).toHaveValue('Sequential1')
  })

  it('calls onUpdate when palette is changed', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    fireEvent.mouseDown(select)

    const option = screen.getByText('Diverging1')
    fireEvent.click(option)

    expect(mockOnUpdate).toHaveBeenCalledWith('Diverging1', expect.any(Array))
  })

  it('shows current colors preview when colors exist', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    expect(screen.getByText('Current Colors')).toBeInTheDocument()

    // Check that color swatches are rendered
    const colorSwatches = screen.getAllByRole('img', { hidden: true }) // Color inputs are hidden
    expect(colorSwatches.length).toBeGreaterThan(0)
  })

  it('does not show current colors preview when no colors', () => {
    renderWithTheme(
      <PaletteForm {...defaultProps} colors={[]} dataColumns={[]} />,
    )

    expect(screen.queryByText('Current Colors')).not.toBeInTheDocument()
  })

  it('renders palette options with color previews', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    fireEvent.mouseDown(select)

    // Check that palette options are rendered
    expect(screen.getByText('Sequential1')).toBeInTheDocument()
    expect(screen.getByText('Diverging1')).toBeInTheDocument()
    expect(screen.getByText('Viridis1')).toBeInTheDocument()
  })

  it('handles empty color scheme selection', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    fireEvent.mouseDown(select)

    const noneOption = screen.getByText('None')
    fireEvent.click(noneOption)

    expect(mockOnUpdate).toHaveBeenCalledWith('', expect.any(Array))
  })

  it('updates colors when palette is changed', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    fireEvent.mouseDown(select)

    const option = screen.getByText('Diverging1')
    fireEvent.click(option)

    // Verify that onUpdate was called with new colors
    const [scheme, colors] = mockOnUpdate.mock.calls[0]
    expect(scheme).toBe('Diverging1')
    expect(colors).toHaveLength(3) // Same number of attributes
    expect(
      colors.every(
        (color) => typeof color === 'string' && color.startsWith('#'),
      ),
    ).toBe(true)
  })

  it('handles single attribute correctly', () => {
    renderWithTheme(
      <PaletteForm
        {...defaultProps}
        colors={['#FF6B6B']}
        dataColumns={['attribute1']}
      />,
    )

    expect(screen.getByText(/1 attribute/)).toBeInTheDocument()
  })

  it('handles multiple attributes correctly', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    expect(screen.getByText(/3 attributes/)).toBeInTheDocument()
  })

  it('renders with proper accessibility attributes', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    expect(select).toHaveAttribute('aria-labelledby')
  })

  it('handles tooltips for color swatches', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    // Color swatches should have tooltips with attribute names
    const colorSwatches = screen.getAllByRole('img', { hidden: true })
    expect(colorSwatches.length).toBe(3) // One for each attribute
  })

  it('maintains color order when palette is changed', () => {
    renderWithTheme(<PaletteForm {...defaultProps} />)

    const select = screen.getByLabelText('Palette')
    fireEvent.mouseDown(select)

    const option = screen.getByText('Diverging1')
    fireEvent.click(option)

    // The colors should be distributed evenly from the new palette
    const [scheme, colors] = mockOnUpdate.mock.calls[0]
    expect(colors).toHaveLength(3)
  })
})
